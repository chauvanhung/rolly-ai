"""
Helpers for detecting and scoring legal domains in Vietnamese queries/documents.
"""
from __future__ import annotations

from app.rag.lexical import normalize_vietnamese

DOMAIN_KEYWORDS: dict[str, tuple[str, ...]] = {
    "housing": (
        "luat nha o",
        "nha o",
        "nha o xa hoi",
        "chung cu",
        "can ho",
    ),
    "civil": (
        "bo luat dan su",
        "luat dan su",
        "dan su",
        "hop dong",
        "nghia vu dan su",
    ),
    "civil_procedure": (
        "bo luat to tung dan su",
        "to tung dan su",
        "thu tuc to tung dan su",
        "khoi kien",
        "tham quyen toa an",
    ),
    "criminal_procedure": (
        "bo luat to tung hinh su",
        "to tung hinh su",
        "dieu tra",
        "truy to",
        "xet xu hinh su",
    ),
    "real_estate": (
        "kinh doanh bat dong san",
        "bat dong san",
        "du an bat dong san",
        "moi gioi bat dong san",
    ),
    "land": (
        "luat dat dai",
        "dat dai",
        "quyen su dung dat",
        "thu hoi dat",
        "giao dat",
    ),
    "compensation_planning": (
        "den bu",
        "boi thuong",
        "thu hoi dat",
        "quy hoach",
        "giai phong mat bang",
        "tai dinh cu",
    ),
    "decree": (
        "nghi dinh",
        "nd cp",
        "nd-cp",
    ),
    "tax_personal_income": (
        "thue tncn",
        "tncn",
        "thue thu nhap ca nhan",
        "thu nhap ca nhan",
        "quyet toan thue tncn",
    ),
    "tax_land_non_agri": (
        "thue su dung dat phi nong nghiep",
        "su dung dat phi nong nghiep",
        "dat phi nong nghiep",
        "phi nong nghiep",
    ),
}


def detect_query_domains(query: str) -> list[str]:
    normalized = normalize_vietnamese(query)
    matched: list[str] = []
    for domain, keywords in DOMAIN_KEYWORDS.items():
        if any(keyword in normalized for keyword in keywords):
            matched.append(domain)
    return matched


def detect_text_domains(text: str, source: str = "") -> list[str]:
    haystack = f"{normalize_vietnamese(source)} {normalize_vietnamese(text[:2000])}"
    matched: list[str] = []
    for domain, keywords in DOMAIN_KEYWORDS.items():
        if any(keyword in haystack for keyword in keywords):
            matched.append(domain)
    return matched


def score_domain_match(query_domains: list[str], text: str, source: str) -> int:
    if not query_domains:
        return 0

    normalized_source = normalize_vietnamese(source)
    haystack = f"{normalized_source} {normalize_vietnamese(text[:1800])}"
    score = 0
    for domain in query_domains:
        keywords = DOMAIN_KEYWORDS.get(domain, ())
        if any(keyword in haystack for keyword in keywords):
            score += 1
        if domain == "decree" and "nghi dinh" in normalized_source:
            score += 1
    return score
