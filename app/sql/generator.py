"""
Vietnamese natural-language to SQL generation.
"""
from __future__ import annotations

import re
import unicodedata

from app.core.logger import logger
from app.core.ollama_client import get_ollama_client
from app.sql.schema import get_schema_context

SQL_GENERATION_PROMPT_TEMPLATE = """Ban la chuyen gia SQL Server.
Hay chuyen cau hoi tieng Viet thanh mot cau SQL doc du lieu an toan.

Quy tac:
- Chi duoc tao SELECT hoac WITH ... SELECT
- Khong duoc tao INSERT, UPDATE, DELETE, DROP, ALTER, CREATE
- Neu khong du thong tin, tra ve: SELECT 'Khong the tao truy van phu hop' AS message
- Chi tra ve SQL thuan tuy, khong markdown, khong giai thich
- Neu can gioi han ket qua, uu tien TOP 50

Schema:
{schema}

Cau hoi:
{question}

SQL:"""


async def generate_sql(question: str) -> str:
    prompt = SQL_GENERATION_PROMPT_TEMPLATE.format(
        schema=get_schema_context(),
        question=question.strip(),
    )
    logger.info("Generating SQL for: %s", question[:120])

    raw_output = await get_ollama_client().generate(prompt)
    sql = _extract_sql(raw_output)
    if not sql:
        sql = _fallback_sql(question)

    logger.info("Generated SQL: %s", sql[:200])
    return sql


def _extract_sql(text: str) -> str:
    cleaned = re.sub(r"```(?:sql)?", "", text or "", flags=re.IGNORECASE).replace("```", "").strip()
    match = re.search(r"((?:SELECT|WITH)\s.+?)(?:;|$)", cleaned, re.IGNORECASE | re.DOTALL)
    if not match:
        return ""

    sql = re.sub(r"\s+", " ", match.group(1)).strip()
    return sql + (";" if not sql.endswith(";") else "")


def _fallback_sql(question: str) -> str:
    normalized = _normalize(question)

    if "ton kho" in normalized or "hang ton" in normalized:
        return (
            "SELECT TOP 50 product_id, product_name, stock_quantity, warehouse_location, last_updated "
            "FROM products ORDER BY stock_quantity ASC;"
        )

    if "doanh thu" in normalized and ("hom nay" in normalized or "hien tai" in normalized):
        return (
            "SELECT CAST(GETDATE() AS DATE) AS report_date, "
            "ISNULL(SUM(total_amount), 0) AS total_revenue, "
            "COUNT(*) AS total_orders "
            "FROM orders WHERE CAST(order_date AS DATE) = CAST(GETDATE() AS DATE);"
        )

    if "don hang" in normalized:
        return (
            "SELECT TOP 50 order_id, customer_id, order_date, total_amount, status "
            "FROM orders ORDER BY order_date DESC;"
        )

    return "SELECT 'Khong the tao truy van phu hop' AS message;"


def _normalize(text: str) -> str:
    text = text.lower().replace("đ", "d")
    text = "".join(ch for ch in unicodedata.normalize("NFD", text) if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", text).strip()
