import mongoose, { Document, Schema } from 'mongoose'

export type UserRole =
  | 'super_admin'
  | 'school_admin'
  | 'principal'
  | 'teacher'
  | 'student'
  | 'parent'
  | 'accountant'
  | 'hr'
  | 'transport_manager'

export const ALL_ROLES: UserRole[] = [
  'super_admin',
  'school_admin',
  'principal',
  'teacher',
  'student',
  'parent',
  'accountant',
  'hr',
  'transport_manager',
]

export type UserStatus = 'pending_verification' | 'active' | 'disabled'

export interface IUserProfile {
  firstName: string
  lastName: string
  phone?: string
  avatar?: string
}

export interface IUser extends Document {
  email: string
  passwordHash: string
  roles: UserRole[]
  schoolIds: mongoose.Types.ObjectId[]
  profile: IUserProfile
  status: UserStatus
  lastLogin?: Date
  emailVerificationToken?: string
  emailVerificationExpires?: Date
  passwordResetToken?: string
  passwordResetExpires?: Date
  createdAt: Date
  updatedAt: Date
}

const userProfileSchema = new Schema<IUserProfile>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    avatar: { type: String },
  },
  { _id: false },
)

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    roles: [
      {
        type: String,
        enum: ALL_ROLES,
        default: ['teacher'],
      },
    ],
    schoolIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'School',
      },
    ],
    profile: {
      type: userProfileSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending_verification', 'active', 'disabled'],
      default: 'pending_verification',
    },
    lastLogin: {
      type: Date,
    },
    emailVerificationToken: {
      type: String,
    },
    emailVerificationExpires: {
      type: Date,
    },
    passwordResetToken: {
      type: String,
    },
    passwordResetExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

userSchema.index({ status: 1 })
userSchema.index({ emailVerificationToken: 1 })
userSchema.index({ passwordResetToken: 1 })

export const User = mongoose.model<IUser>('User', userSchema)
