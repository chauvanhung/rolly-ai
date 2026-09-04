from __future__ import annotations

import json
from pathlib import Path

SETTINGS_FILE = Path(__file__).resolve().parent.parent / "data" / "system_settings.json"

DEFAULT_SETTINGS = {
    "enable_ai_extraction": True,
    "enable_ai_template_learning": True,
}


def load_system_settings() -> dict:
    if not SETTINGS_FILE.exists():
        return dict(DEFAULT_SETTINGS)
    try:
        data = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
        return {
            "enable_ai_extraction": bool(data.get("enable_ai_extraction", True)),
            "enable_ai_template_learning": bool(data.get("enable_ai_template_learning", True)),
        }
    except Exception:
        return dict(DEFAULT_SETTINGS)


def save_system_settings(settings: dict) -> None:
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SETTINGS_FILE.write_text(
        json.dumps(settings, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
