import mongoose, { Document, Schema } from 'mongoose'

export type ContextType = 'general' | 'student'

export interface IParticipantRole {
  userId: mongoose.Types.ObjectId
  role: string
}

export interface IConversation extends Document {
  schoolId: mongoose.Types.ObjectId
  participants: mongoose.Types.ObjectId[]
  participantRoles: IParticipantRole[]
  contextType: ContextType
  studentId?: mongoose.Types.ObjectId | null
  lastMessageAt: Date
  lastMessagePreview: string
  createdAt: Date
  updatedAt: Date
}

const participantRoleSchema = new Schema<IParticipantRole>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true },
  },
  { _id: false },
)

const conversationSchema = new Schema<IConversation>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    participantRoles: {
      type: [participantRoleSchema],
      default: [],
    },
    contextType: {
      type: String,
      enum: ['general', 'student'],
      default: 'general',
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    lastMessagePreview: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true },
)

conversationSchema.index({ schoolId: 1, participants: 1, lastMessageAt: -1 })
conversationSchema.index({ schoolId: 1, studentId: 1 })

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema)
