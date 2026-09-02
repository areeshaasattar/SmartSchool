import mongoose, { Document, Schema } from 'mongoose'

export type AssignmentStatus = 'draft' | 'published' | 'closed'

export interface IAttachment {
  url: string
  filename: string
  mimeType?: string
}

export interface IAssignment extends Document {
  schoolId: mongoose.Types.ObjectId
  classId: mongoose.Types.ObjectId
  subjectId: mongoose.Types.ObjectId
  teacherId: mongoose.Types.ObjectId
  academicYearId: mongoose.Types.ObjectId
  title: string
  description: string
  attachments: IAttachment[]
  dueDate: Date
  maxMarks: number
  status: AssignmentStatus
  createdAt: Date
  updatedAt: Date
}

const attachmentSchema = new Schema<IAttachment>(
  {
    url: { type: String, required: true, trim: true },
    filename: { type: String, required: true, trim: true },
    mimeType: { type: String, trim: true },
  },
  { _id: false },
)

const assignmentSchema = new Schema<IAssignment>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    dueDate: {
      type: Date,
      required: true,
    },
    maxMarks: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'],
      default: 'draft',
    },
  },
  {
    timestamps: true,
  },
)

assignmentSchema.index({ schoolId: 1, classId: 1, status: 1 })
assignmentSchema.index({ schoolId: 1, teacherId: 1 })
assignmentSchema.index({ classId: 1, subjectId: 1 })
assignmentSchema.index({ dueDate: 1 })

export const Assignment = mongoose.model<IAssignment>('Assignment', assignmentSchema)
