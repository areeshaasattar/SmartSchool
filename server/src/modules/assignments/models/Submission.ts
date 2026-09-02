import mongoose, { Document, Schema } from 'mongoose'

export type SubmissionStatus = 'not_submitted' | 'submitted' | 'late' | 'graded'

export interface ISubmissionAttachment {
  url: string
  filename: string
  mimeType?: string
}

export interface ISubmission extends Document {
  schoolId: mongoose.Types.ObjectId
  assignmentId: mongoose.Types.ObjectId
  studentId: mongoose.Types.ObjectId
  content: string
  attachments: ISubmissionAttachment[]
  submittedAt: Date
  status: SubmissionStatus
  marks?: number
  feedback?: string
  gradedBy?: mongoose.Types.ObjectId
  gradedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const submissionAttachmentSchema = new Schema<ISubmissionAttachment>(
  {
    url: { type: String, required: true, trim: true },
    filename: { type: String, required: true, trim: true },
    mimeType: { type: String, trim: true },
  },
  { _id: false },
)

const submissionSchema = new Schema<ISubmission>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    content: {
      type: String,
      trim: true,
      default: '',
    },
    attachments: {
      type: [submissionAttachmentSchema],
      default: [],
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['not_submitted', 'submitted', 'late', 'graded'],
      default: 'not_submitted',
    },
    marks: {
      type: Number,
      min: 0,
    },
    feedback: {
      type: String,
      trim: true,
    },
    gradedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
    },
    gradedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

// One submission per (assignmentId, studentId)
submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true })
submissionSchema.index({ schoolId: 1, assignmentId: 1 })
submissionSchema.index({ studentId: 1, status: 1 })

export const Submission = mongoose.model<ISubmission>('Submission', submissionSchema)
