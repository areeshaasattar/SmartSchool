from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class InsightSummarizeRequest(BaseModel):
    """Aggregate-only request from the Node API. Must never contain raw PII."""

    model_config = ConfigDict(extra="forbid")

    insightType: Literal["academic", "attendance", "briefing"]
    aggregateData: dict[str, Any]
    schoolContext: dict[str, Any] = Field(default_factory=dict)


class InsightSummarizeResult(BaseModel):
    narrative: str = Field(min_length=1)
    keyPoints: list[str] = Field(default_factory=list)
    caveats: list[str] = Field(default_factory=list)


class InsightSummarizeResponse(BaseModel):
    insightType: str
    result: InsightSummarizeResult | dict[str, Any]
    status: Literal["ok", "error"]
