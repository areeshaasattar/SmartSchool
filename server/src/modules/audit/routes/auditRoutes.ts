import { Router, Request, Response } from 'express'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { resolveTenant } from '../../../middlewares/tenant/resolveTenant.js'
import { requireRole } from '../../../middlewares/permissions/requireRole.js'
import * as auditService from '../services/auditService.js'

const router = Router()
const readAccess = [authenticate, resolveTenant, requireRole('super_admin', 'school_admin', 'principal')]

function requestedSchoolId(req: Request): string | undefined {
  return req.user!.roles.includes('super_admin')
    ? (typeof req.query.schoolId === 'string' ? req.query.schoolId : req.tenantId)
    : req.tenantId
}

router.get('/logs', ...readAccess, async (req: Request, res: Response) => {
  try {
    const value = (key: string) => typeof req.query[key] === 'string' ? req.query[key] : undefined
    const page = Number(value('page'))
    const limit = Number(value('limit'))
    const data = await auditService.listAuditLogs({
      schoolId: requestedSchoolId(req), entity: value('entity'), action: value('action'), actorId: value('actorId'),
      dateFrom: value('dateFrom'), dateTo: value('dateTo'),
      page: Number.isFinite(page) ? page : undefined, limit: Number.isFinite(limit) ? limit : undefined,
    })
    res.json(data)
  } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to load audit logs' }) }
})

router.get('/logs/entity/:entity/:entityId', ...readAccess, async (req: Request, res: Response) => {
  try {
    const entity = Array.isArray(req.params.entity) ? req.params.entity[0] : req.params.entity
    const entityId = Array.isArray(req.params.entityId) ? req.params.entityId[0] : req.params.entityId
    res.json({ logs: await auditService.getEntityHistory(entity, entityId, requestedSchoolId(req)) })
  }
  catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to load history' }) }
})

router.get('/logs/:id', ...readAccess, async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
  const log = await auditService.getAuditLog(id, requestedSchoolId(req))
  if (!log) { res.status(404).json({ error: 'Audit log not found' }); return }
  res.json({ log })
})

export default router
