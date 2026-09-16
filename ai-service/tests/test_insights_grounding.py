"""Groundedness tests: the guardrail must reject model responses containing
numbers that are not traceable to the input aggregate payload."""

import asyncio

from app.guardrails.grounding import check_groundedness, payload_numbers
from app.schemas.insights import InsightSummarizeRequest
from app.services import insight_service

FIXED_AGGREGATE = {
    "period": {"weeks": 8},
    "threshold": 75,
    "overallPercentage": 82,
    "byClass": [
        {"classLabel": "5-A", "percentage": 85, "presentDays": 340, "totalDays": 400},
        {"classLabel": "5-B", "percentage": 79, "presentDays": 316, "totalDays": 400},
    ],
    "weeklyTrend": [
        {"weekIndex": 0, "percentage": 84},
        {"weekIndex": 1, "percentage": 80},
    ],
    "dataQuality": {"classesWithNoData": 1},
}


def test_payload_numbers_extracts_all_numeric_leaves():
    numbers = payload_numbers(FIXED_AGGREGATE)
    for expected in [8, 75, 82, 85, 340, 400, 79, 316, 84, 80, 1]:
        assert expected in numbers, f"{expected} missing from payload numbers"


def test_grounded_response_passes():
    response = {
        "narrative": "Attendance held at 82 overall. Class 5-A led with 85 while 5-B followed at 79.",
        "keyPoints": ["Overall attendance: 82", "5-A: 85", "5-B: 79"],
        "caveats": ["1 class had no attendance data in the period"],
    }
    grounded, fabricated = check_groundedness(FIXED_AGGREGATE, response)
    assert grounded, f"unexpected fabricated values: {fabricated}"


def test_fabricated_number_in_narrative_is_rejected():
    response = {
        "narrative": "Attendance reached 91 overall — a strong month.",  # 91 not in payload
        "keyPoints": [],
        "caveats": [],
    }
    grounded, fabricated = check_groundedness(FIXED_AGGREGATE, response)
    assert not grounded
    assert any(abs(v - 91) < 0.01 for v in fabricated)


def test_fabricated_number_in_keypoints_is_rejected():
    response = {
        "narrative": "Attendance stayed near the overall level.",
        "keyPoints": ["5-A attendance was 93"],  # 93 not in payload
        "caveats": [],
    }
    grounded, fabricated = check_groundedness(FIXED_AGGREGATE, response)
    assert not grounded


def test_small_rounding_differences_are_tolerated():
    response = {
        "narrative": "Attendance was about 82.4 overall.",  # 82.4 rounds to 82 within tolerance
        "keyPoints": [],
        "caveats": [],
    }
    grounded, _ = check_groundedness(FIXED_AGGREGATE, response)
    assert grounded


def test_completely_unrelated_numbers_are_rejected():
    response = {
        "narrative": "Enrollment grew by 3400 students and scores hit 99.",
        "keyPoints": [],
        "caveats": [],
    }
    grounded, fabricated = check_groundedness(FIXED_AGGREGATE, response)
    assert not grounded
    assert len(fabricated) >= 2


def test_summarize_rejects_mock_model_response_with_fabricated_number(monkeypatch):
    """End-to-end through the service: a mocked model that invents a number
    must produce a status=error response, never an 'ok' narrative."""

    class FakeCompletions:
        async def create(self, **_kwargs):
            class Msg:
                content = (
                    '{"narrative": "Attendance surged to 97 this month.", '
                    '"keyPoints": ["Overall: 97"], "caveats": []}'
                )

            class Choice:
                message = Msg()

            class Response:
                choices = [Choice()]

            return Response()

    class FakeClient:
        chat = type("Chat", (), {"completions": FakeCompletions()})()

    monkeypatch.setattr(insight_service, "get_openai_client", lambda: FakeClient())

    request = InsightSummarizeRequest(
        insightType="attendance",
        aggregateData=FIXED_AGGREGATE,
        schoolContext={"scopeDescription": "Attendance across all classes, last 8 weeks"},
    )
    outcome = asyncio.run(insight_service.summarize_insight(request))

    assert outcome["status"] == "error"
    assert "not present in the source data" in outcome["result"]["message"]


def test_summarize_accepts_grounded_mock_model_response(monkeypatch):
    class FakeCompletions:
        async def create(self, **_kwargs):
            class Msg:
                content = (
                    '{"narrative": "Attendance held at 82 overall.", '
                    '"keyPoints": ["5-A: 85", "5-B: 79"], "caveats": ["1 class had no data"]}'
                )

            class Choice:
                message = Msg()

            class Response:
                choices = [Choice()]

            return Response()

    class FakeClient:
        chat = type("Chat", (), {"completions": FakeCompletions()})()

    monkeypatch.setattr(insight_service, "get_openai_client", lambda: FakeClient())

    request = InsightSummarizeRequest(
        insightType="attendance",
        aggregateData=FIXED_AGGREGATE,
        schoolContext={},
    )
    outcome = asyncio.run(insight_service.summarize_insight(request))

    assert outcome["status"] == "ok"
    assert outcome["result"]["narrative"] == "Attendance held at 82 overall."
