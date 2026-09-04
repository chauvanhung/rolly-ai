from __future__ import annotations

import os
import sqlite3
import urllib.parse
from functools import wraps
from pathlib import Path
from typing import Callable, TypeVar

import requests
from flask import redirect, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

F = TypeVar("F", bound=Callable)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


ADMIN_EMAIL = "chauvanhung1999@gmail.com"


def init_auth_db(db_path: Path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path, timeout=30.0) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT,
                full_name TEXT,
                avatar_url TEXT,
                google_id TEXT,
                role TEXT DEFAULT 'user',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        # Ensure new columns exist if table was previously created with old schema
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(users)")
        cols = [c[1] for c in cursor.fetchall()]
        if "full_name" not in cols:
            conn.execute("ALTER TABLE users ADD COLUMN full_name TEXT")
        if "avatar_url" not in cols:
            conn.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT")
        if "google_id" not in cols:
            conn.execute("ALTER TABLE users ADD COLUMN google_id TEXT")
        if "role" not in cols:
            conn.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'")

        # Ensure chauvanhung1999@gmail.com is set to admin role
        conn.execute(
            "UPDATE users SET role = 'admin' WHERE email = ?",
            (ADMIN_EMAIL,),
        )


def create_user(db_path: Path, email: str, password: str, full_name: str = "", role: str = "user") -> tuple[bool, str]:
    email = email.strip().lower()
    if not email or "@" not in email:
        return False, "Email không hợp lệ."
    if len(password) < 6:
        return False, "Mật khẩu tối thiểu 6 ký tự."
    display_name = full_name.strip() or email.split("@")[0].capitalize()
    if email == ADMIN_EMAIL:
        role = "admin"
    try:
        with sqlite3.connect(db_path, timeout=30.0) as conn:
            conn.execute(
                "INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)",
                (email, generate_password_hash(password), display_name, role),
            )
        return True, "Tạo tài khoản thành công."
    except sqlite3.IntegrityError:
        return False, "Email này đã được đăng ký."


def count_users(db_path: Path) -> int:
    with sqlite3.connect(db_path, timeout=30.0) as conn:
        return int(conn.execute("SELECT COUNT(*) FROM users").fetchone()[0])


def authenticate_user(db_path: Path, email: str, password: str) -> dict | None:
    email = email.strip().lower()
    with sqlite3.connect(db_path, timeout=30.0) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT id, email, password_hash, full_name, avatar_url, role FROM users WHERE email = ?",
            (email,),
        ).fetchone()
    if not row or not row["password_hash"] or not check_password_hash(row["password_hash"], password):
        return None
    user_email = row["email"]
    is_admin = (user_email.lower() == ADMIN_EMAIL) or (row["role"] == "admin")
    return {
        "id": row["id"],
        "email": user_email,
        "full_name": row["full_name"] or user_email.split("@")[0],
        "avatar_url": row["avatar_url"] or "",
        "role": "admin" if is_admin else (row["role"] or "user"),
        "is_admin": is_admin,
    }


def get_user_by_id(db_path: Path, user_id: int) -> dict | None:
    with sqlite3.connect(db_path, timeout=30.0) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT id, email, full_name, avatar_url, role FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    if not row:
        return None
    user_email = row["email"]
    is_admin = (user_email.lower() == ADMIN_EMAIL) or (row["role"] == "admin")
    return {
        "id": row["id"],
        "email": user_email,
        "full_name": row["full_name"] or user_email.split("@")[0],
        "avatar_url": row["avatar_url"] or "",
        "role": "admin" if is_admin else (row["role"] or "user"),
        "is_admin": is_admin,
    }


