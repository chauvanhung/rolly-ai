import logging
import threading
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from backend.api.admin import router as admin_router
from backend.api.ai import router as ai_router
from backend.api.auth import router as auth_router
from backend.api.data_links import router as data_links_router
from backend.api.family import router as family_router
from backend.api.lottery import PROVINCES, router as lottery_router
from backend.api.notifications import router as notifications_router
from backend.api.planning import router as planning_router
from backend.api.receipt import router as receipt_router
from backend.api.settings import router as settings_router
from backend.api.system_status import router as system_status_router
from backend.api.transaction import router as transaction_router
from backend.api.weather import router as weather_router
from backend.core.config import settings
from backend.db.base import Base
from backend.db.session import SessionLocal, engine
from backend.models.user import User
from backend.services.lottery_ticket_notification_service import LotteryTicketNotificationService
from backend.services.lottery_sync_service import LotterySyncService
from backend.services.push_notification_service import PushNotificationService

logger = logging.getLogger(__name__)
push_dispatch_thread: threading.Thread | None = None
push_dispatch_stop_event = threading.Event()
lottery_sync_thread: threading.Thread | None = None
lottery_sync_stop_event = threading.Event()
LOTTERY_SYNC_INTERVAL_SECONDS = 60
POSTGRES_SEQUENCE_TABLES = (
    "admin_audit_logs",
    "budgets",
    "category_rules",
    "debts",
    "families",
    "google_calendar_accounts",
    "google_calendar_syncs",
    "lottery_result_snapshots",
    "lottery_tickets",
    "push_notification_logs",
    "push_subscriptions",
    "reminders",
    "savings_goals",
    "transactions",
    "users",
    "utility_bills",
)


def ensure_user_role_column() -> None:
    inspector = inspect(engine)
    user_columns = {column["name"] for column in inspector.get_columns("users")}
    if "role" in user_columns:
        return
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'member'"))


