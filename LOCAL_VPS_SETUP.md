# Local VPS Setup For `rolly-ai`

## Muc tieu
- Dung `VMware` de tao 1 may ao Ubuntu dong vai tro `local VPS`.
- Luu toan bo VM o `E:\VMs\rolly-ai-vps`.
- Sau khi cai xong Ubuntu, deploy `rolly-ai` bang Docker.

## Thu muc da chuan bi
- VM folder: `E:\VMs\rolly-ai-vps`
- ISO folder: `E:\ISO`

## Cau hinh VM khuyen nghi
- OS: `Ubuntu Server 24.04 LTS`
- CPU: `2 vCPU`
- RAM: `6 GB`
- Disk: `60 GB`
- Network: `Bridged`
- Disk mode: `Store virtual disk as a single file`

## Buoc 1: Cai VMware
- Cai `VMware Workstation Pro` hoac `VMware Workstation Player`.
- Sau khi cai xong, mo VMware.

## Buoc 2: Tai ISO Ubuntu Server
- Tai tu: `https://ubuntu.com/download/server`
- File can lay: `ubuntu-24.04-live-server-amd64.iso`
- Luu vao: `E:\ISO\ubuntu-24.04-live-server-amd64.iso`

## Buoc 3: Tao may ao
1. Chon `Create a New Virtual Machine`
2. Chon `Typical`
3. Chon `Installer disc image file (iso)`
4. Tro toi: `E:\ISO\ubuntu-24.04-live-server-amd64.iso`
5. Guest OS:
   - `Linux`
   - `Ubuntu 64-bit`
6. Virtual machine name:
   - `rolly-ai-vps`
7. Location:
   - `E:\VMs\rolly-ai-vps`
8. Disk size:
   - `60 GB`
9. Chon:
   - `Store virtual disk as a single file`
10. `Customize Hardware`:
   - `Memory`: `6144 MB`
   - `Processors`: `2`
   - `Network Adapter`: `Bridged`

## Buoc 4: Cai Ubuntu
- Chon `Ubuntu Server`
- Dat ten may:
  - `rolly-ai-vps`
- Tao 1 user moi, vi du:
  - username: `rolly`
- Chon cai `OpenSSH server`
- Khong can cai them package optional nao khac

## Buoc 5: Viec se lam sau khi vao duoc Ubuntu
Chay lan luot:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Dang nhap lai, roi:

```bash
git clone https://github.com/chauvanhung/rolly-ai.git /opt/rolly-ai
cd /opt/rolly-ai
cp backend/.env.example backend/.env
```

Sau do sua `backend/.env`, roi chay:

```bash
docker compose -f docker-compose.expense-public.yml up -d --build
```

## Buoc 6: Truy cap tu dien thoai cung Wi-Fi
- Tim IP Ubuntu VM:

```bash
ip a
```

- Mo tren dien thoai:
  - `http://<ip-vm>`

## Ghi chu
- `VMware` hien chua duoc phat hien tren may nay.
- Khi ban cai xong VMware va tai xong ISO, lam den buoc tao VM roi gui anh tiep, minh se chi tiep tung buoc cai Ubuntu.
