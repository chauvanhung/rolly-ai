"""
app/core/logger.py
==================
Centralized logging setup.
- Rotating file handler (keeps last 5 files, 5MB each)
- Console handler with color support
- All modules import `logger` from here
"""
import logging
import os
from logging.handlers import RotatingFileHandler

from app.core.config import settings


def _setup_logger() -> logging.Logger:
    log = logging.getLogger("ai_assistant")
    log.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))

    # Avoid duplicate handlers if module is reloaded
    if log.handlers:
        return log

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # ---- Console Handler ----
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    log.addHandler(console_handler)

    # ---- File Handler (Rotating) ----
    os.makedirs(os.path.dirname(settings.log_file), exist_ok=True)
    file_handler = RotatingFileHandler(
        settings.log_file,
        maxBytes=5 * 1024 * 1024,  # 5MB
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)
    log.addHandler(file_handler)

    return log


# Singleton logger - import this everywhere
logger = _setup_logger()
