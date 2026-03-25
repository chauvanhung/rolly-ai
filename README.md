# Local AI Assistant

## Quick Context
- Read [RULES.md](/d:/AI_ASSISSTANT/RULES.md) first for architecture and operating rules.
- Read [SYSTEM_STATE.md](/d:/AI_ASSISSTANT/SYSTEM_STATE.md) for current status and quick checks.

## Features
- Vietnamese legal QA with local RAG from files in `data/laws`
- Vietnamese natural language to read-only SQL Server queries
- APScheduler automation for daily reports and anomaly detection
- Optional Telegram notifications, disabled by default for fully local mode
- FastAPI backend with a simple chat web UI
- Official-source law downloader for VBPL documents

## Run
1. Create a virtual environment and install dependencies:
   - `python -m venv .venv`
   - `.venv\Scripts\activate`
   - `pip install -r requirements.txt`
2. Copy `.env.example` to `.env` and fill in your SQL Server connection if needed.
3. Start Ollama and pull the required models:
   - `ollama serve`
   - `ollama pull llama3:8b`
   - `ollama pull nomic-embed-text`
4. Load law files into `data/laws`.
   - Manual: copy PDF/DOCX/DOC files into `data/laws`
   - Automatic from the official VBPL portal:
     - `python -m app.tools.law_downloader --max-pages 3`
     - `python -m app.tools.law_downloader --all-pages --from-year 2015 --to-year 2026`
5. Build or refresh the FAISS index:
   - `Invoke-RestMethod -Method Post http://localhost:8000/ingest`
6. Start the app:
   - `python main.py`
7. Open `http://localhost:8000`.

## Quick Start On This Machine
- Preferred startup: `powershell -ExecutionPolicy Bypass -File .\start.ps1`
- The script automatically:
  - uses `E:\.ollama\models`
  - keeps `OLLAMA_VULKAN=1`
  - starts Ollama if needed
  - checks `llama3:8b` and `nomic-embed-text:latest`
  - starts the FastAPI app

## Notes
- If `TELEGRAM_ENABLED=false`, the system stays fully local and makes no external notification calls.
- If no SQL connection is configured, text-to-SQL still generates safe SQL but execution returns no rows.
- The downloader stores a manifest in `data/laws_manifest.json` and skips files already downloaded.
- Downloading every historical document can be large. Start with a year range or a few listing pages first.
- For low-memory laptops, keep `MAX_INDEX_CHUNKS` in `.env` at a moderate value such as `5000-8000`.
