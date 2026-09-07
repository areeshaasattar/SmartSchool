import os
import uuid
from typing import Any

from qdrant_client import AsyncQdrantClient, models

COLLECTION_NAME = "smartschool_knowledge"


def get_qdrant_client() -> AsyncQdrantClient:
    return AsyncQdrantClient(url=os.getenv("QDRANT_URL", "http://localhost:6333"))


def build_authorization_filter(authorized_context: dict[str, Any]) -> models.Filter:
    """Build the filter used *by Qdrant*, before any matching chunks are returned."""
    school_id = authorized_context.get("schoolId")
    if not isinstance(school_id, str) or not school_id:
        raise ValueError("authorizedContext.schoolId is required for retrieval")

    conditions: list[models.FieldCondition] = [
        models.FieldCondition(key="schoolId", match=models.MatchValue(value=school_id)),
    ]
    source_types = authorized_context.get("sourceTypes")
    if source_types:
        conditions.append(models.FieldCondition(key="sourceType", match=models.MatchAny(any=source_types)))
    owner_ids = authorized_context.get("ownerIds")
    if owner_ids:
        conditions.append(models.FieldCondition(key="ownerId", match=models.MatchAny(any=owner_ids)))
    return models.Filter(must=conditions)


async def ensure_collection(vector_size: int) -> None:
    client = get_qdrant_client()
    if not await client.collection_exists(COLLECTION_NAME):
        await client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(size=vector_size, distance=models.Distance.COSINE),
        )


async def upsert_chunks(document_id: str, chunks: list[str], vectors: list[list[float]], metadata: dict[str, Any]) -> None:
    if not vectors:
        return
    await ensure_collection(len(vectors[0]))
    points = [
        models.PointStruct(
            id=str(uuid.uuid5(uuid.NAMESPACE_URL, f"smartschool:{document_id}:{index}")),
            vector=vector,
            payload={**metadata, "documentId": document_id, "chunkIndex": index, "text": chunks[index]},
        )
        for index, vector in enumerate(vectors)
    ]
    await get_qdrant_client().upsert(collection_name=COLLECTION_NAME, points=points, wait=True)


async def delete_document(document_id: str, school_id: str) -> None:
    await get_qdrant_client().delete(
        collection_name=COLLECTION_NAME,
        points_selector=models.FilterSelector(
            filter=models.Filter(must=[
                models.FieldCondition(key="documentId", match=models.MatchValue(value=document_id)),
                models.FieldCondition(key="schoolId", match=models.MatchValue(value=school_id)),
            ]),
        ),
        wait=True,
    )


async def search(query_vector: list[float], authorized_context: dict[str, Any], limit: int = 5):
    result = await get_qdrant_client().query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=build_authorization_filter(authorized_context),
        limit=limit,
        with_payload=True,
    )
    return result.points
