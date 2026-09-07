import asyncio

from app.schemas.ai import AIRequestContext
from app.services import rag_service


def test_no_grounded_answer_fallback_is_used_below_similarity_threshold(monkeypatch):
    async def no_matches(*_args, **_kwargs):
        return []

    async def vectors(*_args, **_kwargs):
        return [[0.1, 0.2]]

    monkeypatch.setattr(rag_service, "search", no_matches)
    monkeypatch.setattr(rag_service, "embed_texts", vectors)
    response = asyncio.run(rag_service.answer_grounded_query(AIRequestContext(
        schoolId="school-a", userId="user-a", roles=["teacher"], requestType="school_policy_query",
        payload={"query": "What is the uniform policy?"}, authorizedContext={"schoolId": "school-a", "sourceTypes": ["faq"]},
    )))

    assert response.result["grounded"] is False
    assert "don't have authorized information" in response.result["answer"]
