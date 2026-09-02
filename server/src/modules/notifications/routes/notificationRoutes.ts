import { Router, Request, Response } from 'express'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { resolveTenant } from '../../../middlewares/tenant/resolveTenant.js'
import { notificationQuerySchema, updatePreferencesSchema } from '../schemas/notificationSchemas.js'
import * as notificationService from '../services/notificationService.js'
import mongoose from 'mongoose'

const router = Router()

// ── GET /notifications — list own notifications ──────────────────────

router.get(
  '/',
  authenticate,
  resolveTenant,
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()
      const parsed = notificationQuerySchema.parse(req.query)

      const result = await notificationService.listNotifications(tenantId, userId, parsed)
      res.json(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list notifications'
      res.status(400).json({ error: message })
    }
  },
)

// ── GET /notifications/unread-count — for badge display ──────────────

router.get(
  '/unread-count',
  authenticate,
  resolveTenant,
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()
      const count = await notificationService.getUnreadCount(tenantId, userId)
      res.json({ count })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get unread count'
      res.status(500).json({ error: message })
    }
  },
)

// ── POST /notifications/:id/read — mark single as read ──────────────

router.post(
  '/:id/read',
  authenticate,
  resolveTenant,
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()
      const notificationId = String(req.params.id)

      const notification = await notificationService.markAsRead(tenantId, notificationId, userId)
      if (!notification) {
        res.status(404).json({ error: 'Notification not found' })
        return
      }
      res.json(notification)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to mark as read'
      res.status(400).json({ error: message })
    }
  },
)

// ── POST /notifications/read-all — mark all as read ─────────────────

router.post(
  '/read-all',
  authenticate,
  resolveTenant,
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      const result = await notificationService.markAllAsRead(tenantId, userId)
      res.json(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to mark all as read'
      res.status(500).json({ error: message })
    }
  },
)

// ── GET /notifications/preferences — own preferences ────────────────

router.get(
  '/preferences',
  authenticate,
  resolveTenant,
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      const prefs = await notificationService.getPreferences(tenantId, userId)
      res.json(prefs)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get preferences'
      res.status(500).json({ error: message })
    }
  },
)

// ── PATCH /notifications/preferences — update preferences ───────────

router.patch(
  '/preferences',
  authenticate,
  resolveTenant,
  async (req: Request, res: Response) => {
    try {
      const parsed = updatePreferencesSchema.parse(req.body)
      const tenantId = req.tenantId!
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      const prefs = await notificationService.updatePreferences(tenantId, userId, parsed.channelPreferences)
      res.json(prefs)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update preferences'
      res.status(400).json({ error: message })
    }
  },
)

export default router
