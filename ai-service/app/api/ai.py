from fastapi import APIRouter, Depends

from app.guardrails.service_auth import require_service_key
from app.schemas.ai import AIRequestContext, AIResponse
from app.services.ai_service import process_request

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/process", response_model=AIResponse)
async def process_ai_request(
    context: AIRequestContext,
    _: None = Depends(require_service_key),
) -> AIResponse:
    return process_request(context)
