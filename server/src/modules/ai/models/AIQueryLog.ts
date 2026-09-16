import mongoose, { Document, Schema } from 'mongoose'

export type AIQueryFeature = 'assistant' | 'insight' | 'teacher_tool'

export interface IAIQueryLog extends Document {
  schoolId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  requestType: string
  answered: boolean
  /** Discriminates which AI feature produced this log entry. */
  feature: AIQueryFeature
  createdAt: Date
}

const aiQueryLogSchema = new Schema<IAIQueryLog>({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  requestType: { type: String, required: true },
  answered: { type: Boolean, required: true },
  feature: { type: String, enum: ['assistant', 'insight', 'teacher_tool'], default: 'assistant' },
  createdAt: { type: Date, default: Date.now, required: true },
}, { timestamps: false })

aiQueryLogSchema.index({ schoolId: 1, createdAt: -1 })
aiQueryLogSchema.index({ userId: 1, createdAt: -1 })

export const AIQueryLog = mongoose.model<IAIQueryLog>('AIQueryLog', aiQueryLogSchema)
