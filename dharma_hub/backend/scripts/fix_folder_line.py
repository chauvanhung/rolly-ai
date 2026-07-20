from pathlib import Path

p = Path(__file__).resolve().parents[1] / "app" / "api" / "v1" / "generic_admin.py"
text = p.read_text(encoding="utf-8")
old = 'folder("/"),'
new = 'folder="/",'
if old not in text:
    raise SystemExit(f"pattern not found: {old!r}")
p.write_text(text.replace(old, new, 1), encoding="utf-8")
print("fixed", p)
