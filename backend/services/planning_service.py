from calendar import monthrange
from datetime import date
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.models.budget import Budget
from backend.models.category_rule import CategoryRule
from backend.models.google_calendar_sync import GoogleCalendarSync
from backend.models.reminder import Reminder
from backend.models.savings_goal import SavingsGoal
from backend.models.user import User
from backend.models.utility_bill import UtilityBill
from backend.repositories.budget_repository import BudgetRepository
from backend.repositories.category_rule_repository import CategoryRuleRepository
from backend.repositories.reminder_repository import ReminderRepository
from backend.repositories.savings_goal_repository import SavingsGoalRepository
from backend.repositories.utility_bill_repository import UtilityBillRepository
from backend.schemas.planning import (
    BudgetCreate,
    BudgetResponse,
    BudgetUpdate,
    CategoryRuleCreate,
    CategoryRuleResponse,
    CategoryRuleUpdate,
    ReminderCreate,
    ReminderResponse,
    ReminderUpdate,
    SavingsGoalCreate,
    SavingsGoalResponse,
    SavingsGoalUpdate,
    UtilityBillCreate,
    UtilityBillResponse,
    UtilityBillUpdate,
)


class PlanningService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.budgets = BudgetRepository(db)
        self.goals = SavingsGoalRepository(db)
        self.reminders = ReminderRepository(db)
        self.rules = CategoryRuleRepository(db)
        self.utility_bills = UtilityBillRepository(db)

    def list_budgets(self, current_user: User) -> list[BudgetResponse]:
        return [self._serialize_budget(item, current_user.family_id) for item in self.budgets.list_for_user(user_id=current_user.id, family_id=current_user.family_id)]

    def create_budget(self, current_user: User, payload: BudgetCreate) -> BudgetResponse:
        family_id = current_user.family_id if payload.shared_with_family else None
        existing = self.budgets.find_by_scope(user_id=current_user.id, family_id=family_id, category=payload.category)
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Danh muc nay da co ngan sach.")
        budget = Budget(
            user_id=current_user.id,
            family_id=family_id,
            category=payload.category,
            monthly_limit=payload.monthly_limit,
        )
        self.budgets.create(budget)
        self.db.commit()
        self.db.refresh(budget)
        return self._serialize_budget(budget, current_user.family_id)

    def update_budget(self, current_user: User, budget_id: int, payload: BudgetUpdate) -> BudgetResponse:
        budget = self.budgets.get_for_user(budget_id, user_id=current_user.id, family_id=current_user.family_id)
        if not budget:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay ngan sach.")
        if payload.category is not None:
            budget.category = payload.category
        if payload.monthly_limit is not None:
            budget.monthly_limit = payload.monthly_limit
        if payload.shared_with_family is not None:
            budget.family_id = current_user.family_id if payload.shared_with_family else None
        self.db.commit()
        self.db.refresh(budget)
        return self._serialize_budget(budget, current_user.family_id)

    def delete_budget(self, current_user: User, budget_id: int) -> None:
        budget = self.budgets.get_for_user(budget_id, user_id=current_user.id, family_id=current_user.family_id)
        if not budget:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay ngan sach.")
        self.budgets.delete(budget)
        self.db.commit()

    def list_goals(self, current_user: User) -> list[SavingsGoalResponse]:
        return [self._serialize_goal(item) for item in self.goals.list_for_user(current_user.id)]

    def create_goal(self, current_user: User, payload: SavingsGoalCreate) -> SavingsGoalResponse:
        goal = SavingsGoal(user_id=current_user.id, **payload.model_dump())
        self.goals.create(goal)
        self.db.commit()
        self.db.refresh(goal)
        return self._serialize_goal(goal)

    def update_goal(self, current_user: User, goal_id: int, payload: SavingsGoalUpdate) -> SavingsGoalResponse:
        goal = self.goals.get_for_user(goal_id, current_user.id)
        if not goal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay muc tieu tiet kiem.")
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(goal, field, value)
        self.db.commit()
        self.db.refresh(goal)
        return self._serialize_goal(goal)

    def delete_goal(self, current_user: User, goal_id: int) -> None:
        goal = self.goals.get_for_user(goal_id, current_user.id)
        if not goal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay muc tieu tiet kiem.")
        self.goals.delete(goal)
        self.db.commit()

    def list_reminders(self, current_user: User) -> list[ReminderResponse]:
        return [self._serialize_reminder(item) for item in self.reminders.list_for_user(current_user.id)]

    def create_reminder(self, current_user: User, payload: ReminderCreate) -> ReminderResponse:
        reminder = Reminder(user_id=current_user.id, **payload.model_dump())
        self.reminders.create(reminder)
        self.db.commit()
        self.db.refresh(reminder)
        return self._serialize_reminder(reminder)

    def update_reminder(self, current_user: User, reminder_id: int, payload: ReminderUpdate) -> ReminderResponse:
        reminder = self.reminders.get_for_user(reminder_id, current_user.id)
        if not reminder:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay nhac viec.")
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(reminder, field, value)
        self.db.commit()
        self.db.refresh(reminder)
        return self._serialize_reminder(reminder)

    def delete_reminder(self, current_user: User, reminder_id: int) -> None:
        reminder = self.reminders.get_for_user(reminder_id, current_user.id)
        if not reminder:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay nhac viec.")
        self.reminders.delete(reminder)
        self.db.commit()

    def list_rules(self, current_user: User) -> list[CategoryRuleResponse]:
        return [CategoryRuleResponse.model_validate(item) for item in self.rules.list_for_user(current_user.id)]

    def create_rule(self, current_user: User, payload: CategoryRuleCreate) -> CategoryRuleResponse:
        rule = CategoryRule(user_id=current_user.id, **payload.model_dump())
        self.rules.create(rule)
        self.db.commit()
        self.db.refresh(rule)
        return CategoryRuleResponse.model_validate(rule)

    def update_rule(self, current_user: User, rule_id: int, payload: CategoryRuleUpdate) -> CategoryRuleResponse:
        rule = self.rules.get_for_user(rule_id, current_user.id)
        if not rule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay quy tac AI.")
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(rule, field, value)
        self.db.commit()
        self.db.refresh(rule)
        return CategoryRuleResponse.model_validate(rule)

    def delete_rule(self, current_user: User, rule_id: int) -> None:
        rule = self.rules.get_for_user(rule_id, current_user.id)
        if not rule:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay quy tac AI.")
        self.rules.delete(rule)
        self.db.commit()

    def list_utility_bills(self, current_user: User) -> list[UtilityBillResponse]:
        return [self._serialize_utility_bill(item) for item in self.utility_bills.list_for_user(current_user.id)]

    def create_utility_bill(self, current_user: User, payload: UtilityBillCreate) -> UtilityBillResponse:
        bill = UtilityBill(user_id=current_user.id, **payload.model_dump())
        self.utility_bills.create(bill)
        self.db.commit()
        self.db.refresh(bill)
        return self._serialize_utility_bill(bill)

    def update_utility_bill(self, current_user: User, bill_id: int, payload: UtilityBillUpdate) -> UtilityBillResponse:
        bill = self.utility_bills.get_for_user(bill_id, current_user.id)
        if not bill:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay hoa don dinh ky.")
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(bill, field, value)
        self.db.commit()
        self.db.refresh(bill)
        return self._serialize_utility_bill(bill)

    def delete_utility_bill(self, current_user: User, bill_id: int) -> None:
        bill = self.utility_bills.get_for_user(bill_id, current_user.id)
        if not bill:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay hoa don dinh ky.")
        self.utility_bills.delete(bill)
        self.db.commit()

    def _serialize_budget(self, budget: Budget, family_id: int | None) -> BudgetResponse:
        spent_amount = Decimal(str(self.budgets.spent_amount_for_budget(budget, family_id=family_id)))
        remaining = Decimal(str(budget.monthly_limit)) - spent_amount
        usage = 0.0
        if Decimal(str(budget.monthly_limit)) > 0:
            usage = float((spent_amount / Decimal(str(budget.monthly_limit))) * 100)
        return BudgetResponse(
            id=budget.id,
            user_id=budget.user_id,
            family_id=budget.family_id,
            category=budget.category,
            monthly_limit=budget.monthly_limit,
            spent_amount=spent_amount,
            remaining_amount=remaining,
            usage_percent=min(max(usage, 0), 999),
            created_at=budget.created_at,
        )

    def _serialize_goal(self, goal: SavingsGoal) -> SavingsGoalResponse:
        progress = 0.0
        if Decimal(str(goal.target_amount)) > 0:
            progress = float((Decimal(str(goal.current_amount)) / Decimal(str(goal.target_amount))) * 100)
        return SavingsGoalResponse(
            id=goal.id,
            user_id=goal.user_id,
            title=goal.title,
            target_amount=goal.target_amount,
            current_amount=goal.current_amount,
            target_date=goal.target_date,
            is_active=goal.is_active,
            progress_percent=min(max(progress, 0), 999),
            created_at=goal.created_at,
        )

    def _serialize_reminder(self, reminder: Reminder) -> ReminderResponse:
        today = date.today()
        status_value = "completed" if reminder.is_completed else "overdue" if reminder.due_date < today else "upcoming"
        return ReminderResponse(
            id=reminder.id,
            user_id=reminder.user_id,
            title=reminder.title,
            category=reminder.category,
            amount=reminder.amount,
            due_date=reminder.due_date,
            recurrence=reminder.recurrence,
            note=reminder.note,
            is_completed=reminder.is_completed,
            status=status_value,
            created_at=reminder.created_at,
        )

    def _serialize_utility_bill(self, bill: UtilityBill) -> UtilityBillResponse:
        today = date.today()
        due_day = min(max(bill.due_day, 1), monthrange(today.year, today.month)[1])
        next_due = date(today.year, today.month, due_day)
        if next_due < today:
            if today.month == 12:
                year = today.year + 1
                month = 1
            else:
                year = today.year
                month = today.month + 1
            due_day = min(max(bill.due_day, 1), monthrange(year, month)[1])
            next_due = date(year, month, due_day)
        delta = (next_due - today).days
        status_value = "inactive" if not bill.is_active else "due-soon" if delta <= 3 else "scheduled"
        calendar_sync = self.db.query(GoogleCalendarSync).filter(GoogleCalendarSync.utility_bill_id == bill.id).first()
        return UtilityBillResponse(
            id=bill.id,
            user_id=bill.user_id,
            provider=bill.provider,
            customer_code=bill.customer_code,
            category=bill.category,
            preferred_payment_method=bill.preferred_payment_method,
            estimated_amount=bill.estimated_amount,
            due_day=bill.due_day,
            note=bill.note,
            is_active=bill.is_active,
            next_due_date=next_due,
            status=status_value,
            google_calendar_synced=calendar_sync is not None,
            google_calendar_event_link=calendar_sync.event_link if calendar_sync else None,
            google_calendar_last_synced_at=calendar_sync.updated_at if calendar_sync else None,
            created_at=bill.created_at,
        )
