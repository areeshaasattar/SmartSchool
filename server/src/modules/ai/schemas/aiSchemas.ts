import { z } from 'zod'

/**
 * POST /ai/query
 * requestType is constrained to the two supported assistant types; payload is
 * a loosely-typed string-keyed record validated further per requestType inside
 * the route/service (e.g. `query` must be a non-empty string for RAG types).
 */
export const aiQuerySchema = z.object({
  requestType: z.enum(['school_policy_query', 'parent_academic_query']),
  payload: z
    .object({
      query: z.string().trim().min(1, 'query is required').max(2000),
    })
    .passthrough(),
})

/** POST /ai/knowledge — register a knowledge document for indexing. */
export const knowledgeCreateSchema = z.object({
  sourceType: z.enum(['school_policy', 'announcement', 'handbook', 'faq', 'parent_academic']),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(50_000),
  ownerId: z.string().trim().min(1).optional(),
})

/** GET /ai/knowledge/:id (DELETE) — path param validation. */
export const knowledgeIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'id must be a 24-char hex ObjectId'),
})
