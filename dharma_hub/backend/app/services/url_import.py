"""Fetch & extract sutra-like HTML from public URLs for ReadingView import.

Security: block private/local IPs (SSRF), limit size/time, strip scripts.
"""
from __future__ import annotations

import ipaddress
import re
import socket
from html import escape
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; DharmaHubImport/1.0; +local educational)",
    "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "vi,en;q=0.8",
}

MAX_BYTES = 4 * 1024 * 1024  # 4MB
TIMEOUT = 25

# Domains commonly used for Vietnamese Buddhist texts (optional soft preference)
KNOWN_HINTS = (
    "budsas",
    "suttacentral",
    "thuvienhoasen",
    "rongmotamhon",
    "phatgiao",
    "daophatngaynay",
    "quangduc",
    "buddhism",
    "dhamma",
    "tipitaka",
)


class UrlImportError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def _host_is_blocked(hostname: str) -> bool:
    host = (hostname or "").strip().lower().rstrip(".")
    if not host:
        return True
    if host in {"localhost", "localhost.localdomain"}:
        return True
    # Resolve all addresses
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as exc:
        raise UrlImportError(f"Không resolve được domain: {host}") from exc
    for info in infos:
        ip_str = info[4][0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            continue
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            return True
    return False


def _validate_url(url: str) -> str:
    raw = (url or "").strip()
    if not raw:
        raise UrlImportError("Thiếu URL.")
    if len(raw) > 2000:
        raise UrlImportError("URL quá dài.")
    parsed = urlparse(raw)
    if parsed.scheme not in {"http", "https"}:
        raise UrlImportError("Chỉ hỗ trợ URL http/https.")
    if not parsed.netloc:
        raise UrlImportError("URL không hợp lệ.")
    if _host_is_blocked(parsed.hostname or ""):
        raise UrlImportError("Không cho phép URL nội bộ / private IP (chống SSRF).")
    return raw


def _looks_like_html(content_type: str, sample: bytes) -> bool:
    ct = (content_type or "").lower()
    if "html" in ct or "xml" in ct or "text/plain" in ct:
        return True
    head = sample[:200].lower()
    return b"<html" in head or b"<!doctype" in head or b"<body" in head


def _clean_html_fragment(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript", "iframe", "form", "nav", "header", "footer", "aside"]):
        tag.decompose()
    # Keep only safe-ish tags
    allowed = {
        "p",
        "br",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "blockquote",
        "ul",
        "ol",
        "li",
        "strong",
        "b",
        "em",
        "i",
        "u",
        "span",
        "div",
        "hr",
        "a",
    }
    for el in soup.find_all(True):
        if el.name not in allowed:
            el.unwrap()
            continue
        # strip attrs except href on anchors
        attrs = dict(el.attrs)
        el.attrs = {}
        if el.name == "a" and attrs.get("href"):
            href = str(attrs["href"])
            if href.startswith("http://") or href.startswith("https://") or href.startswith("/"):
                el["href"] = href
                el["rel"] = "noopener noreferrer"
                el["target"] = "_blank"
    body = soup.body or soup
    text = body.decode_contents() if hasattr(body, "decode_contents") else str(body)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _extract_main(soup: BeautifulSoup) -> tuple[str, str]:
    """Return (title, html_body)."""
    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip()
    h1 = soup.find("h1")
    if h1 and h1.get_text(strip=True):
        title = h1.get_text(" ", strip=True) or title

    candidates = []
    for sel in (
        "article",
        "main",
        "#content",
        "#main",
        ".content",
        ".post-content",
        ".entry-content",
        ".sutta",
        ".text",
        "#bodytext",
        ".main-content",
    ):
        for node in soup.select(sel):
            txt = node.get_text(" ", strip=True)
            if len(txt) > 200:
                candidates.append((len(txt), node))

    if candidates:
        candidates.sort(key=lambda x: x[0], reverse=True)
        node = candidates[0][1]
    else:
        # Fall back: longest div
        best = None
        best_len = 0
        for div in soup.find_all(["div", "section", "td"]):
            txt = div.get_text(" ", strip=True)
            if len(txt) > best_len:
                best_len = len(txt)
                best = div
        node = best or soup.body or soup

    # Remove nav-like children inside node
    for bad in node.find_all(["nav", "aside", "form", "script", "style"]):
        bad.decompose()

    html = _clean_html_fragment(str(node))
    plain = BeautifulSoup(html, "lxml").get_text(" ", strip=True)
    if len(plain) < 80:
        raise UrlImportError("Trang không có đủ nội dung văn bản để import (có thể là SPA / chặn bot).")

    # Reading minutes rough: ~200 words/min Vietnamese chars
    return title[:300] or "Kinh import", html


def fetch_and_extract(url: str) -> dict:
    """
    Returns dict:
      title, body_html, source_url, plain_length, reading_minutes, host
    """
    safe_url = _validate_url(url)
    final_url = safe_url
    # SECURITY: do NOT let requests auto-follow redirects. Otherwise a public URL could 302 to
    # http://169.254.169.254/ (or localhost) and the connection is made BEFORE any post-hoc host
    # check. We follow each hop manually and re-validate the host (incl. fresh DNS resolution)
    # before every request, closing the redirect-based SSRF and shrinking the DNS-rebind window.
    session = requests.Session()
    current_url = safe_url
    try:
        res = None
        for _hop in range(6):
            _validate_url(current_url)
            res = session.get(
                current_url,
                headers=HEADERS,
                timeout=TIMEOUT,
                stream=True,
                allow_redirects=False,
            )
            if res.is_redirect or res.is_permanent_redirect:
                location = res.headers.get("Location", "")
                res.close()
                if not location:
                    raise UrlImportError("Redirect không hợp lệ.")
                current_url = requests.compat.urljoin(current_url, location)
                continue
            break
        else:
            raise UrlImportError("Quá nhiều lần chuyển hướng.")

        with res:
            final_url = res.url or current_url
            _validate_url(final_url)
            res.raise_for_status()
            content_type = res.headers.get("Content-Type", "")
            chunks = []
            total = 0
            for chunk in res.iter_content(chunk_size=64 * 1024):
                if not chunk:
                    continue
                total += len(chunk)
                if total > MAX_BYTES:
                    raise UrlImportError("Trang quá lớn (>4MB), không import.")
                chunks.append(chunk)
            raw = b"".join(chunks)
    except UrlImportError:
        raise
    except requests.HTTPError as exc:
        code = exc.response.status_code if exc.response is not None else "?"
        raise UrlImportError(f"Tải URL thất bại (HTTP {code}).") from exc
    except requests.RequestException as exc:
        raise UrlImportError(f"Không kết nối được URL: {exc}") from exc
    finally:
        session.close()

    if not _looks_like_html(content_type, raw):
        # Plain text fallback
        try:
            text = raw.decode("utf-8", errors="replace")
        except Exception as exc:  # noqa: BLE001
            raise UrlImportError("Không đọc được nội dung trang.") from exc
        if len(text.strip()) < 80:
            raise UrlImportError("Nội dung quá ngắn hoặc không phải HTML/text.")
        paras = "".join(f"<p>{escape(p.strip())}</p>" for p in re.split(r"\n\s*\n", text) if p.strip())
        host = urlparse(final_url).netloc
        return {
            "title": "Kinh import (text)",
            "body_html": paras,
            "source_url": final_url,
            "plain_length": len(text.strip()),
            "reading_minutes": max(1, len(text.strip()) // 900),
            "host": host,
            "known_source": any(h in host.lower() for h in KNOWN_HINTS),
        }

    # Decode
    encoding = "utf-8"
    try:
        import charset_normalizer  # optional

        det = charset_normalizer.from_bytes(raw).best()
        if det:
            encoding = det.encoding or "utf-8"
    except Exception:  # noqa: BLE001
        # requests-style guess from headers
        m = re.search(r"charset=([\w-]+)", content_type, re.I)
        if m:
            encoding = m.group(1)
    html = raw.decode(encoding, errors="replace")
    soup = BeautifulSoup(html, "lxml")
    title, body_html = _extract_main(soup)
    plain = BeautifulSoup(body_html, "lxml").get_text(" ", strip=True)
    host = urlparse(final_url).netloc
    return {
        "title": title,
        "body_html": body_html,
        "source_url": final_url,
        "plain_length": len(plain),
        "reading_minutes": max(1, min(240, len(plain) // 900)),
        "host": host,
        "known_source": any(h in host.lower() for h in KNOWN_HINTS),
    }
