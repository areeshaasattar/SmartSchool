import { Router, Request, Response } from 'express'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { resolveTenant } from '../../../middlewares/tenant/resolveTenant.js'
import { createConversationSchema, sendMessageSchema, conversationMessagesQuerySchema, markReadSchema } from '../schemas/messageSchemas.js'
import * as messageService from '../services/messageService.js'
import { getIO } from '../../../shared/socket.js'
import { dispatchNotification } from '../../notifications/services/notificationService.js'
import mongoose from 'mongoose'

const router = Router()

// ── Conversations ────────────────────────────────────────────────────

router.post(
  '/conversations',
  authenticate,
  resolveTenant,
  async (req: Request, res: Response) => {
    try {
      const parsed = createConversationSchema.parse(req.body)
      const tenantId = req.tenantId!
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()

      const conversation = await messageService.createConversation(tenantId, parsed, userId)
      res.status(201).json(conversation)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create conversation'
      res.status(400).json({ error: message })
    }
  },
)

router.get(
  '/conversations',
  authenticate,
  resolveTenant,
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()
      const conversations = await messageService.listConversations(tenantId, userId)
      res.json(conversations)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list conversations'
      res.status(500).json({ error: message })
    }
  },
)

router.get(
  '/conversations/:id',
  authenticate,
  resolveTenant,
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()
      const conversationId = String(req.params.id)

      const conversation = await messageService.getConversationById(tenantId, conversationId, userId)
      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' })
        return
      }
      res.json(conversation)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get conversation'
      res.status(500).json({ error: message })
    }
  },
)

// ── Messages ─────────────────────────────────────────────────────────

router.get(
  '/conversations/:id/messages',
  authenticate,
  resolveTenant,
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()
      const conversationId = String(req.params.id)
      const parsed = conversationMessagesQuerySchema.parse(req.query)

      const result = await messageService.getMessages(tenantId, conversationId, userId, parsed.page, parsed.limit)
      res.json(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get messages'
      res.status(400).json({ error: message })
    }
  },
)

router.post(
  '/conversations/:id/messages',
  authenticate,
  resolveTenant,
  async (req: Request, res: Response) => {
    try {
      const parsed = sendMessageSchema.parse(req.body)
      const tenantId = req.tenantId!
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()
      const conversationId = String(req.params.id)

      const message = await messageService.sendMessage(tenantId, conversationId, userId, parsed)
      res.status(201).json(message)

      // Emit via Socket.IO to all participants
      try {
        const conversation = await messageService.getConversationById(tenantId, conversationId, userId)
        if (conversation) {
          const participantIds = (conversation.participants as unknown as { _id: mongoose.Types.ObjectId }[]).map((p) => p._id.toString())

          const io = getIO()
          if (io) {
            for (const pid of participantIds) {
              void io.to(pid).emit('message:new', {
                conversationId,
                message: toPlainPopulated(message),
              })
            }
          }
        }
      } catch {
        // Socket emit failure should not break the REST response
      }

      // Dispatch notification to other participants (separate concern from socket message:new)
      // TODO(feature/redis-bullmq): move this dispatch call onto a queue for async/retryable delivery
      try {
        const conv = await messageService.getConversationById(tenantId, conversationId, userId)
        if (conv) {
          const participantIds = (conv.participants as unknown as { _id: mongoose.Types.ObjectId }[]).map((p) => p._id.toString())
          const senderName = (req.user as { profile?: { firstName?: string; lastName?: string } })?.profile
            ? `${(req.user as { profile: { firstName: string; lastName: string } }).profile.firstName} ${(req.user as { profile: { firstName: string; lastName: string } }).profile.lastName}`
            : 'Someone'
          for (const pid of participantIds) {
            if (pid !== userId) {
              void dispatchNotification({
                schoolId: tenantId,
                userId: pid,
                type: 'message_received',
                data: { senderName, conversationId },
              })
            }
          }
        }
      } catch {
        // Notification failure should not break the REST response
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send message'
      res.status(400).json({ error: message })
    }
  },
)

// ── Read receipts ────────────────────────────────────────────────────

router.post(
  '/conversations/:id/read',
  authenticate,
  resolveTenant,
  async (req: Request, res: Response) => {
    try {
      const parsed = markReadSchema.parse(req.body)
      const tenantId = req.tenantId!
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()
      const conversationId = String(req.params.id)

      const result = await messageService.markAsRead(tenantId, conversationId, userId, parsed.upToMessageId)
      res.json(result)

      // Emit read receipt via Socket.IO
      try {
        const conversation = await messageService.getConversationById(tenantId, conversationId, userId)
        if (conversation) {
          const participantIds = (conversation.participants as unknown as { _id: mongoose.Types.ObjectId }[]).map((p) => p._id.toString())

          const io = getIO()
          if (io) {
            for (const pid of participantIds) {
              if (pid !== userId) {
                void io.to(pid).emit('message:read', {
                  conversationId,
                  userId,
                  readAt: new Date(),
                })
              }
            }
          }
        }
      } catch {
        // Socket emit failure should not break the REST response
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to mark as read'
      res.status(400).json({ error: message })
    }
  },
)

// ── Unread count ─────────────────────────────────────────────────────

router.get(
  '/unread',
  authenticate,
  resolveTenant,
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()
      const count = await messageService.getUnreadCount(tenantId, userId)
      res.json({ count })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get unread count'
      res.status(500).json({ error: message })
    }
  },
)

// ── Helper ───────────────────────────────────────────────────────────

function toPlainPopulated(msg: unknown): Record<string, unknown> {
  if (msg && typeof msg === 'object' && 'toObject' in msg && typeof (msg as { toObject: unknown }).toObject === 'function') {
    return (msg as { toObject: () => Record<string, unknown> }).toObject()
  }
  return msg as Record<string, unknown>
}

export default router
