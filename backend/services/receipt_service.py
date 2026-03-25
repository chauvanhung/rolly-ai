from __future__ import annotations

import base64
import json
import os
import re
import unicodedata
from datetime import datetime
from io import BytesIO

import httpx
import pytesseract
from fastapi import HTTPException, UploadFile, status
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

from backend.core.config import settings
from backend.schemas.receipt import ReceiptAnalysisResponse


class ReceiptService:
    TESSERACT_CANDIDATES = (
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Users\chauv\AppData\Local\Programs\Tesseract-OCR\tesseract.exe",
    )
    PRIMARY_TOTAL_LABELS = (
        "tong cong",
        "tong tien",
        "tong thanh toan",
        "tong thanh tien",
        "thanh tien",
        "can thanh toan",
        "phai thanh toan",
        "tong so tien thanh toan",
        "tong phai tra",
        "khach can tra",
        "so tien thanh toan",
        "grand total",
        "amount due",
        "amount",
        "total",
    )
    SECONDARY_TOTAL_LABELS = (
        "cong tien hang",
        "tam tinh",
        "subtotal",
        "tong",
        "sum",
        "cash",
    )
    AMOUNT_IGNORE_LABELS = (
        "tien khach tra",
        "khach dua",
        "tien mat",
        "cash received",
        "tendered",
        "change",
        "tra lai",
        "tra khach",
        "hoan lai",
        "vat",
        "thue",
        "phi phuc vu",
        "discount",
        "giam gia",
        "km",
        "so luong",
        "sl",
        "don gia",
        "mst",
        "ma gd",
        "stk",
        "tel",
        "phone",
        "hotline",
        "contact",
        "support",
        "bill no",
        "invoice no",
        "approval code",
        "transaction id",
        "merchant id",
        "terminal id",
        "pan no",
        "dt:",
    )
    MERCHANT_SKIP_KEYWORDS = (
        "dia chi",
        "address",
        "mst",
        "ma so thue",
        "tax code",
        "dt:",
        "dien thoai",
        "tel",
        "phuc vu",
        "ban",
        "bill",
        "hoa don",
        "receipt",
        "ngay",
        "gio",
        "thu ngan",
        "cashier",
    )
    MERCHANT_POSITIVE_KEYWORDS = (
        "ca phe",
        "cafe",
        "coffee",
        "restaurant",
        "mart",
        "store",
        "shop",
        "trading",
        "company",
        "co.",
        "pvt",
        ".com",
        "quan",
        "tiem",
    )
    DATE_PATTERNS = (
        r"(?P<day>\d{1,2})[\/\-.](?P<month>\d{1,2})[\/\-.](?P<year>\d{2,4})(?:\s+(?P<hour>\d{1,2})[:h](?P<minute>\d{2})(?:[:h](?P<second>\d{2}))?)?",
        r"(?:ngay|date)\s*[:\-]?\s*(?P<day>\d{1,2})[\/\-.](?P<month>\d{1,2})[\/\-.](?P<year>\d{2,4})(?:\s+(?P<hour>\d{1,2})[:h](?P<minute>\d{2})(?:[:h](?P<second>\d{2}))?)?",
    )
    CATEGORY_KEYWORDS = {
        "Ăn uống": (
            "ca phe",
            "cafe",
            "tra sua",
            "bun",
            "pho",
            "com",
            "restaurant",
            "food",
            "an uong",
            "quan an",
            "milktea",
            "coffee",
        ),
        "Di chuyển": ("grab", "be", "taxi", "xang", "gas", "tram thu phi", "gui xe", "sua xe"),
        "Mua sắm": ("mart", "store", "shop", "sieu thi", "coop", "winmart", "circle k", "ministop"),
        "Hóa đơn": ("dien", "nuoc", "internet", "wifi", "hoa don", "cap nuoc", "dien luc"),
        "Sức khỏe": ("thuoc", "pharmacy", "benh vien", "nha thuoc", "phong kham"),
        "Giáo dục": ("hoc phi", "truong", "university", "lop hoc", "khoa hoc"),
    }
    INCOME_KEYWORDS = ("salary", "luong", "thuong", "bonus", "refund", "hoan tien", "commission")

    def analyze(self, file: UploadFile) -> ReceiptAnalysisResponse:
        if not file.filename:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Thieu anh bill.")

        try:
            image_bytes = file.file.read()
            image = ImageOps.exif_transpose(Image.open(BytesIO(image_bytes))).convert("RGB")
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Khong doc duoc anh bill.") from exc

        optimized_bytes = self._optimize_image_for_vision(image)

        ocr_error: HTTPException | None = None
        try:
            ocr_result = self._analyze_with_tesseract(image)
            if ocr_result.amount or ocr_result.merchant:
                return ocr_result
        except HTTPException as exc:
            ocr_error = exc

        vision_error: HTTPException | None = None
        for model_name in self._candidate_vision_models():
            try:
                return self._analyze_with_vision(optimized_bytes, model_name)
            except HTTPException as exc:
                vision_error = exc

        try:
            return self._analyze_with_tesseract(image)
        except HTTPException as final_ocr_error:
            if vision_error is not None:
                detail = "Bill scan chua doc duoc on dinh tu anh nay. Hay thu anh ro hon hoac nhap nhanh bang AI."
                raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail) from final_ocr_error
            if ocr_error is not None:
                raise ocr_error
            raise

    def _analyze_with_vision(self, image_bytes: bytes, model_name: str) -> ReceiptAnalysisResponse:
        encoded = base64.b64encode(image_bytes).decode("utf-8")
        prompt = (
            "Ban la bo doc hoa don chi tieu gia dinh tai Viet Nam. "
            "Hay quan sat anh bill va tra ve mot JSON hop le theo schema: "
            '{"merchant": string|null, "amount": number|null, "transaction_type": "expense"|"income", '
            '"category": string|null, "note": string|null, "created_at": string|null, "detected_text": string|null, '
            '"confidence_note": string}. '
            "Neu thay ngay tren bill thi dien created_at theo ISO-8601. "
            "Neu khong chac ve amount thi de null. category nen gon va phu hop bill."
        )

        try:
            response = httpx.post(
                f"{settings.ollama_base_url}/api/chat",
                json={
                    "model": model_name,
                    "messages": [{"role": "user", "content": prompt, "images": [encoded]}],
                    "stream": False,
                    "options": {"temperature": 0.1, "num_predict": 120},
                },
                timeout=self._vision_timeout(model_name),
            )
            response.raise_for_status()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Vision model chua san sang de quet bill.",
            ) from exc

        raw = response.json().get("message", {}).get("content", "").strip()
        data = self._parse_json_payload(raw) or self._parse_vision_text_payload(raw)
        if not data:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Vision model da phan tich bill nhung tra ve khong dung dinh dang.",
            )

        detected_text = self._clean_text(data.get("detected_text"))
        amount = self._coerce_amount(data.get("amount"))
        merchant = self._clean_text(data.get("merchant"))
        transaction_type = self._clean_type(data.get("transaction_type"))
        category = self._clean_category(data.get("category"), detected_text or "", transaction_type)
        if self._looks_like_utility_bill_text(detected_text or "") or self._normalize_text(category) == "hoa don":
            transaction_type = "expense"
        note = self._clean_text(data.get("note")) or self._build_note(merchant, category, detected_text or "")
        created_at = self._coerce_datetime(data.get("created_at")) or self._extract_datetime_from_variants([detected_text or ""])
        confidence_note = self._clean_text(data.get("confidence_note")) or self._confidence_note(amount, merchant, source="vision")
        confidence_note = f"{confidence_note} | model={model_name}"

        return ReceiptAnalysisResponse(
            merchant=merchant,
            amount=amount,
            transaction_type=transaction_type,
            category=category,
            note=note,
            created_at=created_at,
            detected_text=detected_text,
            confidence_note=confidence_note,
        )

    def _analyze_with_tesseract(self, image: Image.Image) -> ReceiptAnalysisResponse:
        self._configure_tesseract()
        texts = self._collect_ocr_texts(image)
        if not texts:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OCR da chay nhung chua doc duoc noi dung bill.",
            )

        merged_text = "\n\n".join(texts)
        normalized = self._normalize_text(merged_text)
        amount = self._extract_amount_from_variants(texts)
        merchant = self._extract_merchant_from_variants(texts)
        created_at = self._extract_datetime_from_variants(texts)
        category = self._detect_category(normalized)
        transaction_type = self._detect_type(normalized)
        if self._looks_like_utility_bill_text(normalized) or self._normalize_text(category or "") == "hoa don":
            transaction_type = "expense"
        note = self._build_note(merchant, category, normalized)

        return ReceiptAnalysisResponse(
            merchant=merchant,
            amount=amount,
            transaction_type=transaction_type,
            category=category or ("Thu nhập khác" if transaction_type == "income" else "Chi tiêu khác"),
            note=note,
            created_at=created_at,
            detected_text=max(texts, key=len)[:3000],
            confidence_note=self._confidence_note(amount, merchant, source="ocr"),
        )

    def _collect_ocr_texts(self, image: Image.Image) -> list[str]:
        texts: list[str] = []
        seen: set[str] = set()
        for variant in self._ocr_variants(image):
            for config in ("--oem 3 --psm 6", "--oem 3 --psm 11", "--oem 3 --psm 4"):
                try:
                    text = pytesseract.image_to_string(variant, lang="vie+eng", config=config)
                except pytesseract.TesseractNotFoundError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail="Chua cai Tesseract OCR tren may/server nen chua quet bill duoc.",
                    ) from exc
                text = text.strip()
                if len(text) < 12:
                    continue
                signature = self._normalize_text(text)
                if signature and signature not in seen:
                    seen.add(signature)
                    texts.append(text)
        return texts

    def _ocr_variants(self, image: Image.Image) -> list[Image.Image]:
        base = ImageOps.exif_transpose(image).convert("L")
        autocontrast = ImageOps.autocontrast(base)
        enlarged = autocontrast.resize((autocontrast.width * 2, autocontrast.height * 2))
        sharpened = enlarged.filter(ImageFilter.SHARPEN)
        contrast = ImageEnhance.Contrast(sharpened).enhance(1.35)
        threshold = contrast.point(lambda value: 255 if value > 170 else 0)
        smooth = contrast.filter(ImageFilter.MedianFilter(size=3))
        return [autocontrast, enlarged, contrast, threshold, smooth]

    def _extract_amount_from_variants(self, texts: list[str]) -> float | None:
        best_amount: float | None = None
        best_score = float("-inf")
        recurring: dict[float, int] = {}

        for text in texts:
            candidate = self._extract_amount_from_lines(text)
            if candidate is not None:
                amount, score = candidate
                recurring[amount] = recurring.get(amount, 0) + 1
                if score > best_score:
                    best_amount = amount
                    best_score = score

        if best_amount is not None:
            if recurring.get(best_amount, 0) > 1:
                return best_amount
            repeated = sorted(recurring.items(), key=lambda item: (item[1], item[0]), reverse=True)
            if repeated and repeated[0][1] > 1 and repeated[0][0] >= best_amount * 0.5:
                return repeated[0][0]
            return best_amount

        normalized = self._normalize_text("\n".join(texts))
        return self._extract_amount(normalized)

    def _extract_amount_from_lines(self, text: str) -> tuple[float, float] | None:
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        if not lines:
            return None

        best: tuple[float, float] | None = None
        for index, raw_line in enumerate(lines):
            normalized = self._normalize_text(raw_line)
            has_primary_label = any(label in normalized for label in self.PRIMARY_TOTAL_LABELS)
            has_secondary_label = any(label in normalized for label in self.SECONDARY_TOTAL_LABELS)
            if not has_primary_label and not has_secondary_label:
                continue

            score = (index + 1) / max(len(lines), 1)
            score += 7.0 if has_primary_label else 3.0
            window = lines[index : min(len(lines), index + 3)]
            for candidate_line in window:
                amounts = self._extract_amount_tokens(candidate_line)
                if not amounts:
                    continue
                amount = max(amounts)
                if any(label in self._normalize_text(candidate_line) for label in self.AMOUNT_IGNORE_LABELS):
                    continue
                pair_score = score
                if candidate_line != raw_line:
                    pair_score += 2.5
                if re.search(r"(?:vnd|usd|eur|rs\.?|d|đ)\b", candidate_line, flags=re.IGNORECASE):
                    pair_score += 0.7
                if best is None or pair_score > best[1]:
                    best = (amount, pair_score)

        for index, raw_line in enumerate(lines):
            normalized = self._normalize_text(raw_line)
            amounts = self._extract_amount_tokens(raw_line)
            if not amounts:
                continue

            amount = max(amounts)
            if amount <= 0:
                continue

            has_primary_label = any(label in normalized for label in self.PRIMARY_TOTAL_LABELS)
            has_secondary_label = any(label in normalized for label in self.SECONDARY_TOTAL_LABELS)
            has_ignore_label = any(label in normalized for label in self.AMOUNT_IGNORE_LABELS)
            has_currency = bool(re.search(r"(?:vnd|usd|eur|rs\.?|d|đ)\b", raw_line, flags=re.IGNORECASE))
            longest_digits = max((len(re.sub(r"\D", "", token)) for token in re.findall(r"\d[\d\.,\s]*", raw_line)), default=0)

            if has_ignore_label and not has_primary_label and not has_secondary_label:
                continue
            if longest_digits >= 9 and not has_primary_label and not has_secondary_label and not has_currency:
                continue

            score = (index + 1) / max(len(lines), 1)
            if has_primary_label:
                score += 6.0
            if has_secondary_label:
                score += 2.0
            if has_ignore_label:
                score -= 4.0
            if "vat" in normalized or "thue" in normalized:
                score -= 3.0
            if re.search(r"\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}", raw_line):
                score -= 2.5
            if has_currency:
                score += 0.7
            if len(amounts) == 1:
                score += 0.5
            if amount >= 10000:
                score += 0.5
            if amount >= 10_000_000 and not has_primary_label and not has_secondary_label:
                score -= 6.0

            if best is None or score > best[1]:
                best = (amount, score)

        return best

    def _extract_amount_tokens(self, text: str) -> list[float]:
        tokens = re.findall(
            r"(?<!\d)(\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{2})?|\d+[.,]\d{2}|\d{4,9})(?:\s?(?:d|đ|vnd|usd|eur|rs))?(?!\d)",
            text,
            flags=re.IGNORECASE,
        )
        values: list[float] = []
        for token in tokens:
            value = self._to_number(token)
            if value and value < 1_000_000_000:
                values.append(value)
        return values

    def _extract_merchant_from_variants(self, texts: list[str]) -> str | None:
        best_line: str | None = None
        best_score = float("-inf")

        for text in texts:
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            for index, line in enumerate(lines[:8]):
                normalized = self._normalize_text(line)
                if len(normalized) < 3:
                    continue
                if any(keyword in normalized for keyword in self.MERCHANT_SKIP_KEYWORDS):
                    continue
                if sum(char.isdigit() for char in line) >= max(3, len(line) // 3):
                    continue

                alpha_chars = [char for char in line if char.isalpha()]
                if len(alpha_chars) < 4:
                    continue
                uppercase_ratio = 0.0
                if alpha_chars:
                    uppercase_ratio = sum(char.isupper() for char in alpha_chars) / len(alpha_chars)
                alpha_ratio = len(alpha_chars) / max(len(line.replace(" ", "")), 1)
                if alpha_ratio < 0.45:
                    continue
                noisy_chars = sum(not (char.isalnum() or char in " .,&-/") for char in line)
                noisy_ratio = noisy_chars / max(len(line), 1)
                if noisy_ratio > 0.18:
                    continue

                score = 4 - index
                score += uppercase_ratio * 2.0
                if any(keyword in normalized for keyword in self.MERCHANT_POSITIVE_KEYWORDS):
                    score += 1.5
                if len(line) > 10:
                    score += 0.5
                if len(line.split()) >= 2:
                    score += 0.4
                if 6 <= len(line) <= 42:
                    score += 0.4

                if score > best_score:
                    best_line = self._sanitize_merchant(line)
                    best_score = score

        return best_line

    def _extract_datetime_from_variants(self, texts: list[str]) -> datetime | None:
        for text in texts:
            for pattern in self.DATE_PATTERNS:
                for match in re.finditer(pattern, text, flags=re.IGNORECASE):
                    day = int(match.group("day"))
                    month = int(match.group("month"))
                    year = int(match.group("year"))
                    if year < 100:
                        year += 2000
                    hour = int(match.groupdict().get("hour") or 0)
                    minute = int(match.groupdict().get("minute") or 0)
                    second = int(match.groupdict().get("second") or 0)
                    try:
                        parsed = datetime(year, month, day, hour, minute, second)
                    except ValueError:
                        continue
                    if 2000 <= parsed.year <= datetime.now().year + 1:
                        return parsed
        return None

    def _parse_json_payload(self, raw: str) -> dict | None:
        cleaned = raw.strip().strip("`")
        if "```" in cleaned:
            cleaned = re.sub(r"```(?:json)?", "", cleaned, flags=re.IGNORECASE).replace("```", "").strip()
        try:
            return json.loads(cleaned)
        except Exception:
            match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
            if not match:
                return None
            try:
                return json.loads(match.group(0))
            except Exception:
                return None

    def _parse_vision_text_payload(self, raw: str) -> dict | None:
        text_value = raw.strip()
        if not text_value:
            return None

        fields = {
            "merchant": r"merchant\s*:\s*(.+)",
            "amount": r"amount\s*:\s*(.+)",
            "type": r"type\s*:\s*(.+)",
            "category": r"category\s*:\s*(.+)",
            "note": r"note\s*:\s*(.+)",
            "created_at": r"created[_ ]at\s*:\s*(.+)",
            "detected_text": r"detectedtext\s*:\s*(.+)",
            "confidence": r"confidence\s*:\s*(.+)",
        }

        extracted: dict[str, str] = {}
        for key, pattern in fields.items():
            match = re.search(pattern, text_value, flags=re.IGNORECASE)
            if match:
                extracted[key] = match.group(1).strip()

        normalized = self._normalize_text(text_value)
        return {
            "merchant": extracted.get("merchant") or self._extract_merchant(text_value),
            "amount": self._coerce_amount(extracted.get("amount")) or self._extract_amount(normalized),
            "transaction_type": self._clean_type(extracted.get("type")),
            "category": extracted.get("category") or self._detect_category(normalized),
            "note": extracted.get("note") or text_value[:240],
            "created_at": extracted.get("created_at"),
            "detected_text": extracted.get("detected_text", text_value),
            "confidence_note": extracted.get("confidence", "Vision model tra ve mo ta tu do, he thong da tu rut thong tin."),
        }

    def _normalize_text(self, text: str) -> str:
        if not text:
            return ""
        decomposed = unicodedata.normalize("NFKD", text)
        stripped = "".join(char for char in decomposed if not unicodedata.combining(char))
        stripped = stripped.replace("đ", "d").replace("Đ", "d").lower()
        stripped = re.sub(r"[^\w\s\.,:/-]", " ", stripped)
        return re.sub(r"\s+", " ", stripped).strip()

    def _extract_amount(self, text: str) -> float | None:
        candidates: list[float] = []
        for token in re.findall(r"\b\d{1,3}(?:[.,\s]\d{3})+(?:[.,]\d{2})?\b|\b\d+[.,]\d{2}\b|\b\d{4,9}\b", text):
            value = self._to_number(token)
            if value:
                candidates.append(value)
        return max(candidates) if candidates else None

    def _extract_merchant(self, text: str) -> str | None:
        return self._extract_merchant_from_variants([text])

    def _detect_category(self, text: str) -> str | None:
        if self._looks_like_utility_bill_text(text):
            return "Hóa đơn"
        if any(
            keyword in text
            for keyword in (
                "danh muc hoa don",
                "ma khach hang",
                "nha cung cap",
                "ky thanh toan",
                "chi tiet giao dich",
                "dien luc",
                "ctdl",
                "evn",
                "tien dien",
                "cap nuoc",
            )
        ):
            return "Hóa đơn"
        for category, keywords in self.CATEGORY_KEYWORDS.items():
            if any(keyword in text for keyword in keywords):
                return category
        return None

    def _detect_type(self, text: str) -> str:
        if self._looks_like_utility_bill_text(text):
            return "expense"
        if any(
            keyword in text
            for keyword in (
                "danh muc hoa don",
                "ma khach hang",
                "nha cung cap",
                "ky thanh toan",
                "chi tiet giao dich",
                "dien luc",
                "ctdl",
                "evn",
                "tien dien",
                "cap nuoc",
                "hoa don",
            )
        ):
            return "expense"
        if any(keyword in text for keyword in self.INCOME_KEYWORDS):
            return "income"
        return "expense"

    def _looks_like_utility_bill_text(self, text: str) -> bool:
        normalized = self._normalize_text(text)
        return any(
            keyword in normalized
            for keyword in (
                "danh muc hoa don",
                "ma khach hang",
                "nha cung cap",
                "ky thanh toan",
                "chi tiet giao dich",
                "dien luc",
                "ctdl",
                "evn",
                "tien dien",
                "tien nuoc",
                "cap nuoc",
                "hoa don",
                "momo",
                "zalopay",
                "zalo pay",
                "thanh cong",
            )
        )

    def _build_note(self, merchant: str | None, category: str | None, text: str) -> str:
        parts = []
        if merchant:
            parts.append(merchant)
        if category:
            parts.append(category)
        if "vat" in text.lower():
            parts.append("Co VAT")
        return " | ".join(parts) if parts else "Bill quet tu dong"

    def _confidence_note(self, amount: float | None, merchant: str | None, *, source: str) -> str:
        prefix = "Vision model" if source == "vision" else "OCR"
        if amount and merchant:
            return f"{prefix} da nhan dien duoc ten cua hang va tong tien tu bill."
        if amount:
            return f"{prefix} da nhan dien duoc tong tien, nhung ten cua hang con chua chac."
        return f"{prefix} da chay nhung tong tien van chua on dinh. Ban nen kiem tra lai truoc khi luu."

    def _to_number(self, value: str) -> float | None:
        compact = re.sub(r"\s+", "", value)
        if re.fullmatch(r"\d{1,3}(?:[.,]\d{3})+", compact):
            cleaned = re.sub(r"[^\d]", "", compact)
            return float(cleaned) if cleaned.isdigit() and float(cleaned) > 0 else None
        if re.fullmatch(r"\d{1,3}(?:[.,]\d{3})+[.,]\d{2}", compact):
            normalized = compact.replace(",", "")
            if compact.rfind(",") > compact.rfind("."):
                normalized = compact.replace(".", "").replace(",", ".")
            try:
                amount = float(normalized)
            except ValueError:
                return None
            return amount if amount > 0 else None
        if re.fullmatch(r"\d+[.,]\d{2}", compact):
            try:
                amount = float(compact.replace(",", "."))
            except ValueError:
                return None
            return amount if amount > 0 else None

        cleaned = re.sub(r"[^\d]", "", compact)
        if not cleaned.isdigit():
            return None
        amount = float(cleaned)
        return amount if amount > 0 else None

    def _coerce_amount(self, value: object) -> float | None:
        if value in (None, "", 0):
            return None
        if isinstance(value, (int, float)):
            return float(value) if float(value) > 0 else None
        text_value = str(value).strip()
        return self._to_number(text_value) or self._extract_amount(self._normalize_text(text_value))

    def _coerce_datetime(self, value: object) -> datetime | None:
        if value in (None, ""):
            return None
        text_value = str(value).strip()
        try:
            return datetime.fromisoformat(text_value.replace("Z", "+00:00"))
        except ValueError:
            return self._extract_datetime_from_variants([text_value])

    def _clean_text(self, value: object) -> str | None:
        if value is None:
            return None
        text_value = str(value).strip()
        return text_value or None

    def _sanitize_merchant(self, value: str) -> str:
        text_value = value.strip()
        domain_match = re.search(r"([A-Za-z0-9][A-Za-z0-9.-]+\.[A-Za-z]{2,})", text_value)
        if domain_match:
            return domain_match.group(1)[:120]
        text_value = re.sub(r"^[^\wÀ-ỹ]+", "", text_value, flags=re.UNICODE)
        text_value = re.sub(r"\s+", " ", text_value)
        return text_value[:120]

    def _clean_type(self, value: object) -> str:
        text_value = str(value or "").strip().lower()
        if any(keyword in text_value for keyword in ("hoa don", "bill", "dien", "nuoc", "internet", "evn", "ctdl", "momo", "zalopay")):
            return "expense"
        return "income" if text_value == "income" else "expense"

    def _clean_category(self, value: object, detected_text: str, transaction_type: str) -> str:
        category = self._clean_text(value)
        if category:
            return category
        inferred = self._detect_category(self._normalize_text(detected_text))
        if inferred:
            return inferred
        return "Thu nhập khác" if transaction_type == "income" else "Chi tiêu khác"

    def _candidate_vision_models(self) -> list[str]:
        candidates = [settings.ollama_vision_model]
        unique: list[str] = []
        for item in candidates:
            if item and item not in unique:
                unique.append(item)
        return unique

    def _optimize_image_for_vision(self, image: Image.Image) -> bytes:
        optimized = image.copy()
        optimized.thumbnail((1024, 1024))
        buffer = BytesIO()
        optimized.save(buffer, format="JPEG", quality=72, optimize=True)
        return buffer.getvalue()

    def _vision_timeout(self, model_name: str) -> int:
        if "moondream" in model_name.lower():
            return 16
        return 28

    def _configure_tesseract(self) -> None:
        current = getattr(pytesseract.pytesseract, "tesseract_cmd", "") or ""
        if current and os.path.exists(current):
            return
        for candidate in self.TESSERACT_CANDIDATES:
            if os.path.exists(candidate):
                pytesseract.pytesseract.tesseract_cmd = candidate
                return
