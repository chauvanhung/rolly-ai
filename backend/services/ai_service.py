from __future__ import annotations

import json
import re
import unicodedata
from datetime import datetime, timedelta
from decimal import Decimal

import httpx
from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.models.user import User
from backend.repositories.category_rule_repository import CategoryRuleRepository
from backend.schemas.ai import AIActionResponse, AIResponse, ParsedTransactionPreview
from backend.schemas.planning import BudgetCreate, ReminderCreate, UtilityBillCreate
from backend.schemas.transaction import TransactionCreate
from backend.services.formatters import format_vnd
from backend.services.planning_service import PlanningService
from backend.services.transaction_service import TransactionService


class AIService:
    TONE_PROMPTS = {
        "gentle": "Giọng hiền, ấm, tự nhiên, động viên nhẹ.",
        "straight": "Giọng thẳng, hơi cà khịa nhẹ nhưng không xúc phạm nặng.",
        "playful": "Giọng hài hước, dí dỏm, lanh lợi.",
        "coach": "Giọng như huấn luyện viên tài chính, rõ ràng, thúc đẩy hành động.",
    }
    GREETING_TOKENS = (
        "hi",
        "hello",
        "helo",
        "hey",
        "hii",
        "hiii",
        "xin chao",
        "chao",
        "chao ban",
        "alo",
    )
    SOCIAL_TOKENS = (
        "cam on",
        "thanks",
        "thank you",
        "ok",
        "oke",
        "okela",
        "uh",
        "uhm",
        "um",
        "duoc roi",
        "tot",
        "hay qua",
        "ban lam tiep di",
        "giup toi voi",
    )
    FINANCE_HINT_TOKENS = (
        "chi",
        "tieu",
        "mua",
        "uong",
        "an",
        "cafe",
        "ca phe",
        "luong",
        "thu nhap",
        "thuong",
        "hoa don",
        "ngan sach",
        "nhac",
        "evn",
        "dien luc",
        "momo",
        "zalopay",
        "grab",
        "taxi",
        "xang",
        "sua xe",
        "internet",
        "wifi",
        "tien dien",
        "tien nuoc",
        "hoc phi",
        "thuoc",
        "benh vien",
        "mart",
        "shop",
    )
    CATEGORY_RULES = {
        "Di chuyển": ("grab", "taxi", "xang", "do xang", "xe", "sua xe", "gui xe", "phat csgt", "ve xe"),
        "Ăn uống": ("an", "uong", "ca phe", "cafe", "tra sua", "com", "bun", "pho", "do an", "dinner", "lunch"),
        "Mua sắm": ("mua", "shopping", "sieu thi", "mart", "shop", "quan ao"),
        "Hóa đơn": ("dien", "nuoc", "wifi", "internet", "hoa don", "tien nha"),
        "Sức khỏe": ("thuoc", "benh vien", "kham", "nha khoa"),
        "Giáo dục": ("hoc", "hoc phi", "sach", "khoa hoc"),
        "Lương": ("luong", "salary", "thuong", "bonus", "hoa hong"),
    }
    PAYMENT_METHODS = {
        "momo": "MoMo",
        "zalo": "ZaloPay",
        "zalopay": "ZaloPay",
        "ngan hang": "Ngân hàng",
        "bank": "Ngân hàng",
        "tien mat": "Tiền mặt",
        "cash": "Tiền mặt",
    }

    def __init__(self, db: Session) -> None:
        self.db = db
        self.transaction_service = TransactionService(db)
        self.planning_service = PlanningService(db)
        self.category_rules = CategoryRuleRepository(db)
        self._current_user_id: int | None = None

    def answer(self, current_user: User, question: str, include_family: bool) -> AIResponse:
        question = question.strip()
        if not question:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Câu hỏi không được để trống.")

        generated_sql = self._generate_sql(question, include_family)
        rows = self._run_safe_query(generated_sql, current_user=current_user)
        return AIResponse(
            answer=self._summarize_rows(question, rows, current_user, include_family),
            sql=generated_sql,
            rows=rows[:20],
        )

    def execute_command(self, current_user: User, message: str, shared_with_family: bool, tone: str = "gentle") -> AIActionResponse:
        self._current_user_id = current_user.id
        normalized = self._normalize_message(message)
        tone = tone if tone in self.TONE_PROMPTS else "gentle"

        if self._looks_like_greeting(normalized):
            return self._chat_reply(message, tone)
        if not self._extract_amount(normalized) and not self._looks_like_finance_intent(normalized):
            return self._chat_reply(message, tone)
        if self._looks_like_budget_command(normalized):
            return self._create_budget_from_message(current_user, normalized, shared_with_family, tone)
        if self._looks_like_reminder_command(normalized):
            return self._create_reminder_from_message(current_user, normalized, tone)
        if self._looks_like_utility_bill_command(normalized):
            return self._create_utility_bill_from_message(current_user, normalized, tone)
        if self._looks_like_social_message(normalized):
            return self._chat_reply(message, tone)
        return self._create_transaction_from_message(current_user, message, shared_with_family, tone)

    def _create_transaction_from_message(self, current_user: User, message: str, shared_with_family: bool, tone: str) -> AIActionResponse:
        parsed = self._parse_transaction_message(message, shared_with_family)
        payload = TransactionCreate(
            type=parsed.type,
            amount=Decimal(str(parsed.amount)),
            category=parsed.category,
            note=parsed.note,
            created_at=parsed.created_at,
            shared_with_family=shared_with_family,
        )
        transaction = self.transaction_service.create_transaction(current_user, payload)
        direction = "một khoản chi" if parsed.type == "expense" else "một khoản thu"
        answer = (
            f"Mình đã ghi lại {direction} {parsed.category.lower()} trị giá "
            f"{format_vnd(parsed.amount)} vào ngày {parsed.created_at.strftime('%d/%m/%Y')}."
        )
        return AIActionResponse(
            action="transaction",
            answer=self._style_action_reply(answer, message, tone, action="transaction"),
            parsed=parsed,
            transaction=transaction,
        )

    def _create_budget_from_message(self, current_user: User, text_value: str, shared_with_family: bool, tone: str) -> AIActionResponse:
        amount = self._extract_amount(text_value)
        if amount is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mình chưa thấy hạn mức ngân sách trong câu này.")
        category = self._detect_budget_category(text_value)
        budget = self.planning_service.create_budget(
            current_user,
            BudgetCreate(category=category, monthly_limit=Decimal(str(amount)), shared_with_family=shared_with_family),
        )
        answer = f"Mình đã đặt ngân sách {category.lower()} ở mức {format_vnd(amount)} mỗi tháng."
        return AIActionResponse(
            action="budget",
            answer=self._style_action_reply(answer, text_value, tone, action="budget"),
            data={"budget": budget.model_dump(mode="json")},
        )

    def _create_reminder_from_message(self, current_user: User, text_value: str, tone: str) -> AIActionResponse:
        amount = self._extract_amount(text_value)
        due_date = self._extract_due_date(text_value)
        title = self._extract_reminder_title(text_value)
        category = self._detect_category(text_value, "expense")
        recurrence = "monthly" if "hang thang" in text_value or "moi thang" in text_value else "once"
        reminder = self.planning_service.create_reminder(
            current_user,
            ReminderCreate(
                title=title,
                category=category,
                amount=Decimal(str(amount)) if amount else None,
                due_date=due_date,
                recurrence=recurrence,
                note="Tạo từ AI chat",
            ),
        )
        answer = f"Mình đã tạo nhắc việc '{title}' đến hạn ngày {due_date.strftime('%d/%m/%Y')}."
        return AIActionResponse(
            action="reminder",
            answer=self._style_action_reply(answer, text_value, tone, action="reminder"),
            data={"reminder": reminder.model_dump(mode="json")},
        )

    def _create_utility_bill_from_message(self, current_user: User, text_value: str, tone: str) -> AIActionResponse:
        amount = self._extract_amount(text_value)
        due_day = self._extract_due_day(text_value)
        provider = self._detect_bill_provider(text_value)
        customer_code = self._extract_customer_code(text_value)
        payment_method = self._detect_payment_method(text_value)
        if not customer_code:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mình chưa thấy mã khách hàng trong câu này.")
        bill = self.planning_service.create_utility_bill(
            current_user,
            UtilityBillCreate(
                provider=provider,
                customer_code=customer_code,
                category="Hóa đơn",
                preferred_payment_method=payment_method,
                estimated_amount=Decimal(str(amount)) if amount else None,
                due_day=due_day,
                note="Tạo từ AI chat",
                is_active=True,
            ),
        )
        answer = f"Mình đã thêm hóa đơn {provider} với mã {customer_code}, thường đóng qua {payment_method}."
        return AIActionResponse(
            action="utility_bill",
            answer=self._style_action_reply(answer, text_value, tone, action="utility_bill"),
            data={"utility_bill": bill.model_dump(mode="json")},
        )

    def _parse_transaction_message(self, message: str, shared_with_family: bool) -> ParsedTransactionPreview:
        normalized = self._normalize_message(message)
        amount = self._extract_amount(normalized)

        if amount is not None:
            transaction_type = self._detect_type(normalized)
            category = self._detect_category(normalized, transaction_type)
            if self._looks_like_utility_bill_command(normalized) or self._normalize_message(category) == "hoa don":
                transaction_type = "expense"
            created_at = self._detect_datetime(normalized)
            note = self._build_note(normalized, category, transaction_type)
            return ParsedTransactionPreview(
                type=transaction_type,
                amount=float(amount),
                category=category,
                note=note,
                created_at=created_at,
                shared_with_family=shared_with_family,
            )

        llm_result = self._try_llm_parse(message)
        if llm_result:
            if self._looks_like_utility_bill_command(normalized) or self._normalize_message(str(llm_result["category"])) == "hoa don":
                llm_result["type"] = "expense"
            return ParsedTransactionPreview(
                type=llm_result["type"],
                amount=float(llm_result["amount"]),
                category=llm_result["category"],
                note=llm_result["note"],
                created_at=llm_result["created_at"],
                shared_with_family=shared_with_family,
            )

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mình chưa nhận ra số tiền trong câu này.")

    def _try_llm_parse(self, message: str) -> dict | None:
        prompt = f"""
Bạn là bộ phân tích giao dịch tài chính cá nhân.
Hãy đọc câu tiếng Việt của người dùng và trả về JSON hợp lệ duy nhất theo schema:
{{
  "type": "expense" | "income",
  "amount": number,
  "category": string,
  "note": string,
  "created_at": "ISO-8601"
}}
Không trả lời giải thích, chỉ trả JSON.
Câu người dùng: {message}
"""
        try:
            response = httpx.post(
                f"{settings.ollama_base_url}/api/generate",
                json={
                    "model": settings.ollama_llm_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"num_predict": 120, "temperature": 0.1},
                },
                timeout=min(settings.ai_request_timeout, 12),
            )
            response.raise_for_status()
            raw = response.json().get("response", "").strip().strip("`")
            if "```" in raw:
                raw = re.sub(r"```(?:json)?", "", raw, flags=re.IGNORECASE).replace("```", "").strip()
            data = json.loads(raw)
            created_at = datetime.fromisoformat(str(data["created_at"]).replace("Z", "+00:00"))
            amount = float(data["amount"])
            if amount <= 0:
                return None
            tx_type = str(data["type"]).lower()
            if tx_type not in {"income", "expense"}:
                tx_type = "expense"
            category = str(data["category"]).strip() or ("Thu nhập khác" if tx_type == "income" else "Chi tiêu khác")
            return {
                "type": tx_type,
                "amount": amount,
                "category": category,
                "note": str(data["note"]).strip() or "Ghi nhận từ AI",
                "created_at": created_at,
            }
        except Exception:
            return None

    def _normalize_message(self, message: str) -> str:
        text_value = unicodedata.normalize("NFKD", message.lower().strip())
        text_value = "".join(char for char in text_value if not unicodedata.combining(char))
        text_value = text_value.replace("đ", "d")
        return re.sub(r"\s+", " ", text_value)

    def _extract_amount(self, text_value: str) -> int | None:
        prioritized_patterns = [
            r"(?<![/\d])(\d+(?:[\.,]\d+)?)(?:\s*)(k|nghin|ngan|trieu|tr|m)\b",
            r"(?<![/\d])(\d{1,3}(?:[.\s]\d{3})+|\d+)(?:\s*)(d|dong|vnd)\b",
            r"(?<![/\d])(\d{1,3}(?:[.\s]\d{3})+)(?![/\d])",
        ]
        for pattern in prioritized_patterns:
            match = re.search(pattern, text_value)
            if not match:
                continue
            raw_number = match.group(1).replace(" ", "")
            unit = (match.group(2) if len(match.groups()) > 1 else "").lower()
            if "." in raw_number and re.fullmatch(r"\d{1,3}(?:\.\d{3})+", raw_number):
                number = float(raw_number.replace(".", ""))
            else:
                number = float(raw_number.replace(",", "."))
            if unit in {"k", "nghin", "ngan"}:
                number *= 1000
            elif unit in {"trieu", "tr", "m"}:
                number *= 1_000_000
            return int(number)
        return None

    def _detect_type(self, text_value: str) -> str:
        if self._looks_like_utility_bill_command(text_value):
            return "expense"
        income_tokens = ("duoc tra", "nhan luong", "luong", "thuong", "duoc hoan", "refund", "thu nhap", "ban do", "ban hang")
        return "income" if any(token in text_value for token in income_tokens) else "expense"

    def _detect_category(self, text_value: str, transaction_type: str) -> str:
        matched_rule = self._match_custom_rule(text_value, transaction_type)
        if matched_rule:
            return matched_rule.category
        if transaction_type == "income":
            return "Lương" if any(token in text_value for token in ("luong", "thuong", "bonus")) else "Thu nhập khác"
        for category, keywords in self.CATEGORY_RULES.items():
            if any(keyword in text_value for keyword in keywords):
                return category
        return "Chi tiêu khác"

    def _detect_datetime(self, text_value: str) -> datetime:
        now = datetime.now()
        explicit_datetime = re.search(r"\b(\d{1,2})/(\d{1,2})/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?\b", text_value)
        if explicit_datetime:
            day = int(explicit_datetime.group(1))
            month = int(explicit_datetime.group(2))
            year = int(explicit_datetime.group(3))
            hour = int(explicit_datetime.group(4)) if explicit_datetime.group(4) else now.hour
            minute = int(explicit_datetime.group(5)) if explicit_datetime.group(5) else now.minute
            try:
                return datetime(year, month, day, hour, minute)
            except ValueError:
                pass
        if "hom qua" in text_value:
            return now - timedelta(days=1)
        if "hom kia" in text_value:
            return now - timedelta(days=2)
        if "sang nay" in text_value:
            return now.replace(hour=8, minute=0, second=0, microsecond=0)
        if "trua nay" in text_value:
            return now.replace(hour=12, minute=0, second=0, microsecond=0)
        if "toi qua" in text_value:
            return (now - timedelta(days=1)).replace(hour=19, minute=0, second=0, microsecond=0)
        return now

    def _build_note(self, text_value: str, category: str, transaction_type: str) -> str:
        matched_rule = self._match_custom_rule(text_value, transaction_type)
        if matched_rule and matched_rule.note_template:
            return matched_rule.note_template
        cleaned = re.sub(r"\b(hom nay|hom qua|hom kia|sang nay|trua nay|toi qua)\b", "", text_value, flags=re.IGNORECASE)
        cleaned = re.sub(r"\b\d{1,2}/\d{1,2}/\d{4}(?:\s+\d{1,2}:\d{1,2})?\b", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\b\d+(?:[\.,]\d+)?\s*(k|nghin|ngan|trieu|tr|m)?\b", "", cleaned).strip(" ,.-")
        if cleaned:
            return cleaned
        return f"Ghi nhận tự động vào nhóm {category.lower()}"

    def _match_custom_rule(self, text_value: str, transaction_type: str | None):
        if not self._current_user_id:
            return None
        normalized = self._normalize_message(text_value)
        for rule in self.category_rules.list_active_for_user(self._current_user_id):
            keyword = self._normalize_message(rule.keyword)
            if keyword not in normalized:
                continue
            if transaction_type and rule.transaction_type and rule.transaction_type != transaction_type:
                continue
            return rule
        return None

    def _looks_like_budget_command(self, text_value: str) -> bool:
        return "ngan sach" in text_value or ("gioi han" in text_value and self._extract_amount(text_value) is not None)

    def _looks_like_greeting(self, text_value: str) -> bool:
        compact = re.sub(r"[^a-z\s]", "", text_value).strip()
        return compact in self.GREETING_TOKENS

    def _looks_like_social_message(self, text_value: str) -> bool:
        compact = re.sub(r"[^a-z\s]", "", text_value).strip()
        return compact in self.SOCIAL_TOKENS

    def _looks_like_finance_intent(self, text_value: str) -> bool:
        return any(token in text_value for token in self.FINANCE_HINT_TOKENS)

    def _chat_reply(self, message: str, tone: str) -> AIActionResponse:
        prompt = f"""
Bạn là trợ lý tài chính cá nhân nói tiếng Việt, giọng tự nhiên, ngắn gọn, thân thiện.
Ngữ cảnh: bạn đang ở trong app quản lý chi tiêu và đang chat với người dùng.
Nếu người dùng chỉ đang chào hỏi, cảm ơn, xác nhận hoặc nói chuyện ngắn, hãy trả lời như một trợ lý tự nhiên.
Nếu phù hợp, gợi ý thật ngắn người dùng có thể nhập một câu như:
- hôm qua ăn trưa 60k
- đặt ngân sách ăn uống 3 triệu
- thêm hóa đơn EVN mã khách hàng ...
Phong cách bắt buộc: {self.TONE_PROMPTS.get(tone, self.TONE_PROMPTS["gentle"])}
Chỉ trả lời bằng nội dung hội thoại, không JSON.

Tin nhắn người dùng: {message}
"""
        try:
            response = httpx.post(
                f"{settings.ollama_base_url}/api/generate",
                json={
                    "model": settings.ollama_llm_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"num_predict": 80, "temperature": 0.4},
                },
                timeout=min(settings.ai_request_timeout, 8),
            )
            response.raise_for_status()
            answer = response.json().get("response", "").strip()
        except Exception:
            fallback_map = {
                "gentle": "Mình đây. Bạn cứ nhắn tự nhiên như 'hôm qua ăn trưa 60k' hoặc 'đặt ngân sách ăn uống 3 triệu' nhé.",
                "straight": "Mình đây. Cứ nói thẳng nhu cầu của bạn, ví dụ 'uống cafe 45k' hay 'đặt ngân sách ăn uống 3 triệu'.",
                "playful": "Mình đây. Cứ nhắn kiểu tự nhiên như 'cafe sáng 45k' hay 'thêm hóa đơn EVN 650k' là mình lo tiếp cho.",
                "coach": "Mình sẵn sàng. Bạn cứ nêu đúng việc cần làm như 'ghi chi 60k' hoặc 'đặt ngân sách 3 triệu', mình sẽ xử lý ngay.",
            }
            answer = fallback_map.get(tone, fallback_map["gentle"])
        return AIActionResponse(action="chat", answer=answer)

    def _style_action_reply(self, base_answer: str, original_message: str, tone: str, *, action: str) -> str:
        if tone == "gentle":
            return base_answer

        prompt = f"""
Bạn là trợ lý tài chính trong app quản lý chi tiêu.
Hãy viết lại câu trả lời sau cho tự nhiên hơn theo đúng phong cách được chọn, nhưng phải giữ nguyên dữ kiện, số tiền, loại hành động và không được bịa thêm.

Phong cách bắt buộc: {self.TONE_PROMPTS.get(tone, self.TONE_PROMPTS["gentle"])}
Loại hành động: {action}
Tin nhắn gốc của người dùng: {original_message}
Câu trả lời gốc: {base_answer}

Yêu cầu:
- Tối đa 2 câu ngắn.
- Vẫn lịch sự và an toàn.
- Nếu là phong cách thẳng hoặc hài hước thì chỉ cà khịa nhẹ, không xúc phạm độc hại.
- Chỉ trả về câu trả lời hoàn chỉnh bằng tiếng Việt.
"""
        try:
            response = httpx.post(
                f"{settings.ollama_base_url}/api/generate",
                json={
                    "model": settings.ollama_llm_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"num_predict": 90, "temperature": 0.6},
                },
                timeout=min(settings.ai_request_timeout, 6),
            )
            response.raise_for_status()
            styled = response.json().get("response", "").strip()
            return styled or base_answer
        except Exception:
            if tone == "straight":
                return f"{base_answer} Ghi rồi nhé, đừng để mấy khoản nhỏ này trôi mất nữa."
            if tone == "playful":
                return f"{base_answer} Nhỏ mà có võ đó, mình đã chốt lại cho bạn rồi."
            if tone == "coach":
                return f"{base_answer} Giữ nhịp như vậy thì bạn sẽ kiểm soát dòng tiền tốt hơn."
            return base_answer

    def _looks_like_reminder_command(self, text_value: str) -> bool:
        return any(token in text_value for token in ("nhac", "nhac viec", "nhac tien", "den han"))

    def _looks_like_utility_bill_command(self, text_value: str) -> bool:
        return any(
            token in text_value
            for token in (
                "hoa don",
                "ma khach hang",
                "evn",
                "dien luc",
                "ctdl",
                "cap nuoc",
                "internet",
                "wifi",
                "thanh toan",
                "tien dien",
                "tien nuoc",
                "momo",
                "zalopay",
                "zalo pay",
            )
        )

    def _detect_budget_category(self, text_value: str) -> str:
        return self._detect_category(text_value, "expense")

    def _extract_due_day(self, text_value: str) -> int:
        match = re.search(r"(?:ngay|mung)\s*(\d{1,2})", text_value)
        if match:
            day = int(match.group(1))
            if 1 <= day <= 31:
                return day
        return 10

    def _extract_due_date(self, text_value: str):
        now = datetime.now()
        day = self._extract_due_day(text_value)
        try:
            due = datetime(now.year, now.month, day).date()
        except ValueError:
            due = datetime(now.year, now.month, 28).date()
        if due < now.date():
            month = now.month + 1 if now.month < 12 else 1
            year = now.year if now.month < 12 else now.year + 1
            try:
                due = datetime(year, month, day).date()
            except ValueError:
                due = datetime(year, month, 28).date()
        return due

    def _extract_reminder_title(self, text_value: str) -> str:
        if "tien dien" in text_value:
            return "Tiền điện"
        if "tien nuoc" in text_value:
            return "Tiền nước"
        if "internet" in text_value or "wifi" in text_value:
            return "Internet"
        cleaned = re.sub(r"\b(nhac|nhac viec|den han|ngay\s*\d{1,2}|mung\s*\d{1,2})\b", "", text_value).strip(" ,.-")
        return cleaned[:160] or "Nhắc thanh toán"

    def _detect_bill_provider(self, text_value: str) -> str:
        if "evn" in text_value or "dien luc" in text_value or "ctdl" in text_value:
            return "EVN"
        if "nuoc" in text_value:
            return "Nước"
        if "internet" in text_value or "wifi" in text_value:
            return "Internet"
        if "dien thoai" in text_value:
            return "Điện thoại"
        return "Khác"

    def _extract_customer_code(self, text_value: str) -> str | None:
        match = re.search(r"\b([a-z]{1,4}\d{6,20}|\d{8,20})\b", text_value, flags=re.IGNORECASE)
        return match.group(1).upper() if match else None

    def _detect_payment_method(self, text_value: str) -> str:
        for token, label in self.PAYMENT_METHODS.items():
            if token in text_value:
                return label
        return "MoMo"

    def _generate_sql(self, question: str, include_family: bool) -> str:
        scope_clause = "t.user_id = :user_id"
        if include_family:
            scope_clause = "(t.user_id = :user_id OR t.family_id = :family_id)"

        if self._can_use_fallback_sql(question):
            return self._fallback_sql(question, scope_clause)

        prompt = f"""
Bạn là trợ lý phân tích tài chính cá nhân.
Hãy chuyển câu hỏi tiếng Việt thành duy nhất một câu SQL PostgreSQL dạng SELECT.
Chỉ dùng bảng transactions với bí danh t.
Các cột hợp lệ: id, user_id, family_id, type, amount, category, note, created_at.
Luôn thêm điều kiện WHERE {scope_clause}.
Không dùng INSERT, UPDATE, DELETE, DROP, ALTER.
Chỉ trả về SQL, không giải thích.
Câu hỏi: {question}
"""
        try:
            response = httpx.post(
                f"{settings.ollama_base_url}/api/generate",
                json={
                    "model": settings.ollama_llm_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"num_predict": min(settings.ai_max_tokens, 180), "temperature": 0.1},
                },
                timeout=settings.ai_request_timeout,
            )
            response.raise_for_status()
            sql = response.json().get("response", "").strip()
        except Exception:
            sql = ""
        return self._normalize_generated_sql(sql, question, scope_clause)

    def _can_use_fallback_sql(self, question: str) -> bool:
        q = self._normalize_message(question)
        simple_patterns = (
            "thang nay toi tieu bao nhieu",
            "thang nay toi chi bao nhieu",
            "thang nay toi thu bao nhieu",
            "thang nay toi kiem bao nhieu",
            "tong chi",
            "tong thu",
            "chi nhieu nhat",
            "nhom nao chi nhieu nhat",
            "chi tieu theo danh muc",
        )
        return any(pattern in q for pattern in simple_patterns)

    def _normalize_generated_sql(self, sql: str, question: str, scope_clause: str) -> str:
        if not sql:
            return self._fallback_sql(question, scope_clause)
        sql = sql.strip().strip("`")
        if "```" in sql:
            sql = re.sub(r"```(?:sql)?", "", sql, flags=re.IGNORECASE).replace("```", "").strip()
        normalized = sql.lower()
        if not normalized.startswith("select"):
            return self._fallback_sql(question, scope_clause)
        if ";" in sql.strip().rstrip(";"):
            return self._fallback_sql(question, scope_clause)
        if any(word in normalized for word in ("insert", "update", "delete", "drop", "alter", "truncate", "create")):
            return self._fallback_sql(question, scope_clause)
        if " from transactions" not in normalized:
            return self._fallback_sql(question, scope_clause)
        if ":user_id" not in sql:
            if " where " in normalized:
                sql = f"{sql} AND {scope_clause}"
            else:
                sql = f"{sql} WHERE {scope_clause}"
        return sql

    def _fallback_sql(self, question: str, scope_clause: str) -> str:
        q = question.lower()
        if "thang nay" in q and ("tieu" in q or "chi" in q):
            return (
                "SELECT COALESCE(SUM(t.amount), 0) AS total_expense "
                "FROM transactions t "
                f"WHERE {scope_clause} AND t.type = 'expense' "
                "AND date_trunc('month', t.created_at) = date_trunc('month', now())"
            )
        if "thang nay" in q and ("thu" in q or "kiem" in q):
            return (
                "SELECT COALESCE(SUM(t.amount), 0) AS total_income "
                "FROM transactions t "
                f"WHERE {scope_clause} AND t.type = 'income' "
                "AND date_trunc('month', t.created_at) = date_trunc('month', now())"
            )
        return (
            "SELECT t.category, COALESCE(SUM(t.amount), 0) AS total "
            "FROM transactions t "
            f"WHERE {scope_clause} AND t.type = 'expense' "
            "GROUP BY t.category ORDER BY total DESC LIMIT 5"
        )

    def _run_safe_query(self, sql: str, *, current_user: User) -> list[dict]:
        params = {"user_id": current_user.id, "family_id": current_user.family_id}
        result = self.db.execute(text(sql), params)
        return [dict(row._mapping) for row in result]

    def _summarize_rows(self, question: str, rows: list[dict], current_user: User, include_family: bool) -> str:
        summary = self.transaction_service.get_summary(current_user, include_family=include_family)
        if not rows:
            return "Hiện chưa có dữ liệu phù hợp để phân tích."
        first_row = rows[0]
        if "total_expense" in first_row:
            amount = Decimal(str(first_row["total_expense"]))
            return f"Tháng này bạn đã chi khoảng {format_vnd(amount)}."
        if "total_income" in first_row:
            amount = Decimal(str(first_row["total_income"]))
            return f"Tháng này bạn đã thu khoảng {format_vnd(amount)}."
        if summary.by_category:
            top_category = max(summary.by_category, key=lambda item: Decimal(str(item["total"])))
            return (
                f"Bạn đang chi nhiều nhất cho {top_category['category']} với khoảng "
                f"{format_vnd(Decimal(str(top_category['total'])))}. Bạn nên thử giảm 10-20% ngân sách của nhóm này."
            )
        return f"Tôi đã xử lý câu hỏi: {question}"
