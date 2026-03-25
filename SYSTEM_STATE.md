# System State

## Chon dung source truoc
- `Legal AI`: app phap luat cu o root repo.
- `Expense SaaS`: app chi tieu moi trong `backend/` + `frontend/`.

## Expense SaaS hien tai
- Backend dang o `backend/`
- Frontend dang o `frontend/`
- Frontend LAN: `http://192.168.190.199:5173`
- Backend health: `http://127.0.0.1:8000/health`
- DB local dev: SQLite fallback
- Frontend co chat rieng o `/chat`

## Expense SaaS da co
- Dang ky / dang nhap
- Them / sua / xoa giao dich
- Summary, chart, giao dien mobile-first
- AI ghi giao dich tu cau tu nhien
- Bill scan / camera flow mobile
- Utility bill manager
- Budget / reminder / category rules
- Chat command center rieng

## Chat AI hien tai
- 4 mode:
  - `Hiền`
  - `Thẳng`
  - `Hài hước`
  - `Coach`
- Gui `tone` qua `POST /api/ai/log`
- Frontend luu context theo user trong localStorage:
  - `chatMessages`
  - `pendingFollowUp`
  - `recentTransactions`
  - tone duoc chon
- Chat co the:
  - ghi giao dich
  - hoi lai khi thieu so tien
  - tao budget
  - tao reminder
  - tao utility bill
  - sua giao dich gan nhat
  - xoa giao dich gan nhat

## Rule quan trong cua Expense SaaS
- Utility bill / hoa don / EVN / dien nuoc luon la `expense`
- Cac cau xa giao, cam xuc, chao hoi di qua AI chat, khong bi coi la giao dich
- Cac cau ro nghia tai chinh di qua rule/command de nhanh
- Chat phai co nut quay lai trang chu

## Expense SaaS checklist nhanh
1. Backend len `GET /health` = `ok`
2. Frontend `:5173` tra `200`
3. Login duoc
4. Thu `uống Phúc Long 60k`
5. Thu `hi`
6. Thu `đặt ngân sách ăn uống 3 triệu`
7. Thu mot mode khac nhu `Thẳng`

## Legal AI hien tai
- Van ton tai o root repo
- Chay bang `start.ps1` hoac `python main.py`
- Data luat trong `data/laws`
- FAISS trong `data/faiss_index`

## Rule tiet kiem token khi quay lai sau
1. Doc file nay truoc.
2. Xac dinh dang lam `Expense SaaS` hay `Legal AI`.
3. Neu la `Expense SaaS`, mo 3 file truoc:
   - `backend/services/ai_service.py`
   - `frontend/src/components/ChatAssistant.jsx`
   - `frontend/src/pages/Dashboard.jsx`
4. Neu la `Legal AI`, mo:
   - `app/agent/orchestrator.py`
   - `app/rag/qa_chain.py`
   - `app/sql/generator.py`
