import mongoose, { Document, Schema } from 'mongoose'

export type AIInsightType = 'academic' | 'attendance' | 'briefing'
export type AIInsightStatus = 'generated' | 'acknowledged'

export interface IAIInsight extends Document {
  schoolId: mongoose.Types.ObjectId
  type: AIInsightType
  requestedBy: mongoose.Types.ObjectId
  scopeDescription: string
  sourceDataSnapshot: Record<string, unknown>
  narrative: string
  keyPoints: string[]
  caveats: string[]
  status: AIInsightStatus
  acknowledgedAt?: Date
  acknowledgedBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const insightSchema = new Schema<IAIInsight>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['academic', 'attendance', 'briefing'],
      required: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    scopeDescription: {
      type: String,
      required: true,
      trim: true,
    },
    // The exact aggregate payload that was sent to the AI service — kept so
    // every number in the narrative can be traced back to its source data.
    sourceDataSnapshot: {
      type: Schema.Types.Mixed,
      required: true,
    },
    narrative: {
      type: String,
      required: true,
      trim: true,
    },
    keyPoints: {
      type: [String],
      default: [],
    },
    caveats: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['generated', 'acknowledged'],
      default: 'generated',
    },
    acknowledgedAt: { type: Date },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

insightSchema.index({ schoolId: 1, type: 1, createdAt: -1 })
insightSchema.index({ schoolId: 1, requestedBy: 1, createdAt: -1 })

export const AIInsight = mongoose.model<IAIInsight>('AIInsight', insightSchema)
