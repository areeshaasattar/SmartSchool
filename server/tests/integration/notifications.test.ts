import mongoose from 'mongoose'
import { Notification } from '../../src/modules/notifications/models/Notification.js'
import { NotificationTemplate } from '../../src/modules/notifications/models/NotificationTemplate.js'
import { NotificationPreference } from '../../src/modules/notifications/models/NotificationPreference.js'
import * as notificationService from '../../src/modules/notifications/services/notificationService.js'
import { notificationsQueue } from '../../src/queues/index.js'

// ── Mocks ────────────────────────────────────────────────────────────

const schoolId = new mongoose.Types.ObjectId().toString()
const userId = new mongoose.Types.ObjectId().toString()

jest.mock('../../src/middlewares/auth/authenticate.js', () => ({
  authenticate: jest.fn((req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req.user = { _id: userId, email: 'admin@test.com', roles: ['school_admin'], schoolIds: [schoolId] }
    req.tenantId = schoolId
    next()
  }),
}))

jest.mock('../../src/middlewares/tenant/resolveTenant.js', () => ({
  resolveTenant: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}))

jest.mock('../../src/middlewares/permissions/requireRole.js', () => ({
  requirePermission: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

jest.mock('../../src/middlewares/validation/validate.js', () => ({
  validate: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

jest.mock('../../src/modules/audit/models/AuditLog.js', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../src/shared/socket.js', () => ({
  getIO: jest.fn().mockReturnValue(null),
}))

// Mock BullMQ queues so tests never attempt real Redis connections
jest.mock('../../src/queues/index.js', () => ({
  notificationsQueue: { add: jest.fn().mockResolvedValue(undefined) },
  attendanceAlertsQueue: { add: jest.fn().mockResolvedValue(undefined) },
  feeRemindersQueue: { add: jest.fn().mockResolvedValue(undefined) },
  pdfGenerationQueue: { add: jest.fn().mockResolvedValue(undefined) },
  importProcessingQueue: { add: jest.fn().mockResolvedValue(undefined) },
  aiIndexingQueue: { add: jest.fn().mockResolvedValue(undefined) },
}))

jest.mock('../../src/shared/notifications/senders/email.js', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}))

jest.mock('../../src/shared/notifications/senders/push.js', () => ({
  sendPush: jest.fn().mockResolvedValue(true),
}))

jest.mock('../../src/shared/notifications/senders/sms.js', () => ({
  sendSms: jest.fn().mockResolvedValue(true),
}))

// ── Spy on model methods
jest.spyOn(Notification, 'create')
jest.spyOn(Notification, 'find')
jest.spyOn(Notification, 'countDocuments')
jest.spyOn(Notification, 'updateMany')
jest.spyOn(Notification, 'findOneAndUpdate')
jest.spyOn(NotificationTemplate, 'findOne')
jest.spyOn(NotificationTemplate, 'create')
jest.spyOn(NotificationPreference, 'findOne')
jest.spyOn(NotificationPreference, 'create')
jest.spyOn(NotificationPreference, 'findOneAndUpdate')

jest.mock('../../src/modules/auth/models/User.js', () => {
  const mockSelect = jest.fn()
  return {
    User: {
      findById: jest.fn().mockReturnValue({
        select: mockSelect,
      }),
      _mockSelect: mockSelect,
    },
  }
})

// ── Tests ────────────────────────────────────────────────────────────

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('interpolate', () => {
    it('replaces variables correctly', () => {
      const result = notificationService.interpolate('Hello {{name}}', { name: 'World' })
      expect(result).toBe('Hello World')
    })
  })

  describe('listNotifications', () => {
    it('returns paginated notifications', async () => {
      const chain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      }
      ;(Notification.find as jest.Mock).mockReturnValue(chain)
      ;(Notification.countDocuments as jest.Mock).mockResolvedValue(0)

      const result = await notificationService.listNotifications(schoolId, userId)

      expect(result.pagination).toBeDefined()
      expect(result.pagination.total).toBe(0)
    })
  })

  describe('getUnreadCount', () => {
    it('counts unread notifications', async () => {
      ;(Notification.countDocuments as jest.Mock).mockResolvedValue(5)

      const count = await notificationService.getUnreadCount(schoolId, userId)
      expect(count).toBe(5)
    })

    it('returns 0 when no unread', async () => {
      ;(Notification.countDocuments as jest.Mock).mockResolvedValue(0)

      const count = await notificationService.getUnreadCount(schoolId, userId)
      expect(count).toBe(0)
    })
  })

  describe('markAsRead', () => {
    it('marks a notification as read', async () => {
      const notifId = new mongoose.Types.ObjectId()
      const mockNotification = { _id: notifId, status: 'read', readAt: new Date() }
      ;(Notification.findOneAndUpdate as jest.Mock).mockResolvedValue(mockNotification)

      const result = await notificationService.markAsRead(schoolId, notifId.toString(), userId)
      expect(result).not.toBeNull()
    })

    it('returns null for non-existent notification', async () => {
      ;(Notification.findOneAndUpdate as jest.Mock).mockResolvedValue(null)

      const result = await notificationService.markAsRead(schoolId, new mongoose.Types.ObjectId().toString(), userId)
      expect(result).toBeNull()
    })
  })

  describe('markAllAsRead', () => {
    it('marks all notifications as read', async () => {
      ;(Notification.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 3 })

      const result = await notificationService.markAllAsRead(schoolId, userId)
      expect(result.updatedCount).toBe(3)
    })
  })

  describe('getPreferences', () => {
    it('returns existing preferences', async () => {
      const mockPrefs = {
        userId,
        schoolId,
        channelPreferences: [{ type: 'attendance_alert', channels: ['in_app', 'email'] }],
      }
      ;(NotificationPreference.findOne as jest.Mock).mockResolvedValue(mockPrefs)

      const result = await notificationService.getPreferences(schoolId, userId)
      expect(result).toEqual(mockPrefs)
    })

    it('creates default preferences if none exist', async () => {
      ;(NotificationPreference.findOne as jest.Mock).mockResolvedValue(null)
      ;(NotificationPreference.create as jest.Mock).mockImplementation((data) =>
        Promise.resolve({ ...data, _id: new mongoose.Types.ObjectId() })
      )

      const result = await notificationService.getPreferences(schoolId, userId)
      expect(NotificationPreference.create).toHaveBeenCalled()
      expect(result.channelPreferences.length).toBeGreaterThan(0)
    })
  })

  describe('updatePreferences', () => {
    it('updates preferences with upsert', async () => {
      const mockPrefs = {
        userId,
        schoolId,
        channelPreferences: [{ type: 'attendance_alert', channels: ['in_app'] }],
      }
      ;(NotificationPreference.findOneAndUpdate as jest.Mock).mockResolvedValue(mockPrefs)

      const result = await notificationService.updatePreferences(schoolId, userId, [
        { type: 'attendance_alert', channels: ['in_app'] },
      ])
      expect(result).toEqual(mockPrefs)
    })
  })

  describe('dispatchNotification', () => {
    it('enqueues the notification job', async () => {
      const input = {
        schoolId,
        userId,
        type: 'fee_reminder',
        data: { studentName: 'John', status: 'due', amount: '100' },
      }

      await notificationService.dispatchNotification(input)

      expect(notificationsQueue.add).toHaveBeenCalledWith('dispatch', input)
    })
  })

  describe('processNotification', () => {
    it('creates notification records for enabled channels', async () => {
      const { User } = require('../../src/modules/auth/models/User.js')
      User._mockSelect.mockResolvedValue({
        _id: userId,
        email: 'admin@test.com',
        profile: { phone: '+1234567890' },
      })

      // No preferences — use defaults (attendance_alert → in_app + email)
      ;(NotificationPreference.findOne as jest.Mock).mockResolvedValue(null)
      ;(NotificationTemplate.findOne as jest.Mock).mockResolvedValue(null) // no custom template
      ;(Notification.create as jest.Mock).mockImplementation((data) =>
        Promise.resolve({ ...data, _id: new mongoose.Types.ObjectId(), save: jest.fn() })
      )

      await notificationService.processNotification({
        schoolId,
        userId,
        type: 'attendance_alert',
        data: { studentName: 'John', percentage: '65', threshold: '75' },
      })

      // Should create 2 notifications: in_app + email
      expect(Notification.create).toHaveBeenCalledTimes(2)
    })

    it('creates notification for message_received (in_app only)', async () => {
      const { User } = require('../../src/modules/auth/models/User.js')
      User._mockSelect.mockResolvedValue({
        _id: userId,
        email: 'test@test.com',
        profile: {},
      })

      ;(NotificationPreference.findOne as jest.Mock).mockResolvedValue(null)
      ;(NotificationTemplate.findOne as jest.Mock).mockResolvedValue(null)
      ;(Notification.create as jest.Mock).mockImplementation((data) =>
        Promise.resolve({ ...data, _id: new mongoose.Types.ObjectId(), save: jest.fn() })
      )

      await notificationService.processNotification({
        schoolId,
        userId,
        type: 'message_received',
        data: { senderName: 'Teacher', conversationId: '123' },
      })

      // message_received defaults to in_app only
      expect(Notification.create).toHaveBeenCalledTimes(1)
      const createCall = (Notification.create as jest.Mock).mock.calls[0][0]
      expect(createCall.channel).toBe('in_app')
    })

    it('does not throw when user not found', async () => {
      const { User } = require('../../src/modules/auth/models/User.js')
      User._mockSelect.mockResolvedValue(null)

      // Should not throw
      await expect(
        notificationService.processNotification({
          schoolId,
          userId,
          type: 'attendance_alert',
          data: {},
        })
      ).resolves.toBeUndefined()
    })
  })
})
