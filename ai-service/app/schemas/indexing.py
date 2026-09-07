from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class KnowledgeIndexRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    documentId: str = Field(min_length=1)
    schoolId: str = Field(min_length=1)
    sourceType: str = Field(min_length=1)
    title: str = Field(min_length=1)
    content: str = Field(min_length=1)
    ownerId: str | None = None


class KnowledgeDeleteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    documentId: str = Field(min_length=1)
    schoolId: str = Field(min_length=1)
