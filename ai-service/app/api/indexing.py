from fastapi import APIRouter, Depends

from app.embeddings.chunking import chunk_text
from app.embeddings.openai_client import embed_texts
from app.guardrails.service_auth import require_service_key
from app.retrieval.qdrant import delete_document, upsert_chunks
from app.schemas.indexing import KnowledgeDeleteRequest, KnowledgeIndexRequest

router = APIRouter(prefix="/ai", tags=["indexing"])


@router.post("/index")
async def index_knowledge_document(request: KnowledgeIndexRequest, _: None = Depends(require_service_key)):
    chunks = chunk_text(request.content)
    await upsert_chunks(
        request.documentId,
        chunks,
        await embed_texts(chunks),
        {"schoolId": request.schoolId, "sourceType": request.sourceType, "title": request.title, "ownerId": request.ownerId},
    )
    return {"status": "ok", "chunksIndexed": len(chunks)}


@router.post("/deindex")
async def deindex_knowledge_document(request: KnowledgeDeleteRequest, _: None = Depends(require_service_key)):
    await delete_document(request.documentId, request.schoolId)
    return {"status": "ok"}
