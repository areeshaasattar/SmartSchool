import mongoose, { Document, Schema } from 'mongoose'

export type ExamStatus = 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'published'

export interface IScheduleEntry {
  subjectId: mongoose.Types.ObjectId
  date: Date
  startTime: string
  endTime: string
  maxMarks: number
  passMarks: number
}

export interface IExam extends Document {
  schoolId: mongoose.Types.ObjectId
  academicYearId: mongoose.Types.ObjectId
  term: string
  name: string
  classIds: mongoose.Types.ObjectId[]
  schedule: IScheduleEntry[]
  status: ExamStatus
  createdAt: Date
  updatedAt: Date
}

const scheduleEntrySchema = new Schema<IScheduleEntry>(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    maxMarks: { type: Number, required: true, min: 1 },
    passMarks: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const examSchema = new Schema<IExam>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    term: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    classIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Class',
      },
    ],
    schedule: {
      type: [scheduleEntrySchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'ongoing', 'completed', 'published'],
      default: 'draft',
    },
  },
  {
    timestamps: true,
  },
)

examSchema.index({ schoolId: 1, academicYearId: 1, status: 1 })
examSchema.index({ schoolId: 1, term: 1 })

export const Exam = mongoose.model<IExam>('Exam', examSchema)
