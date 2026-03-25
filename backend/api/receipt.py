from fastapi import APIRouter, Depends, File, UploadFile

from backend.api.deps import get_current_user, rate_limit_dependency
from backend.models.user import User
from backend.schemas.receipt import ReceiptAnalysisResponse
from backend.services.receipt_service import ReceiptService

router = APIRouter(dependencies=[Depends(rate_limit_dependency)])


@router.post("/receipt/analyze", response_model=ReceiptAnalysisResponse)
def analyze_receipt(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    del current_user
    return ReceiptService().analyze(file)
