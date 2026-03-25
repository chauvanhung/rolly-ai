# Expense SaaS

SaaS quản lý chi tiêu cá nhân và gia đình, gồm:

- Backend: FastAPI + SQLAlchemy + JWT
- Database:
  - Local dev: SQLite tự động nếu chưa đặt `DATABASE_URL`
  - Production: PostgreSQL
- Frontend: React + Axios + Chart.js
- AI: Ollama local qua endpoint `/api/ai`
- Bill scan: OCR qua `pytesseract`

## Cấu trúc

- `backend/`: API, models, services, repositories
- `frontend/`: React app
- `docker-compose.expense.yml`: chạy toàn bộ stack bằng Docker

## Chạy backend local nhanh nhất

1. `cd D:\AI_ASSISSTANT\backend`
2. `python -m venv .venv`
3. Nếu PowerShell bị chặn activate, dùng trực tiếp Python trong venv:
   - `.\.venv\Scripts\python.exe -m pip install -r requirements.txt`
4. Copy `backend/.env.example` thành `.env`
5. Có thể để trống `DATABASE_URL` để backend tự dùng SQLite local
6. Chạy API:
   - `.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000`

Khi chạy kiểu này, file database local sẽ được tạo tại:

- `backend/expense_saas.db`

## Chạy frontend local

1. Dùng Node portable đã tải hoặc cài Node.js
2. `cd D:\AI_ASSISSTANT\frontend`
3. `npm install`
4. `npm run dev`

## Bill scan / OCR

- API: `POST /api/receipt/analyze`
- Frontend đã có khu upload bill trong form giao dịch
- Để OCR chạy thật, máy/server cần cài `Tesseract OCR`
- Nếu chưa cài `tesseract.exe`, API sẽ trả thông báo chưa thể quét bill

## Docker production-style

- `docker compose -f docker-compose.expense.yml up --build`

Docker compose sẽ dùng PostgreSQL, backend và frontend cùng lúc.

## API chính

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/transactions`
- `GET /api/transactions`
- `DELETE /api/transactions/{id}`
- `GET /api/summary`
- `GET /api/ai?q=Tháng này tôi tiêu bao nhiêu?`
- `POST /api/receipt/analyze`

## Test case

- Đăng ký user mới
- Đăng nhập
- Thêm giao dịch
- Upload bill để auto-fill
- Xem dashboard
- Xóa giao dịch
- Hỏi AI: `Tháng này tôi tiêu bao nhiêu?`
