import { useState, useEffect } from 'react'
import api from '../../../services/api'

interface ChannelPreference {
  type: string
  channels: string[]
}

const NOTIFICATION_TYPES = [
  { type: 'attendance_alert', label: 'Attendance Alerts', description: 'When your child\'s attendance drops below threshold' },
  { type: 'fee_reminder', label: 'Fee Reminders', description: 'Invoice due dates and overdue notifications' },
  { type: 'exam_published', label: 'Exam Results', description: 'When exam results are published' },
  { type: 'assignment_graded', label: 'Assignment Grading', description: 'When assignments are graded' },
  { type: 'message_received', label: 'Messages', description: 'New messages from teachers/parents' },
]

const CHANNELS = [
  { id: 'in_app', label: 'In-App', description: 'Notification bell', alwaysOn: true },
  { id: 'email', label: 'Email', description: 'Email notifications' },
  { id: 'push', label: 'Push', description: 'Browser push notifications' },
  { id: 'sms', label: 'SMS', description: 'Text message notifications' },
]

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<ChannelPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    api.get('/notifications/preferences')
      .then((res) => setPreferences(res.data.channelPreferences || []))
      .catch(() => setError('Failed to load preferences'))
      .finally(() => setLoading(false))
  }, [])

  const getChannelsForType = (type: string): string[] => {
    const pref = preferences.find((p) => p.type === type)
    return pref?.channels || ['in_app']
  }

  const toggleChannel = (type: string, channel: string) => {
    if (channel === 'in_app') return // always on
    setPreferences((prev) => {
      const existing = prev.find((p) => p.type === type)
      if (existing) {
        const channels = existing.channels.includes(channel)
          ? existing.channels.filter((c) => c !== channel)
          : [...existing.channels, channel]
        return prev.map((p) => p.type === type ? { ...p, channels } : p)
      } else {
        return [...prev, { type, channels: ['in_app', channel] }]
      }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await api.patch('/notifications/preferences', { channelPreferences: preferences })
      setSuccess('Preferences saved successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center text-secondary-500 py-8">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-secondary-900">Notification Preferences</h1>
      <p className="text-sm text-secondary-500">
        Choose which notifications you receive and how. In-app notifications are always enabled.
      </p>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>}
      {success && <div className="rounded-lg bg-green-50 p-4 text-sm text-green-600">{success}</div>}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-secondary-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase w-1/3">Notification Type</th>
              {CHANNELS.map((ch) => (
                <th key={ch.id} className="px-4 py-3 text-center text-xs font-medium text-secondary-500 uppercase">
                  {ch.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-100">
            {NOTIFICATION_TYPES.map((nt) => {
              const enabled = getChannelsForType(nt.type)
              return (
                <tr key={nt.type} className="hover:bg-secondary-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-secondary-900">{nt.label}</div>
                    <div className="text-xs text-secondary-500">{nt.description}</div>
                  </td>
                  {CHANNELS.map((ch) => (
                    <td key={ch.id} className="px-4 py-3 text-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enabled.includes(ch.id)}
                          onChange={() => toggleChannel(nt.type, ch.id)}
                          disabled={ch.alwaysOn}
                          className="sr-only peer"
                        />
                        <div className={`w-9 h-5 rounded-full peer
                          ${ch.alwaysOn ? 'bg-primary-300 cursor-not-allowed' : 'bg-secondary-300 peer-checked:bg-primary-600'}
                          after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all
                          peer-checked:after:translate-x-full`}></div>
                      </label>
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>
    </div>
  )
}
