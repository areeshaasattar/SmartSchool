import mongoose, { Document, Schema } from 'mongoose'

export const KNOWLEDGE_SOURCE_TYPES = ['school_policy', 'announcement', 'handbook', 'faq', 'parent_academic'] as const
export type KnowledgeSourceType = typeof KNOWLEDGE_SOURCE_TYPES[number]

export interface IKnowledgeDocument extends Document {
  schoolId: mongoose.Types.ObjectId
  sourceType: KnowledgeSourceType
  title: string
  content: string
  uploadedBy: mongoose.Types.ObjectId
  ownerId?: mongoose.Types.ObjectId
  status: 'pending_index' | 'indexed' | 'failed'
  createdAt: Date
  updatedAt: Date
}

const knowledgeDocumentSchema = new Schema<IKnowledgeDocument>({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  sourceType: { type: String, enum: KNOWLEDGE_SOURCE_TYPES, required: true },
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'Student' },
  status: { type: String, enum: ['pending_index', 'indexed', 'failed'], default: 'pending_index' },
}, { timestamps: true })

knowledgeDocumentSchema.index({ schoolId: 1, sourceType: 1, status: 1 })
knowledgeDocumentSchema.index({ schoolId: 1, ownerId: 1 })

export const KnowledgeDocument = mongoose.model<IKnowledgeDocument>('KnowledgeDocument', knowledgeDocumentSchema)
