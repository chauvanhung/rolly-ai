"""Reproduce media upload for mp3."""
from __future__ import annotations

import pathlib
import urllib.error
import urllib.request

from app.core.db import SessionLocal
from app.core.security import create_access_token
from app.models import User


def main() -> None:
    db = SessionLocal()
    u = db.query(User).filter(User.email == "admin@phatgiao.rollyhub.com").first()
    if not u:
        u = db.query(User).filter(User.is_super_admin.is_(True)).first()
    print("user", u.email if u else None, "super", bool(u and u.is_super_admin))
    token = create_access_token(str(u.id), {"email": u.email})
    db.close()

    p = pathlib.Path("/tmp/test-upload.mp3")
    p.write_bytes(b"ID3\x03\x00\x00\x00\x00\x00\x00" + b"\x00" * 8000)
    print("file_size", p.stat().st_size)

    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    body = b""
    body += f"--{boundary}\r\n".encode()
    body += b'Content-Disposition: form-data; name="file"; filename="test-upload.mp3"\r\n'
    body += b"Content-Type: audio/mpeg\r\n\r\n"
    body += p.read_bytes()
    body += f"\r\n--{boundary}--\r\n".encode()

    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/v1/media_assets/upload",
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print("status", r.status)
            print(r.read().decode()[:800])
    except urllib.error.HTTPError as e:
        print("http_err", e.code)
        print(e.read().decode()[:800])
    except Exception as e:  # noqa: BLE001
        print("err", type(e), e)


if __name__ == "__main__":
    main()
