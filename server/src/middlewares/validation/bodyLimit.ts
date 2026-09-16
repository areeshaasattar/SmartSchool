import { Request, Response, NextFunction } from 'express'
import { env } from '../../shared/config/env.js'

/**
 * Coarse pre-parse guard against oversized request bodies.
 *
 * When the body has been buffered (e.g. by the supertest/json middleware chain),
 * express's own `limit` option would only reject after full parse; checking
 * content-length here fails fast with a clean 413 before touching the parser.
 * Streaming requests without a content-length header pass through — express.json
 * still enforces its own byte cap during parsing.
 */
export function jsonBodyLimit(req: Request, res: Response, next: NextFunction): void {
  const declared = Number(req.headers['content-length'] ?? 0)
  if (declared > env.MAX_UPLOAD_BYTES) {
    res.status(413).json({ error: 'Request body too large' })
    return
  }
  next()
}
