from app.schemas.ai import AIRequestContext, AIResponse
from app.services.rag_service import answer_grounded_query
from app.services.teacher_quiz_service import generate_quiz_draft


async def process_request(context: AIRequestContext) -> AIResponse:
    """Return the stable pre-AI response contract for downstream integrations."""
    if context.requestType in {"school_policy_query", "parent_academic_query"}:
        return await answer_grounded_query(context)
    if context.requestType == "teacher_quiz_draft":
        return await generate_quiz_draft(context)
    return AIResponse(
        requestType=context.requestType,
        result={
            "message": "AI processing is not implemented yet",
            "requestType": context.requestType,
        },
        status="ok",
    )
