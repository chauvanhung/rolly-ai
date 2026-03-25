"""
SQL Server connection management.
"""
from __future__ import annotations

from typing import Optional

import pyodbc

from app.core.config import settings
from app.core.logger import logger


class SQLDatabase:
    def __init__(self) -> None:
        self._connection: Optional[pyodbc.Connection] = None
        self.is_available = False

    def _connect(self) -> bool:
        if not settings.sql_connection_string:
            logger.warning("SQL_CONNECTION_STRING chua duoc cau hinh. Tinh nang SQL se bi tat.")
            self.is_available = False
            return False

        try:
            self._connection = pyodbc.connect(settings.sql_connection_string, timeout=10)
            self._connection.autocommit = False
            self.is_available = True
            logger.info("Connected to SQL Server.")
            return True
        except pyodbc.Error as exc:
            logger.error("SQL Server connection failed: %s", exc)
            self._connection = None
            self.is_available = False
            return False

    def get_connection(self) -> Optional[pyodbc.Connection]:
        if self._connection is None:
            self._connect()
            return self._connection

        try:
            cursor = self._connection.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
        except Exception:
            logger.warning("SQL connection lost. Reconnecting.")
            self.close()
            self._connect()
        return self._connection

    def close(self) -> None:
        if self._connection is not None:
            try:
                self._connection.close()
            except Exception:
                pass
        self._connection = None
        self.is_available = False


_db: Optional[SQLDatabase] = None


def get_db() -> SQLDatabase:
    global _db
    if _db is None:
        _db = SQLDatabase()
        _db._connect()
    return _db