def ensure_user_settings_columns() -> None:
    inspector = inspect(engine)
    user_columns = {column["name"] for column in inspector.get_columns("users")}
    statements: list[str] = []
    if "daily_reminder_enabled" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN daily_reminder_enabled BOOLEAN NOT NULL DEFAULT true")
    if "daily_reminder_hour" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN daily_reminder_hour INTEGER NOT NULL DEFAULT 20")
    if "admin_welcome_enabled" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN admin_welcome_enabled BOOLEAN NOT NULL DEFAULT true")
    if "budget_alert_enabled" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN budget_alert_enabled BOOLEAN NOT NULL DEFAULT true")
    if "browser_notification_enabled" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN browser_notification_enabled BOOLEAN NOT NULL DEFAULT false")
    if "lottery_notification_enabled" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN lottery_notification_enabled BOOLEAN NOT NULL DEFAULT true")
    if "weather_notification_enabled" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN weather_notification_enabled BOOLEAN NOT NULL DEFAULT false")
    if "weather_notification_hour" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN weather_notification_hour INTEGER NOT NULL DEFAULT 18")
    if "weather_rain_alert_enabled" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN weather_rain_alert_enabled BOOLEAN NOT NULL DEFAULT false")
    if "weather_location_name" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN weather_location_name VARCHAR(120) NULL")
    if "weather_timezone" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN weather_timezone VARCHAR(80) NULL")
    if "weather_latitude" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN weather_latitude VARCHAR(32) NULL")
    if "weather_longitude" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN weather_longitude VARCHAR(32) NULL")
    if "weather_work_location_name" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN weather_work_location_name VARCHAR(120) NULL")
    if "weather_work_timezone" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN weather_work_timezone VARCHAR(80) NULL")
    if "weather_work_latitude" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN weather_work_latitude VARCHAR(32) NULL")
    if "weather_work_longitude" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN weather_work_longitude VARCHAR(32) NULL")
    if "buddhist_notification_enabled" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN buddhist_notification_enabled BOOLEAN NOT NULL DEFAULT false")
    if "buddhist_notification_hour" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN buddhist_notification_hour INTEGER NOT NULL DEFAULT 7")
    if not statements:
        return
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def ensure_user_profile_columns() -> None:
    inspector = inspect(engine)
    user_columns = {column["name"] for column in inspector.get_columns("users")}
    statements: list[str] = []
    if "avatar_url" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(1024) NULL")
    if "background_url" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN background_url VARCHAR(1024) NULL")
    if not statements:
        return
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def ensure_user_security_columns() -> None:
    inspector = inspect(engine)
    user_columns = {column["name"] for column in inspector.get_columns("users")}
    statements: list[str] = []
    if "session_version" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0")
    if "password_reset_version" not in user_columns:
        statements.append("ALTER TABLE users ADD COLUMN password_reset_version INTEGER NOT NULL DEFAULT 0")
    if not statements:
        return
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def ensure_push_notification_log_columns() -> None:
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    if "push_notification_logs" not in table_names:
        return
    columns = {column["name"] for column in inspector.get_columns("push_notification_logs")}
    statements: list[str] = []
    if "title" not in columns:
        statements.append("ALTER TABLE push_notification_logs ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT ''")
    if "body" not in columns:
        statements.append("ALTER TABLE push_notification_logs ADD COLUMN body TEXT NULL")
    if "target_url" not in columns:
        statements.append("ALTER TABLE push_notification_logs ADD COLUMN target_url TEXT NULL")
    if "status" not in columns:
        statements.append("ALTER TABLE push_notification_logs ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'pending'")
    if "delivery_count" not in columns:
        statements.append("ALTER TABLE push_notification_logs ADD COLUMN delivery_count INTEGER NOT NULL DEFAULT 0")
    if "error_message" not in columns:
        statements.append("ALTER TABLE push_notification_logs ADD COLUMN error_message TEXT NULL")
    if "read_at" not in columns:
        statements.append("ALTER TABLE push_notification_logs ADD COLUMN read_at TIMESTAMP WITH TIME ZONE NULL")
    if not statements:
        return
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def ensure_push_subscription_columns() -> None:
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    if "push_subscriptions" not in table_names:
        return
    columns = {column["name"] for column in inspector.get_columns("push_subscriptions")}
    statements: list[str] = []
    if "app_scope" not in columns:
        statements.append("ALTER TABLE push_subscriptions ADD COLUMN app_scope VARCHAR(32) NOT NULL DEFAULT 'app'")
    if not statements:
        return
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def ensure_transaction_source_columns() -> None:
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    if "transactions" not in table_names:
        return
    columns = {column["name"] for column in inspector.get_columns("transactions")}
    statements: list[str] = []
    if "source_app" not in columns:
        statements.append("ALTER TABLE transactions ADD COLUMN source_app VARCHAR(50) NULL")
    if "source_id" not in columns:
        statements.append("ALTER TABLE transactions ADD COLUMN source_id VARCHAR(100) NULL")
    if "source_url" not in columns:
        statements.append("ALTER TABLE transactions ADD COLUMN source_url TEXT NULL")
    if not statements:
        return
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def ensure_lottery_ticket_columns() -> None:
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    if "lottery_tickets" not in table_names:
        return
    columns = {column["name"] for column in inspector.get_columns("lottery_tickets")}
    statements: list[str] = []
    if "payout_amount" not in columns:
        statements.append("ALTER TABLE lottery_tickets ADD COLUMN payout_amount NUMERIC(14, 2) NULL")
    if "payout_transaction_id" not in columns:
        statements.append("ALTER TABLE lottery_tickets ADD COLUMN payout_transaction_id INTEGER NULL")
    if "payout_received_at" not in columns:
        statements.append("ALTER TABLE lottery_tickets ADD COLUMN payout_received_at TIMESTAMP WITH TIME ZONE NULL")
    if not statements:
        return
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def ensure_reminder_lunar_columns() -> None:
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    if "reminders" not in table_names:
        return
    columns = {column["name"] for column in inspector.get_columns("reminders")}
    statements: list[str] = []
    if "calendar_type" not in columns:
        statements.append("ALTER TABLE reminders ADD COLUMN calendar_type VARCHAR(10) NOT NULL DEFAULT 'solar'")
    if "reminder_type" not in columns:
        statements.append("ALTER TABLE reminders ADD COLUMN reminder_type VARCHAR(20) NOT NULL DEFAULT 'task'")
    if "priority" not in columns:
        statements.append("ALTER TABLE reminders ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'normal'")
    if "lunar_day" not in columns:
        statements.append("ALTER TABLE reminders ADD COLUMN lunar_day INTEGER NULL")
    if "lunar_month" not in columns:
        statements.append("ALTER TABLE reminders ADD COLUMN lunar_month INTEGER NULL")
    if "lunar_leap" not in columns:
        statements.append("ALTER TABLE reminders ADD COLUMN lunar_leap BOOLEAN NOT NULL DEFAULT false")
    if "remind_before_days" not in columns:
        statements.append("ALTER TABLE reminders ADD COLUMN remind_before_days INTEGER NOT NULL DEFAULT 0")
    if "remind_offsets" not in columns:
        statements.append("ALTER TABLE reminders ADD COLUMN remind_offsets VARCHAR(120) NOT NULL DEFAULT '0'")
    if "remind_at_hour" not in columns:
        statements.append("ALTER TABLE reminders ADD COLUMN remind_at_hour INTEGER NOT NULL DEFAULT 9")
    if "remind_at_minute" not in columns:
        statements.append("ALTER TABLE reminders ADD COLUMN remind_at_minute INTEGER NOT NULL DEFAULT 0")
    if not statements:
        return
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def ensure_postgres_id_sequences() -> None:
    if engine.dialect.name != "postgresql":
        return
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    with engine.begin() as connection:
        for table_name in POSTGRES_SEQUENCE_TABLES:
            if table_name not in table_names:
                continue
            connection.execute(
                text(
                    f"""
                    SELECT setval(
                        pg_get_serial_sequence('{table_name}', 'id'),
                        COALESCE((SELECT MAX(id) FROM {table_name}), 1),
                        (SELECT MAX(id) IS NOT NULL FROM {table_name})
                    )
                    """
                )
            )


