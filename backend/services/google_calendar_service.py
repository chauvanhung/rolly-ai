from __future__ import annotations

from calendar import monthrange
from datetime import UTC, date, datetime, timedelta
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, status
from jose import jwt
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.models.google_calendar_account import GoogleCalendarAccount
from backend.models.google_calendar_sync import GoogleCalendarSync
from backend.models.user import User
from backend.models.utility_bill import UtilityBill
from backend.schemas.planning import GoogleCalendarStatusResponse


class GoogleCalendarService:
    AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
    EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events"
    SCOPE = "openid email https://www.googleapis.com/auth/calendar.events"

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_status(self, current_user: User) -> GoogleCalendarStatusResponse:
        account = self._get_account(current_user.id)
        if not account:
            return GoogleCalendarStatusResponse(connected=False)
        return GoogleCalendarStatusResponse(
            connected=True,
            google_email=account.google_email,
            calendar_id=account.calendar_id,
        )

    def get_authorization_url(self, current_user: User, return_url: str | None) -> str:
        self._ensure_configured()
        target_return = return_url or settings.frontend_base_url
        state = jwt.encode(
            {"sub": str(current_user.id), "return_url": target_return, "iat": int(datetime.now(tz=UTC).timestamp())},
            settings.secret_key,
            algorithm=settings.algorithm,
        )
        params = {
            "client_id": settings.google_client_id,
            "redirect_uri": settings.google_calendar_redirect_uri,
            "response_type": "code",
            "scope": self.SCOPE,
            "access_type": "offline",
            "include_granted_scopes": "true",
            "prompt": "consent",
            "state": state,
        }
        return f"{self.AUTH_URL}?{urlencode(params)}"

    def handle_callback(self, code: str, state: str) -> str:
        self._ensure_configured()
        try:
            payload = jwt.decode(state, settings.secret_key, algorithms=[settings.algorithm])
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="State Google khong hop le.") from exc

        user_id = int(payload["sub"])
        return_url = payload.get("return_url") or settings.frontend_base_url

        token_data = self._exchange_code(code)
        profile = self._fetch_google_profile(token_data["access_token"])

        account = self._get_account(user_id)
        expires_in = int(token_data.get("expires_in", 3600))
        expires_at = datetime.now(tz=UTC) + timedelta(seconds=max(expires_in - 60, 60))

        if not account:
            account = GoogleCalendarAccount(
                user_id=user_id,
                google_email=profile.get("email"),
                access_token=token_data["access_token"],
                refresh_token=token_data.get("refresh_token"),
                token_type=token_data.get("token_type", "Bearer"),
                scope=token_data.get("scope"),
                expires_at=expires_at,
                calendar_id="primary",
            )
            self.db.add(account)
        else:
            account.google_email = profile.get("email") or account.google_email
            account.access_token = token_data["access_token"]
            account.refresh_token = token_data.get("refresh_token") or account.refresh_token
            account.token_type = token_data.get("token_type", account.token_type)
            account.scope = token_data.get("scope", account.scope)
            account.expires_at = expires_at

        self.db.commit()
        separator = "&" if "?" in return_url else "?"
        return f"{return_url}{separator}google_calendar=connected"

    def sync_utility_bill(self, current_user: User, bill: UtilityBill) -> GoogleCalendarSync:
        account = self._ensure_account(current_user.id)
        access_token = self._ensure_access_token(account)
        next_due = self._compute_next_due_date(bill)
        event_payload = self._build_event_payload(bill, next_due)

        sync = (
            self.db.query(GoogleCalendarSync)
            .filter(GoogleCalendarSync.user_id == current_user.id, GoogleCalendarSync.utility_bill_id == bill.id)
            .first()
        )

        headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
        calendar_id = account.calendar_id or "primary"

        if sync:
            url = f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events/{sync.event_id}"
            response = httpx.put(url, headers=headers, json=event_payload, timeout=20)
        else:
            url = self.EVENTS_URL.format(calendar_id=calendar_id)
            response = httpx.post(url, headers=headers, json=event_payload, timeout=20)

        if response.status_code >= 400:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Khong dong bo duoc len Google Calendar.")

        data = response.json()
        if not sync:
            sync = GoogleCalendarSync(user_id=current_user.id, utility_bill_id=bill.id, event_id=data["id"], event_link=data.get("htmlLink"))
            self.db.add(sync)
        else:
            sync.event_id = data["id"]
            sync.event_link = data.get("htmlLink")

        self.db.commit()
        self.db.refresh(sync)
        return sync

    def _build_event_payload(self, bill: UtilityBill, next_due: date) -> dict:
        amount_label = f"{int(bill.estimated_amount):,} VND".replace(",", ".") if bill.estimated_amount else "Chua co muc uoc tinh"
        description = "\n".join(
            [
                f"Nha cung cap: {bill.provider}",
                f"Ma khach hang: {bill.customer_code}",
                f"So tien uoc tinh: {amount_label}",
                f"Phuong thuc thanh toan uu tien: {bill.preferred_payment_method}",
                f"Ghi chu: {bill.note or 'Khong co'}",
            ]
        )
        return {
            "summary": f"Thanh toan {bill.provider}",
            "description": description,
            "start": {"date": next_due.isoformat()},
            "end": {"date": (next_due + timedelta(days=1)).isoformat()},
            "recurrence": [f"RRULE:FREQ=MONTHLY;BYMONTHDAY={bill.due_day}"],
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "popup", "minutes": 24 * 60},
                    {"method": "popup", "minutes": 3 * 60},
                ],
            },
        }

    def _compute_next_due_date(self, bill: UtilityBill) -> date:
        today = date.today()
        due_day = min(max(bill.due_day, 1), monthrange(today.year, today.month)[1])
        next_due = date(today.year, today.month, due_day)
        if next_due < today:
            if today.month == 12:
                year = today.year + 1
                month = 1
            else:
                year = today.year
                month = today.month + 1
            due_day = min(max(bill.due_day, 1), monthrange(year, month)[1])
            next_due = date(year, month, due_day)
        return next_due

    def _ensure_access_token(self, account: GoogleCalendarAccount) -> str:
        if account.expires_at and account.expires_at > datetime.now(tz=UTC) + timedelta(seconds=30):
            return account.access_token
        if not account.refresh_token:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tai khoan Google chua co refresh token.")

        response = httpx.post(
            self.TOKEN_URL,
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "refresh_token": account.refresh_token,
                "grant_type": "refresh_token",
            },
            timeout=20,
        )
        if response.status_code >= 400:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Khong lam moi duoc token Google.")
        token_data = response.json()
        account.access_token = token_data["access_token"]
        expires_in = int(token_data.get("expires_in", 3600))
        account.expires_at = datetime.now(tz=UTC) + timedelta(seconds=max(expires_in - 60, 60))
        self.db.commit()
        return account.access_token

    def _exchange_code(self, code: str) -> dict:
        response = httpx.post(
            self.TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_calendar_redirect_uri,
                "grant_type": "authorization_code",
            },
            timeout=20,
        )
        if response.status_code >= 400:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Khong doi duoc ma Google OAuth.")
        return response.json()

    def _fetch_google_profile(self, access_token: str) -> dict:
        response = httpx.get(self.USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"}, timeout=15)
        if response.status_code >= 400:
            return {}
        return response.json()

    def _ensure_configured(self) -> None:
        if not settings.google_client_id or not settings.google_client_secret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google Calendar chua duoc cau hinh. Hay them GOOGLE_CLIENT_ID va GOOGLE_CLIENT_SECRET.",
            )

    def _get_account(self, user_id: int) -> GoogleCalendarAccount | None:
        return self.db.query(GoogleCalendarAccount).filter(GoogleCalendarAccount.user_id == user_id).first()

    def _ensure_account(self, user_id: int) -> GoogleCalendarAccount:
        account = self._get_account(user_id)
        if not account:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ban chua ket noi Google Calendar.")
        return account
