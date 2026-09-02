import { z } from 'zod'

const channelEnum = z.enum(['in_app', 'email', 'push', 'sms'])

export const channelPreferenceSchema = z.object({
  type: z.string().min(1),
  channels: z.array(channelEnum).min(1),
})

export const updatePreferencesSchema = z.object({
  channelPreferences: z.array(channelPreferenceSchema),
})

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['read', 'unread']).optional(),
  type: z.string().optional(),
})
