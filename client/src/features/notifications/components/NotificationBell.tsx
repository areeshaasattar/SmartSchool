import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getSocket } from '../../messages/services/socket'
import api from '../../../services/api'

interface Notification {
  _id: string
  type: string
  title: string
  body: string
  status: string
  createdAt: string
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count')
      setUnreadCount(res.data.count)
    } catch {
      // silent
    }
  }, [])

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/notifications', { params: { limit: 10 } })
      setNotifications(res.data.notifications || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUnreadCount()
  }, [loadUnreadCount])

  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen, loadNotifications])

  // Listen for new notifications via socket
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleNewNotification = (data: { notification: Notification }) => {
      setNotifications((prev) => [data.notification, ...prev].slice(0, 10))
      setUnreadCount((prev) => prev + 1)
    }

    socket.on('notification:new', handleNewNotification)
    return () => { socket.off('notification:new', handleNewNotification) }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api.post(`/notifications/${notificationId}/read`)
      setNotifications((prev) =>
        prev.map((n) => n._id === notificationId ? { ...n, status: 'read' } : n)
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {
      // silent
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })))
      setUnreadCount(0)
    } catch {
      // silent
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString()
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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 rounded-lg transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-secondary-200 z-50">
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-semibold text-secondary-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-secondary-400 text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-secondary-400 text-sm">No notifications</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`p-3 border-b border-secondary-100 hover:bg-secondary-50 cursor-pointer ${
                    n.status === 'unread' ? 'bg-primary-50' : ''
                  }`}
                  onClick={() => handleMarkAsRead(n._id)}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{typeIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-secondary-900 truncate">{n.title}</p>
                      <p className="text-xs text-secondary-500 truncate mt-0.5">{n.body}</p>
                      <p className="text-xs text-secondary-400 mt-1">{formatTime(n.createdAt)}</p>
                    </div>
                    {n.status === 'unread' && (
                      <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <Link
            to="/notifications"
            className="block p-3 text-center text-sm text-primary-600 hover:bg-secondary-50 rounded-b-xl"
            onClick={() => setIsOpen(false)}
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  )
}
