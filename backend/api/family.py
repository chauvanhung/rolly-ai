from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.deps import get_current_user, rate_limit_dependency
from backend.db.session import get_db
from backend.models.user import User
from backend.repositories.family_repository import FamilyRepository
from backend.schemas.family import FamilyCreateRequest, FamilyResponse

router = APIRouter(dependencies=[Depends(rate_limit_dependency)])


@router.get("/family", response_model=FamilyResponse | None)
def get_family(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.family_id:
        return None
    return FamilyRepository(db).get(current_user.family_id)


@router.post("/family", response_model=FamilyResponse)
def create_family(
    payload: FamilyCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = FamilyRepository(db)
    family = repo.create(payload.name.strip())
    current_user.family_id = family.id
    db.add(current_user)
    db.commit()
    db.refresh(family)
    return family
