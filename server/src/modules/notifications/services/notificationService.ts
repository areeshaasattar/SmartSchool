import mongoose from 'mongoose'
import { NotificationTemplate } from '../models/NotificationTemplate.js'
import { Notification } from '../models/Notification.js'
import { NotificationPreference, DEFAULT_CHANNEL_PREFERENCES } from '../models/NotificationPreference.js'
import { sendEmail } from '../../../shared/notifications/senders/email.js'
import { sendPush } from '../../../shared/notifications/senders/push.js'
import { sendSms } from '../../../shared/notifications/senders/sms.js'
import { getIO } from '../../../shared/socket.js'
import { User } from '../../auth/models/User.js'

// ── Template interpolation ───────────────────────────────────────────

/**
 * Interpolate {{variable}} placeholders in a template string.
 */
export function interpolate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    return variables[key] !== undefined ? variables[key] : `{{${key}}}`
  })
}

// ── Default templates ────────────────────────────────────────────────

const DEFAULT_TEMPLATES: Array<{
  type: string
  channel: string
  subject: string
  body: string
}> = [
  {
    type: 'attendance_alert',
    channel: 'in_app',
    subject: 'Attendance Alert',
    body: 'Student {{studentName}} has {{percentage}}% attendance, below the {{threshold}}% threshold.',
  },
  {
    type: 'attendance_alert',
    channel: 'email',
    subject: 'Attendance Alert — {{studentName}}',
    body: 'Dear Parent,\n\nThis is to inform you that {{studentName}} has {{percentage}}% attendance, which is below the {{threshold}}% threshold.\n\nPlease ensure regular attendance.',
  },
  {
    type: 'fee_reminder',
    channel: 'in_app',
    subject: 'Fee Reminder',
    body: 'Fee invoice for {{studentName}} is {{status}}. Amount: {{amount}}.',
  },
  {
    type: 'fee_reminder',
    channel: 'email',
    subject: 'Fee Reminder — {{studentName}}',
    body: 'Dear Parent,\n\nThis is a reminder that the fee invoice for {{studentName}} is {{status}}.\n\nAmount: {{amount}}\nDue Date: {{dueDate}}',
  },
  {
    type: 'exam_published',
    channel: 'in_app',
    subject: 'Exam Results Published',
    body: 'Results for "{{examName}}" have been published. Check your report card.',
  },
  {
    type: 'exam_published',
    channel: 'email',
    subject: 'Exam Results Published — {{examName}}',
    body: 'Dear {{recipientName}},\n\nThe results for "{{examName}}" ({{term}}) have been published.\n\nPlease log in to view your report card.',
  },
  {
    type: 'assignment_graded',
    channel: 'in_app',
    subject: 'Assignment Graded',
    body: 'Your assignment "{{assignmentTitle}}" has been graded. Marks: {{marks}}/{{maxMarks}}.',
  },
  {
    type: 'message_received',
    channel: 'in_app',
    subject: 'New Message',
    body: 'You have a new message from {{senderName}}.',
  },
]

// ── Dispatch function ────────────────────────────────────────────────

export interface DispatchNotificationInput {
  schoolId: string
  userId: string
  type: string
  data: Record<string, string>
}

/**
 * Dispatch a notification to a user across all enabled channels.
 * Creates Notification records per channel, emits socket for in_app,
 * and calls stub senders for email/push/sms.
 *
 * TODO(feature/redis-bullmq): move this dispatch call onto a queue for async/retryable delivery
 */
export async function dispatchNotification(input: DispatchNotificationInput): Promise<void> {
  const { schoolId, userId, type, data } = input

  // 1. Resolve user for email/phone
  const user = await User.findById(userId).select('email profile.phone')
  if (!user) return

  // 2. Resolve user preferences
  const prefs = await NotificationPreference.findOne({ userId, schoolId })
  const enabledChannels = resolveChannels(type, prefs?.channelPreferences || [])

  // 3. Resolve template per channel and create notifications
  for (const channel of enabledChannels) {
    const template = await resolveTemplate(schoolId, type, channel)

    const title = template
      ? interpolate(template.subject, data)
      : `${type.replace(/_/g, ' ')}`
    const body = template
      ? interpolate(template.body, data)
      : JSON.stringify(data)

    try {
      // Create notification record
      const notification = await Notification.create({
        schoolId,
        userId,
        type,
        channel,
        title,
        body,
        data,
        status: 'pending',
      })

      // Send via appropriate channel
      let sent = false
      try {
        sent = await sendViaChannel(channel, userId, user.email, user.profile?.phone, title, body)
      } catch {
        sent = false
      }

      // Update status
      if (sent) {
        notification.status = 'sent'
        notification.sentAt = new Date()
        await notification.save()

        // Emit socket event for in_app notifications
        if (channel === 'in_app') {
          emitNotification(userId, notification)
        }
      } else {
        notification.status = 'failed'
        await notification.save()
      }
    } catch {
      // Per-channel failure isolation — don't block other channels
      continue
    }
  }
}

// ── Channel resolution ───────────────────────────────────────────────

