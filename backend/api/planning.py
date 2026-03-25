from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from backend.api.deps import get_current_user, rate_limit_dependency
from backend.core.config import settings
from backend.db.session import get_db
from backend.models.user import User
from backend.schemas.planning import (
    BudgetCreate,
    BudgetResponse,
    BudgetUpdate,
    CategoryRuleCreate,
    CategoryRuleResponse,
    CategoryRuleUpdate,
    GoogleCalendarConnectResponse,
    GoogleCalendarStatusResponse,
    GoogleCalendarSyncResponse,
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
from backend.services.google_calendar_service import GoogleCalendarService
from backend.services.planning_service import PlanningService

router = APIRouter(dependencies=[Depends(rate_limit_dependency)])


@router.get("/budgets", response_model=list[BudgetResponse])
def list_budgets(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return PlanningService(db).list_budgets(current_user)


@router.post("/budgets", response_model=BudgetResponse)
def create_budget(payload: BudgetCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return PlanningService(db).create_budget(current_user, payload)


@router.put("/budgets/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    payload: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PlanningService(db).update_budget(current_user, budget_id, payload)


@router.delete("/budgets/{budget_id}")
def delete_budget(budget_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    PlanningService(db).delete_budget(current_user, budget_id)
    return {"message": "Đã xóa ngân sách."}


@router.get("/goals", response_model=list[SavingsGoalResponse])
def list_goals(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return PlanningService(db).list_goals(current_user)


@router.post("/goals", response_model=SavingsGoalResponse)
def create_goal(payload: SavingsGoalCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return PlanningService(db).create_goal(current_user, payload)


@router.put("/goals/{goal_id}", response_model=SavingsGoalResponse)
def update_goal(
    goal_id: int,
    payload: SavingsGoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PlanningService(db).update_goal(current_user, goal_id, payload)


@router.delete("/goals/{goal_id}")
def delete_goal(goal_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    PlanningService(db).delete_goal(current_user, goal_id)
    return {"message": "Đã xóa mục tiêu tiết kiệm."}


@router.get("/reminders", response_model=list[ReminderResponse])
def list_reminders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return PlanningService(db).list_reminders(current_user)


@router.post("/reminders", response_model=ReminderResponse)
def create_reminder(payload: ReminderCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return PlanningService(db).create_reminder(current_user, payload)


@router.put("/reminders/{reminder_id}", response_model=ReminderResponse)
def update_reminder(
    reminder_id: int,
    payload: ReminderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PlanningService(db).update_reminder(current_user, reminder_id, payload)


@router.delete("/reminders/{reminder_id}")
def delete_reminder(reminder_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    PlanningService(db).delete_reminder(current_user, reminder_id)
    return {"message": "Đã xóa nhắc việc."}


@router.get("/category-rules", response_model=list[CategoryRuleResponse])
def list_category_rules(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return PlanningService(db).list_rules(current_user)


@router.post("/category-rules", response_model=CategoryRuleResponse)
def create_category_rule(
    payload: CategoryRuleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PlanningService(db).create_rule(current_user, payload)


@router.put("/category-rules/{rule_id}", response_model=CategoryRuleResponse)
def update_category_rule(
    rule_id: int,
    payload: CategoryRuleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PlanningService(db).update_rule(current_user, rule_id, payload)


@router.delete("/category-rules/{rule_id}")
def delete_category_rule(rule_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    PlanningService(db).delete_rule(current_user, rule_id)
    return {"message": "Đã xóa quy tắc AI."}


@router.get("/utility-bills", response_model=list[UtilityBillResponse])
def list_utility_bills(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return PlanningService(db).list_utility_bills(current_user)


@router.post("/utility-bills", response_model=UtilityBillResponse)
def create_utility_bill(
    payload: UtilityBillCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PlanningService(db).create_utility_bill(current_user, payload)


@router.put("/utility-bills/{bill_id}", response_model=UtilityBillResponse)
def update_utility_bill(
    bill_id: int,
    payload: UtilityBillUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PlanningService(db).update_utility_bill(current_user, bill_id, payload)


@router.delete("/utility-bills/{bill_id}")
def delete_utility_bill(bill_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    PlanningService(db).delete_utility_bill(current_user, bill_id)
    return {"message": "Đã xóa hóa đơn định kỳ."}


@router.get("/google-calendar/status", response_model=GoogleCalendarStatusResponse)
def google_calendar_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return GoogleCalendarService(db).get_status(current_user)


@router.get("/google-calendar/connect", response_model=GoogleCalendarConnectResponse)
def google_calendar_connect(
    return_url: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    auth_url = GoogleCalendarService(db).get_authorization_url(current_user, return_url=return_url or settings.frontend_base_url)
    return GoogleCalendarConnectResponse(auth_url=auth_url)


@router.get("/google-calendar/callback", include_in_schema=False)
def google_calendar_callback(code: str, state: str, db: Session = Depends(get_db)):
    redirect_to = GoogleCalendarService(db).handle_callback(code, state)
    return RedirectResponse(url=redirect_to)


@router.post("/utility-bills/{bill_id}/sync-google-calendar", response_model=GoogleCalendarSyncResponse)
def sync_utility_bill_to_google_calendar(
    bill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    planning = PlanningService(db)
    bill = planning.utility_bills.get_for_user(bill_id, current_user.id)
    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay hoa don dinh ky.")
    sync = GoogleCalendarService(db).sync_utility_bill(current_user, bill)
    return GoogleCalendarSyncResponse(message="Đã đồng bộ hóa đơn lên Google Calendar.", event_link=sync.event_link)
