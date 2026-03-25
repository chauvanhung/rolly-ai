"""
Read-only SQL validator for SQL Server queries.
"""
from __future__ import annotations

import re

from app.core.logger import logger

BLOCKED_KEYWORDS = [
    "DELETE",
    "UPDATE",
    "INSERT",
    "DROP",
    "ALTER",
    "CREATE",
    "TRUNCATE",
    "EXEC",
    "EXECUTE",
    "MERGE",
    "GRANT",
    "REVOKE",
    "DENY",
    "BACKUP",
    "RESTORE",
    "BULK",
    "OPENROWSET",
    "OPENDATASOURCE",
    "INTO",
    "XP_",
    "SP_",
]


class SQLValidationError(Exception):
    pass


def validate_sql(sql: str) -> str:
    if not sql or not sql.strip():
        raise SQLValidationError("Cau lenh SQL trong.")

    sql = _strip_comments(sql).strip()
    sql = sql.rstrip(";").strip()

    if not sql:
        raise SQLValidationError("Cau lenh SQL trong sau khi bo comment.")

    if ";" in sql:
        raise SQLValidationError("Chi cho phep mot cau lenh SELECT duy nhat.")

    first_word = sql.split()[0].upper()
    if first_word not in {"SELECT", "WITH"}:
        raise SQLValidationError(f"Chi cho phep SELECT/WITH. Cau lenh hien tai bat dau bang '{first_word}'.")

    upper_sql = f" {sql.upper()} "
    for keyword in BLOCKED_KEYWORDS:
        pattern = rf"(?<![\w]){re.escape(keyword)}(?![\w])"
        if re.search(pattern, upper_sql):
            raise SQLValidationError(f"Cau lenh SQL chua tu khoa bi cam: {keyword}.")

    if len(sql) > 4000:
        raise SQLValidationError("Cau lenh SQL qua dai.")

    logger.info("SQL validated: %s", sql[:200])
    return sql + ";"


def _strip_comments(sql: str) -> str:
    sql = re.sub(r"--[^\n]*", "", sql)
    sql = re.sub(r"/\*.*?\*/", "", sql, flags=re.DOTALL)
    return sql
