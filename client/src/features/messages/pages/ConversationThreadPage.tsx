import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../../services/api'
import { getSocket } from '../services/socket'

interface Sender {
  _id: string
  email: string
  profile?: { firstName: string; lastName: string }
}

interface MessageAttachment {
  url: string
  filename: string
  mimeType: string
}

interface Message {
  _id: string
  senderId: Sender
  content: string
  attachments: MessageAttachment[]
  readBy: { userId: string; readAt: string }[]
  createdAt: string
}

interface Conversation {
  _id: string
  participants: Sender[]
  contextType: string
  studentId?: { _id: string; profile: { firstName: string; lastName: string } } | null
}

export default function ConversationThreadPage() {
  const { id } = useParams<{ id: string }>()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [content, setContent] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [attachmentFilename, setAttachmentFilename] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentUserIdRef = useRef<string>('')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadConversation = useCallback(async () => {
    if (!id) return
    try {
      const res = await api.get(`/messages/conversations/${id}`)
      setConversation(res.data)
    } catch {
      // silent
    }
  }, [id])

  const loadMessages = useCallback(async () => {
    if (!id) return
    try {
      const res = await api.get(`/messages/conversations/${id}/messages`)
      setMessages(res.data.messages || [])
      // Get current user ID from first message sender or profile
      if (res.data.messages?.length > 0) {
        // We'll set it from the auth context instead
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadConversation()
    loadMessages()
  }, [loadConversation, loadMessages])

  useEffect(() => { scrollToBottom() }, [messages])

  // Get current user ID
  useEffect(() => {
    api.get('/auth/me').then((res) => {
      currentUserIdRef.current = res.data.user?.id || res.data.id || ''
    }).catch(() => {})
  }, [])

  // Listen for new messages via socket
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !id) return

    const handleNewMessage = (data: { conversationId: string; message: Message }) => {
      if (data.conversationId === id) {
        setMessages((prev) => [...prev, data.message])
        // Mark as read
        api.post(`/messages/conversations/${id}/read`).catch(() => {})
      }
    }

    const handleReadReceipt = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === id) {
        setMessages((prev) => prev.map((msg) => {
          if (msg.readBy.some((r) => r.userId === data.userId)) return msg
          return {
            ...msg,
            readBy: [...msg.readBy, { userId: data.userId, readAt: new Date().toISOString() }],
          }
        }))
      }
    }

    socket.on('message:new', handleNewMessage)
    socket.on('message:read', handleReadReceipt)

    // Mark conversation as read
    api.post(`/messages/conversations/${id}/read`).catch(() => {})

    return () => {
      socket.off('message:new', handleNewMessage)
      socket.off('message:read', handleReadReceipt)
    }
  }, [id])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!content.trim() && !attachmentUrl.trim()) || !id) return

    setSending(true)
    try {
      const payload: { content?: string; attachments?: MessageAttachment[] } = {}
      if (content.trim()) payload.content = content.trim()
      if (attachmentUrl.trim()) {
        payload.attachments = [{
          url: attachmentUrl.trim(),
          filename: attachmentFilename.trim() || 'attachment',
          mimeType: 'application/octet-stream',
        }]
      }

      await api.post(`/messages/conversations/${id}/messages`, payload)
      setContent('')
      setAttachmentUrl('')
      setAttachmentFilename('')
      await loadMessages()
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setSending(false)
    }
  }

  const getOtherName = (sender: Sender) => {
    return sender.profile ? `${sender.profile.firstName} ${sender.profile.lastName}` : sender.email
  }

  if (loading) return <div className="text-center text-secondary-500 py-8">Loading messages...</div>
  if (!conversation) return <div className="text-center py-8 text-secondary-400">Conversation not found</div>

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[80vh]">
      {/* Header */}
      <div className="bg-white rounded-t-xl shadow-sm p-4 border-b">
        <Link to="/messages" className="text-sm text-primary-600 hover:underline">← Back to Messages</Link>
        <h1 className="text-lg font-semibold text-secondary-900 mt-1">
          {conversation.participants.map((p) => getOtherName(p)).join(', ')}
        </h1>
        {conversation.contextType === 'student' && conversation.studentId && (
          <p className="text-xs text-primary-600">Regarding: {conversation.studentId.profile.firstName} {conversation.studentId.profile.lastName}</p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-secondary-50 p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-secondary-400 py-8">No messages yet. Start the conversation!</div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId._id === currentUserIdRef.current
            return (
              <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md rounded-xl px-4 py-2.5 ${
                  isMine ? 'bg-primary-600 text-white' : 'bg-white shadow-sm'
                }`}>
                  {!isMine && (
                    <p className="text-xs font-medium text-primary-600 mb-1">{getOtherName(msg.senderId)}</p>
                  )}
                  {msg.content && <p className="text-sm">{msg.content}</p>}
                  {msg.attachments.map((att, i) => (
                    <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                      className={`text-xs underline block mt-1 ${isMine ? 'text-primary-100' : 'text-primary-600'}`}>
                      📎 {att.filename}
                    </a>
                  ))}
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-xs ${isMine ? 'text-primary-200' : 'text-secondary-400'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMine && msg.readBy.length > 1 && (
                      <span className="text-xs text-primary-200">✓✓ Read</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} className="bg-white rounded-b-xl shadow-sm p-4 border-t">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || (!content.trim() && !attachmentUrl.trim())}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={attachmentUrl}
            onChange={(e) => setAttachmentUrl(e.target.value)}
            placeholder="Attachment URL (optional)"
            className="flex-1 rounded-lg border border-secondary-300 px-3 py-1.5 text-xs"
          />
          <input
            type="text"
            value={attachmentFilename}
            onChange={(e) => setAttachmentFilename(e.target.value)}
            placeholder="Filename"
            className="w-32 rounded-lg border border-secondary-300 px-3 py-1.5 text-xs"
          />
        </div>
      </form>
    </div>
  )
}