def bootstrap_admin_roles() -> None:
    bootstrap_emails = {email.strip().lower() for email in settings.admin_emails if email and email.strip()}
    if not bootstrap_emails:
        return
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.email.in_(bootstrap_emails)).all()
        for user in users:
            if user.role not in {"admin", "owner"}:
                user.role = "owner"
                db.add(user)
        db.commit()
    finally:
        db.close()


def dispatch_push_notifications_once() -> None:
    if not settings.web_push_enabled:
        return
    db = SessionLocal()
    try:
        PushNotificationService(db).dispatch_due_notifications()
    except Exception:
        logger.exception("Failed to dispatch web push notifications")
    finally:
        db.close()


def start_push_dispatcher() -> None:
    global push_dispatch_thread
    if push_dispatch_thread and push_dispatch_thread.is_alive():
        return
    if not settings.web_push_enabled:
        logger.info("Web push dispatcher skipped because VAPID keys are missing")
        return
    push_dispatch_stop_event.clear()

    def worker() -> None:
        dispatch_push_notifications_once()
        while not push_dispatch_stop_event.wait(settings.push_dispatch_interval_seconds):
            dispatch_push_notifications_once()

    push_dispatch_thread = threading.Thread(target=worker, name="push-dispatcher", daemon=True)
    push_dispatch_thread.start()


def stop_push_dispatcher() -> None:
    global push_dispatch_thread
    push_dispatch_stop_event.set()
    if push_dispatch_thread and push_dispatch_thread.is_alive():
        push_dispatch_thread.join(timeout=2)
    push_dispatch_thread = None


def sync_lottery_results_once() -> None:
    db = SessionLocal()
    try:
        LotterySyncService(db).sync_schedule(PROVINCES, lookback_days=2)
        LotteryTicketNotificationService(db).scan_recent_tickets(PROVINCES, lookback_days=7)
    except Exception:
        logger.exception("Failed to sync lottery results")
    finally:
        db.close()


def start_lottery_sync_dispatcher() -> None:
    global lottery_sync_thread
    if lottery_sync_thread and lottery_sync_thread.is_alive():
        return
    lottery_sync_stop_event.clear()

    def worker() -> None:
        sync_lottery_results_once()
        while not lottery_sync_stop_event.wait(LOTTERY_SYNC_INTERVAL_SECONDS):
            sync_lottery_results_once()

    lottery_sync_thread = threading.Thread(target=worker, name="lottery-sync-dispatcher", daemon=True)
    lottery_sync_thread.start()


def stop_lottery_sync_dispatcher() -> None:
    global lottery_sync_thread
    lottery_sync_stop_event.set()
    if lottery_sync_thread and lottery_sync_thread.is_alive():
        lottery_sync_thread.join(timeout=2)
    lottery_sync_thread = None


