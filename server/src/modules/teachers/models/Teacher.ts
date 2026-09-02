import mongoose, { Document, Schema } from 'mongoose'

export type EmploymentType = 'full_time' | 'part_time' | 'contract'
export type TeacherEmploymentStatus = 'active' | 'on_leave' | 'inactive'

export interface ITeacherProfile {
  firstName: string
  lastName: string
  dob?: Date
  gender?: 'male' | 'female' | 'other'
  photoUrl?: string
  phone?: string
}

export interface ITeacherEmployment {
  designation: string
  joiningDate: Date
  employmentType: EmploymentType
  status: TeacherEmploymentStatus
}

export interface IQualification {
  degree: string
  institution: string
  year: number
}

export interface ITeacher extends Document {
  schoolId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  employeeNo: string
  departments: string[]
  subjects: string[]
  classes: mongoose.Types.ObjectId[]
  profile: ITeacherProfile
  employment: ITeacherEmployment
  qualifications: IQualification[]
  createdAt: Date
  updatedAt: Date
}

const teacherProfileSchema = new Schema<ITeacherProfile>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dob: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    photoUrl: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  { _id: false },
)

const teacherEmploymentSchema = new Schema<ITeacherEmployment>(
  {
    designation: { type: String, required: true, trim: true },
    joiningDate: { type: Date, required: true },
    employmentType: { type: String, enum: ['full_time', 'part_time', 'contract'], required: true },
    status: { type: String, enum: ['active', 'on_leave', 'inactive'], default: 'active' },
  },
  { _id: false },
)

const qualificationSchema = new Schema<IQualification>(
  {
    degree: { type: String, required: true, trim: true },
    institution: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
  },
  { _id: true },
)

const teacherSchema = new Schema<ITeacher>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    employeeNo: {
      type: String,
      required: true,
      trim: true,
    },
    departments: [{ type: String, trim: true }],
    subjects: [{ type: String, trim: true }],
    classes: [{ type: Schema.Types.ObjectId, ref: 'Class' }],
    profile: {
      type: teacherProfileSchema,
      required: true,
    },
    employment: {
      type: teacherEmploymentSchema,
      required: true,
    },
    qualifications: {
      type: [qualificationSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
)

// employeeNo unique per schoolId
teacherSchema.index({ schoolId: 1, employeeNo: 1 }, { unique: true })
teacherSchema.index({ schoolId: 1, 'employment.status': 1 })
teacherSchema.index({ userId: 1 })

export const Teacher = mongoose.model<ITeacher>('Teacher', teacherSchema)
