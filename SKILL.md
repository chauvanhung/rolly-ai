---
name: ai_assistant_repo
description: Use this skill when working inside the D:\AI_ASSISSTANT repo. It helps quickly identify whether the task belongs to the Legal AI app at the repo root or the Expense SaaS app in backend/frontend, then points to the smallest set of files to read first.
---

# AI Assistant Repo Skill

## Muc tieu
- Giam token khi tiep quan repo nay.
- Xac dinh nhanh dang sua `Legal AI` hay `Expense SaaS`.
- Chi mo dung 2-5 file truoc khi sua.

## Chon dung source

### 1. Legal AI
Dung khi task lien quan:
- RAG phap luat
- SQL Server / text-to-SQL
- automation APScheduler
- `main.py` o root repo

Mo truoc:
- `RULES.md`
- `SYSTEM_STATE.md`
- `main.py`
- `app/agent/orchestrator.py`
- `app/rag/qa_chain.py`
- `app/sql/generator.py`

### 2. Expense SaaS
Dung khi task lien quan:
- app chi tieu
- login/register/dashboard
- mobile UI
- AI chat / bill scan
- budget / reminder / utility bill

Mo truoc:
- `RULES.md`
- `SYSTEM_STATE.md`
- `backend/services/ai_service.py`
- `frontend/src/components/ChatAssistant.jsx`
- `frontend/src/pages/Dashboard.jsx`

## Rule tiet kiem token
- Khong quet ca repo neu user chi sua 1 flow.
- Chi mo them file sau khi da xac dinh source.
- Neu la frontend Expense SaaS, uu tien doc:
  - `frontend/src/components/ChatAssistant.jsx`
  - `frontend/src/components/TransactionForm.jsx`
  - `frontend/src/pages/ChatPage.jsx`
- Neu la backend Expense SaaS, uu tien doc:
  - `backend/api/ai.py`
  - `backend/services/ai_service.py`
  - `backend/api/transaction.py`
- Neu la Legal AI, uu tien doc:
  - `app/agent/orchestrator.py`
  - `app/rag/retriever.py`
  - `app/rag/qa_chain.py`

## Rule cua Expense SaaS
- Chat va form giao dich la 2 khu rieng.
- Chat co 4 tone:
  - `gentle`
  - `straight`
  - `playful`
  - `coach`
- Utility bill / hoa don / EVN / dien nuoc luon la `expense`.
- Frontend luu context chat theo user:
  - `chatMessages`
  - `pendingFollowUp`
  - `recentTransactions`
  - tone duoc chon

## Rule cua Legal AI
- Chi dung Ollama local.
- SQL chi duoc `SELECT`.
- RAG uu tien `data/laws`.
- Neu co index lon, ton trong `MAX_INDEX_CHUNKS`.

## Lenh chay nhanh

### Expense SaaS
- Backend:
  - `.\backend\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000`
- Frontend:
  - `cmd /c D:\AI_ASSISSTANT\frontend\start_frontend.cmd`

### Legal AI
- `powershell -ExecutionPolicy Bypass -File .\start.ps1`

## Khi nao doc them
- Neu task la UI mobile -> doc `frontend/src/pages/Dashboard.jsx` va `frontend/src/styles.css` hoac component lien quan.
- Neu task la chat AI -> doc `backend/services/ai_service.py` va `frontend/src/components/ChatAssistant.jsx`.
- Neu task la bill scan -> doc `backend/services/receipt_service.py` va `frontend/src/components/TransactionForm.jsx`.
- Neu task la phap luat -> doc `app/rag/*` truoc, roi moi sang `app/tools/law_downloader.py`.
