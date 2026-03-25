"""
Scheduled jobs for reporting and anomaly detection.
"""
from __future__ import annotations

import asyncio
from datetime import datetime

from app.core.logger import logger
from app.sql.executor import execute_sql
from app.sql.validator import validate_sql
from app.tools.telegram import send_telegram_message


async def daily_report_job() -> str:
    now = datetime.now().strftime("%d/%m/%Y %H:%M")
    logger.info("Running daily report job at %s", now)

    sections = [f"Báo cáo hằng ngày - {now}"]
    queries = [
        (
            "Doanh thu hôm nay",
            "SELECT ISNULL(SUM(total_amount), 0) AS doanh_thu FROM orders WHERE CAST(order_date AS DATE) = CAST(GETDATE() AS DATE);",
        ),
        (
            "Số đơn hôm nay",
            "SELECT COUNT(*) AS so_don FROM orders WHERE CAST(order_date AS DATE) = CAST(GETDATE() AS DATE);",
        ),
        (
            "Sản phẩm sắp hết",
            "SELECT COUNT(*) AS sap_het FROM products WHERE stock_quantity < 10;",
        ),
    ]

    for label, raw_sql in queries:
        rows = execute_sql(validate_sql(raw_sql))
        value = next(iter(rows[0].values()), 0) if rows else 0
        sections.append(f"- {label}: {value}")

    report = "\n".join(sections)
    await send_telegram_message(report)
    return report


async def anomaly_detection_job() -> str:
    logger.info("Running anomaly detection job")
    sql = validate_sql(
        "SELECT COUNT(*) AS pending_count FROM orders WHERE status = 'pending' AND order_date < DATEADD(HOUR, -24, GETDATE());"
    )
    rows = execute_sql(sql)
    pending_count = int(rows[0].get("pending_count", 0)) if rows else 0
    if pending_count > 10:
        message = (
            "Cảnh báo dữ liệu bất thường\n"
            f"- Số đơn pending quá 24h: {pending_count}"
        )
        await send_telegram_message(message)
        return message
    return "Không phát hiện bất thường."


def _run_async_job(coro):
    asyncio.run(coro)


def sync_daily_report() -> None:
    _run_async_job(daily_report_job())


def sync_anomaly_detection() -> None:
    _run_async_job(anomaly_detection_job())
