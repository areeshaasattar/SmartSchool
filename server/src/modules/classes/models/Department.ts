import mongoose, { Document, Schema } from 'mongoose'

export interface IDepartment extends Document {
  schoolId: mongoose.Types.ObjectId
  name: string
  createdAt: Date
  updatedAt: Date
}

const departmentSchema = new Schema<IDepartment>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
)

departmentSchema.index({ schoolId: 1, name: 1 }, { unique: true })

export const Department = mongoose.model<IDepartment>('Department', departmentSchema)
