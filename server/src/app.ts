import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import hpp from 'hpp'
import mongoose from 'mongoose'
import { corsAllowedOrigins } from './shared/config/env.js'
import { jsonBodyLimit } from './middlewares/validation/bodyLimit.js'
import { sanitizeRequest } from './middlewares/validation/sanitizeRequest.js'

/**
 * Application factory with the full hardening pipeline.
 *
 * Order matters:
 *   1. helmet            — security headers (CSP, HSTS, no sniff, frameguard…)
 *   2. cors              — strict origin allowlist from env (no wildcard)
 *   3. bodyLimit + json  — cap request body size before parsing
 *   4. mongoSanitize     — strip $-prefixed / dotted keys (NoSQL injection)
 *   5. hpp               — reject HTTP parameter pollution (?a=1&a=2)
 *   6. routes
 *   7. error handler
 */
export function createApp(): express.Express {
  const app = express()
  app.disable('x-powered-by')

  const allowedOrigins = corsAllowedOrigins()

  // ── Security headers ────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind/CSS-in-JS needs inline styles
          imgSrc: ["'self'", 'data:', 'blob:', 'res.cloudinary.com'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", ...allowedOrigins.map((o) => o.toString()), 'https://api.openai.com'],
          objectSrc: ["'none'"],
          frameAncestors: ["'self'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    }),
  )

  // ── CORS: strict env allowlist, credentials allowed for same-first-party ──
  app.use(
    cors({
      origin(origin, callback) {
        // Non-browser clients (curl, health checks) may omit Origin
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true)
          return
        }
        callback(new Error(`Origin ${origin} is not allowed by CORS`))
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-School-Id'],
      credentials: true,
      maxAge: 86400,
    }),
  )

  // ── Body parsing with hard size cap ─────────────────────────────────
  app.use(jsonBodyLimit)
  app.use(express.json({ limit: '1mb' }))

  // ── Injection safety ────────────────────────────────────────────────
  // Express 5-compatible NoSQL sanitization (stock middleware breaks on req.query)
  app.use(sanitizeRequest)
  app.use(hpp())

  // ── Health check (no auth, before routes) ───────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api', routes)

  // ── Error handling middleware ───────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 4-arity required by Express
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof mongoose.Error.ValidationError) {
      const details = Object.fromEntries(
        Object.entries(err.errors).map(([field, validationError]) => [field, validationError.message]),
      )
      res.status(400).json({ error: 'Validation failed', details })
      return
    }

    // CORS allowlist rejections surface as plain errors — map them to 403.
    if (err.message.includes('not allowed by CORS')) {
      res.status(403).json({ error: err.message })
      return
    }

    console.error('Unhandled error:', err)
    res.status(500).json({ error: 'Internal server error' })
  })

  return app
}

// Imported late to avoid circular imports (routes import middlewares that
// import config which this file also imports).
import routes from './routes/index.js'

export default createApp

