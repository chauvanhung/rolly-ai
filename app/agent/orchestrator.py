"""
Central orchestrator for law QA, SQL querying, automation, and general chat.
"""
from __future__ import annotations

import re
import unicodedata

from app.agent.intent_detector import Intent, detect_intent
from app.automation.jobs import anomaly_detection_job, daily_report_job
from app.automation.scheduler import schedule_daily_report
from app.core.logger import logger
from app.core.ollama_client import get_ollama_client
from app.rag.catalog import summarize_local_law_catalog
from app.rag.qa_chain import answer_law_question
from app.sql.executor import format_results_as_table, run_nl_query


async def handle_query(user_input: str) -> str:
    text = user_input.strip()
    if not text:
        return "Vui lòng nhập nội dung cần xử lý."

    intent, _confidence = detect_intent(text)
    logger.info("Handling query | intent=%s | input=%s", intent.value, text[:120])

    if intent == Intent.LAW:
        return await _handle_law(text)
    if intent == Intent.SQL:
        return await _handle_sql(text)
    if intent == Intent.AUTOMATION:
        return await _handle_automation(text)
    return await _handle_general(text)


async def _handle_law(question: str) -> str:
    try:
        if _is_law_catalog_query(question):
            return summarize_local_law_catalog()
        return await answer_law_question(question)
    except Exception as exc:
        logger.error("Law QA error: %s", exc)
        return f"Không thể tra cứu văn bản pháp luật lúc này: {exc}"


async def _handle_sql(question: str) -> str:
    try:
        sql, rows = await run_nl_query(question)
        return format_results_as_table(sql, rows)
    except Exception as exc:
        logger.error("SQL pipeline error: %s", exc)
        return f"Không thể xử lý truy vấn dữ liệu lúc này: {exc}"


async def _handle_automation(message: str) -> str:
    normalized = _normalize_text(message)

    if any(phrase in normalized for phrase in ["bao cao ngay", "gui bao cao ngay", "bao cao bay gio"]):
        return await daily_report_job()

    if any(phrase in normalized for phrase in ["kiem tra bat thuong ngay", "kiem tra ngay", "canh bao ngay"]):
        return await anomaly_detection_job()

    match = re.search(r"(\d{1,2})(?:[:hg](\d{1,2}))?", normalized)
    if "bao cao" in normalized and match:
        hour = int(match.group(1))
        minute = int(match.group(2) or 0)
        if hour > 23 or minute > 59:
            return "Giờ hẹn không hợp lệ. Hãy dùng định dạng như 8h hoặc 08:30."
        return schedule_daily_report(hour, minute)

    return (
        "Tôi có thể hỗ trợ automation theo 3 cách:\n"
        "- 'Tự động gửi báo cáo mỗi ngày lúc 8h'\n"
        "- 'Gửi báo cáo ngay'\n"
        "- 'Kiểm tra bất thường ngay'"
    )


async def _handle_general(message: str) -> str:
    prompt = f"""Bạn là trợ lý AI offline chạy local trên máy người dùng.
Luôn trả lời bằng tiếng Việt Unicode tự nhiên, ngắn gọn, lịch sự và hữu ích.
Nếu người dùng hỏi về khả năng hệ thống, hãy nêu rõ 3 nhóm chính: pháp luật, SQL và automation.

Người dùng: {message}
Trợ lý:"""
    return await get_ollama_client().generate(prompt)


def _normalize_text(text: str) -> str:
    text = text.lower().replace("đ", "d")
    text = "".join(ch for ch in unicodedata.normalize("NFD", text) if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", text).strip()


def _is_law_catalog_query(text: str) -> bool:
    normalized = _normalize_text(text)
    patterns = (
        "hoi duoc nhung luat gi",
        "co nhung luat gi",
        "hien tai co nhung luat gi",
        "he thong co nhung luat gi",
        "kho luat co gi",
        "danh muc luat",
        "danh sach luat",
        "nhung bo luat nao",
    )
    return any(pattern in normalized for pattern in patterns)
