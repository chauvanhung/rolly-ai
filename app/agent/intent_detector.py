"""
Lightweight intent detector optimized for Vietnamese input.
"""
from __future__ import annotations

import re
import unicodedata
from enum import Enum
from typing import Iterable, Tuple

from app.core.logger import logger


class Intent(str, Enum):
    LAW = "LAW"
    SQL = "SQL"
    AUTOMATION = "AUTOMATION"
    OTHER = "OTHER"


LAW_KEYWORDS = {
    "luat",
    "bo luat",
    "nghi dinh",
    "thong tu",
    "nghi quyet",
    "quyet dinh",
    "dieu",
    "khoan",
    "quy dinh",
    "quy che",
    "van ban",
    "phap luat",
    "thu tuc",
    "thue",
    "tncn",
    "gtgt",
    "bhxh",
    "lao dong",
    "hop dong",
    "xu phat",
    "nha o",
    "nha dat",
    "dat dai",
    "bat dong san",
    "so do",
    "so hong",
    "quyen su dung dat",
    "quy hoach",
    "cap phep",
    "so huu",
}

SQL_KEYWORDS = {
    "ton kho",
    "hang ton",
    "san pham",
    "don hang",
    "doanh thu",
    "khach hang",
    "liet ke",
    "bao nhieu",
    "tong cong",
    "thong ke",
    "du lieu",
    "truy van",
    "sql",
    "database",
    "query",
    "top",
    "xep hang",
    "bang",
    "cot",
    "ban ghi",
}

AUTOMATION_KEYWORDS = {
    "tu dong",
    "lich",
    "hen gio",
    "moi ngay",
    "hang ngay",
    "dinh ky",
    "gui bao cao",
    "nhac",
    "luc",
    "schedule",
    "cron",
    "job",
    "automation",
    "canh bao",
}


def _normalize(text: str) -> str:
    text = text.lower().strip()
    text = text.replace("đ", "d")
    text = "".join(
        ch for ch in unicodedata.normalize("NFD", text) if unicodedata.category(ch) != "Mn"
    )
    text = re.sub(r"\s+", " ", text)
    return text


def _score_keywords(text: str, keywords: Iterable[str]) -> int:
    return sum(1 for keyword in keywords if keyword in text)


def detect_intent(text: str) -> Tuple[Intent, float]:
    normalized = _normalize(text)

    law_score = _score_keywords(normalized, LAW_KEYWORDS)
    sql_score = _score_keywords(normalized, SQL_KEYWORDS)
    automation_score = _score_keywords(normalized, AUTOMATION_KEYWORDS)

    if any(token in normalized for token in ("luat", "nghi dinh", "thong tu", "quy dinh", "phap luat")):
        law_score += 2
    if any(token in normalized for token in ("nha o", "dat dai", "bat dong san", "quyen su dung dat", "quy hoach")):
        law_score += 2
    if any(token in normalized for token in ("select", "from ", " where ", "sql", "truy van", "du lieu")):
        sql_score += 2
    if any(token in normalized for token in ("tu dong", "hen gio", "moi ngay", "hang ngay", "cron")):
        automation_score += 2

    max_score = max(law_score, sql_score, automation_score)
    if max_score == 0:
        intent = Intent.OTHER
        confidence = 0.55
    elif automation_score >= max(law_score, sql_score):
        intent = Intent.AUTOMATION
        confidence = min(automation_score / 3.0, 1.0)
    elif law_score >= sql_score:
        intent = Intent.LAW
        confidence = min(law_score / 3.0, 1.0)
    else:
        intent = Intent.SQL
        confidence = min(sql_score / 3.0, 1.0)

    logger.info(
        "Intent=%s confidence=%.2f | law=%s sql=%s auto=%s | query=%s",
        intent.value,
        confidence,
        law_score,
        sql_score,
        automation_score,
        text[:80],
    )
    return intent, confidence
