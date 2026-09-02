import mongoose, { Document, Schema } from 'mongoose'

export type DisciplineCategory = 'behavior' | 'academic_integrity' | 'attendance' | 'other'
export type DisciplineSeverity = 'minor' | 'moderate' | 'major'
export type DisciplineStatus = 'open' | 'resolved'

export interface IDisciplineFollowUp {
  date: Date
  note: string
  recordedBy: mongoose.Types.ObjectId
}

export interface IDisciplineRecord extends Document {
  schoolId: mongoose.Types.ObjectId
  studentId: mongoose.Types.ObjectId
  incidentDate: Date
  category: DisciplineCategory
  description: string
  reportedBy: mongoose.Types.ObjectId // teacherId or userId
  severity: DisciplineSeverity
  actionTaken?: string
  followUp: IDisciplineFollowUp[]
  status: DisciplineStatus
  createdAt: Date
  updatedAt: Date
}

const disciplineFollowUpSchema = new Schema<IDisciplineFollowUp>(
  {
    date: { type: Date, required: true, default: Date.now },
    note: { type: String, required: true, trim: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false },
)

const disciplineRecordSchema = new Schema<IDisciplineRecord>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    incidentDate: {
      type: Date,
      required: true,
    },
    category: {
      type: String,
      enum: ['behavior', 'academic_integrity', 'attendance', 'other'],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'major'],
      required: true,
    },
    actionTaken: {
      type: String,
      trim: true,
    },
    followUp: [disciplineFollowUpSchema],
    status: {
      type: String,
      enum: ['open', 'resolved'],
      default: 'open',
    },
  },
  {
    timestamps: true,
  },
)

disciplineRecordSchema.index({ schoolId: 1, studentId: 1 })
disciplineRecordSchema.index({ schoolId: 1, status: 1 })
disciplineRecordSchema.index({ schoolId: 1, reportedBy: 1 })
disciplineRecordSchema.index({ schoolId: 1, incidentDate: 1 })

export const DisciplineRecord = mongoose.model<IDisciplineRecord>('DisciplineRecord', disciplineRecordSchema)
