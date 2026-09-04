# 🚀 Hướng Dẫn Triển Khai Cert Word Sync Lên Docker & Server (Dành Cho Hermes / System Admin)

Tài liệu này hướng dẫn chi tiết cách triển khai ứng dụng **Cert Word Sync** lên Server/VPS Linux bằng **Docker** & **Docker Compose**, kết hợp Nginx/Cloudflare SSL cho tên miền `word.rollyhub.com`.

---

## 📋 1. Yêu Cầu Môi Trường (Prerequisites)

* **Hệ điều hành Server**: Ubuntu 20.04 / 22.04 LTS hoặc Debian 11/12.
* **Công cụ bắt buộc**:
  * `git`
  * `docker` (Phiên bản >= 20.10)
  * `docker-compose` hoặc plugin `docker compose`
* **Tên miền**: `word.rollyhub.com` đã được trỏ IP về VPS (qua Cloudflare DNS Proxy).

---

## 🛠️ 2. Các Bước Triển Khai Chi Tiết (Docker Deployment)

### Bước 1: Clone hoặc tải source code lên Server
```bash
cd /opt
git clone https://github.com/chauvanhung/rolly-ai.git cert_word_sync
cd cert_word_sync
```

### Bước 2: Tạo file cấu hình môi trường `.env`
Tạo file `.env` từ file mẫu `.env.example`:
```bash
cp .env.example .env
nano .env
```

Điền các thông số cơ bản vào file `.env`:
```env
PORT=5055
SECRET_KEY=cert_word_sync_super_secret_key_2026_prod

# Cấu hình API Key AI (Bắt buộc nếu muốn dùng tính năng AI)
AI_PROVIDER=openai_compatible
AI_BASE_URL=https://api.openai.com/v1
AI_API_KEY=sk-proj-xxxx...  # Điền API Key của bạn
AI_MODEL=gpt-4.1-mini

# Google OAuth Login (Tùy chọn)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Bước 3: Build & Khởi chạy Container Docker
Chạy lệnh bên dưới để Docker tự động cài đặt LibreOffice (xử lý file Word `.doc`/`.docx` trên Linux), các thư viện Python và chạy dịch vụ ngầm:

```bash
docker compose up -d --build
```

### Bước 4: Kiểm tra trạng thái chạy & Logs
```bash
# Kiểm tra danh sách container
docker compose ps

# Xem log thời gian thực
docker compose logs -f
```

---

## 🌐 3. Cấu hình Reverse Proxy Nginx & Cloudflare SSL (`word.rollyhub.com`)

Nếu bạn sử dụng Nginx trên VPS làm Reverse Proxy đứng trước Docker:

### 1. Tạo file cấu hình Nginx
```bash
sudo nano /etc/nginx/sites-available/word.rollyhub.com
```

Nội dung cấu hình Nginx:
```nginx
server {
    listen 80;
    server_name word.rollyhub.com;

    # Cho phép tải file dung lượng lớn (mẫu Word, chứng thư)
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:5055;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket & Timeouts
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

### 2. Kích hoạt website & Reload Nginx
```bash
sudo ln -s /etc/nginx/sites-available/word.rollyhub.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Cấu hình SSL Certbot (nếu không dùng Cloudflare SSL)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d word.rollyhub.com
```

---

## 🔄 4. Cập Nhật Code Khi Có Phiên Bản Mới (Continuous Deployment)

Khi nâng cấp code hoặc cập nhật tính năng mới:
```bash
cd /opt/cert_word_sync
git pull
docker compose up -d --build
```

---

## 🛡️ 5. Dữ Liệu Lưu Trữ Bền Vững (Persistent Volumes)
Docker đã được cấu hình lưu dữ liệu bền vững ngoài ổ đĩa máy chủ (host volume):
* `./data`: Lưu cơ sở dữ liệu tài khoản `auth.sqlite3` & cài đặt AI hệ thống `system_settings.json`.
* `./clients`: Lưu cấu hình JSON của từng khách hàng.
* `./templates`: Lưu các file mẫu Word của từng khách hàng.
* `./outputs`: Lưu file Word kết quả đã trích xuất.
