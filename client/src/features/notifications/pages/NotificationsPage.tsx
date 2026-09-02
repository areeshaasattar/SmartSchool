import { useState, useEffect, useCallback } from 'react'
import api from '../../../services/api'

interface Notification {
  _id: string
  type: string
  title: string
  body: string
  status: string
  data: Record<string, unknown>
  createdAt: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'read' | 'unread'>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, limit: 20 }
      if (filter === 'read') params.status = 'read'
      if (filter === 'unread') params.status = 'unread'

      const res = await api.get('/notifications', { params })
      setNotifications(res.data.notifications || [])
      setTotalPages(res.data.pagination?.pages || 1)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [page, filter])

  useEffect(() => { loadNotifications() }, [loadNotifications])

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`)
      setNotifications((prev) =>
        prev.map((n) => n._id === id ? { ...n, status: 'read' } : n)
      )
    } catch {
      // silent
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })))
    } catch {
      // silent
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString()
  }

  const typeIcon = (type: string) => {
    switch (type) {
      case 'attendance_alert': return '📅'
      case 'fee_reminder': return '💰'
      case 'exam_published': return '📈'
      case 'assignment_graded': return '📝'
      case 'message_received': return '✉️'
      default: return '🔔'
    }
  }

  const unreadCount = notifications.filter((n) => n.status !== 'read').length

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'unread', 'read'] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1) }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-secondary-300 text-secondary-700 hover:bg-secondary-50'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-secondary-500 py-8">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <p className="text-secondary-400">No notifications</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm divide-y divide-secondary-100">
          {notifications.map((n) => (
            <div
              key={n._id}
              className={`p-4 hover:bg-secondary-50 cursor-pointer ${
                n.status !== 'read' ? 'bg-primary-50' : ''
              }`}
              onClick={() => handleMarkAsRead(n._id)}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{typeIcon(n.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-secondary-900">{n.title}</h3>
                    {n.status !== 'read' && (
                      <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-secondary-500 mt-0.5">{n.body}</p>
                  <p className="text-xs text-secondary-400 mt-1">{formatTime(n.createdAt)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-secondary-300 px-3 py-1.5 text-sm text-secondary-700 hover:bg-secondary-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-secondary-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-secondary-300 px-3 py-1.5 text-sm text-secondary-700 hover:bg-secondary-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
