"""
Safe SQL execution pipeline.
"""
from __future__ import annotations

from typing import Any, Dict, List, Tuple

from app.core.config import settings
from app.core.logger import logger
from app.sql.db import get_db
from app.sql.generator import generate_sql
from app.sql.validator import SQLValidationError, validate_sql


async def run_nl_query(question: str) -> Tuple[str, List[Dict[str, Any]]]:
    sql = await generate_sql(question)
    try:
        validated_sql = validate_sql(sql)
    except SQLValidationError as exc:
        logger.warning("SQL validation failed: %s", exc)
        return str(exc), []

    return validated_sql, execute_sql(validated_sql)


def execute_sql(sql: str) -> List[Dict[str, Any]]:
    db = get_db()
    if not db.is_available:
        logger.warning("SQL Server is not available.")
        return []

    connection = db.get_connection()
    if connection is None:
        return []

    try:
        cursor = connection.cursor()
        logger.info("[SQL EXEC] %s", sql)
        cursor.execute(sql)
        if cursor.description is None:
            connection.rollback()
            return []

        columns = [col[0] for col in cursor.description]
        rows = cursor.fetchmany(settings.sql_result_limit)
        connection.rollback()
        return [_mask_row(dict(zip(columns, row))) for row in rows]
    except Exception as exc:
        logger.error("SQL execution error: %s", exc)
        try:
            connection.rollback()
        except Exception:
            pass
        return []


def _mask_row(row: Dict[str, Any]) -> Dict[str, Any]:
    return {column: _safe_value(column, value) for column, value in row.items()}


def _safe_value(column_name: str, value: Any) -> Any:
    if value is None:
        return None

    lowered = column_name.lower()
    text = str(value)

    if any(token in lowered for token in ("password", "pwd", "secret", "token")):
        return "***"

    if any(token in lowered for token in ("phone", "mobile", "sdt")) and len(text) >= 6:
        return f"{text[:3]}***{text[-2:]}"

    if "email" in lowered and "@" in text:
        local, domain = text.split("@", 1)
        return f"{local[:2]}***@{domain}"

    return value


def format_results_as_table(sql: str, rows: List[Dict[str, Any]]) -> str:
    if not rows:
        if sql.lower().startswith("select") or sql.lower().startswith("with"):
            return f"SQL đã sinh:\n```sql\n{sql}\n```\n\nKhông tìm thấy dữ liệu phù hợp."
        return f"Không thể tạo truy vấn hợp lệ.\n\nChi tiết: {sql}"

    columns = list(rows[0].keys())
    header = " | ".join(columns)
    separator = " | ".join("---" for _ in columns)

    lines = [
        "SQL đã thực thi:",
        f"```sql\n{sql}\n```",
        f"Tìm thấy {len(rows)} dòng.",
        "",
        f"| {header} |",
        f"| {separator} |",
    ]
    for row in rows[:20]:
        values = [str(row.get(col, "")) for col in columns]
        lines.append(f"| {' | '.join(values)} |")

    if len(rows) > 20:
        lines.append(f"... và {len(rows) - 20} dòng khác.")

    return "\n".join(lines)
