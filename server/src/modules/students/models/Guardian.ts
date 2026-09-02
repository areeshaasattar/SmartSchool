import mongoose, { Document, Schema } from 'mongoose'

export interface IGuardian extends Document {
  schoolId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  relationship: string
  children: mongoose.Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const guardianSchema = new Schema<IGuardian>(
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
    relationship: {
      type: String,
      required: true,
      trim: true,
    },
    children: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Student',
      },
    ],
  },
  {
    timestamps: true,
  },
)

guardianSchema.index({ schoolId: 1, userId: 1 }, { unique: true })
guardianSchema.index({ schoolId: 1 })
guardianSchema.index({ userId: 1 })

export const Guardian = mongoose.model<IGuardian>('Guardian', guardianSchema)
