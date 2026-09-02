import mongoose from 'mongoose'
import { Conversation, IConversation } from '../models/Conversation.js'
import { Message, IMessage } from '../models/Message.js'
import { Student } from '../../students/models/Student.js'
import { Guardian } from '../../students/models/Guardian.js'
import { Teacher } from '../../teachers/models/Teacher.js'
import { Class } from '../../classes/models/Class.js'

// ── Helpers ──────────────────────────────────────────────────────────

function toPlain(obj: unknown): Record<string, unknown> {
  if (obj && typeof obj === 'object' && 'toObject' in obj && typeof (obj as { toObject: unknown }).toObject === 'function') {
    return (obj as { toObject: () => Record<string, unknown> }).toObject()
  }
  return obj as Record<string, unknown>
}

/**
 * Check if a user is a participant in a conversation.
 */
export function isParticipant(conversation: IConversation, userId: string): boolean {
  return conversation.participants.some((p: unknown) => {
    // Handle both string IDs and populated objects with _id
    if (typeof p === 'string') return p === userId
    if (p && typeof p === 'object' && '_id' in p) return String((p as { _id: unknown })._id) === userId
    return String(p) === userId
  })
}

/**
 * Validate that participants are eligible for a student-context conversation.
 * - The initiator must be a guardian of the student or a teacher assigned to the student's class.
 * - The target must also be connected to the same student.
 */
async function validateStudentContextParticipants(
  schoolId: string,
  studentId: string,
  initiatorUserId: string,
  targetUserIds: string[],
): Promise<void> {
  const student = await Student.findOne({ _id: studentId, schoolId })
  if (!student) throw new Error('Student not found')

  const classId = student.classId?.toString()

  // Check initiator eligibility
  const initiatorGuardian = await Guardian.findOne({ userId: initiatorUserId, schoolId, children: studentId })
  let initiatorIsGuardian = Boolean(initiatorGuardian)

  let initiatorIsTeacher = false
  if (!initiatorIsGuardian && classId) {
    const teacher = await Teacher.findOne({ userId: initiatorUserId, schoolId })
    if (teacher) {
      const cls = await Class.findOne({ _id: classId, schoolId })
      if (cls) {
        initiatorIsTeacher =
          cls.classTeacherId?.toString() === teacher._id.toString() ||
          cls.teacherIds.some((tid) => tid.toString() === teacher._id.toString())
      }
    }
  }

  if (!initiatorIsGuardian && !initiatorIsTeacher) {
    throw new Error('Initiator is not connected to this student')
  }

  // Check each target's eligibility
  for (const targetUserId of targetUserIds) {
    if (targetUserId === initiatorUserId) continue // skip self

    const targetGuardian = await Guardian.findOne({ userId: targetUserId, schoolId, children: studentId })
    if (targetGuardian) continue // target is also a guardian — ok

    if (classId) {
      const targetTeacher = await Teacher.findOne({ userId: targetUserId, schoolId })
      if (targetTeacher) {
        const cls = await Class.findOne({ _id: classId, schoolId })
        if (cls) {
          const targetIsAssigned =
            cls.classTeacherId?.toString() === targetTeacher._id.toString() ||
            cls.teacherIds.some((tid) => tid.toString() === targetTeacher._id.toString())
          if (targetIsAssigned) continue
        }
      }
    }

    throw new Error(`User ${targetUserId} is not connected to this student`)
  }
}

// ── Conversation CRUD ────────────────────────────────────────────────

export async function createConversation(schoolId: string, data: {
  participantIds: string[]
  contextType?: 'general' | 'student'
  studentId?: string | null
}, initiatorUserId: string) {
  const allParticipantIds = [...new Set([initiatorUserId, ...data.participantIds])]

  // Validate student context if applicable
  if (data.contextType === 'student' && data.studentId) {
    await validateStudentContextParticipants(schoolId, data.studentId, initiatorUserId, data.participantIds)
  }

  // Check if a similar conversation already exists (same participants + same student context)
  const existing = await Conversation.findOne({
    schoolId,
    participants: { $all: allParticipantIds, $size: allParticipantIds.length },
    contextType: data.contextType || 'general',
    ...(data.studentId ? { studentId: data.studentId } : { studentId: null }),
  })

  if (existing) return existing

  const conversation = await Conversation.create({
    schoolId,
    participants: allParticipantIds,
    participantRoles: allParticipantIds.map((id) => ({ userId: new mongoose.Types.ObjectId(id), role: id === initiatorUserId ? 'initiator' : 'participant' })),
    contextType: data.contextType || 'general',
    studentId: data.studentId || null,
    lastMessageAt: new Date(),
    lastMessagePreview: '',
  })

  return conversation
}

