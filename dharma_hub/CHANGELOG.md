# Changelog — Dharma Hub (phatgiao)

## 2026-07-20 — Gói hoàn thiện CMS + trải nghiệm lễ

### Nội dung & biên tập
- Kinh nhiều chương + phân tầng **Tập → Chương**
- Editor rich text (đậm/nghiêng/màu/căn lề/Tab thụt dòng)
- Upload MP3 / nghe trực tiếp (bài giảng + thư viện)
- Giảng sư **không bắt buộc**
- Danh mục bộ kinh Nikāya đầy đủ + map dữ liệu sẵn có

### Admin mới / đủ menu
- Giảng sư / Nhà sư
- Danh mục
- **Lịch Phật sự** (`/admin/events`)
- **Tin / Thông báo** (`/admin/news`)
- **Thiện nguyện** (`/admin/charities`)
- Dashboard đếm đúng số (tách API, endpoint chuẩn)

### Công khai
- Chuông thông báo (lễ + sự kiện 14 ngày)
- Animation hoa sen / pháp luân / tượng Phật vàng (trang nhã)
- Demo: `/demo/festival`

### Kỹ thuật
- CORS, upload, port local `3015` / `8015`
- Script `backend/scripts/seed_categories.py`
