import { io, Socket } from 'socket.io-client'
import { getAccessToken, getActiveSchoolId } from '../../../services/api'

let socket: Socket | null = null

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

export function connectSocket(): Socket {
  if (socket?.connected) return socket

  const token = getAccessToken()
  if (!token) throw new Error('No access token available')

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  })

  socket.on('connect', () => {
    console.log('[SOCKET] Connected:', socket?.id)
  })

  socket.on('disconnect', (reason) => {
    console.log('[SOCKET] Disconnected:', reason)
  })

  socket.on('connect_error', (err) => {
    console.error('[SOCKET] Connection error:', err.message)
  })

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function getSocket(): Socket | null {
  return socket
}

export function emitJoinSchool() {
  const schoolId = getActiveSchoolId()
  if (socket && schoolId) {
    socket.emit('join:school', { schoolId })
  }
}
