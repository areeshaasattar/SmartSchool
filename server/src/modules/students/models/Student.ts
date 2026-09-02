import mongoose, { Document, Schema } from 'mongoose'

export type StudentStatus = 'active' | 'inactive' | 'graduated' | 'transferred'

export interface IStudentProfile {
  firstName: string
  lastName: string
  dob: Date
  gender: 'male' | 'female' | 'other'
  photoUrl?: string
  bloodGroup?: string
}

export interface IEmergencyContact {
  name: string
  relation: string
  phone: string
}

export interface IStudent extends Document {
  schoolId: mongoose.Types.ObjectId
  admissionNo: string
  guardianIds: mongoose.Types.ObjectId[]
  classId?: mongoose.Types.ObjectId | null
  sectionId?: mongoose.Types.ObjectId | null
  profile: IStudentProfile
  emergencyContact: IEmergencyContact
  status: StudentStatus
  academicYearId?: mongoose.Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const studentProfileSchema = new Schema<IStudentProfile>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dob: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    photoUrl: { type: String, trim: true },
    bloodGroup: { type: String, trim: true },
  },
  { _id: false },
)

const emergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: { type: String, required: true, trim: true },
    relation: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
  },
  { _id: false },
)

const studentSchema = new Schema<IStudent>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    admissionNo: {
      type: String,
      required: true,
      trim: true,
    },
    guardianIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Guardian',
      },
    ],
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
    },
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: 'Section',
      default: null,
    },
    profile: {
      type: studentProfileSchema,
      required: true,
    },
    emergencyContact: {
      type: emergencyContactSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'graduated', 'transferred'],
      default: 'active',
    },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

// admissionNo unique per schoolId
studentSchema.index({ schoolId: 1, admissionNo: 1 }, { unique: true })
studentSchema.index({ schoolId: 1, status: 1 })
studentSchema.index({ schoolId: 1, 'profile.firstName': 1, 'profile.lastName': 1 })

export const Student = mongoose.model<IStudent>('Student', studentSchema)
