import sys
import urllib.request
import urllib.parse
from pathlib import Path
from docx import Document

sys.stdout.reconfigure(encoding='utf-8')

file_path = Path('D:/file/CHỨNG THƯ CHANGXIN 66001.22.docx')
url = 'http://127.0.0.1:5055/generate'

boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
file_bytes = file_path.read_bytes()

body = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="client_id"\r\n\r\n'
    f'changxin\r\n'
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="certificate"; filename="{file_path.name}"\r\n'
    f'Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n'
).encode('utf-8') + file_bytes + f'\r\n--{boundary}--\r\n'.encode('utf-8')

req = urllib.request.Request(url, data=body, headers={
    'Content-Type': f'multipart/form-data; boundary={boundary}'
})

res = urllib.request.urlopen(req)
html = res.read().decode('utf-8')

print('=== HTTP STATUS ===')
print('Status Code:', res.status)

print('\n=== CHECK EXTRACTED FIELDS IN HTML ===')
for field in ['certificate_no', 'certificate_date', 'customer_name', 'contract_no', 'invoice_no', 'customs_declaration_no']:
    p = '<td class="data-key">' + field + '</td>'
    idx = html.find(p)
    if idx != -1:
        snippet = html[idx:idx+150]
        # Clean tags
        clean_snip = snippet.replace('\n', ' ').replace('  ', ' ')
        print(f'  {field}: {clean_snip}')

print('\n=== CHECK GENERATED OUTPUT DOCX FILES ===')
for g_file in ['phieu_CHANGXIN_da_cap_nhat.docx', 'bien_ban_CHANGXIN_da_cap_nhat.docx']:
    out_docx_path = Path('outputs/changxin') / g_file
    if out_docx_path.exists():
        doc = Document(str(out_docx_path))
        print(f'\n[VERIFIED DOCX] File: {g_file}')
        for i, p in enumerate(doc.paragraphs):
            if any(k in p.text for k in ['ICC/08.26/66001.22', '30 tháng 08 năm 2026', 'CHANG XIN']):
                print(f'  Paragraph {i}: {repr(p.text.strip())}')
