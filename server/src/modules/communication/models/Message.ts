import mongoose, { Document, Schema } from 'mongoose'

export interface IAttachment {
  url: string
  filename: string
  mimeType: string
}

export interface IReadBy {
  userId: mongoose.Types.ObjectId
  readAt: Date
}

export interface IMessage extends Document {
  schoolId: mongoose.Types.ObjectId
  conversationId: mongoose.Types.ObjectId
  senderId: mongoose.Types.ObjectId
  content: string
  attachments: IAttachment[]
  readBy: IReadBy[]
  createdAt: Date
}

const attachmentSchema = new Schema<IAttachment>(
  {
    url: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
  },
  { _id: false },
)

const readBySchema = new Schema<IReadBy>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const messageSchema = new Schema<IMessage>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      default: '',
      trim: true,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    readBy: {
      type: [readBySchema],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
)

messageSchema.index({ conversationId: 1, createdAt: -1 })
messageSchema.index({ schoolId: 1, conversationId: 1, createdAt: -1 })

export const Message = mongoose.model<IMessage>('Message', messageSchema)
