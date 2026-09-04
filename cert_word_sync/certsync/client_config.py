from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path


DEFAULT_PHIEU_UPDATES = [
    {"labels": ["Số chứng thư:", "Số chứng nhận:", "Số chứng từ:", "Số CT:", "Số:"], "field": "certificate_no"},
    {"labels": ["Ngày cấp chứng thư:", "Ngày chứng thư:", "Ngày chứng từ:", "Ngày cấp:", "Ngày:"], "field": "certificate_date"},
    {"labels": ["Tên khách hàng", "Tên tổ chức", "Tên đơn vị"], "field": "customer_name"},
    {
        "labels": ["Địa điểm giám định/lấy mẫu:", "Địa điểm kiểm tra, giám định", "Địa điểm giám định:"],
        "field": "inspection_location",
    },
    {"labels": ["Số lượng Container:", "Số lượng container:", "Số container:"], "field": "container_count"},
]


DEFAULT_BIEN_BAN_UPDATES = [
    {"labels": ["Số chứng thư:", "Số chứng nhận:", "Số chứng từ:", "Số CT:", "Số:"], "field": "certificate_no"},
    {"labels": ["Ngày cấp chứng thư:", "Ngày chứng thư:", "Ngày chứng từ:", "Ngày cấp:", "Ngày:"], "field": "certificate_date"},
    {"labels": ["- Tên tổ chức:", "Tên tổ chức:", "Tên tổ chức, cá nhân"], "field": "customer_name"},
    {"labels": ["- Địa chỉ:", "Địa chỉ:"], "field": "customer_address"},
    {
        "labels": [
            "- Giấy xác nhận đã ký quỹ bảo đảm phế liệu nhập khẩu số:",
            "Giấy xác nhận đã ký quỹ bảo đảm phế liệu nhập khẩu số:",
            "Giấy xác nhận ký quỹ bảo đảm phế liệu nhập khẩu số:",
        ],
        "field": "deposit_confirmation",
    },
    {"labels": ["Hợp đồng số", "Số hợp đồng"], "field": "contract_no"},
    {"labels": ["Hóa đơn số", "Số hóa đơn"], "field": "invoice_no"},
    {"labels": ["Vận đơn số", "Số vận đơn"], "field": "bill_of_lading_no"},
    {
        "labels": ["Tờ khai hàng hóa nhập khẩu số", "Tờ khai hàng hóa phế liệu nhập khẩu số", "Tờ khai số"],
        "field": "customs_declaration_no",
    },
    {
        "labels": ["Chủng loại phế liệu nhập khẩu:", "Chủng loại phế liệu nhập khẩu", "Tên sản phẩm/mặt hàng"],
        "field": "product_name",
    },
    {"labels": ["Số/khối lượng hàng theo khai báo:", "Số lượng hàng", "Khối lượng hàng"], "field": "quantity"},
    {
        "labels": [
            "Số container/phương tiện vận chuyển (hàng rời) đăng ký kiểm tra, giám định:",
            "Số lượng container:",
            "Số container:",
        ],
        "field": "container_count",
    },
]


def normalize_client_id(value: str) -> str:
    value = value.strip().lower().replace("đ", "d")
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = re.sub(r"[^a-z0-9_-]+", "_", value)
    value = re.sub(r"_+", "_", value).strip("_")
    if not value:
        raise ValueError("Ma khach hang khong hop le")
    return value


def make_template_config(client_id: str, kind: str, filename: str) -> dict:
    upper_id = client_id.upper()
    if kind == "phieu":
        return {
            "source": filename,
            "output": f"phieu_{upper_id}_da_cap_nhat.docx",
            "updates": DEFAULT_PHIEU_UPDATES,
        }
    if kind == "bien_ban":
        return {
            "source": filename,
            "output": f"bien_ban_{upper_id}_da_cap_nhat.docx",
            "updates": DEFAULT_BIEN_BAN_UPDATES,
        }
    raise ValueError(f"Loai template khong hop le: {kind}")


def build_client_config(
    client_id: str,
    phieu_filename: str | None = None,
    bien_ban_filename: str | None = None,
    display_name: str | None = None,
) -> dict:
    upper_id = client_id.upper()
    templates = []
    if phieu_filename:
        templates.append(make_template_config(client_id, "phieu", phieu_filename))
    if bien_ban_filename:
        templates.append(make_template_config(client_id, "bien_ban", bien_ban_filename))
    return {
        "name": (display_name or upper_id).strip(),
        "templates": templates,
    }


def save_client_config(path: Path, config: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(config, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
