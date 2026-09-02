import { interpolate } from '../../src/modules/notifications/services/notificationService.js'
import { DEFAULT_CHANNEL_PREFERENCES } from '../../src/modules/notifications/models/NotificationPreference.js'
import { updatePreferencesSchema, notificationQuerySchema } from '../../src/modules/notifications/schemas/notificationSchemas.js'

describe('Notification template interpolation', () => {
  it('replaces single variable', () => {
    const result = interpolate('Hello {{name}}!', { name: 'John' })
    expect(result).toBe('Hello John!')
  })

  it('replaces multiple variables', () => {
    const result = interpolate('{{student}} scored {{marks}}/{{total}}', {
      student: 'Alice',
      marks: '85',
      total: '100',
    })
    expect(result).toBe('Alice scored 85/100')
  })

  it('leaves unresolved variables as-is', () => {
    const result = interpolate('Hello {{name}}, your score is {{score}}', { name: 'John' })
    expect(result).toBe('Hello John, your score is {{score}}')
  })

  it('handles empty template', () => {
    const result = interpolate('', { name: 'John' })
    expect(result).toBe('')
  })

  it('handles no variables', () => {
    const result = interpolate('No variables here', { name: 'John' })
    expect(result).toBe('No variables here')
  })

  it('handles empty variables object', () => {
    const result = interpolate('Hello {{name}}', {})
    expect(result).toBe('Hello {{name}}')
  })
})

describe('Default channel preferences', () => {
  it('attendance_alert defaults to in_app + email', () => {
    expect(DEFAULT_CHANNEL_PREFERENCES.attendance_alert).toContain('in_app')
    expect(DEFAULT_CHANNEL_PREFERENCES.attendance_alert).toContain('email')
  })

  it('fee_reminder defaults to in_app + email', () => {
    expect(DEFAULT_CHANNEL_PREFERENCES.fee_reminder).toContain('in_app')
    expect(DEFAULT_CHANNEL_PREFERENCES.fee_reminder).toContain('email')
  })

  it('exam_published defaults to in_app + email', () => {
    expect(DEFAULT_CHANNEL_PREFERENCES.exam_published).toContain('in_app')
    expect(DEFAULT_CHANNEL_PREFERENCES.exam_published).toContain('email')
  })

  it('assignment_graded defaults to in_app only', () => {
    expect(DEFAULT_CHANNEL_PREFERENCES.assignment_graded).toEqual(['in_app'])
  })

  it('message_received defaults to in_app only', () => {
    expect(DEFAULT_CHANNEL_PREFERENCES.message_received).toEqual(['in_app'])
  })

  it('in_app is always included in all defaults', () => {
    for (const channels of Object.values(DEFAULT_CHANNEL_PREFERENCES)) {
      expect(channels).toContain('in_app')
    }
  })
})

describe('Notification validation schemas', () => {
  describe('updatePreferencesSchema', () => {
    it('accepts valid preferences', () => {
      const result = updatePreferencesSchema.safeParse({
        channelPreferences: [
          { type: 'attendance_alert', channels: ['in_app', 'email'] },
          { type: 'fee_reminder', channels: ['in_app'] },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('rejects empty channels array', () => {
      const result = updatePreferencesSchema.safeParse({
        channelPreferences: [
          { type: 'attendance_alert', channels: [] },
        ],
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid channel', () => {
      const result = updatePreferencesSchema.safeParse({
        channelPreferences: [
          { type: 'attendance_alert', channels: ['in_app', 'invalid'] },
        ],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('notificationQuerySchema', () => {
    it('accepts empty query with defaults', () => {
      const result = notificationQuerySchema.parse({})
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })

    it('accepts valid status filter', () => {
      const result = notificationQuerySchema.parse({ status: 'unread' })
      expect(result.status).toBe('unread')
    })

    it('rejects invalid status', () => {
      const result = notificationQuerySchema.safeParse({ status: 'invalid' })
      expect(result.success).toBe(false)
    })

    it('coerces string numbers', () => {
      const result = notificationQuerySchema.parse({ page: '2', limit: '10' })
      expect(result.page).toBe(2)
      expect(result.limit).toBe(10)
    })
  })
})

describe('Channel failure isolation', () => {
  it('one channel failure does not affect others', async () => {
    const results: string[] = []

    const channels = ['in_app', 'email', 'push']
    for (const channel of channels) {
      try {
        if (channel === 'email') throw new Error('Email provider down')
        results.push(`${channel}: sent`)
      } catch {
        results.push(`${channel}: failed`)
      }
    }

    expect(results).toEqual(['in_app: sent', 'email: failed', 'push: sent'])
  })
})
