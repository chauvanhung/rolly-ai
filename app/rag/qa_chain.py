"""
RAG question answering pipeline for Vietnamese legal QA.
"""
from __future__ import annotations

import asyncio

from app.core.logger import logger
from app.core.ollama_client import get_ollama_client
from app.rag.legal_domains import detect_query_domains
from app.rag.lexical import normalize_vietnamese
from app.rag.retriever import retrieve_relevant_chunks


def _compact_text(text: str, limit: int = 700) -> str:
    cleaned = " ".join(text.split())
    if len(cleaned) <= limit:
        return cleaned
    return f"{cleaned[:limit].rstrip()}..."


def _fallback_answer(chunks: list[tuple[str, str]], sources: list[str]) -> str:
    lines = []
    for index, (chunk, source) in enumerate(chunks, start=1):
        lines.append(f"{index}. {_compact_text(chunk, 280)} ({source})")
    return (
        "Tôi chưa kịp tổng hợp câu trả lời đầy đủ từ mô hình, nhưng đây là các đoạn liên quan nhất tôi tìm được:\n"
        f"{chr(10).join(lines)}\n\n"
        "Bạn có thể hỏi hẹp hơn theo tên luật, điều khoản hoặc năm ban hành để trả lời nhanh và sát hơn.\n\n"
        f"Nguồn tham khảo: {', '.join(sources)}"
    )


def _is_compensation_planning_query(question: str) -> bool:
    return "compensation_planning" in detect_query_domains(question)


def _has_authoritative_compensation_sources(chunks: list[tuple[str, str]]) -> bool:
    for chunk, source in chunks:
        normalized_source = normalize_vietnamese(source)
        normalized_chunk = normalize_vietnamese(chunk[:2200])
        if any(marker in normalized_source for marker in ("ubnd", "hdnd", "chi thi", "tatc")):
            continue
        if any(marker in normalized_source for marker in ("luat", "bo luat", "nghi dinh", "thong tu")) and any(
            term in f"{normalized_source} {normalized_chunk}"
            for term in ("boi thuong", "den bu", "tai dinh cu", "thu hoi dat", "giai phong mat bang", "quy hoach")
        ):
            return True
    return False


def _missing_compensation_corpus_message() -> str:
    return (
        "Kho dữ liệu local hiện chưa có đủ văn bản trung ương phù hợp để trả lời đáng tin cậy về "
        "bồi thường, thu hồi đất, tái định cư hoặc nhà ở dính quy hoạch. "
        "Tôi tạm thời không trả lời suy diễn để tránh sai. "
        "Bạn hãy bổ sung thêm Luật Đất đai và các nghị định, thông tư về bồi thường, hỗ trợ, tái định cư rồi chạy lại `/ingest`."
    )


async def answer_law_question(question: str) -> str:
    chunks = await retrieve_relevant_chunks(question)
    if not chunks:
        if _is_compensation_planning_query(question):
            return _missing_compensation_corpus_message()
        return (
            "Chưa tìm thấy văn bản pháp lý phù hợp trong kho dữ liệu local cho câu hỏi này. "
            "Nếu bạn đang hỏi một mảng chuyên biệt như thuế TNCN, hãy bổ sung tài liệu đúng chuyên đề vào `data/laws` rồi chạy lại `/ingest`."
        )

    if _is_compensation_planning_query(question) and not _has_authoritative_compensation_sources(chunks):
        return _missing_compensation_corpus_message()

    context_parts = []
    sources = []
    for index, (chunk, source) in enumerate(chunks, start=1):
        context_parts.append(f"[Đoạn {index} | Nguồn: {source}]\n{_compact_text(chunk, 700)}")
        if source not in sources:
            sources.append(source)

    prompt = f"""Bạn là trợ lý pháp lý Việt Nam.
Chỉ được trả lời dựa trên ngữ cảnh được cung cấp.
Nếu ngữ cảnh chưa đủ, hãy nói rõ là chưa đủ thông tin.
Trả lời bằng tiếng Việt Unicode, ngắn gọn, tối đa 5 câu.
Nếu có thể, nêu tên luật hoặc nghị định xuất hiện trong ngữ cảnh.
Ưu tiên theo cấu trúc:
1. Kết luận ngắn
2. Ý chính của quy định
3. Nguồn áp dụng

Ngữ cảnh:
{'\n\n'.join(context_parts)}

Câu hỏi: {question}

Trả lời:"""
    logger.info("Generating RAG answer for: %s", question[:120])
    try:
        answer = await asyncio.wait_for(get_ollama_client().generate(prompt), timeout=45)
    except asyncio.TimeoutError:
        logger.warning("RAG answer timed out, using fallback summary for: %s", question[:120])
        if _is_compensation_planning_query(question) and not _has_authoritative_compensation_sources(chunks):
            return _missing_compensation_corpus_message()
        return _fallback_answer(chunks, sources)

    if not answer.strip():
        return _fallback_answer(chunks, sources)
    return f"{answer}\n\nNguồn tham khảo: {', '.join(sources)}"
