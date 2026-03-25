# Deploy Web Public

## Muc tieu
- Dua `Expense SaaS` len web public truoc.
- Frontend va backend dung chung 1 domain.
- `Caddy` lo reverse proxy va HTTPS.

## Kien truc
- `postgres`: luu du lieu
- `backend`: FastAPI API
- `frontend`: React build static
- `caddy`: route `/api/*` vao backend, route con lai vao frontend

## File deploy chinh
- `docker-compose.expense-public.yml`
- `deploy/expense/Caddyfile`
- `backend/.env`

## Chuan bi tren server
1. Co VPS Ubuntu co Docker va Docker Compose
2. Domain tro ve IP server
3. Tao `backend/.env` tu `backend/.env.example`

## Bien moi truong quan trong
- `DOMAIN=your-domain.com`
- `POSTGRES_USER=expense_user`
- `POSTGRES_PASSWORD=doi-mat-khau-manh`
- `POSTGRES_DB=expense_saas`
- `SECRET_KEY=mot-khoa-dai-va-manh`
- `GOOGLE_CLIENT_ID=...`
- `GOOGLE_CLIENT_SECRET=...`
- `GOOGLE_CALENDAR_REDIRECT_URI=https://your-domain.com/api/google-calendar/callback`
- `FRONTEND_BASE_URL=https://your-domain.com`
- `CORS_ORIGINS=["https://your-domain.com"]`

## Chay deploy
```bash
docker compose -f docker-compose.expense-public.yml up -d --build
```

## URL sau deploy
- App: `https://your-domain.com`
- Backend health: `https://your-domain.com/health`
- Swagger: `https://your-domain.com/docs`

## Ghi chu
- Frontend dang goi API bang duong dan tuong doi `/api`, nen hop voi mo hinh 1 domain.
- Neu dung Google Calendar, redirect URI phai trung khop 100% voi domain that.
- Neu server khong public HTTPS duoc ngay, co the doi `DOMAIN` tam bang IP va chi mo cong `80`, nhung khong hop de chay Google OAuth lau dai.
