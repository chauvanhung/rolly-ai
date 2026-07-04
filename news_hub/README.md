# News Hub — Trang tin nóng tổng hợp

Tổng hợp tin nóng từ RSS công khai của các báo VN (VnExpress, Tuổi Trẻ, Thanh Niên,
Dân Trí, VietnamNet). Miễn phí, không cần API key.

## Cấu trúc
- `backend/` — FastAPI: tổng hợp RSS, xếp hạng "nóng", cache 5 phút
- `frontend/` — React + Vite + Tailwind: trang tin nóng, tab chủ đề, tìm kiếm

## Chạy local

### Backend (port 8099)
```powershell
cd backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m uvicorn app.main:app --port 8099
```

### Frontend (port 5199)
```powershell
cd frontend
npm install
npm run dev
```
Mở http://localhost:5199 (dev server tự proxy `/api` sang backend 8099).

## API
- `GET /api/hot?limit=30&topic=the-thao` — tin nóng (tùy chọn lọc chủ đề)
- `GET /api/topics` — danh sách chủ đề
- `GET /api/search?q=world+cup` — tìm kiếm theo tiêu đề/tóm tắt
- `POST /api/refresh` — ép làm mới cache

## Cách xếp hạng "nóng"
Điểm theo độ mới của bài, giảm dần theo hàm mũ (half-life ~12h). Bài mới hơn xếp trên.

## Nguồn dữ liệu
Chỉnh `backend/app/sources.py` để thêm/bớt feed RSS hoặc chủ đề.