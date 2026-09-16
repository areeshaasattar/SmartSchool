import { Request, Response, Router } from 'express'
import mongoose from 'mongoose'
import { authenticate } from '../../../../middlewares/auth/authenticate.js'
import { resolveTenant } from '../../../../middlewares/tenant/resolveTenant.js'
import { requireRole } from '../../../../middlewares/permissions/requireRole.js'
import { aiUserRateLimit } from '../../../../middlewares/validation/rateLimit.js'
import { Teacher } from '../../../teachers/models/Teacher.js'
import * as insightService from '../services/insightService.js'
import { InsightError, INSIGHT_TYPES } from '../services/insightService.js'
import type { AIInsightType } from '../models/AIInsight.js'

const router = Router()

// All insight endpoints require auth + tenant resolution.
router.use(authenticate, resolveTenant)

function requireTenantId(req: Request, res: Response): string | null {
  if (!req.tenantId) {
    res.status(400).json({ error: 'A school tenant is required for insights' })
    return null
  }
  return req.tenantId
}

/**
 * Resolve the class scope for the requester:
 * - teachers are always scoped to the classes they teach (never the whole school)
 * - principal / school_admin / super_admin see school-wide aggregates
 */
async function resolveScope(
  req: Request,
): Promise<{ schoolId: string; userId: string; classIds?: string[] }> {
  const schoolId = req.tenantId!
  const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

  if (req.user!.roles.includes('teacher')) {
    const teacher = await Teacher.findOne({ userId, schoolId }).select('classes')
    const classIds = (teacher?.classes ?? []).map((c: { toString(): string }) => c.toString())
    return { schoolId, userId, classIds }
  }
  return { schoolId, userId }
}

function allowedTypesForRoles(roles: string[]): AIInsightType[] {
  if (roles.includes('principal') || roles.includes('school_admin') || roles.includes('super_admin')) {
    return INSIGHT_TYPES
  }
  if (roles.includes('teacher')) {
    return ['academic', 'attendance']
  }
  return []
}

function sendInsightError(res: Response, error: unknown): void {
  if (error instanceof InsightError) {
    res.status(error.statusCode).json({ error: error.message })
    return
  }
  res.status(500).json({ error: error instanceof Error ? error.message : 'Insight request failed' })
}

// ── POST /ai/insights/academic ──────────────────────────────────────
router.post('/insights/academic', requireRole('teacher', 'principal', 'school_admin'), aiUserRateLimit, async (req: Request, res: Response) => {
  const schoolId = requireTenantId(req, res)
  if (!schoolId) return

  try {
    const scope = await resolveScope(req)
    const insight = await insightService.generateInsight({
      schoolId: scope.schoolId,
      requestedBy: scope.userId,
      type: 'academic',
      body: req.body,
      classIds: scope.classIds,
    })
    res.status(201).json(insight)
  } catch (error) {
    sendInsightError(res, error)
  }
})

// ── POST /ai/insights/attendance ────────────────────────────────────
router.post('/insights/attendance', requireRole('teacher', 'principal', 'school_admin'), aiUserRateLimit, async (req: Request, res: Response) => {
  const schoolId = requireTenantId(req, res)
  if (!schoolId) return

  try {
    const scope = await resolveScope(req)
    const insight = await insightService.generateInsight({
      schoolId: scope.schoolId,
      requestedBy: scope.userId,
      type: 'attendance',
      body: req.body,
      classIds: scope.classIds,
    })
    res.status(201).json(insight)
  } catch (error) {
    sendInsightError(res, error)
  }
})

// ── POST /ai/insights/principal-briefing ────────────────────────────
router.post(
  '/insights/principal-briefing',
  requireRole('principal', 'school_admin', 'super_admin'),
  aiUserRateLimit,
  async (req: Request, res: Response) => {
    const schoolId = requireTenantId(req, res)
    if (!schoolId) return

    try {
      const scope = await resolveScope(req)
      const insight = await insightService.generateInsight({
        schoolId: scope.schoolId,
        requestedBy: scope.userId,
        type: 'briefing',
        body: req.body,
      })
      res.status(201).json(insight)
    } catch (error) {
      sendInsightError(res, error)
    }
  },
)

// ── GET /ai/insights?type=&limit= ───────────────────────────────────
router.get('/insights', async (req: Request, res: Response) => {
  const schoolId = requireTenantId(req, res)
  if (!schoolId) return

  try {
    const allowed = allowedTypesForRoles([...req.user!.roles])
    if (allowed.length === 0) {
      res.status(403).json({ error: 'Insights are not available for this role' })
      return
    }

    const requestedType = typeof req.query.type === 'string' ? req.query.type : undefined
    if (requestedType && !allowed.includes(requestedType as AIInsightType)) {
      res.status(403).json({ error: 'You do not have access to this insight type' })
      return
    }

    const result = await insightService.listInsights({
      schoolId,
      query: { type: requestedType, limit: req.query.limit },
    })
    res.json(result)
  } catch (error) {
    sendInsightError(res, error)
  }
})

// ── POST /ai/insights/:id/acknowledge ───────────────────────────────
router.post('/insights/:id/acknowledge', async (req: Request, res: Response) => {
  const schoolId = requireTenantId(req, res)
  if (!schoolId) return

  try {
    const allowed = allowedTypesForRoles([...req.user!.roles])
    if (allowed.length === 0) {
      res.status(403).json({ error: 'Insights are not available for this role' })
      return
    }

    const insight = await insightService.acknowledgeInsight({
      schoolId,
      insightId: String(req.params.id),
      acknowledgedBy: (req.user!._id as mongoose.Types.ObjectId).toString(),
    })

    if (!insight) {
      res.status(404).json({ error: 'Insight not found' })
      return
    }
    if (insight.type && !allowed.includes(insight.type as AIInsightType)) {
      res.status(403).json({ error: 'You do not have access to this insight type' })
      return
    }

    res.json(insight)
  } catch (error) {
    sendInsightError(res, error)
  }
})

export default router
