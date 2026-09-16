import { createServer } from 'http'
import dns from 'node:dns'
// Importing env/app triggers envalid validation before any network I/O.
import { createApp } from './app.js'
import { env } from './shared/config/env.js'
import { connectDatabase } from './config/database.js'
import { getRedisClient } from './shared/redis.js'
import { initSocket } from './shared/socket.js'
import { migrateLegacySessions } from './modules/auth/services/authService.js'

dns.setServers(['8.8.8.8', '8.8.4.4'])

const app = createApp()
const PORT = env.PORT

// Start server
async function start() {
  try {
    await connectDatabase(env.MONGO_URI)
    getRedisClient()

    // One-time re-hash of pre-hardening plaintext refresh tokens (idempotent).
    try {
      const { migrated } = await migrateLegacySessions()
      if (migrated > 0) console.log(`Re-hashed ${migrated} legacy session token(s)`)
    } catch (error) {
      console.error('Legacy session migration failed (continuing):', error)
    }

    const httpServer = createServer(app)
    initSocket(httpServer)
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

void start()

export default app

