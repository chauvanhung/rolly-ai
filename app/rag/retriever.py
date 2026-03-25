"""
Hybrid retriever for Vietnamese legal QA.
Uses FAISS semantic retrieval + BM25 lexical retrieval.
"""
from __future__ import annotations

from typing import List, Tuple

from app.core.config import settings
from app.core.logger import logger
from app.rag.embedder import embed_query_async
from app.rag.legal_domains import detect_query_domains, score_domain_match
from app.rag.lexical import extract_query_terms, normalize_vietnamese, tokenize_vietnamese
from app.rag.vector_store import get_vector_store


def _is_general_compensation_query(query_terms: list[str], query_domains: list[str]) -> bool:
    return "compensation_planning" in query_domains and any(
        term in query_terms for term in {"den bu", "boi thuong", "thu hoi dat", "tai dinh cu", "quy hoach"}
    )


def _is_authoritative_compensation_source(text: str, source: str) -> bool:
    normalized_source = normalize_vietnamese(source)
    haystack = f"{normalized_source} {normalize_vietnamese(text[:2200])}"

    # Avoid surfacing local or unrelated guidance as if it were general nationwide law.
    if any(marker in normalized_source for marker in ("ubnd", "hdnd", "chi thi", "tatc")):
        return False

    has_primary_form = any(marker in normalized_source for marker in ("luat", "bo luat", "nghi dinh", "thong tu"))
    has_subject_terms = any(
        term in haystack
        for term in ("boi thuong", "den bu", "tai dinh cu", "thu hoi dat", "giai phong mat bang", "quy hoach")
    )
    has_land_terms = any(term in haystack for term in ("dat dai", "dat ", "quyen su dung dat", "nha o", "thua dat"))
    return has_primary_form and has_subject_terms and has_land_terms


def _lexical_overlap_score(query_terms: list[str], text: str, source: str) -> int:
    haystack = f"{normalize_vietnamese(source)} {normalize_vietnamese(text[:1200])}"
    return sum(1 for term in query_terms if term in haystack)


def _source_overlap_score(query_terms: list[str], source: str) -> int:
    normalized_source = normalize_vietnamese(source)
    return sum(1 for term in query_terms if term in normalized_source)


def _contains_any_term(terms: list[str], text: str, source: str) -> bool:
    haystack = f"{normalize_vietnamese(source)} {normalize_vietnamese(text[:1800])}"
    return any(term in haystack for term in terms)


def _contains_all_term_groups(term_groups: list[list[str]], text: str, source: str) -> bool:
    haystack = f"{normalize_vietnamese(source)} {normalize_vietnamese(text[:1800])}"
    return all(any(term in haystack for term in group) for group in term_groups)


def _candidate_prefilter(query_terms: list[str], items: list[dict[str, object]], top_n: int) -> list[dict[str, object]]:
    if not items:
        return []
    if not query_terms:
        return items[:top_n]

    high_priority_terms = {
        "thue tncn",
        "thue thu nhap ca nhan",
        "thue su dung dat phi nong nghiep",
        "den bu",
        "boi thuong",
        "thu hoi dat",
        "tai dinh cu",
        "quy hoach",
    }
    strong_terms = [term for term in query_terms if term in high_priority_terms]

    scored = []
    for item in items:
        source = str(item["source"])
        text = str(item["text"])
        normalized_source = normalize_vietnamese(source)
        normalized_text = normalize_vietnamese(text[:1600])
        phrase_hits = sum(1 for term in query_terms if " " in term and (term in normalized_source or term in normalized_text))
        strong_hits = sum(1 for term in strong_terms if term in normalized_source or term in normalized_text)
        scored.append((strong_hits, phrase_hits, item))

    scored.sort(key=lambda row: (row[0], row[1]), reverse=True)
    filtered = [row[2] for row in scored if row[0] > 0 or row[1] > 0]
    return (filtered or items)[:top_n]


