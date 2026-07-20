"""Polish local sutra_texts/*.txt before DB import."""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
OUT = Path(__file__).resolve().parents[1] / "data" / "sutra_texts"

DROP_LINE = [
    r"^\s*Tag\s*$",
    r"^\s*Tags?\s*$",
    r"^\s*\d+\s*Views?\s*$",
    r"^\s*Kinh Tạng\s*$",
    r"^\s*Bộ Kinh Tập\s*$",
    r"^\s*Bộ Hoa Nghiêm\s*$",
    r"^\s*Bộ Đại Tập\s*$",
    r"^\s*Kinh Điển Đại Thừa\s*$",
    r"^\s*Thần Chú\s*$",
    r"^\s*Hướng Dẫn Tụng.*$",
    r"^\s*Bài viết liên quan\s*$",
    r"^\s*Trung Nguyễn\s*$",
    r"^\s*Tháng\s+\d+.*\d{4}\s*$",
    r"^\s*>>\s*DỮ LIỆU.*$",
    r"^\s*STK:.*$",
    r"^\s*Ngân hàng.*$",
    r"^\s*Nội dung:\s*Họ tên.*$",
    r"^\s*Đoàn Trung Còn\s*$",
    r"^\s*Nguyễn Minh Tiến\s*$",
    r"^\s*HT Thích Trí Quang\s*$",
    r"^\s*Thích Trí Tịnh\s*$",
    r"^\s*Kinh Điển\s*$",
]
DROP_RE = [re.compile(p, re.I) for p in DROP_LINE]

START = [
    re.compile(r"(?im)^(KINH\s+.+)"),
    re.compile(r"(?im)^(Như vầy tôi nghe)"),
    re.compile(r"(?im)^(Như thị ngã văn)"),
    re.compile(r"(?im)^(Ta nghe như vầy)"),
    re.compile(r"(?im)^(QUYỂN\s+\d+)"),
    re.compile(r"(?im)^(Phẩm\s+\d+)"),
    re.compile(r"(?im)^(Đại Phật Đảnh)"),
    re.compile(r"(?im)^(ĐẠI PHƯƠNG QUẢNG)"),
    re.compile(r"(?im)^(Nghi thức)"),
    re.compile(r"(?im)^(CHÚ\s+)"),
    re.compile(r"(?im)^(NAM MÔ)"),
]


def polish(text: str) -> str:
    body, attr = text, ""
    m = re.search(r"\n*-{2,}\s*\n\s*Nguồn:[\s\S]*$", text)
    if m:
        body, attr = text[: m.start()].rstrip(), text[m.start() :].strip()

    body = re.sub(r"(?is)STK\s*:\s*[\d\s.]+.{0,80}?Ngân hàng.{0,160}", "", body)
    body = re.sub(r"(?im)^>>\s*DỮ LIỆU.*$", "", body)

    lines = []
    for ln in body.replace("\r", "\n").split("\n"):
        s = ln.strip()
        if not s:
            if lines and lines[-1] != "":
                lines.append("")
            continue
        if any(rx.search(s) for rx in DROP_RE):
            continue
        if re.fullmatch(r"(?:\d{1,3}\s+){6,}\d{1,3}", s):
            continue
        lines.append(s)
    body = "\n".join(lines)
    body = re.sub(r"\n{3,}", "\n\n", body).strip()

    # chop leading site intro if markers found early
    head = body[:1200]
    if re.search(r"Tag|Views|Kinh Tạng|Kinh Điển", head, re.I):
        best = None
        for rx in START:
            m = rx.search(body)
            if m and m.start() < 1800 and (best is None or m.start() < best):
                best = m.start()
        if best and best > 30:
            body = body[best:].strip()

    # drop trailing related-link section if present
    body = re.split(r"(?im)\n(?:Bài viết liên quan|Related posts?|Xem thêm)\n", body)[0].strip()

    if attr:
        src = re.search(r"Nguồn:\s*(.+)", attr)
        body += f"\n\n---\nNguồn: {src.group(1).strip()}" if src else f"\n\n{attr}"
    return body.strip()


def main():
    for p in sorted(OUT.glob("*.txt")):
        old = p.read_text(encoding="utf-8")
        new = polish(old)
        p.write_text(new, encoding="utf-8")
        print(f"{p.name}: {len(old)} -> {len(new)} (delta {len(old)-len(new)})")


if __name__ == "__main__":
    main()
