# Cert Word Sync

Tool noi bo de upload file Word "Chung thu" va tu dong cap nhat thong tin sang
2 file Word con lai theo form rieng cua tung khach hang.

## Chay nhanh

```powershell
cd D:\AI_ASSISSTANT\cert_word_sync
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Mo trinh duyet tai `http://127.0.0.1:5055`.

## Cach dung

1. Dat template cua tung khach hang vao `templates\<ma-khach>\`.
2. Tao file cau hinh trong `clients\<ma-khach>.json`.
3. Upload file Chung thu moi tren web.
4. Tool se tao folder output gom phieu xac nhan va bien ban da cap nhat.

Ban cung co the them bo form moi ngay tren web bang muc "Them bo form khach hang moi".
Tool se tao san folder template va JSON cau hinh mac dinh. Neu form moi dung nhan
khac, mo file `clients\<ma-khach>.json` va sua `label` cho khop voi chu trong file Word.

## Dung chung cho nhieu form

Code khong co dinh rieng CHANGXIN. Moi khach hang co mot file JSON trong `clients/`.
Trong moi update co the dung:

```json
{"labels": ["Số chứng thư:", "Số chứng nhận:", "Số CT:"], "field": "certificate_no"}
```

`labels` la cac cach goi khac nhau trong tung form Word; chi can mot nhan khop la tool se
cap nhat field do. Khi them khach moi tren web, tool se tao san bo `labels` pho bien cho:

- So/ngay chung thu
- Ten khach hang, dia chi
- Giay xac nhan ky quy
- Dia diem giam dinh
- Hop dong, hoa don, van don, to khai
- Chung loai, so luong hang, so container

## Dung AI khac bang base URL

Neu AI cua ban co API tuong thich OpenAI Chat Completions, cau hinh trong `.env`:

```env
AI_PROVIDER=openai_compatible
AI_BASE_URL=https://api-cua-ban.example.com/v1
AI_API_KEY=your-api-key
AI_MODEL=ten-model-cua-ban
```

Quy tac:

- `AI_BASE_URL` la goc API, thuong ket thuc bang `/v1`.
- Tool se goi endpoint `${AI_BASE_URL}/chat/completions`.
- `AI_API_KEY` la key cua nha cung cap AI do.
- `AI_MODEL` la ten model dung de doc noi dung Word va tra ve JSON.

Neu nha cung cap khong ho tro OpenAI-compatible API, can viet them adapter rieng cho
endpoint cua ho.

Luu y: file `.doc` cu can Microsoft Word tren Windows de chuyen sang `.docx`.
Neu khong co Word, hay luu template bien ban thanh `.docx` truoc.
