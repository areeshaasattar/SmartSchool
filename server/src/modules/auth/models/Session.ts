import mongoose, { Document, Schema } from 'mongoose'

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId
  refreshToken: string
  userAgent?: string
  ipAddress?: string
  expiresAt: Date
  createdAt: Date
}

const sessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    refreshToken: {
      type: String,
      required: true,
      unique: true,
    },
    userAgent: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  },
)

sessionSchema.index({ refreshToken: 1 })
sessionSchema.index({ userId: 1, expiresAt: 1 })

export const Session = mongoose.model<ISession>('Session', sessionSchema)
