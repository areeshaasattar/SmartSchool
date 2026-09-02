import mongoose from 'mongoose'
import { Conversation } from '../../src/modules/communication/models/Conversation.js'
import { Message } from '../../src/modules/communication/models/Message.js'
import * as messageService from '../../src/modules/communication/services/messageService.js'

// ── Mocks ────────────────────────────────────────────────────────────

const schoolId = new mongoose.Types.ObjectId().toString()
const userId1 = new mongoose.Types.ObjectId().toString()
const userId2 = new mongoose.Types.ObjectId().toString()

jest.mock('../../src/middlewares/auth/authenticate.js', () => ({
  authenticate: jest.fn((req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req.user = { _id: userId1, email: 'teacher@test.com', roles: ['teacher'], schoolIds: [schoolId] }
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

// ── Spy on model methods
jest.spyOn(Conversation, 'create')
jest.spyOn(Conversation, 'findOne')
jest.spyOn(Conversation, 'find')
jest.spyOn(Conversation, 'findByIdAndUpdate')
jest.spyOn(Message, 'create')
jest.spyOn(Message, 'find')
jest.spyOn(Message, 'countDocuments')
jest.spyOn(Message, 'updateMany')
jest.spyOn(Message, 'findById')

// ── Tests ────────────────────────────────────────────────────────────

describe('Messaging Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createConversation', () => {
    it('creates a general conversation', async () => {
      const mockConv = {
        _id: new mongoose.Types.ObjectId(),
        schoolId,
        participants: [userId1, userId2],
        contextType: 'general',
        studentId: null,
      }
      ;(Conversation.findOne as jest.Mock).mockResolvedValue(null)
      ;(Conversation.create as jest.Mock).mockResolvedValue(mockConv)

      const result = await messageService.createConversation(schoolId, {
        participantIds: [userId2],
      }, userId1)

      expect(result).toBeDefined()
      expect(Conversation.create).toHaveBeenCalled()
    })

    it('returns existing conversation if same participants exist', async () => {
      const existing = {
        _id: new mongoose.Types.ObjectId(),
        schoolId,
        participants: [userId1, userId2],
        contextType: 'general',
      }
      ;(Conversation.findOne as jest.Mock).mockResolvedValue(existing)

      const result = await messageService.createConversation(schoolId, {
        participantIds: [userId2],
      }, userId1)

      expect(result._id).toEqual(existing._id)
      expect(Conversation.create).not.toHaveBeenCalled()
    })

    it('deduplicates participants', async () => {
      ;(Conversation.findOne as jest.Mock).mockResolvedValue(null)
      ;(Conversation.create as jest.Mock).mockResolvedValue({ _id: new mongoose.Types.ObjectId() })

      await messageService.createConversation(schoolId, {
        participantIds: [userId1, userId2], // userId1 is also the initiator
      }, userId1)

      const createCall = (Conversation.create as jest.Mock).mock.calls[0][0]
      expect(createCall.participants).toHaveLength(2) // deduplicated
    })
  })

  describe('sendMessage', () => {
    it('sends a message and updates conversation', async () => {
      const convId = new mongoose.Types.ObjectId()
      const mockConv = {
        _id: convId,
        schoolId,
        participants: [userId1, userId2],
        contextType: 'general',
      }
      const mockMessage = {
        _id: new mongoose.Types.ObjectId(),
        schoolId,
        conversationId: convId,
        senderId: userId1,
        content: 'Hello!',
        attachments: [],
        readBy: [{ userId: userId1, readAt: new Date() }],
        createdAt: new Date(),
      }

      ;(Conversation.findOne as jest.Mock).mockResolvedValue(mockConv)
      ;(Message.create as jest.Mock).mockResolvedValue(mockMessage)
      ;(Conversation.findByIdAndUpdate as jest.Mock).mockResolvedValue({})
      ;(Message.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockMessage),
      })

      const result = await messageService.sendMessage(schoolId, convId.toString(), userId1, {
        content: 'Hello!',
      })

      expect(result).not.toBeNull()
      expect(Conversation.findByIdAndUpdate).toHaveBeenCalledWith(
        convId.toString(),
        expect.objectContaining({ lastMessagePreview: 'Hello!' }),
      )
    })

    it('rejects empty message', async () => {
      const convId = new mongoose.Types.ObjectId()
      const mockConv = { _id: convId, schoolId, participants: [userId1, userId2] }
      ;(Conversation.findOne as jest.Mock).mockResolvedValue(mockConv)

      await expect(
        messageService.sendMessage(schoolId, convId.toString(), userId1, {})
      ).rejects.toThrow('must have content')
    })

    it('allows attachment-only message', async () => {
      const convId = new mongoose.Types.ObjectId()
      const mockConv = { _id: convId, schoolId, participants: [userId1, userId2] }
      const mockMessage = { _id: new mongoose.Types.ObjectId(), content: '', attachments: [{ url: 'https://example.com', filename: 'test.pdf', mimeType: 'application/pdf' }] }

      ;(Conversation.findOne as jest.Mock).mockResolvedValue(mockConv)
      ;(Message.create as jest.Mock).mockResolvedValue(mockMessage)
      ;(Conversation.findByIdAndUpdate as jest.Mock).mockResolvedValue({})
      ;(Message.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockMessage),
      })

      const result = await messageService.sendMessage(schoolId, convId.toString(), userId1, {
        attachments: [{ url: 'https://example.com', filename: 'test.pdf', mimeType: 'application/pdf' }],
      })

      expect(result).not.toBeNull()
    })

    it('rejects non-participant', async () => {
      const convId = new mongoose.Types.ObjectId()
      const mockConv = { _id: convId, schoolId, participants: [userId2] }
      ;(Conversation.findOne as jest.Mock).mockResolvedValue(mockConv)

      await expect(
        messageService.sendMessage(schoolId, convId.toString(), userId1, { content: 'Hi' })
      ).rejects.toThrow('Not a participant')
    })

    it('rejects non-existent conversation', async () => {
      ;(Conversation.findOne as jest.Mock).mockResolvedValue(null)

      await expect(
        messageService.sendMessage(schoolId, new mongoose.Types.ObjectId().toString(), userId1, { content: 'Hi' })
      ).rejects.toThrow('Conversation not found')
    })
  })

  describe('getMessages', () => {
    it('returns paginated messages', async () => {
      const convId = new mongoose.Types.ObjectId()
      const mockConv = { _id: convId, schoolId, participants: [userId1, userId2] }
      const chain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      }
      ;(Conversation.findOne as jest.Mock).mockResolvedValue(mockConv)
      ;(Message.find as jest.Mock).mockReturnValue(chain)
      ;(Message.countDocuments as jest.Mock).mockResolvedValue(0)

      const result = await messageService.getMessages(schoolId, convId.toString(), userId1, 1, 50)

      expect(result.pagination).toBeDefined()
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.total).toBe(0)
    })

    it('rejects non-participant', async () => {
      const convId = new mongoose.Types.ObjectId()
      const mockConv = { _id: convId, schoolId, participants: [userId2] }
      ;(Conversation.findOne as jest.Mock).mockResolvedValue(mockConv)

      await expect(
        messageService.getMessages(schoolId, convId.toString(), userId1)
      ).rejects.toThrow('Not a participant')
    })

    it('rejects non-existent conversation', async () => {
      ;(Conversation.findOne as jest.Mock).mockResolvedValue(null)

      await expect(
        messageService.getMessages(schoolId, new mongoose.Types.ObjectId().toString(), userId1)
      ).rejects.toThrow('Conversation not found')
    })
  })

  describe('markAsRead', () => {
    it('marks messages as read', async () => {
      const convId = new mongoose.Types.ObjectId()
      const mockConv = { _id: convId, schoolId, participants: [userId1, userId2] }
      ;(Conversation.findOne as jest.Mock).mockResolvedValue(mockConv)
      ;(Message.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 3 })

      const result = await messageService.markAsRead(schoolId, convId.toString(), userId2)

      expect(result.updatedCount).toBe(3)
    })

    it('rejects non-participant', async () => {
      const convId = new mongoose.Types.ObjectId()
      const mockConv = { _id: convId, schoolId, participants: [userId1] }
      ;(Conversation.findOne as jest.Mock).mockResolvedValue(mockConv)

      await expect(
        messageService.markAsRead(schoolId, convId.toString(), userId2)
      ).rejects.toThrow('Not a participant')
    })
  })

  describe('getUnreadCount', () => {
    it('counts unread messages', async () => {
      const chain = {
        select: jest.fn().mockResolvedValue([{ _id: new mongoose.Types.ObjectId() }]),
      }
      ;(Conversation.find as jest.Mock).mockReturnValue(chain)
      ;(Message.countDocuments as jest.Mock).mockResolvedValue(5)

      const count = await messageService.getUnreadCount(schoolId, userId1)
      expect(count).toBe(5)
    })

    it('returns 0 when no conversations', async () => {
      const chain = {
        select: jest.fn().mockResolvedValue([]),
      }
      ;(Conversation.find as jest.Mock).mockReturnValue(chain)

      const count = await messageService.getUnreadCount(schoolId, userId1)
      expect(count).toBe(0)
    })
  })

  describe('getConversationById', () => {
    it('returns conversation for participant', async () => {
      const convId = new mongoose.Types.ObjectId()
      const mockResult = {
        _id: convId,
        schoolId,
        participants: [
          { _id: new mongoose.Types.ObjectId(userId1), email: 't@test.com' },
          { _id: new mongoose.Types.ObjectId(userId2), email: 'p@test.com' },
        ],
        populate: jest.fn().mockReturnThis(),
      }
      ;(Conversation.findOne as jest.Mock).mockReturnValue(mockResult)

      const result = await messageService.getConversationById(schoolId, convId.toString(), userId1)
      expect(result).not.toBeNull()
    })

    it('returns null for non-participant', async () => {
      const convId = new mongoose.Types.ObjectId()
      const mockResult = {
        _id: convId,
        schoolId,
        participants: [
          { _id: new mongoose.Types.ObjectId(userId2), email: 'p@test.com' },
        ],
        populate: jest.fn().mockReturnThis(),
      }
      ;(Conversation.findOne as jest.Mock).mockReturnValue(mockResult)

      const result = await messageService.getConversationById(schoolId, convId.toString(), userId1)
      expect(result).toBeNull()
    })

    it('returns null for non-existent conversation', async () => {
      const populateMock = jest.fn()
      // First call returns chain, second call returns null
      populateMock.mockReturnValueOnce({ populate: populateMock }).mockResolvedValueOnce(null)
      const mockChain = { populate: populateMock }
      ;(Conversation.findOne as jest.Mock).mockReturnValue(mockChain)

      const result = await messageService.getConversationById(schoolId, new mongoose.Types.ObjectId().toString(), userId1)
      expect(result).toBeNull()
    })
  })
})
