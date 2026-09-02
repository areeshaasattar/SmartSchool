import mongoose, { Document, Schema } from 'mongoose'

// ── Sub-document types ───────────────────────────────────────────────

export interface ISchoolContact {
  email?: string
  phone?: string
  address?: string
}

export interface ISchoolBranding {
  logoUrl?: string
  primaryColor?: string
}

export interface IGradeRange {
  minPercent: number
  maxPercent: number
  grade: string
}

export interface ISchoolSettings {
  timezone: string
  locale: string
  academicWeekStart: number // 0 = Sunday … 6 = Saturday
  gradingScale: string
  gradingScaleRanges: IGradeRange[]
  contact: ISchoolContact
  branding: ISchoolBranding
  attendanceAlertThreshold: number // percentage below which a parent alert fires
}

export interface IAcademicYear {
  _id?: mongoose.Types.ObjectId
  label: string
  startDate: Date
  endDate: Date
  isCurrent: boolean
}

export interface ISubscription {
  plan: string
  status: string
  seatLimit: number
}

export type SchoolStatus = 'active' | 'inactive' | 'suspended'

export interface ISchool extends Document {
  name: string
  code: string
  status: SchoolStatus
  settings: ISchoolSettings
  academicYears: mongoose.Types.DocumentArray<IAcademicYear>
  subscription: ISubscription
  createdAt: Date
  updatedAt: Date
}

// ── Sub-schemas ──────────────────────────────────────────────────────

const schoolContactSchema = new Schema<ISchoolContact>(
  {
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
  },
  { _id: false },
)

const schoolBrandingSchema = new Schema<ISchoolBranding>(
  {
    logoUrl: { type: String, trim: true },
    primaryColor: { type: String, trim: true },
  },
  { _id: false },
)

const schoolSettingsSchema = new Schema<ISchoolSettings>(
  {
    timezone: { type: String, default: 'UTC', trim: true },
    locale: { type: String, default: 'en', trim: true },
    academicWeekStart: { type: Number, default: 1, min: 0, max: 6 },
    gradingScale: { type: String, default: 'letter', trim: true },
    gradingScaleRanges: {
      type: [{
        minPercent: { type: Number, required: true },
        maxPercent: { type: Number, required: true },
        grade: { type: String, required: true, trim: true },
      }],
      default: [
        { minPercent: 90, maxPercent: 100, grade: 'A+' },
        { minPercent: 80, maxPercent: 89, grade: 'A' },
        { minPercent: 70, maxPercent: 79, grade: 'B+' },
        { minPercent: 60, maxPercent: 69, grade: 'B' },
        { minPercent: 50, maxPercent: 59, grade: 'C' },
        { minPercent: 0, maxPercent: 49, grade: 'F' },
      ],
    },
    contact: { type: schoolContactSchema, default: () => ({}) },
    branding: { type: schoolBrandingSchema, default: () => ({}) },
    attendanceAlertThreshold: { type: Number, default: 75, min: 0, max: 100 },
  },
  { _id: false },
)

const academicYearSchema = new Schema<IAcademicYear>(
  {
    label: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isCurrent: { type: Boolean, default: false },
  },
  { _id: true },
)

const subscriptionSchema = new Schema<ISubscription>(
  {
    plan: { type: String, default: 'free', trim: true },
    status: { type: String, default: 'active', trim: true },
    seatLimit: { type: Number, default: 50, min: 1 },
  },
  { _id: false },
)

// ── Main schema ──────────────────────────────────────────────────────

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
    settings: {
      type: schoolSettingsSchema,
      default: () => ({}),
    },
    academicYears: {
      type: [academicYearSchema],
      default: [],
    },
    subscription: {
      type: subscriptionSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  },
)

schoolSchema.index({ code: 1 })
schoolSchema.index({ status: 1 })

export const School = mongoose.model<ISchool>('School', schoolSchema)
