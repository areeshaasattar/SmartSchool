from __future__ import annotations

import json
import logging
import os
from typing import Any

from app.embeddings.openai_client import get_openai_client
from app.guardrails.grounding import check_groundedness, format_payload
from app.prompts.insights import build_system_prompt, build_user_prompt
from app.schemas.ai import AIResponse  # noqa: F401  (kept for symmetry with other services)
from app.schemas.insights import InsightSummarizeRequest, InsightSummarizeResult

logger = logging.getLogger(__name__)

MAX_AGGREGATE_CHARS = 24_000


def _summarize_error(message: str) -> dict[str, Any]:
    return {"insightType": "", "result": {"message": message}, "status": "error"}


def _truncate_payload(payload: dict[str, Any]) -> str:
    formatted = format_payload(payload)
    if len(formatted) > MAX_AGGREGATE_CHARS:
        logger.warning("Aggregate payload exceeded %s chars; truncating for prompt", MAX_AGGREGATE_CHARS)
        return formatted[:MAX_AGGREGATE_CHARS]
    return formatted


def _parse_model_json(raw: str) -> dict[str, Any]:
    data = json.loads(raw)
    if not isinstance(data, dict):
        raise ValueError("AI response must be a JSON object")
    return data


def _normalize_result(data: dict[str, Any]) -> InsightSummarizeResult:
    narrative = data.get("narrative")
    if not isinstance(narrative, str) or not narrative.strip():
        raise ValueError("AI response missing narrative")

    def str_list(key: str) -> list[str]:
        value = data.get(key)
        if not isinstance(value, list):
            return []
        return [item.strip() for item in value if isinstance(item, str) and item.strip()]

    return InsightSummarizeResult(
        narrative=narrative.strip(),
        keyPoints=str_list("keyPoints"),
        caveats=str_list("caveats"),
    )


async def summarize_insight(request: InsightSummarizeRequest) -> dict[str, Any]:
    """Narrate a pre-computed aggregate under strict grounding rules.

    The model receives only the anonymized aggregate; the response is rejected
    unless every number it contains is traceable to that aggregate.
    """
    try:
        completion = await get_openai_client().chat.completions.create(
            model=os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": build_system_prompt()},
                {
                    "role": "user",
                    "content": build_user_prompt(
                        request.insightType,
                        _truncate_payload(request.aggregateData),
                        json.dumps(request.schoolContext, default=str),
                    ),
                },
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
            max_tokens=1500,
        )
    except Exception:  # noqa: BLE001
        logger.exception("Failed to call OpenAI for insight summarization")
        return _summarize_error("AI generation failed")

    raw = completion.choices[0].message.content
    if not raw:
        return _summarize_error("AI returned an empty response")

    try:
        parsed = _parse_model_json(raw)
        result = _normalize_result(parsed)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.warning("Insight output failed normalization: %s", exc)
        return _summarize_error(f"Invalid AI output: {exc}")

    # ── Grounding guardrail: reject fabricated numbers ──────────────────
    # Check narrative + keyPoints + caveats, not just the parsed structure.
    grounded, fabricated = check_groundedness(request.aggregateData, result.model_dump())
    if not grounded:
        logger.warning(
            "Insight response rejected: untraceable numbers %s (type=%s)",
            fabricated,
            request.insightType,
        )
        return _summarize_error(
            "AI narrative contained numbers not present in the source data; "
            f"untraceable values: {fabricated}. Regeneration required."
        )

    return {
        "insightType": request.insightType,
        "result": result.model_dump(),
        "status": "ok",
    }
