from app.schemas.ai import AIRequestContext, AIResponse


def process_request(context: AIRequestContext) -> AIResponse:
    """Return the stable pre-AI response contract for downstream integrations."""
    return AIResponse(
        requestType=context.requestType,
        result={
            "message": "AI processing is not implemented yet",
            "requestType": context.requestType,
        },
        status="ok",
    )
