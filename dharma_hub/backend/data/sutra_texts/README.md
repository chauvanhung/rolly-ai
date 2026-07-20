# Import kinh từ file local

Đặt file .txt hoặc .md đặt tên theo slug, ví dụ:

- kinh-pho-mon.txt
- kinh-duoc-su.txt
- kinh-ia-tang-bon-nguyen.txt
- kinh-lang-nghiem.txt
- kinh-vien-giac.txt
- kinh-hoa-nghiem.txt
- kinh-duy-ma-cat.txt
- kinh-sam-hoi-hong-danh.txt

Rồi chạy trong container backend:

`
python /app/scripts/import_sutra_texts.py --from-dir /app/data/sutra_texts --force
`

Nội dung nên là bản Việt ngữ đầy đủ, UTF-8.
