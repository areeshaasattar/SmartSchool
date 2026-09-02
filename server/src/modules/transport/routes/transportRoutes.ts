import { Router, Request, Response } from 'express'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { resolveTenant } from '../../../middlewares/tenant/resolveTenant.js'
import { requirePermission } from '../../../middlewares/permissions/requireRole.js'
import {
  createVehicleSchema,
  updateVehicleSchema,
  createDriverSchema,
  updateDriverSchema,
  createStopSchema,
  createRouteSchema,
  updateRouteSchema,
  createTransportAssignmentSchema,
} from '../schemas/transportSchemas.js'
import * as transportService from '../services/transportService.js'

const router = Router()

// ── Vehicles ─────────────────────────────────────────────────────────

router.post(
  '/vehicles',
  authenticate,
  resolveTenant,
  requirePermission('transport:manage'),
  async (req: Request, res: Response) => {
    try {
      const parsed = createVehicleSchema.parse(req.body)
      const vehicle = await transportService.createVehicle(req.tenantId!, parsed, req.user!.id)
      res.status(201).json(vehicle)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create vehicle'
      res.status(400).json({ error: message })
    }
  },
)

router.get(
  '/vehicles',
  authenticate,
  resolveTenant,
  requirePermission('transport:read'),
  async (req: Request, res: Response) => {
    try {
      const vehicles = await transportService.listVehicles(req.tenantId!)
      res.json(vehicles)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list vehicles'
      res.status(400).json({ error: message })
    }
  },
)

router.patch(
  '/vehicles/:id',
  authenticate,
  resolveTenant,
  requirePermission('transport:manage'),
  async (req: Request, res: Response) => {
    try {
      const parsed = updateVehicleSchema.parse(req.body)
      const vehicle = await transportService.updateVehicle(req.tenantId!, String(req.params.id), parsed, req.user!.id)
      res.json(vehicle)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update vehicle'
      res.status(400).json({ error: message })
    }
  },
)

// ── Drivers ──────────────────────────────────────────────────────────

router.post(
  '/drivers',
  authenticate,
  resolveTenant,
  requirePermission('transport:manage'),
  async (req: Request, res: Response) => {
    try {
      const parsed = createDriverSchema.parse(req.body)
      const driver = await transportService.createDriver(req.tenantId!, parsed, req.user!.id)
      res.status(201).json(driver)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create driver'
      res.status(400).json({ error: message })
    }
  },
)

router.get(
  '/drivers',
  authenticate,
  resolveTenant,
  requirePermission('transport:read'),
  async (req: Request, res: Response) => {
    try {
      const drivers = await transportService.listDrivers(req.tenantId!)
      res.json(drivers)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list drivers'
      res.status(400).json({ error: message })
    }
  },
)

router.patch(
  '/drivers/:id',
  authenticate,
  resolveTenant,
  requirePermission('transport:manage'),
  async (req: Request, res: Response) => {
    try {
      const parsed = updateDriverSchema.parse(req.body)
      const driver = await transportService.updateDriver(req.tenantId!, String(req.params.id), parsed, req.user!.id)
      res.json(driver)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update driver'
      res.status(400).json({ error: message })
    }
  },
)

// ── Stops ────────────────────────────────────────────────────────────

router.post(
  '/stops',
  authenticate,
  resolveTenant,
  requirePermission('transport:manage'),
  async (req: Request, res: Response) => {
    try {
      const parsed = createStopSchema.parse(req.body)
      const stop = await transportService.createStop(req.tenantId!, parsed, req.user!.id)
      res.status(201).json(stop)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create stop'
      res.status(400).json({ error: message })
    }
  },
)

router.get(
  '/stops',
  authenticate,
  resolveTenant,
  requirePermission('transport:read'),
  async (req: Request, res: Response) => {
    try {
      const stops = await transportService.listStops(req.tenantId!)
      res.json(stops)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list stops'
      res.status(400).json({ error: message })
    }
  },
)

// ── Routes ───────────────────────────────────────────────────────────

router.post(
  '/routes',
  authenticate,
  resolveTenant,
  requirePermission('transport:manage'),
  async (req: Request, res: Response) => {
    try {
      const parsed = createRouteSchema.parse(req.body)
      const route = await transportService.createRoute(req.tenantId!, parsed, req.user!.id)
      res.status(201).json(route)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create route'
      res.status(400).json({ error: message })
    }
  },
)

router.get(
  '/routes',
  authenticate,
  resolveTenant,
  requirePermission('transport:read'),
  async (req: Request, res: Response) => {
    try {
      const routes = await transportService.listRoutes(req.tenantId!)
      res.json(routes)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list routes'
      res.status(400).json({ error: message })
    }
  },
)

router.get(
  '/routes/:id',
  authenticate,
  resolveTenant,
  requirePermission('transport:read'),
  async (req: Request, res: Response) => {
    try {
      const result = await transportService.getRouteById(req.tenantId!, String(req.params.id))
      if (!result) {
        res.status(404).json({ error: 'Route not found' })
        return
      }
      res.json(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get route'
      res.status(400).json({ error: message })
    }
  },
)

router.patch(
  '/routes/:id',
  authenticate,
  resolveTenant,
  requirePermission('transport:manage'),
  async (req: Request, res: Response) => {
    try {
      const parsed = updateRouteSchema.parse(req.body)
      const route = await transportService.updateRoute(req.tenantId!, String(req.params.id), parsed, req.user!.id)
      res.json(route)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update route'
      res.status(400).json({ error: message })
    }
  },
)

// ── Transport Assignments ────────────────────────────────────────────

router.post(
  '/assignments',
  authenticate,
  resolveTenant,
  requirePermission('transport:manage'),
  async (req: Request, res: Response) => {
    try {
      const parsed = createTransportAssignmentSchema.parse(req.body)
      const assignment = await transportService.createTransportAssignment(req.tenantId!, parsed, req.user!.id)
      res.status(201).json(assignment)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create transport assignment'
      res.status(400).json({ error: message })
    }
  },
)

router.delete(
  '/assignments/:id',
  authenticate,
  resolveTenant,
  requirePermission('transport:manage'),
  async (req: Request, res: Response) => {
    try {
      await transportService.deleteTransportAssignment(req.tenantId!, String(req.params.id), req.user!.id)
      res.json({ message: 'Transport assignment removed' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete transport assignment'
      res.status(400).json({ error: message })
    }
  },
)

router.get(
  '/student/:studentId',
  authenticate,
  resolveTenant,
  requirePermission('transport:read'),
  async (req: Request, res: Response) => {
    try {
      const assignment = await transportService.getStudentTransport(
        req.tenantId!,
        String(req.params.studentId),
        req.user!.id,
        req.user!.roles,
      )
      if (!assignment) {
        res.status(404).json({ error: 'No active transport assignment found' })
        return
      }
      res.json(assignment)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get student transport'
      res.status(400).json({ error: message })
    }
  },
)

export default router
