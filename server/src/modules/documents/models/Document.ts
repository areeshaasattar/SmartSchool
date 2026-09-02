import mongoose, { Document as MongooseDocument, Schema } from 'mongoose'

export type OwnerType =
  | 'student'
  | 'teacher'
  | 'school'
  | 'invoice'
  | 'report_card'
  | 'assignment_submission'
  | 'message'
  | 'discipline'

export type DocumentType =
  | 'profile_photo'
  | 'admission_form'
  | 'id_proof'
  | 'generated_report_card'
  | 'generated_receipt'
  | 'attachment'

export type AccessPolicy = 'owner_and_admin' | 'tenant_staff' | 'public_within_tenant'

export interface IDocument extends MongooseDocument {
  schoolId: mongoose.Types.ObjectId
  ownerType: OwnerType
  ownerId: mongoose.Types.ObjectId
  uploadedBy: mongoose.Types.ObjectId
  storageKey: string
  filename: string
  mimeType: string
  sizeBytes: number
  type: DocumentType
  accessPolicy: AccessPolicy
  deleted: boolean
  createdAt: Date
  updatedAt: Date
}

const documentSchema = new Schema<IDocument>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    ownerType: {
      type: String,
      enum: [
        'student',
        'teacher',
        'school',
        'invoice',
        'report_card',
        'assignment_submission',
        'message',
        'discipline',
      ],
      required: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    storageKey: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: [
        'profile_photo',
        'admission_form',
        'id_proof',
        'generated_report_card',
        'generated_receipt',
        'attachment',
      ],
      required: true,
    },
    accessPolicy: {
      type: String,
      enum: ['owner_and_admin', 'tenant_staff', 'public_within_tenant'],
      default: 'owner_and_admin',
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
)

documentSchema.index({ schoolId: 1, ownerType: 1, ownerId: 1 })
documentSchema.index({ schoolId: 1, uploadedBy: 1 })
documentSchema.index({ schoolId: 1, deleted: 1 })

export const Document = mongoose.model<IDocument>('Document', documentSchema)
