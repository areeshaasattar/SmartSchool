from __future__ import annotations

import json
import logging
import os
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.ai import AIRequestContext, AIResponse
from app.embeddings.openai_client import get_openai_client

logger = logging.getLogger(__name__)

MAX_QUESTIONS = 50
MIN_QUESTIONS = 1


# ── Strict output schema ─────────────────────────────────────────────────────

class QuestionResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=1)
    type: Literal["mcq", "short_answer", "essay"]
    options: list[str] | None = Field(default=None)
    correctAnswer: str = Field(min_length=1)
    explanation: str = Field(min_length=1)


class QuizDraftResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    questions: list[QuestionResult] = Field(min_length=1)


# ── Request validation ───────────────────────────────────────────────────────

def _validate_payload(payload: dict[str, Any]) -> dict[str, Any]:
    topic = payload.get("topic")
    if not isinstance(topic, str) or not topic.strip():
        raise ValueError("payload.topic is required and must be non-empty")

    difficulty = payload.get("difficulty")
    if difficulty not in {"easy", "medium", "hard"}:
        raise ValueError("payload.difficulty must be one of: easy, medium, hard")

    question_count = payload.get("questionCount")
    if not isinstance(question_count, int) or not (MIN_QUESTIONS <= question_count <= MAX_QUESTIONS):
        raise ValueError(f"payload.questionCount must be an integer between {MIN_QUESTIONS} and {MAX_QUESTIONS}")

    question_types = payload.get("questionTypes")
    if not isinstance(question_types, list) or not question_types:
        raise ValueError("payload.questionTypes must be a non-empty list")
    if not all(isinstance(t, str) and t in {"mcq", "short_answer", "essay"} for t in question_types):
        raise ValueError("payload.questionTypes must only contain mcq, short_answer, or essay")

    return {
        "topic": topic.strip(),
        "difficulty": difficulty,
        "questionCount": question_count,
        "questionTypes": question_types,
    }


# ── Prompt construction ──────────────────────────────────────────────────────

def _build_messages(validated: dict[str, Any]) -> list[dict[str, str]]:
    return [
        {
            "role": "system",
            "content": (
                "You are a teacher's assistant for generating quiz drafts.\n"
                "Produce ONLY valid JSON that matches the requested schema. Do not include markdown, explanations, or text outside the JSON object.\n"
                "Constraints:\n"
                "- Return exactly the number of questions requested unless doing so would require impossible repetition, in which case return as many as you can and never fewer than 1.\n"
                "- Each question must be original, school-appropriate, and matched to the requested difficulty.\n"
                "- For mcq questions you must provide 3-5 plausible options and exactly one correct answer.\n"
                "- For short_answer and essay questions, do not provide options.\n"
                "- The correctAnswer must be concise and unambiguous.\n"
                "- The explanation must be 1-3 sentences suitable for a teacher reviewing the key.\n"
                "- Reflect the requested mix of questionTypes; if multiple types are requested, distribute them sensibly."
            ),
        },
        {
            "role": "user",
            "content": (
                "Generate a quiz draft with the following parameters:\n"
                f"Topic: {validated['topic']}\n"
                f"Difficulty: {validated['difficulty']}\n"
                f"Question count: {validated['questionCount']}\n"
                f"Question types: {', '.join(validated['questionTypes'])}\n\n"
                "Respond with a JSON object like this:\n"
                "{\n"
                "  \"questions\": [\n"
                "    {\n"
                "      \"question\": \"String\",\n"
                "      \"type\": \"mcq|short_answer|essay\",\n"
                "      \"options\": [\"String\", ...] or null,\n"
                "      \"correctAnswer\": \"String\",\n"
                "      \"explanation\": \"String\"\n"
                "    }\n"
                "  ]\n"
                "}"
            ),
        },
    ]


def _post_process(result: dict[str, Any], requested_types: list[str]) -> dict[str, Any]:
    """Normalize and validate AI output before it leaves the service."""
    if not isinstance(result, dict):
        raise ValueError("AI response must be a JSON object")
    questions = result.get("questions")
    if not isinstance(questions, list) or not questions:
        raise ValueError("AI response must contain a non-empty 'questions' array")

    allowed_types = set(requested_types)
    normalized: list[dict[str, Any]] = []

    for item in questions:
        if not isinstance(item, dict):
            continue
        question = item.get("question")
        qtype = item.get("type")
        correct = item.get("correctAnswer")
        explanation = item.get("explanation")

        if not isinstance(question, str) or not question.strip():
            continue
        if not isinstance(qtype, str) or qtype not in allowed_types:
            continue
        if not isinstance(correct, str) or not correct.strip():
            continue
        if not isinstance(explanation, str) or not explanation.strip():
            continue

        options = item.get("options")
        if options is not None:
            if not isinstance(options, list) or not all(isinstance(o, str) and o.strip() for o in options):
                options = None

        normalized.append({
            "question": question.strip(),
            "type": qtype,
            "options": options,
            "correctAnswer": correct.strip(),
            "explanation": explanation.strip(),
        })

    if not normalized:
        raise ValueError("AI response contained no valid questions after normalization")

    # Enforce count parity: if the service returned fewer than asked and we can tolerate it,
    # we still accept it (teachers can retry). We do not silently pad with junk.
    return {"questions": normalized}


# ── Orchestration ────────────────────────────────────────────────────────────

async def generate_quiz_draft(context: AIRequestContext) -> AIResponse:
    try:
        validated = _validate_payload(context.payload)
    except ValueError as exc:
        return AIResponse(
            requestType=context.requestType,
            result={"message": str(exc), "requestType": context.requestType},
            status="error",
        )

    try:
        completion = await get_openai_client().chat.completions.create(
            model=os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini"),
            messages=_build_messages(validated),
            temperature=0.3,
            response_format={"type": "json_object"},
            max_tokens=4096,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to call OpenAI for teacher quiz draft")
        return AIResponse(
            requestType=context.requestType,
            result={"message": "AI generation failed", "requestType": context.requestType},
            status="error",
        )

    raw = completion.choices[0].message.content
    if raw is None:
        return AIResponse(
            requestType=context.requestType,
            result={"message": "AI returned an empty response", "requestType": context.requestType},
            status="error",
        )

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.warning("AI returned non-JSON response: %s", exc)
        return AIResponse(
            requestType=context.requestType,
            result={"message": "AI returned invalid JSON", "requestType": context.requestType},
            status="error",
        )

    try:
        result = _post_process(parsed, validated["questionTypes"])
    except ValueError as exc:
        logger.warning("AI output failed post-processing: %s", exc)
        return AIResponse(
            requestType=context.requestType,
            result={"message": f"Invalid AI output: {exc}", "requestType": context.requestType},
            status="error",
        )

    return AIResponse(
        requestType=context.requestType,
        result=result,
        sources=[],
        status="ok",
    )
