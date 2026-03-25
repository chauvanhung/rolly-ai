# CI CD Setup

## Muc tieu
- Push code len repo va tu dong check build.
- Khi merge `main`, co the tu deploy len VPS.

## File da co
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `.gitignore`

## CI dang lam gi
- Backend:
  - cai dependencies
  - `python -m compileall`
- Frontend:
  - `npm ci`
  - `npm run build`

## CD dang lam gi
- Trigger khi push `main` hoac bam tay `workflow_dispatch`
- SSH vao server
- `git pull origin main`
- `docker compose -f docker-compose.expense-public.yml up -d --build`

## Ban can tao repo truoc
1. Tao repo GitHub
2. Push source len
3. Vao `Settings > Secrets and variables > Actions`
4. Them cac secret:
   - `SSH_HOST`
   - `SSH_USER`
   - `SSH_PRIVATE_KEY`
   - `SSH_PORT`
   - `DEPLOY_PATH`

## Gia tri secret goi y
- `SSH_HOST`: IP hoac domain VPS
- `SSH_USER`: user SSH tren server
- `SSH_PRIVATE_KEY`: private key dung de SSH
- `SSH_PORT`: thuong la `22`
- `DEPLOY_PATH`: thu muc tren server, vi du `/opt/expense-saas`

## Tren server can co san
- Docker
- Docker Compose
- source code da duoc clone o `DEPLOY_PATH`
- file `backend/.env`
- domain da tro ve VPS neu chay public HTTPS

## Sau khi push
- CI se chay ngay
- Neu push len `main`, deploy workflow se chay

## Kiem tra sau deploy
- `https://your-domain.com`
- `https://your-domain.com/health`
- `https://your-domain.com/docs`