def list_users(db_path: Path) -> list[dict]:
    with sqlite3.connect(db_path, timeout=30.0) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT id, email, full_name, avatar_url, google_id, password_hash, role, created_at
            FROM users
            ORDER BY created_at DESC, id DESC
            """
        ).fetchall()
    return [
        {
            "id": row["id"],
            "email": row["email"],
            "full_name": row["full_name"] or row["email"].split("@")[0],
            "avatar_url": row["avatar_url"] or "",
            "google_id": row["google_id"] or "",
            "has_password": bool(row["password_hash"]),
            "role": "admin" if (row["email"].lower() == ADMIN_EMAIL or row["role"] == "admin") else (row["role"] or "user"),
            "is_admin": (row["email"].lower() == ADMIN_EMAIL or row["role"] == "admin"),
            "created_at": row["created_at"],
        }
        for row in rows
    ]


def admin_reset_password(db_path: Path, user_id: int, new_password: str) -> tuple[bool, str]:
    if len(new_password) < 6:
        return False, "Mật khẩu mới tối thiểu 6 ký tự."
    with sqlite3.connect(db_path, timeout=30.0) as conn:
        cursor = conn.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (generate_password_hash(new_password), user_id),
        )
        if cursor.rowcount == 0:
            return False, "Không tìm thấy người dùng."
    return True, "Cập nhật mật khẩu mới thành công."


def delete_user(db_path: Path, user_id: int, current_admin_id: int | None = None) -> tuple[bool, str]:
    if current_admin_id and user_id == current_admin_id:
        return False, "Không thể xóa chính tài khoản admin đang đăng nhập."
    with sqlite3.connect(db_path, timeout=30.0) as conn:
        conn.row_factory = sqlite3.Row
        target = conn.execute("SELECT email FROM users WHERE id = ?", (user_id,)).fetchone()
        if not target:
            return False, "Tài khoản không tồn tại."
        if target["email"].lower() == ADMIN_EMAIL:
            return False, "Không thể xóa tài khoản Admin tối cao (chauvanhung1999@gmail.com)."
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    return True, "Đã xóa tài khoản thành công."


def get_or_create_google_user(
    db_path: Path, google_id: str, email: str, full_name: str = "", avatar_url: str = ""
) -> dict:
    email = email.strip().lower()
    display_name = full_name.strip() or email.split("@")[0].capitalize()
    role = "admin" if email == ADMIN_EMAIL else "user"

    with sqlite3.connect(db_path, timeout=30.0) as conn:
        conn.row_factory = sqlite3.Row
        # Check by google_id or email
        row = conn.execute(
            "SELECT id, email, full_name, avatar_url, role FROM users WHERE google_id = ? OR email = ?",
            (google_id, email),
        ).fetchone()

        if row:
            user_id = row["id"]
            conn.execute(
                "UPDATE users SET google_id = ?, full_name = COALESCE(NULLIF(?, ''), full_name), avatar_url = COALESCE(NULLIF(?, ''), avatar_url), role = CASE WHEN email = ? THEN 'admin' ELSE role END WHERE id = ?",
                (google_id, display_name, avatar_url, ADMIN_EMAIL, user_id),
            )
            is_admin = (email == ADMIN_EMAIL) or (row["role"] == "admin")
        else:
            cursor = conn.execute(
                "INSERT INTO users (email, password_hash, full_name, avatar_url, google_id, role) VALUES (?, ?, ?, ?, ?, ?)",
                (email, "", display_name, avatar_url, google_id, role),
            )
            user_id = cursor.lastrowid
            is_admin = (email == ADMIN_EMAIL) or (role == "admin")

        return {
            "id": user_id,
            "email": email,
            "full_name": display_name,
            "avatar_url": avatar_url,
            "role": "admin" if is_admin else "user",
            "is_admin": is_admin,
        }


def get_google_auth_url(client_id: str, redirect_uri: str, state: str = "") -> str:
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "prompt": "select_account",
    }
    if state:
        params["state"] = state
    return f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"


def exchange_google_code_and_get_user(
    db_path: Path, client_id: str, client_secret: str, code: str, redirect_uri: str
) -> tuple[dict | None, str]:
    try:
        token_res = requests.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
            timeout=10,
        )
        if token_res.status_code != 200:
            return None, f"Lỗi xác thực Google token (Code {token_res.status_code})."

        token_data = token_res.json()
        access_token = token_data.get("access_token")
        if not access_token:
            return None, "Không nhận được access token từ Google."

        userinfo_res = requests.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        if userinfo_res.status_code != 200:
            return None, "Không thể lấy thông tin tài khoản Google."

        profile = userinfo_res.json()
        google_id = profile.get("id") or profile.get("sub")
        email = profile.get("email")
        full_name = profile.get("name") or profile.get("given_name") or ""
        avatar_url = profile.get("picture") or ""

        if not email or not google_id:
            return None, "Tài khoản Google không trả về Email hợp lệ."

        user_dict = get_or_create_google_user(
            db_path=db_path,
            google_id=str(google_id),
            email=email,
            full_name=full_name,
            avatar_url=avatar_url,
        )
        return user_dict, "Đăng nhập Google thành công."
    except Exception as e:
        return None, f"Lỗi kết nối Google OAuth: {str(e)}"


def verify_google_id_token_and_get_user(
    db_path: Path, client_id: str, id_token: str
) -> tuple[dict | None, str]:
    try:
        res = requests.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}",
            timeout=10,
        )
        if res.status_code != 200:
            return None, "Google ID Token không hợp lệ hoặc đã hết hạn."

        payload = res.json()
        aud = payload.get("aud")
        if client_id and aud != client_id:
            return None, "Client ID trong Google Token không trùng khớp."

        email = payload.get("email")
        google_id = payload.get("sub") or payload.get("id")
        full_name = payload.get("name") or payload.get("given_name") or ""
        avatar_url = payload.get("picture") or ""

        if not email or not google_id:
            return None, "Tài khoản Google không cung cấp Email hợp lệ."

        user_dict = get_or_create_google_user(
            db_path=db_path,
            google_id=str(google_id),
            email=email,
            full_name=full_name,
            avatar_url=avatar_url,
        )
        return user_dict, "Đăng nhập Google thành công."
    except Exception as e:
        return None, f"Lỗi xác thực Google ID Token: {str(e)}"


def login_required(view: F) -> F:
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("user_id"):
            return redirect(url_for("login_page"))
        return view(*args, **kwargs)

    return wrapped  # type: ignore[return-value]


def admin_required(view: F) -> F:
    @wraps(view)
    def wrapped(*args, **kwargs):
        user_id = session.get("user_id")
        if not user_id:
            return redirect(url_for("login_page", error="Vui lòng đăng nhập để tiếp tục."))
        user_role = session.get("role")
        user_email = (session.get("user_email") or session.get("email") or "").strip().lower()
        is_admin = session.get("is_admin")
        if not is_admin and user_role != "admin" and user_email != ADMIN_EMAIL:
            return redirect(url_for("index", error="Quyền truy cập bị từ chối. Tính năng này chỉ dành cho Admin."))
        return view(*args, **kwargs)

    return wrapped  # type: ignore[return-value]


