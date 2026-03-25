# Project Rules

## Muc tieu chung
- Repo nay hien co 2 source chinh:
  - `Legal AI` o root repo
  - `Expense SaaS` trong `backend/` va `frontend/`
- Giao tiep voi nguoi dung bang tieng Viet Unicode.
- Uu tien local/offline, chi goi ra ngoai khi chu dong tai tai lieu hoac can nguon chinh thuc.

## Legal AI stack
- Backend: FastAPI
- LLM local: Ollama
- Chat model: `llama3:8b`
- Embedding: `nomic-embed-text`
- Vector DB: FAISS local
- Database: SQL Server qua `pyodbc`
- Scheduler: APScheduler
- UI: `index.html` + JavaScript
- Nguon van ban phap luat: `vbpl.vn`

## Expense SaaS stack
- Backend: `backend/` voi FastAPI + SQLAlchemy + JWT
- Frontend: `frontend/` voi React + Vite
- DB local dev: SQLite fallback
- AI local: Ollama
- UI uu tien mobile-first
- Chat rieng: `frontend/src/pages/ChatPage.jsx`
- Logic chat chinh: `frontend/src/components/ChatAssistant.jsx`
- Command center backend: `backend/services/ai_service.py`

## Rule so tien
- Tat ca hien thi tai chinh phai theo chuan `vi-VN`.
- Frontend phai dung helper chung `formatMoney(...)`.
- Backend/AI phai dung helper chung `format_vnd(...)`.
- Khong goi `toLocaleString(...)` truc tiep tung noi neu da co helper.

## Rule chat AI cua Expense SaaS
- Chat phai tach rieng khoi form giao dich thu cong.
- Truoc khi AI noi theo phong cach nao, nguoi dung phai chon mode.
- 4 mode hien co:
  - `gentle` = `Hiền`
  - `straight` = `Thẳng`
  - `playful` = `Hài hước`
  - `coach` = `Coach`
- Chat dung hybrid:
  - cau ro rang ve tai chinh -> rule/command de nhanh va dung
  - cau xa giao, cam xuc, hoi chuyen -> AI chat reply
  - cau thieu du lieu -> hoi lai theo hoi thoai
- Utility bill / hoa don / EVN / dien nuoc / ma khach hang phai mac dinh la `expense`.
- Chat phai nho context ngan han theo user:
  - `chatMessages`
  - `pendingFollowUp`
  - `recentTransactions`
- Khi user nhan `hi`, `hello`, `ok`, `cam on` thi khong duoc tiep tuc follow-up giao dich cu.

## Rule RAG Legal AI
- Chi dung model local qua Ollama.
- SQL chi duoc phep `SELECT`.
- RAG uu tien du lieu trong `data/laws`.
- Cho phep nap them `.txt` va `.md` lam tai lieu neo nghia khi can.
- Khi index lon phai gioi han `MAX_INDEX_CHUNKS`.
- Khi can corpus chuyen de, dieu chinh `FOCUSED_INDEX_RATIO`.

## Thu tu chay Legal AI
1. `powershell -ExecutionPolicy Bypass -File .\start.ps1`
2. Hoac chay tay:
   - `ollama serve`
   - `python main.py`
3. Kiem tra:
   - `GET /status`
   - `POST /ingest`

## Thu tu chay Expense SaaS
1. Backend:
   - `cd D:\AI_ASSISSTANT`
   - `.\backend\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000`
2. Frontend:
   - `taskkill /F /IM node.exe`
   - `cmd /c D:\AI_ASSISSTANT\frontend\start_frontend.cmd`
3. Web:
   - may nay: `http://localhost:5173`
   - dien thoai cung Wi-Fi: `http://192.168.190.199:5173`
4. Chat rieng:
   - `http://192.168.190.199:5173/chat`

## File nen doc truoc de tiet kiem token
- `README.md`
- `RULES.md`
- `SYSTEM_STATE.md`

## File nen doc truoc neu sua Expense SaaS
- `backend/services/ai_service.py`
- `frontend/src/components/ChatAssistant.jsx`
- `frontend/src/pages/ChatPage.jsx`
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/components/TransactionForm.jsx`

## File nen doc truoc neu sua Legal AI
- `main.py`
- `app/agent/orchestrator.py`
- `app/rag/qa_chain.py`
- `app/rag/retriever.py`
- `app/sql/generator.py`

## Rule tiep quan de tiet kiem token
- Doc `RULES.md` truoc, roi `SYSTEM_STATE.md`.
- Xac dinh dang sua source nao: `Legal AI` hay `Expense SaaS`.
- Chi mo them file trong module dang sua.
- Khong quet ca repo neu chi can sua 1 flow.
