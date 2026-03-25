"""
Utilities for lightweight Vietnamese lexical retrieval.
"""
from __future__ import annotations

import re
import unicodedata


def normalize_vietnamese(text: str) -> str:
    text = text.lower().replace("_", " ").replace("đ", "d").replace("Ä‘", "d")
    text = "".join(ch for ch in unicodedata.normalize("NFD", text) if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", text).strip()


def tokenize_vietnamese(text: str) -> list[str]:
    normalized = normalize_vietnamese(text)
    return [token for token in re.split(r"[^a-z0-9]+", normalized) if token]


def extract_query_terms(query: str) -> list[str]:
    normalized = normalize_vietnamese(query)
    phrases = [
        "nha o xa hoi",
        "nha o thuong mai",
        "nha o",
        "dat dai",
        "bat dong san",
        "quy hoach",
        "den bu",
        "boi thuong",
        "giai phong mat bang",
        "thu hoi dat",
        "tai dinh cu",
        "quyen su dung dat",
        "so hong",
        "so do",
        "chung cu",
        "du an",
        "luat",
        "nghi dinh",
        "thong tu",
    ]
    terms = [phrase for phrase in phrases if phrase in normalized]
    terms.extend(token for token in tokenize_vietnamese(query) if len(token) >= 4)
    return list(dict.fromkeys(terms))
