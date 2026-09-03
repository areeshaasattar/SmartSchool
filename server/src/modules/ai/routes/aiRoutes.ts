import { Request, Response, Router } from 'express'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { resolveTenant } from '../../../middlewares/tenant/resolveTenant.js'
import { AIServiceClientError, processAIRequest } from '../services/aiServiceClient.js'

const router = Router()

router.post('/query', authenticate, resolveTenant, async (req: Request, res: Response) => {
  if (!req.tenantId) {
    res.status(400).json({ error: 'A school tenant is required for AI requests' })
    return
  }

  const { requestType, payload = {} } = req.body as { requestType?: unknown; payload?: unknown }
  if (typeof requestType !== 'string' || !requestType.trim() || !payload || typeof payload !== 'object' || Array.isArray(payload)) {
    res.status(400).json({ error: 'requestType and payload object are required' })
    return
  }

  try {
    const response = await processAIRequest({
      schoolId: req.tenantId,
      userId: req.user!.id,
      roles: [...req.user!.roles],
      requestType,
      payload: payload as Record<string, unknown>,
      authorizedContext: {},
    })
    res.json(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process AI request'
    const statusCode = error instanceof AIServiceClientError ? error.statusCode : 500
    res.status(statusCode).json({ error: message })
  }
})

export default router
