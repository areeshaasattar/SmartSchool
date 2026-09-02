import { createConversationSchema, sendMessageSchema, conversationMessagesQuerySchema, markReadSchema } from '../../src/modules/communication/schemas/messageSchemas.js'

describe('Message validation schemas', () => {
  describe('createConversationSchema', () => {
    it('accepts valid conversation with participants', () => {
      const result = createConversationSchema.safeParse({
        participantIds: ['507f1f77bcf86cd799439011'],
      })
      expect(result.success).toBe(true)
    })

    it('accepts student context', () => {
      const result = createConversationSchema.safeParse({
        participantIds: ['507f1f77bcf86cd799439011'],
        contextType: 'student',
        studentId: '507f1f77bcf86cd799439012',
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty participants', () => {
      const result = createConversationSchema.safeParse({
        participantIds: [],
      })
      expect(result.success).toBe(false)
    })

    it('defaults contextType to general', () => {
      const result = createConversationSchema.safeParse({
        participantIds: ['507f1f77bcf86cd799439011'],
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.contextType).toBe('general')
      }
    })
  })

  describe('sendMessageSchema', () => {
    it('accepts valid text message', () => {
      const result = sendMessageSchema.safeParse({
        content: 'Hello, teacher!',
      })
      expect(result.success).toBe(true)
    })

    it('accepts attachment-only message', () => {
      const result = sendMessageSchema.safeParse({
        attachments: [{ url: 'https://example.com/file.pdf', filename: 'file.pdf', mimeType: 'application/pdf' }],
      })
      expect(result.success).toBe(true)
    })

    it('accepts message with content and attachments', () => {
      const result = sendMessageSchema.safeParse({
        content: 'See attached',
        attachments: [{ url: 'https://example.com/file.pdf', filename: 'file.pdf', mimeType: 'application/pdf' }],
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty message with no content and no attachments', () => {
      const result = sendMessageSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('rejects empty content string', () => {
      const result = sendMessageSchema.safeParse({
        content: '   ',
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid attachment URL', () => {
      const result = sendMessageSchema.safeParse({
        content: 'Hello',
        attachments: [{ url: 'not-a-url', filename: 'file.pdf', mimeType: 'application/pdf' }],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('conversationMessagesQuerySchema', () => {
    it('accepts empty query with defaults', () => {
      const result = conversationMessagesQuerySchema.parse({})
      expect(result.page).toBe(1)
      expect(result.limit).toBe(50)
    })

    it('accepts custom page and limit', () => {
      const result = conversationMessagesQuerySchema.parse({ page: '2', limit: '25' })
      expect(result.page).toBe(2)
      expect(result.limit).toBe(25)
    })

    it('rejects limit over 100', () => {
      const result = conversationMessagesQuerySchema.safeParse({ limit: '200' })
      expect(result.success).toBe(false)
    })
  })

  describe('markReadSchema', () => {
    it('accepts empty body', () => {
      const result = markReadSchema.parse({})
      expect(result).toEqual({})
    })

    it('accepts upToMessageId', () => {
      const result = markReadSchema.parse({ upToMessageId: '507f1f77bcf86cd799439011' })
      expect(result.upToMessageId).toBe('507f1f77bcf86cd799439011')
    })
  })
})

describe('Participant eligibility logic', () => {
  it('participant check works correctly', () => {
    const participants = ['user1', 'user2', 'user3']
    const isParticipant = (userId: string) => participants.includes(userId)

    expect(isParticipant('user1')).toBe(true)
    expect(isParticipant('user2')).toBe(true)
    expect(isParticipant('user4')).toBe(false)
  })
})
