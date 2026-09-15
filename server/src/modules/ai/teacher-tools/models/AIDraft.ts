import mongoose, { Document, Schema } from 'mongoose'

export type AIDraftType = 'quiz' | 'assignment_description'
export type AIDraftStatus = 'generated' | 'edited' | 'approved' | 'discarded'

export interface IQuestion {
  question: string
  type: 'mcq' | 'short_answer' | 'essay'
  options?: string[]
  correctAnswer: string
  explanation: string
}

export interface IGeneratedContent {
  questions: IQuestion[]
}

export interface IRequestParams {
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  questionCount: number
  questionTypes: Array<'mcq' | 'short_answer' | 'essay'>
}

export interface IAIDraft extends Document {
  schoolId: mongoose.Types.ObjectId
  teacherId: mongoose.Types.ObjectId
  classId: mongoose.Types.ObjectId
  subjectId: mongoose.Types.ObjectId
  draftType: AIDraftType
  requestParams: IRequestParams
  generatedContent: IGeneratedContent
  status: AIDraftStatus
  reviewedAt?: Date
  publishedAssignmentId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const questionSchema = new Schema<IQuestion>(
  {
    question: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['mcq', 'short_answer', 'essay'],
      required: true,
    },
    options: { type: [String], default: undefined },
    correctAnswer: { type: String, required: true, trim: true },
    explanation: { type: String, required: true, trim: true },
  },
  { _id: false },
)

const requestParamsSchema = new Schema<IRequestParams>(
  {
    topic: { type: String, required: true, trim: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    questionCount: { type: Number, required: true, min: 1 },
    questionTypes: {
      type: [String],
      enum: ['mcq', 'short_answer', 'essay'],
      required: true,
      validate: {
        validator: (arr: readonly string[]) => arr.length > 0,
        message: 'questionTypes must include at least one type',
      },
    },
  },
  { _id: false },
)

const generatedContentSchema = new Schema<IGeneratedContent>(
  {
    questions: {
      type: [questionSchema],
      required: true,
      validate: {
        validator: (arr: readonly IQuestion[]) => arr.length > 0,
        message: 'generatedContent must include at least one question',
      },
    },
  },
  { _id: false },
)

const draftSchema = new Schema<IAIDraft>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
      index: true,
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
    draftType: {
      type: String,
      enum: ['quiz', 'assignment_description'],
      required: true,
    },
    requestParams: {
      type: requestParamsSchema,
      required: true,
    },
    generatedContent: {
      type: generatedContentSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ['generated', 'edited', 'approved', 'discarded'],
      default: 'generated',
    },
    reviewedAt: { type: Date },
    publishedAssignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment' },
  },
  { timestamps: true },
)

draftSchema.index({ schoolId: 1, teacherId: 1, status: 1 })
draftSchema.index({ schoolId: 1, classId: 1, status: 1 })
draftSchema.index({ publishedAssignmentId: 1 })

export const AIDraft = mongoose.model<IAIDraft>('AIDraft', draftSchema)
