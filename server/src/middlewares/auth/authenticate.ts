import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, AccessTokenPayload } from '../../shared/tokens.js'
import { User, IUser } from '../../modules/auth/models/User.js'

declare global {
  namespace Express {
    interface Request {
      user?: IUser
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Access token required' })
      return
    }

    const token = authHeader.split(' ')[1]

    let payload: AccessTokenPayload
    try {
      payload = verifyAccessToken(token)
    } catch {
      res.status(401).json({ error: 'Invalid or expired access token' })
      return
    }

    const user = await User.findById(payload.userId)

    if (!user) {
      res.status(401).json({ error: 'User not found' })
      return
    }

    if (user.status !== 'active') {
      res.status(401).json({ error: 'Account is not active' })
      return
    }

    req.user = user
    next()
  } catch (error) {
    next(error)
  }
}
