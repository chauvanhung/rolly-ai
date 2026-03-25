"""
Utilities for summarizing the local legal corpus without using RAG generation.
"""
from __future__ import annotations

import os
from collections import defaultdict

from app.core.config import settings
from app.rag.legal_domains import detect_text_domains
from app.rag.vector_store import get_vector_store

DOMAIN_LABELS = {
    "housing": "Nhà ở",
    "civil": "Dân sự",
    "civil_procedure": "Tố tụng dân sự",
    "criminal_procedure": "Tố tụng hình sự",
    "real_estate": "Bất động sản",
    "land": "Đất đai",
    "decree": "Nghị định",
}


def summarize_local_law_catalog(limit_per_domain: int = 4) -> str:
    laws_dir = settings.laws_dir
    if not os.path.exists(laws_dir):
        return "Thư mục dữ liệu luật hiện chưa tồn tại."

    source_files = sorted(
        file_name for file_name in os.listdir(laws_dir)
        if file_name.lower().endswith((".pdf", ".docx", ".doc"))
    )
    if not source_files:
        return "Hiện chưa có file luật nào trong kho local."

    grouped: dict[str, set[str]] = defaultdict(set)
    store = get_vector_store()

    if store.is_ready and store.metadata:
        for text, source in store.metadata:
            for domain in detect_text_domains(text, source):
                grouped[domain].add(source)
    else:
        for source in source_files:
            for domain in detect_text_domains("", source):
                grouped[domain].add(source)

    categorized = set()
    for items in grouped.values():
        categorized.update(items)
    uncategorized_count = max(0, len(source_files) - len(categorized))

    lines = [
        f"Hiện kho luật local có khoảng {len(source_files)} tài liệu có thể tra cứu.",
        "Các nhóm hỏi tốt nhất hiện tại gồm:",
    ]

    for domain in ("housing", "land", "real_estate", "civil", "civil_procedure", "criminal_procedure", "decree"):
        items = sorted(grouped.get(domain, set()))
        if not items:
            continue
        examples = ", ".join(items[:limit_per_domain])
        lines.append(f"- {DOMAIN_LABELS[domain]}: {len(items)} tài liệu. Ví dụ: {examples}")

    if uncategorized_count:
        lines.append(f"- Nhóm khác/chưa gắn nhãn: {uncategorized_count} tài liệu.")

    lines.append(
        "Bạn nên hỏi theo tên luật, nghị định, chủ đề hoặc năm ban hành, ví dụ: "
        "'Luật Nhà ở 2023 quy định gì về nhà ở xã hội?'"
    )
    return "\n".join(lines)
