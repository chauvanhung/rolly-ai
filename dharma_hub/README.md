# phatgiao

Website Phật giáo + hệ thống quản trị nội dung.

## Backend hiện có

- FastAPI + SQLAlchemy + Postgres.
- Soft-delete chuẩn: `is_deleted`, `deleted_at`, `deleted_by`.
- RBAC: users, roles, permissions theo module/action.
- Audit log: create/update/delete/restore/publish/export/login.
- CRUD đầy đủ mẫu cho `Kinh điển` (sutras + chapters).
- Generic CRUD coverage cho: bài pháp, bài giảng, giảng sư, lịch Phật sự, khóa tu, thiện nguyện, tin tức, media, danh mục, thẻ, vai trò.
- User CRUD: tạo/sửa/khóa/mở khóa/reset password/xóa mềm/khôi phục/audit.

## Chạy local

```powershell
cd D:\AI_ASSISSTANT\dharma_hub
docker compose -f docker-compose.local.yml up -d --build
```

Frontend admin: http://127.0.0.1:3015
API: http://127.0.0.1:8015
Docs: http://127.0.0.1:8015/docs

Tài khoản mẫu (chỉ dùng local):

- Email: `admin@phatgiao.rollyhub.com`
- Password: `ChangeMe123!`

## Ghi chú

Đây là foundation backend cho yêu cầu CRUD lớn. Frontend admin/public website sẽ làm ở phase tiếp theo.

## Frontend admin hiện có

- Đăng nhập bằng token Bearer.
- Trang quản trị Kinh điển:
  - danh sách dạng bảng,
  - tìm kiếm,
  - lọc trạng thái,
  - xem thùng rác,
  - phân trang,
  - xem chi tiết,
  - thêm mới,
  - chỉnh sửa,
  - xuất bản,
  - xóa mềm,
  - khôi phục,
  - xuất CSV,
  - cảnh báo khi rời form chưa lưu.


