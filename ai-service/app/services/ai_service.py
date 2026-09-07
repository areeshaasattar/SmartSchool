from app.schemas.ai import AIRequestContext, AIResponse
from app.services.rag_service import answer_grounded_query


async def process_request(context: AIRequestContext) -> AIResponse:
    """Return the stable pre-AI response contract for downstream integrations."""
    if context.requestType in {"school_policy_query", "parent_academic_query"}:
        return await answer_grounded_query(context)
    return AIResponse(
        requestType=context.requestType,
        result={
            "message": "AI processing is not implemented yet",
            "requestType": context.requestType,
        },
        status="ok",
    )
