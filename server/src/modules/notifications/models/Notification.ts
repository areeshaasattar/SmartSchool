import mongoose, { Document, Schema } from 'mongoose'

export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read'

export interface INotification extends Document {
  schoolId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  type: string
  channel: string
  title: string
  body: string
  data: Record<string, unknown>
  status: NotificationStatus
  readAt?: Date
  sentAt?: Date
  createdAt: Date
}

const notificationSchema = new Schema<INotification>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    channel: {
      type: String,
      enum: ['in_app', 'email', 'push', 'sms'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'read'],
      default: 'pending',
    },
    readAt: {
      type: Date,
    },
    sentAt: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
)

notificationSchema.index({ schoolId: 1, userId: 1, status: 1, createdAt: -1 })
notificationSchema.index({ schoolId: 1, userId: 1, createdAt: -1 })

export const Notification = mongoose.model<INotification>(
  'Notification',
  notificationSchema,
)
