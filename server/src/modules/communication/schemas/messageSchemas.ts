import { z } from 'zod'

// ── Create Conversation ──────────────────────────────────────────────

export const createConversationSchema = z.object({
  participantIds: z.array(z.string()).min(1, 'At least one participant is required'),
  contextType: z.enum(['general', 'student']).default('general'),
  studentId: z.string().nullable().optional(),
})

// ── Send Message ─────────────────────────────────────────────────────

const attachmentSchema = z.object({
  url: z.string().url('Invalid URL'),
  filename: z.string().min(1, 'Filename is required'),
  mimeType: z.string().min(1, 'MIME type is required'),
})

export const sendMessageSchema = z.object({
  content: z.string().optional(),
  attachments: z.array(attachmentSchema).optional(),
}).refine(
  (data) => (data.content && data.content.trim().length > 0) || (data.attachments && data.attachments.length > 0),
  'Message must have content or at least one attachment',
)

// ── Mark Read ────────────────────────────────────────────────────────

export const markReadSchema = z.object({
  upToMessageId: z.string().optional(),
})

// ── Query schemas ────────────────────────────────────────────────────

export const conversationMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})
