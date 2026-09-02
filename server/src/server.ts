import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { connectDatabase } from './config/database.js'
import { getRedisClient } from './shared/redis.js'
import routes from './routes/index.js'
import dns from 'node:dns'

dotenv.config()
dns.setServers(['8.8.8.8', '8.8.4.4'])

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// API routes
app.use('/api', routes)

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Start server
async function start() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://root:rootpassword@localhost:27017/smartschool?authSource=admin'
    await connectDatabase(mongoUri)

    // Connect to Redis
    getRedisClient()

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

start()

export default app
