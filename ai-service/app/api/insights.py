from fastapi import APIRouter, Depends

from app.guardrails.service_auth import require_service_key
from app.schemas.insights import InsightSummarizeRequest, InsightSummarizeResponse
from app.services.insight_service import summarize_insight

router = APIRouter(prefix="/insights", tags=["insights"])


@router.post("/summarize", response_model=InsightSummarizeResponse, response_model_exclude_none=True)
async def summarize(
    request: InsightSummarizeRequest,
    _: None = Depends(require_service_key),
) -> InsightSummarizeResponse:
    """Summarize an anonymized aggregate. Node API is the only caller."""
    outcome = await summarize_insight(request)

    if outcome["status"] == "error":
        return InsightSummarizeResponse(
            insightType=request.insightType,
            result={"message": outcome["result"]["message"]},
            status="error",
        )

    return InsightSummarizeResponse(
        insightType=request.insightType,
        result=outcome["result"],
        status="ok",
    )
