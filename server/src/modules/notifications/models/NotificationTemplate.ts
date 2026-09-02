import mongoose, { Document, Schema } from 'mongoose'

export type NotificationType =
  | 'attendance_alert'
  | 'fee_reminder'
  | 'exam_published'
  | 'assignment_graded'
  | 'message_received'

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms'

export interface INotificationTemplate extends Document {
  schoolId?: mongoose.Types.ObjectId | null  // null = platform-wide default
  type: NotificationType
  channel: NotificationChannel
  subject: string
  body: string  // supports {{variable}} interpolation
  createdAt: Date
  updatedAt: Date
}

const notificationTemplateSchema = new Schema<INotificationTemplate>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      default: null,
    },
    type: {
      type: String,
      enum: ['attendance_alert', 'fee_reminder', 'exam_published', 'assignment_graded', 'message_received'],
      required: true,
    },
    channel: {
      type: String,
      enum: ['in_app', 'email', 'push', 'sms'],
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
)

notificationTemplateSchema.index({ schoolId: 1, type: 1, channel: 1 })
notificationTemplateSchema.index({ schoolId: 1, type: 1 })

export const NotificationTemplate = mongoose.model<INotificationTemplate>(
  'NotificationTemplate',
  notificationTemplateSchema,
)
