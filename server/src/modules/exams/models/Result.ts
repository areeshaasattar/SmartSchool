import mongoose, { Document, Schema } from 'mongoose'

export type ResultStatus = 'pending' | 'entered' | 'published'

export interface ISubjectMark {
  subjectId: mongoose.Types.ObjectId
  marksObtained: number
  maxMarks: number
  grade: string
  passMarks: number
  passed: boolean
}

export interface IResult extends Document {
  schoolId: mongoose.Types.ObjectId
  examId: mongoose.Types.ObjectId
  studentId: mongoose.Types.ObjectId
  classId: mongoose.Types.ObjectId
  subjectMarks: ISubjectMark[]
  totalMarks: number
  totalMaxMarks: number
  percentage: number
  overallGrade: string
  rank?: number
  status: ResultStatus
  enteredBy?: mongoose.Types.ObjectId
  publishedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const subjectMarkSchema = new Schema<ISubjectMark>(
  {
    subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    marksObtained: { type: Number, required: true, min: 0 },
    maxMarks: { type: Number, required: true, min: 1 },
    grade: { type: String, default: '' },
    passMarks: { type: Number, required: true, min: 0 },
    passed: { type: Boolean, default: true },
  },
  { _id: false },
)

const resultSchema = new Schema<IResult>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    examId: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    subjectMarks: {
      type: [subjectMarkSchema],
      default: [],
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    totalMaxMarks: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    overallGrade: {
      type: String,
      default: '',
    },
    rank: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['pending', 'entered', 'published'],
      default: 'pending',
    },
    enteredBy: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
    },
    publishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

// One result per (examId, studentId)
resultSchema.index({ examId: 1, studentId: 1 }, { unique: true })
resultSchema.index({ schoolId: 1, examId: 1, classId: 1 })
resultSchema.index({ studentId: 1, status: 1 })

export const Result = mongoose.model<IResult>('Result', resultSchema)
