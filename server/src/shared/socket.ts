import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import { verifyAccessToken } from './tokens.js'
import { User } from '../modules/auth/models/User.js'

let io: Server | null = null

/**
 * Initialize Socket.IO on the HTTP server.
 * Authenticates connections via the same JWT access token used for REST.
 */
export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  // Authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token
      if (!token || typeof token !== 'string') {
        return next(new Error('Authentication required'))
      }

      const payload = verifyAccessToken(token)
      const user = await User.findById(payload.userId)

      if (!user) {
        return next(new Error('User not found'))
      }
      if (user.status !== 'active') {
        return next(new Error('Account is not active'))
      }

      // Attach user info to socket
      socket.data.userId = user._id.toString()
      socket.data.email = user.email
      socket.data.roles = user.roles
      socket.data.schoolIds = (user.schoolIds || []).map((id) => id.toString())

      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string
    const schoolIds = socket.data.schoolIds as string[]

    console.log(`[SOCKET] User ${userId} connected (socket: ${socket.id})`)

    // Join user-specific room
    socket.join(userId)

    // Join school-specific rooms for future tenant-scoped broadcasts
    if (schoolIds) {
      for (const schoolId of schoolIds) {
        socket.join(`school:${schoolId}`)
      }
    }

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`[SOCKET] User ${userId} disconnected (socket: ${socket.id})`)
    })
  })

  return io
}

/**
 * Get the Socket.IO server instance.
 */
export function getIO(): Server | null {
  return io
}
