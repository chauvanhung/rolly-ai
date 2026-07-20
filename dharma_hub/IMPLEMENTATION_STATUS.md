# phatgiao / Dharma Hub — Trạng thái triển khai

Ngày cập nhật: **2026-07-20**

## Chạy local

```bash
cd dharma_hub
docker compose -f docker-compose.local.yml up -d
```

| Service  | URL |
|----------|-----|
| Frontend | http://127.0.0.1:3015 |
| Backend  | http://127.0.0.1:8015 |
| Health   | http://127.0.0.1:8015/health |
| Public   | https://phatgiao.rollyhub.com (nếu reverse-proxy Caddy/Cloudflare) |

Admin mẫu (khi seed): `admin@phatgiao.rollyhub.com` / `ChangeMe123!`

## Admin CMS (đầy đủ)

| Module | Path |
|--------|------|
| Dashboard | `/admin/dashboard` |
| Users | `/admin/users` |
| Kinh | `/admin/sutras` |
| Bài pháp | `/admin/articles` |
| Bài giảng | `/admin/lectures` |
| Lịch Phật sự | `/admin/events` |
| Khóa tu | `/admin/retreats` |
| Tin | `/admin/news` |
| Thiện nguyện | `/admin/charities` |
| Giảng sư | `/admin/teachers` |
| Danh mục | `/admin/categories` |
| Media | `/admin/media` |
| Liên hệ | `/admin/contacts` |
| Nhận tin | `/admin/subscribers` |

## Public

- Kinh, bài pháp, bài giảng, lịch, khóa tu, tin, thiện nguyện, thư viện
- Notify chuông + banner lễ: client-side + `/public/calendar`
- Demo animation: `/demo/festival`

## Seed danh mục bộ kinh

```bash
docker compose -f docker-compose.local.yml exec backend python /app/scripts/seed_categories.py
# hoặc copy script vào container nếu image chưa có /app/scripts
```

## Ghi chú deploy production

1. Rebuild: `docker compose -f docker-compose.local.yml build frontend backend && docker compose -f docker-compose.local.yml up -d`
2. Proxy `phatgiao.rollyhub.com` → `127.0.0.1:3015` (FE) / API rewrite `/api` → `8015`
3. Đặt `JWT_SECRET`, `CORS_ORIGINS`, Google OAuth origins cho domain thật
4. Volume `dharma_uploads` giữ file MP3/PDF

Xem thêm `CHANGELOG.md`.
