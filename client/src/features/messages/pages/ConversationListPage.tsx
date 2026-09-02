import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../services/api'
import { getSocket } from '../services/socket'

interface Participant {
  _id: string
  email: string
  profile?: { firstName: string; lastName: string }
}

interface Conversation {
  _id: string
  participants: Participant[]
  contextType: string
  studentId?: { _id: string; profile: { firstName: string; lastName: string } } | null
  lastMessageAt: string
  lastMessagePreview: string
}

export default function ConversationListPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadConversations = useCallback(async () => {
    try {
      const res = await api.get('/messages/conversations')
      setConversations(res.data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  const loadUnread = useCallback(async () => {
    try {
      const res = await api.get('/messages/unread')
      setUnreadCount(res.data.count)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    loadConversations()
    loadUnread()
  }, [loadConversations, loadUnread])

  // Listen for new messages via socket
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handleNewMessage = (_data: { conversationId: string }) => {
      // Reload conversations list to get updated preview
      loadConversations()
      loadUnread()
    }

    socket.on('message:new', handleNewMessage)
    return () => { socket.off('message:new', handleNewMessage) }
  }, [loadConversations, loadUnread])

  const getOtherParticipant = (conv: Conversation) => {
    // For now, show first non-self participant (simplified)
    return conv.participants[0]
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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-secondary-900">Messages</h1>
        <Link
          to="/messages/new"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          + New Message
        </Link>
      </div>

      {unreadCount > 0 && (
        <div className="mb-4 rounded-lg bg-primary-50 p-3 text-sm text-primary-700">
          You have {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
        </div>
      )}

      {loading ? (
        <div className="text-center text-secondary-500 py-8">Loading conversations...</div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <p className="text-secondary-400">No conversations yet</p>
          <p className="text-xs text-secondary-300 mt-2">Start a new message to begin a conversation.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm divide-y divide-secondary-100">
          {conversations.map((conv) => {
            const other = getOtherParticipant(conv)
            return (
              <Link
                key={conv._id}
                to={`/messages/${conv._id}`}
                className="flex items-center gap-3 p-4 hover:bg-secondary-50 transition-colors"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm flex-shrink-0">
                  {other?.profile?.firstName?.[0] || other?.email?.[0] || '?'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-secondary-900 truncate">
                      {other?.profile ? `${other.profile.firstName} ${other.profile.lastName}` : other?.email || 'Unknown'}
                    </h3>
                    <span className="text-xs text-secondary-400 flex-shrink-0 ml-2">
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  {conv.contextType === 'student' && conv.studentId && (
                    <p className="text-xs text-primary-600 mt-0.5">
                      Re: {conv.studentId.profile.firstName} {conv.studentId.profile.lastName}
                    </p>
                  )}
                  <p className="text-sm text-secondary-500 truncate mt-0.5">
                    {conv.lastMessagePreview || 'No messages yet'}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
