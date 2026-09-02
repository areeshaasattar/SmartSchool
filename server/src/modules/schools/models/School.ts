import mongoose, { Document, Schema } from 'mongoose'

export type SchoolStatus = 'active' | 'inactive' | 'suspended'

export interface ISchool extends Document {
  name: string
  code: string
  status: SchoolStatus
  createdAt: Date
  updatedAt: Date
}

const schoolSchema = new Schema<ISchool>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  },
)

schoolSchema.index({ code: 1 })
schoolSchema.index({ status: 1 })

export const School = mongoose.model<ISchool>('School', schoolSchema)