export async function listConversations(schoolId: string, userId: string) {
  return Conversation.find({
    schoolId,
    participants: userId,
  })
    .sort({ lastMessageAt: -1 })
    .populate('participants', 'email profile.firstName profile.lastName')
}

export async function getConversationById(schoolId: string, conversationId: string, userId: string) {
  const conversation = await Conversation.findOne({ _id: conversationId, schoolId })
    .populate('participants', 'email profile.firstName profile.lastName')
    .populate('studentId', 'admissionNo profile.firstName profile.lastName')

  if (!conversation) return null
  if (!isParticipant(conversation as unknown as IConversation, userId)) return null

  return conversation
}

// ── Messages ─────────────────────────────────────────────────────────

export async function getMessages(schoolId: string, conversationId: string, userId: string, page = 1, limit = 50) {
  const conversation = await Conversation.findOne({ _id: conversationId, schoolId })
  if (!conversation) throw new Error('Conversation not found')
  if (!isParticipant(conversation, userId)) throw new Error('Not a participant')

  const skip = (page - 1) * limit
  const [messages, total] = await Promise.all([
    Message.find({ conversationId, schoolId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'email profile.firstName profile.lastName'),
    Message.countDocuments({ conversationId, schoolId }),
  ])

  return {
    messages: messages.reverse(), // oldest first for display
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

export async function sendMessage(schoolId: string, conversationId: string, senderId: string, data: {
  content?: string
  attachments?: { url: string; filename: string; mimeType: string }[]
}) {
  const conversation = await Conversation.findOne({ _id: conversationId, schoolId })
  if (!conversation) throw new Error('Conversation not found')
  if (!isParticipant(conversation, senderId)) throw new Error('Not a participant')

  // Ensure content or attachments exist
  const hasContent = data.content && data.content.trim().length > 0
  const hasAttachments = data.attachments && data.attachments.length > 0
  if (!hasContent && !hasAttachments) {
    throw new Error('Message must have content or at least one attachment')
  }

  const message = await Message.create({
    schoolId,
    conversationId,
    senderId,
    content: data.content || '',
    attachments: data.attachments || [],
    readBy: [{ userId: new mongoose.Types.ObjectId(senderId), readAt: new Date() }],
  })

  // Update conversation preview and lastMessageAt
  const preview = (data.content || '').substring(0, 100) || (data.attachments?.[0]?.filename || 'Attachment')
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessageAt: new Date(),
    lastMessagePreview: preview,
  })

  // Populate sender for broadcast
  const populated = await Message.findById(message._id)
    .populate('senderId', 'email profile.firstName profile.lastName')

  return populated
}

// ── Read receipts ────────────────────────────────────────────────────

export async function markAsRead(schoolId: string, conversationId: string, userId: string, upToMessageId?: string) {
  const conversation = await Conversation.findOne({ _id: conversationId, schoolId })
  if (!conversation) throw new Error('Conversation not found')
  if (!isParticipant(conversation, userId)) throw new Error('Not a participant')

  const filter: Record<string, unknown> = { conversationId, schoolId }
  if (upToMessageId) {
    // Mark all messages up to this one (inclusive) as read
    const targetMessage = await Message.findById(upToMessageId)
    if (targetMessage) {
      filter.createdAt = { $lte: targetMessage.createdAt }
    }
  }

  // Update all messages in this conversation that haven't been read by this user
  const now = new Date()
  const result = await Message.updateMany(
    {
      ...filter,
      senderId: { $ne: userId },
      'readBy.userId': { $ne: userId },
    },
    {
      $push: {
        readBy: { userId: new mongoose.Types.ObjectId(userId), readAt: now },
      },
    },
  )

  return { updatedCount: result.modifiedCount }
}

// ── Unread count ─────────────────────────────────────────────────────

export async function getUnreadCount(schoolId: string, userId: string): Promise<number> {
  // Get all conversations the user participates in
  const conversations = await Conversation.find({
    schoolId,
    participants: userId,
  }).select('_id')

  if (conversations.length === 0) return 0

  const conversationIds = conversations.map((c) => c._id)

  // Count messages not read by this user
  const count = await Message.countDocuments({
    conversationId: { $in: conversationIds },
    schoolId,
    senderId: { $ne: userId },
    'readBy.userId': { $ne: userId },
  })

  return count
}
