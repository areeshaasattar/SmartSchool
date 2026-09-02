import mongoose, { Document, Schema } from 'mongoose'

export interface IGradeMapping {
  grade: string
}

export interface ISubject extends Document {
  schoolId: mongoose.Types.ObjectId
  name: string
  code: string
  gradeMappings: IGradeMapping[]
  createdAt: Date
  updatedAt: Date
}

const gradeMappingSchema = new Schema<IGradeMapping>(
  {
    grade: { type: String, required: true, trim: true },
  },
  { _id: false },
)

const subjectSchema = new Schema<ISubject>(
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
    code: {
      type: String,
      required: true,
      trim: true,
    },
    gradeMappings: {
      type: [gradeMappingSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
)

// code unique per school
subjectSchema.index({ schoolId: 1, code: 1 }, { unique: true })
subjectSchema.index({ schoolId: 1 })

export const Subject = mongoose.model<ISubject>('Subject', subjectSchema)