def create_application() -> FastAPI:
    allow_origin_regex = None
    if settings.allow_private_network_cors and settings.app_env.lower() not in {"production", "staging"}:
        allow_origin_regex = r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$"

    is_prod = settings.app_env.lower() in {"production", "staging", "prod"}
    app = FastAPI(
        title="Expense SaaS API",
        version="1.0.0",
        description="Production-ready SaaS API for personal and family expense management.",
        # Hide OpenAPI surface on production (reduces recon / admin path disclosure).
        docs_url=None if is_prod else "/docs",
        redoc_url=None if is_prod else "/redoc",
        openapi_url=None if is_prod else "/openapi.json",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=allow_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        max_age=86400,
    )

    @app.middleware("http")
    async def add_sensitive_cache_headers(request: Request, call_next) -> Response:
        response = await call_next(request)
        normalized_path = request.url.path.rstrip("/")
        sensitive_prefixes = (
            "/api/auth",
            "/api/admin",
            "/api/settings",
            "/api/notifications",
        )
        is_sensitive_route = normalized_path.startswith(sensitive_prefixes)
        has_session_cookie = "set-cookie" in {key.lower() for key in response.headers.keys()}
        if is_sensitive_route or has_session_cookie:
            response.headers["Cache-Control"] = "no-store, max-age=0"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response

    app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
    app.include_router(admin_router, prefix="/api", tags=["admin"])
    app.include_router(data_links_router, prefix="/api", tags=["data-links"])
    app.include_router(notifications_router, prefix="/api", tags=["notifications"])
    app.include_router(settings_router, prefix="/api", tags=["settings"])
    app.include_router(system_status_router, prefix="/api", tags=["system-status"])
    app.include_router(transaction_router, prefix="/api", tags=["transactions"])
    app.include_router(weather_router, prefix="/api", tags=["weather"])
    app.include_router(family_router, prefix="/api", tags=["family"])
    app.include_router(lottery_router, prefix="/api", tags=["lottery"])
    app.include_router(planning_router, prefix="/api", tags=["planning"])
    app.include_router(ai_router, prefix="/api", tags=["ai"])
    app.include_router(receipt_router, prefix="/api", tags=["receipt"])

    class _UploadStaticFiles(StaticFiles):
        async def get_response(self, path, scope):
            response = await super().get_response(path, scope)
            if response.status_code == 200:
                response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
                # Defense in depth against stored-XSS: never let the browser MIME-sniff an
                # uploaded file into an executable type, and force downloads instead of inline
                # rendering for anything that isn't an image.
                response.headers["X-Content-Type-Options"] = "nosniff"
                content_type = response.headers.get("content-type", "")
                if not content_type.startswith("image/"):
                    response.headers["Content-Disposition"] = "attachment"
            return response

    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    app.mount("/api/uploads", _UploadStaticFiles(directory=settings.upload_dir, check_dir=False), name="uploads")

    @app.on_event("startup")
    def on_startup() -> None:
        Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
        Base.metadata.create_all(bind=engine)
        ensure_user_role_column()
        ensure_user_settings_columns()
        ensure_user_profile_columns()
        ensure_user_security_columns()
        ensure_push_notification_log_columns()
        ensure_push_subscription_columns()
        ensure_transaction_source_columns()
        ensure_lottery_ticket_columns()
        ensure_reminder_lunar_columns()
        ensure_postgres_id_sequences()
        bootstrap_admin_roles()
        start_push_dispatcher()
        start_lottery_sync_dispatcher()

    @app.on_event("shutdown")
    def on_shutdown() -> None:
        stop_push_dispatcher()
        stop_lottery_sync_dispatcher()

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/api", include_in_schema=False, response_class=HTMLResponse)
    @app.get("/api/", include_in_schema=False, response_class=HTMLResponse)
    def api_index() -> str:
        return """
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Expense SaaS API</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f8fafc;
        --card: rgba(255, 255, 255, 0.96);
        --text: #0f172a;
        --muted: #475569;
        --line: rgba(148, 163, 184, 0.3);
        --accent: #0f766e;
        --accent-soft: rgba(15, 118, 110, 0.1);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Segoe UI", system-ui, sans-serif;
        background:
          radial-gradient(circle at top left, rgba(34, 197, 94, 0.12), transparent 28%),
          radial-gradient(circle at top right, rgba(6, 182, 212, 0.12), transparent 30%),
          var(--bg);
        color: var(--text);
      }
      .wrap {
        max-width: 900px;
        margin: 0 auto;
        padding: 32px 16px 48px;
      }
      .hero, .card {
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 28px;
        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
      }
      .hero {
        padding: 28px;
      }
      .eyebrow {
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.22em;
        font-size: 12px;
        font-weight: 700;
        color: var(--accent);
      }
      h1 {
        margin: 14px 0 12px;
        font-size: clamp(28px, 6vw, 44px);
        line-height: 1.05;
      }
      p {
        margin: 0;
        color: var(--muted);
        line-height: 1.7;
      }
      .actions, .grid {
        display: grid;
        gap: 14px;
      }
      .actions {
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        margin-top: 22px;
      }
      .grid {
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        margin-top: 18px;
      }
      a.button, .card a {
        text-decoration: none;
      }
      a.button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 48px;
        border-radius: 999px;
        padding: 0 18px;
        background: var(--text);
        color: white;
        font-weight: 700;
      }
      a.button.secondary {
        background: white;
        color: var(--text);
        border: 1px solid var(--line);
      }
      .card {
        padding: 22px;
      }
      .card h2 {
        margin: 0 0 10px;
        font-size: 18px;
      }
      ul {
        margin: 12px 0 0;
        padding-left: 18px;
        color: var(--muted);
      }
      li { margin: 8px 0; }
      code {
        padding: 2px 8px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="hero">
        <p class="eyebrow">Expense SaaS API</p>
        <h1>Trang API của hệ thống quản lý chi tiêu</h1>
        <p>
          Đây là cổng backend cho ứng dụng Expense SaaS. Bạn có thể dùng các link bên dưới để kiểm tra
          sức khỏe hệ thống, xem tài liệu OpenAPI hoặc gọi thẳng từng nhóm endpoint.
        </p>
        <div class="actions">
          <a class="button" href="/docs">Mở Swagger Docs</a>
          <a class="button secondary" href="/openapi.json">Xem OpenAPI JSON</a>
          <a class="button secondary" href="/health">Kiểm tra Health</a>
        </div>
      </section>

      <section class="grid">
        <article class="card">
          <h2>Xác thực và tài khoản</h2>
          <p>Dùng để đăng ký, đăng nhập, lấy thông tin phiên hiện tại và đăng nhập Google.</p>
          <ul>
            <li><code>/api/auth/register</code></li>
            <li><code>/api/auth/login</code></li>
            <li><code>/api/auth/me</code></li>
            <li><code>/api/auth/google/connect</code></li>
          </ul>
        </article>

        <article class="card">
          <h2>Ví gia đình và cài đặt</h2>
          <p>Tạo ví gia đình, tham gia bằng mã mời và lưu cài đặt theo từng tài khoản.</p>
          <ul>
            <li><code>/api/family</code></li>
            <li><code>/api/family/join</code></li>
            <li><code>/api/family/regenerate-invite</code></li>
            <li><code>/api/settings</code></li>
          </ul>
        </article>

        <article class="card">
          <h2>Xổ số theo tỉnh</h2>
          <p>Theo dõi lịch quay hôm nay, xem bảng kết quả theo tỉnh và mở realtime khi đến giờ mở thưởng.</p>
          <ul>
            <li><code>/api/lottery/provinces</code></li>
            <li><code>/api/lottery/today</code></li>
            <li><code>/api/lottery/results</code></li>
            <li><code>/api/lottery/live/{province_code}</code></li>
          </ul>
        </article>

        <article class="card">
          <h2>Giao dịch và phân tích</h2>
          <p>Nhóm endpoint chính cho giao dịch, tổng quan tài chính, kế hoạch và AI hỗ trợ nhập liệu.</p>
          <ul>
            <li><code>/api/transactions</code></li>
            <li><code>/api/summary</code></li>
            <li><code>/api/planning/budgets</code></li>
            <li><code>/api/ai</code></li>
          </ul>
        </article>

        <article class="card">
          <h2>Quản trị và OCR</h2>
          <p>Dành cho quản trị viên và các tính năng đọc hóa đơn.</p>
          <ul>
            <li><code>/api/admin/overview</code></li>
            <li><code>/api/admin/users/{id}/status</code></li>
            <li><code>/api/receipt/analyze</code></li>
          </ul>
        </article>
      </section>
    </main>
  </body>
</html>
        """

    return app


app = create_application()
