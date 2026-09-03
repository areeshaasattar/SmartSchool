from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AIRequestContext(BaseModel):
    """Already-authorized context supplied exclusively by the Node API."""

    model_config = ConfigDict(extra="forbid")

    schoolId: str = Field(min_length=1)
    userId: str = Field(min_length=1)
    roles: list[str] = Field(min_length=1)
    requestType: str = Field(min_length=1)
    payload: dict[str, Any]
    authorizedContext: dict[str, Any]


class AIResponse(BaseModel):
    requestType: str
    result: dict[str, Any]
    sources: list[dict[str, Any]] = Field(default_factory=list)
    status: str
