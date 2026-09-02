import mongoose, { Document, Schema } from 'mongoose'

export interface IChannelPreference {
  type: string
  channels: string[]
}

export interface INotificationPreference extends Document {
  userId: mongoose.Types.ObjectId
  schoolId: mongoose.Types.ObjectId
  channelPreferences: IChannelPreference[]
  createdAt: Date
  updatedAt: Date
}

const channelPreferenceSchema = new Schema<IChannelPreference>(
  {
    type: { type: String, required: true },
    channels: [{ type: String, enum: ['in_app', 'email', 'push', 'sms'] }],
  },
  { _id: false },
)

const notificationPreferenceSchema = new Schema<INotificationPreference>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    channelPreferences: {
      type: [channelPreferenceSchema],
      default: [],
    },
  },
  { timestamps: true },
)

notificationPreferenceSchema.index({ userId: 1, schoolId: 1 }, { unique: true })

export const NotificationPreference = mongoose.model<INotificationPreference>(
  'NotificationPreference',
  notificationPreferenceSchema,
)

/**
 * Default channel preferences per notification type.
 * in_app is always on; other channels default to sensible values.
 */
export const DEFAULT_CHANNEL_PREFERENCES: Record<string, string[]> = {
  attendance_alert: ['in_app', 'email'],
  fee_reminder: ['in_app', 'email'],
  exam_published: ['in_app', 'email'],
  assignment_graded: ['in_app'],
  message_received: ['in_app'],
}
