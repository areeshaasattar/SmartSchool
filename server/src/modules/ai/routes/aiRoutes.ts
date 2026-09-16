import { Request, Response, Router } from 'express'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { resolveTenant } from '../../../middlewares/tenant/resolveTenant.js'
import { requireRole } from '../../../middlewares/permissions/requireRole.js'
import { aiUserRateLimit } from '../../../middlewares/validation/rateLimit.js'
import { validate } from '../../../middlewares/validation/validate.js'
import { aiQuerySchema } from '../schemas/aiSchemas.js'
import { AIServiceClientError, processAIRequest } from '../services/aiServiceClient.js'
import { Guardian } from '../../students/models/Guardian.js'
import { AIQueryLog } from '../models/AIQueryLog.js'
import { KNOWLEDGE_SOURCE_TYPES, KnowledgeSourceType } from '../knowledge/models/KnowledgeDocument.js'
import * as knowledgeService from '../knowledge/services/knowledgeService.js'

const router = Router()

// AI endpoints are abuse-prone (LLM cost) — per-user Redis rate limit.
router.post('/query', authenticate, resolveTenant, aiUserRateLimit, validate(aiQuerySchema), async (req: Request, res: Response) => {
  if (!req.tenantId) {
    res.status(400).json({ error: 'A school tenant is required for AI requests' })
    return
  }

  const { requestType, payload } = req.body as { requestType: string; payload: Record<string, unknown> }

  let authorizedContext: Record<string, unknown>
  if (requestType === 'school_policy_query') {
    if (!req.user!.roles.some((role) => ['school_admin', 'principal', 'teacher'].includes(role))) {
      res.status(403).json({ error: 'School policy assistant is not available for this role' })
      return
    }
    authorizedContext = { schoolId: req.tenantId, sourceTypes: ['school_policy', 'announcement', 'handbook', 'faq'] }
  } else if (requestType === 'parent_academic_query') {
    if (!req.user!.roles.includes('parent')) {
      res.status(403).json({ error: 'Parent assistant is only available to parents' })
      return
    }
    const guardians = await Guardian.find({ schoolId: req.tenantId, userId: req.user!.id })
    const ownerIds = [...new Set(guardians.flatMap((guardian) => guardian.children.map((child) => child.toString())))]
    authorizedContext = { schoolId: req.tenantId, sourceTypes: ['parent_academic'], ownerIds }
  } else {
    res.status(400).json({ error: 'Unsupported AI request type' })
    return
  }

  try {
    const response = await processAIRequest({
      schoolId: req.tenantId,
      userId: req.user!.id,
      roles: [...req.user!.roles],
      requestType,
      payload: payload as Record<string, unknown>,
      authorizedContext,
    })
    await AIQueryLog.create({
      schoolId: req.tenantId,
      userId: req.user!.id,
      requestType,
      answered: response.result.grounded === true,
    })
    res.json(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process AI request'
    const statusCode = error instanceof AIServiceClientError ? error.statusCode : 500
    res.status(statusCode).json({ error: message })
  }
})

router.post('/knowledge', authenticate, resolveTenant, requireRole('school_admin', 'super_admin'), async (req: Request, res: Response) => {
  if (!req.tenantId) {
    res.status(400).json({ error: 'A school tenant is required for knowledge documents' })
    return
  }
  const { sourceType, title, content, ownerId } = req.body as Record<string, string | undefined>
  if (typeof sourceType !== 'string' || !KNOWLEDGE_SOURCE_TYPES.includes(sourceType as KnowledgeSourceType) || typeof title !== 'string' || !title.trim() || typeof content !== 'string' || !content.trim()) {
    res.status(400).json({ error: 'sourceType, title, and non-empty content are required' })
    return
  }
  try {
    const document = await knowledgeService.createKnowledgeDocument({
      schoolId: req.tenantId, uploadedBy: req.user!.id, sourceType: sourceType as KnowledgeSourceType, title, content,
      ownerId: typeof ownerId === 'string' ? ownerId : undefined,
    })
    res.status(202).json(document)
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to register knowledge document' })
  }
})

router.get('/knowledge', authenticate, resolveTenant, requireRole('school_admin', 'super_admin'), async (req: Request, res: Response) => {
  if (!req.tenantId) {
    res.status(400).json({ error: 'A school tenant is required for knowledge documents' })
    return
  }
  res.json({ documents: await knowledgeService.listKnowledgeDocuments(req.tenantId) })
})

router.delete('/knowledge/:id', authenticate, resolveTenant, requireRole('school_admin', 'super_admin'), async (req: Request, res: Response) => {
  if (!req.tenantId) {
    res.status(400).json({ error: 'A school tenant is required for knowledge documents' })
    return
  }
  try {
    await knowledgeService.deleteKnowledgeDocument(req.tenantId, String(req.params.id))
    res.json({ status: 'ok' })
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : 'Knowledge document not found' })
  }
})

export default router
