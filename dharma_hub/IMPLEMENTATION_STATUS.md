# phatgiao - Trạng thái triển khai CRUD

Ngày cập nhật: 2026-07-15

## Đã làm

### 1. Backend foundation

- Tạo app mới: `dharma_hub`.
- Backend FastAPI + SQLAlchemy + Postgres/SQLite.
- Cấu hình Dockerfile và `docker-compose.local.yml`.
- Health endpoint: `GET /health`.
- Static uploads mount: `/api/uploads`.

### 2. Chuẩn dữ liệu quản trị

- Timestamp: `created_at`, `updated_at`, `created_by`, `updated_by`.
- Xóa mềm: `is_deleted`, `deleted_at`, `deleted_by`.
- Publish: `status`, `published_at`.
- Audit log: actor, action, module, entity_id, before_json, after_json, IP, user agent.

### 3. RBAC

- Models: users, roles, permissions.
- Quyền theo module/action: view, create, update, delete, restore, approve, publish, export.
- Super Admin có toàn quyền.
- Tài khoản local mẫu khi DB trống:
  - Email: `admin@phatgiao.rollyhub.com`
  - Password: `ChangeMe123!`

### 4. CRUD Kinh điển đầy đủ

Đã có API cho:

- Tạo bài kinh.
- Xem danh sách, tìm kiếm, lọc, sắp xếp, phân trang.
- Xem chi tiết.
- Cập nhật.
- Xóa mềm.
- Khôi phục.
- Xóa vật lý bởi Super Admin.
- Xuất CSV.
- Publish / hide.
- Audit log theo bài kinh.
- Quản lý chương/phẩm: thêm/sửa/xóa mềm.
- Field audio/pdf/category/tags/source/translator/status đã có trong model.

### 5. Generic CRUD coverage cho module còn lại

Đã có CRUD mềm/audit/export/search/pagination chung cho:

- Bài pháp.
- Bài giảng.
- Giảng sư.
- Lịch Phật sự.
- Khóa tu.
- Thiện nguyện.
- Tin tức/thông báo.
- Thư viện media.
- Danh mục.
- Thẻ.
- Vai trò.

### 6. Người dùng

Đã có API:

- Tạo người dùng.
- Danh sách.
- Xem chi tiết.
- Cập nhật.
- Gán vai trò.
- Khóa / mở khóa.
- Reset password.
- Xóa mềm / khôi phục.
- Audit log.

### 7. Đăng ký sự kiện / khóa tu

Đã có API:

- Danh sách đăng ký sự kiện.
- Tạo/sửa đăng ký sự kiện.
- Xuất CSV đăng ký sự kiện.
- Danh sách đăng ký khóa tu.
- Tạo/sửa đăng ký khóa tu.
- Đánh dấu đã gửi email xác nhận.
- Xuất CSV đăng ký khóa tu.

### 8. Kiểm tra kỹ thuật

- `python -m py_compile` toàn bộ backend: PASS.
- Docker build/runtime đã verify: backend healthy ở `http://127.0.0.1:8015`, frontend healthy ở `http://127.0.0.1:3015`.

## Chưa làm / phase tiếp theo

1. Verify runtime bằng Docker khi Docker Desktop ổn định lại.
2. Bổ sung frontend quản trị:
   - bảng dữ liệu,
   - search/filter/sort/pagination,
   - bulk actions,
   - form create/update,
   - audit tab,
   - CSV export button.
3. Bổ sung public website UI theo spec Phật giáo.
4. Bổ sung media upload thật (ảnh/audio/video/pdf) với kiểm tra file size/type.
5. Bổ sung Excel export (hiện CSV đã có).
6. Bổ sung email thật cho khóa tu.
7. Bổ sung hard-delete confirmation UI chỉ cho Super Admin.

## Cập nhật 2026-07-16

- Docker Desktop đã hồi; đã build và chạy thành công stack local.
- Backend verified:
  - `GET /health` OK.
  - Login OK với `admin@phatgiao.rollyhub.com`.
  - Tạo bài kinh OK.
  - Publish OK.
  - Xóa mềm OK.
  - Khôi phục OK.
- Sửa lỗi seed email `.local` không qua `EmailStr`; đổi tài khoản mẫu thành `admin@phatgiao.rollyhub.com`.
- Sửa lỗi tạo bài kinh khi payload có `chapters` bị gán trực tiếp vào relationship SQLAlchemy.
- Frontend admin React/Vite đã thêm:
  - login,
  - API client Bearer token,
  - bảng Kinh điển,
  - search/filter/pagination,
  - modal chi tiết,
  - form thêm/sửa,
  - publish,
  - xóa mềm/khôi phục,
  - export CSV,
  - cảnh báo rời form chưa lưu.
- Frontend admin chạy tại: `http://127.0.0.1:3015`.

