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

export interface ISchoolSettings {
  timezone: string
  locale: string
  academicWeekStart: number // 0 = Sunday … 6 = Saturday
  gradingScale: string
  contact: ISchoolContact
  branding: ISchoolBranding
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
    contact: { type: schoolContactSchema, default: () => ({}) },
    branding: { type: schoolBrandingSchema, default: () => ({}) },
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