function resolveChannels(type: string, preferences: Array<{ type: string; channels: string[] }>): string[] {
  // Check user preferences for this type
  const userPref = preferences.find((p) => p.type === type)
  if (userPref && userPref.channels.length > 0) {
    return userPref.channels
  }

  // Fall back to defaults
  return DEFAULT_CHANNEL_PREFERENCES[type] || ['in_app']
}

// ── Template resolution ──────────────────────────────────────────────

async function resolveTemplate(
  schoolId: string,
  type: string,
  channel: string,
): Promise<{ subject: string; body: string } | null> {
  // Try school-specific template first
  const schoolTemplate = await NotificationTemplate.findOne({
    schoolId,
    type,
    channel,
  })
  if (schoolTemplate) {
    return { subject: schoolTemplate.subject, body: schoolTemplate.body }
  }

  // Fall back to platform default
  const defaultTemplate = await NotificationTemplate.findOne({
    schoolId: null,
    type,
    channel,
  })
  if (defaultTemplate) {
    return { subject: defaultTemplate.subject, body: defaultTemplate.body }
  }

  // Fall back to hardcoded defaults
  const hardcoded = DEFAULT_TEMPLATES.find((t) => t.type === type && t.channel === channel)
  if (hardcoded) {
    return { subject: hardcoded.subject, body: hardcoded.body }
  }

  return null
}

// ── Channel senders ──────────────────────────────────────────────────

async function sendViaChannel(
  channel: string,
  userId: string,
  email: string,
  phone: string | undefined,
  title: string,
  body: string,
): Promise<boolean> {
  switch (channel) {
    case 'in_app':
      // In-app is always "sent" — the record is the delivery
      return true
    case 'email':
      return sendEmail(email, title, body)
    case 'push':
      return sendPush(userId, title, body)
    case 'sms':
      if (!phone) return false
      return sendSms(phone, body)
    default:
      return false
  }
}

// ── Socket emission ──────────────────────────────────────────────────

function emitNotification(userId: string, notification: unknown) {
  try {
    const io = getIO()
    if (io) {
      void io.to(userId).emit('notification:new', {
        notification: toPlain(notification),
      })
    }
  } catch {
    // Socket failure should not break notification dispatch
  }
}

function toPlain(obj: unknown): Record<string, unknown> {
  if (obj && typeof obj === 'object' && 'toObject' in obj && typeof (obj as { toObject: unknown }).toObject === 'function') {
    return (obj as { toObject: () => Record<string, unknown> }).toObject()
  }
  return obj as Record<string, unknown>
}

// ── CRUD operations ──────────────────────────────────────────────────

export async function listNotifications(
  schoolId: string,
  userId: string,
  filters: { page?: number; limit?: number; status?: string; type?: string } = {},
) {
  const { page = 1, limit = 20, status, type } = filters

  const query: Record<string, unknown> = { schoolId, userId }
  if (status === 'read') query.status = 'read'
  if (status === 'unread') query.status = { $ne: 'read' }
  if (type) query.type = type

  const [notifications, total] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Notification.countDocuments(query),
  ])

  return {
    notifications,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }
}

export async function getUnreadCount(schoolId: string, userId: string): Promise<number> {
  return Notification.countDocuments({
    schoolId,
    userId,
    channel: 'in_app',
    status: { $ne: 'read' },
  })
}

export async function markAsRead(schoolId: string, notificationId: string, userId: string) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, schoolId, userId },
    { $set: { status: 'read', readAt: new Date() } },
    { new: true },
  )
  return notification
}

export async function markAllAsRead(schoolId: string, userId: string) {
  const result = await Notification.updateMany(
    { schoolId, userId, channel: 'in_app', status: { $ne: 'read' } },
    { $set: { status: 'read', readAt: new Date() } },
  )
  return { updatedCount: result.modifiedCount }
}

export async function getPreferences(schoolId: string, userId: string) {
  let prefs = await NotificationPreference.findOne({ userId, schoolId })
  if (!prefs) {
    // Create with defaults
    const channelPreferences = Object.entries(DEFAULT_CHANNEL_PREFERENCES).map(
      ([type, channels]) => ({ type, channels }),
    )
    prefs = await NotificationPreference.create({
      userId,
      schoolId,
      channelPreferences,
    })
  }
  return prefs
}

export async function updatePreferences(
  schoolId: string,
  userId: string,
  channelPreferences: Array<{ type: string; channels: string[] }>,
) {
  const prefs = await NotificationPreference.findOneAndUpdate(
    { userId, schoolId },
    { $set: { channelPreferences } },
    { new: true, upsert: true },
  )
  return prefs
}

// ── Seed default templates ───────────────────────────────────────────

export async function seedDefaultTemplates() {
  for (const tmpl of DEFAULT_TEMPLATES) {
    const existing = await NotificationTemplate.findOne({
      schoolId: null,
      type: tmpl.type,
      channel: tmpl.channel,
    })
    if (!existing) {
      await NotificationTemplate.create({
        schoolId: null,
        type: tmpl.type,
        channel: tmpl.channel,
        subject: tmpl.subject,
        body: tmpl.body,
      })
    }
  }
}