async def retrieve_relevant_chunks(query: str) -> List[Tuple[str, str]]:
    store = get_vector_store()

    if not store.is_ready:
        logger.warning("Vector store not ready. Cannot retrieve chunks.")
        return []

    query_vec = await embed_query_async(query)
    fetch_k = max(settings.retrieval_fetch_k, settings.rag_top_k * 8, 16)
    semantic_candidates = store.search(query_vec, top_k=fetch_k)
    query_terms = extract_query_terms(query)
    query_tokens = tokenize_vietnamese(query)
    query_domains = detect_query_domains(query)
    bm25_candidates = store.search_bm25(query_tokens, top_k=fetch_k)

    merged: dict[tuple[str, str], dict[str, object]] = {}

    for rank, (text, source, distance) in enumerate(semantic_candidates):
        merged[(text, source)] = {
            "text": text,
            "source": source,
            "semantic_rank": rank,
            "semantic_distance": distance,
            "bm25_score": 0.0,
        }

    for rank, (text, source, bm25_score) in enumerate(bm25_candidates):
        key = (text, source)
        current = merged.get(key)
        if current is None:
            merged[key] = {
                "text": text,
                "source": source,
                "semantic_rank": fetch_k + rank,
                "semantic_distance": 999999.0,
                "bm25_score": bm25_score,
            }
        else:
            current["bm25_score"] = bm25_score

    reranked = []
    for item in merged.values():
        domain_score = score_domain_match(query_domains, str(item["text"]), str(item["source"]))
        overlap_score = _lexical_overlap_score(query_terms, str(item["text"]), str(item["source"]))
        source_score = _source_overlap_score(query_terms, str(item["source"]))
        enriched = dict(item)
        enriched["domain_score"] = domain_score
        enriched["overlap_score"] = overlap_score
        enriched["source_score"] = source_score
        reranked.append(enriched)

    reranked.sort(
        key=lambda item: (
            int(item["domain_score"]),
            int(item["source_score"]),
            int(item["overlap_score"]),
            float(item["bm25_score"]),
            -float(item["semantic_rank"]),
            -float(item["semantic_distance"]),
        ),
        reverse=True,
    )

    if query_domains:
        reranked = [item for item in reranked if int(item["domain_score"]) > 0]
        if not reranked:
            logger.info("No in-domain legal chunks found for query: %s | domains=%s", query[:80], ",".join(query_domains))
            return []

    if query_terms:
        reranked = [item for item in reranked if int(item["overlap_score"]) > 0 or float(item["bm25_score"]) > 0]
        if not reranked:
            logger.info("No lexically relevant legal chunks found for query: %s", query[:80])
            return []

    reranked = _candidate_prefilter(query_terms, reranked, top_n=max(settings.rag_top_k * 6, 12))

    strict_terms = [term for term in query_terms if term in {"den bu", "boi thuong", "thu hoi dat", "tai dinh cu", "giai phong mat bang"}]
    if strict_terms:
        reranked = [
            item for item in reranked
            if _contains_any_term(strict_terms, str(item["text"]), str(item["source"]))
        ]
        if not reranked:
            logger.info("No strict legal chunks found for query: %s | strict_terms=%s", query[:80], ",".join(strict_terms))
            return []

    if any(term in query_terms for term in {"den bu", "boi thuong"}) and any(
        term in query_terms for term in {"quy hoach", "dat dai", "nha o", "thu hoi dat", "tai dinh cu"}
    ):
        land_comp_groups = [
            ["den bu", "boi thuong", "tai dinh cu", "giai phong mat bang", "thu hoi dat"],
            ["dat", "nha o", "quy hoach", "thu hoi dat", "tai dinh cu"],
        ]
        reranked = [
            item for item in reranked
            if _contains_all_term_groups(land_comp_groups, str(item["text"]), str(item["source"]))
        ]
        if not reranked:
            logger.info("No land-compensation legal chunks found for query: %s", query[:80])
            return []

    if _is_general_compensation_query(query_terms, query_domains):
        reranked = [
            item
            for item in reranked
            if _is_authoritative_compensation_source(str(item["text"]), str(item["source"]))
        ]
        if not reranked:
            logger.info("No authoritative compensation legal chunks found for query: %s", query[:80])
            return []

    selected: list[tuple[str, str]] = []
    seen_sources: set[str] = set()
    for item in reranked:
        source = str(item["source"])
        if source not in seen_sources or len(selected) + 1 >= settings.rag_top_k:
            selected.append((str(item["text"]), source))
            seen_sources.add(source)
        if len(selected) >= settings.rag_top_k:
            break

    logger.info(
        "RAG retrieved %s chunk(s) for query: %s | semantic=%s bm25=%s fetch_k=%s domains=%s",
        len(selected),
        query[:60],
        len(semantic_candidates),
        len(bm25_candidates),
        fetch_k,
        ",".join(query_domains) or "none",
    )
    return selected
