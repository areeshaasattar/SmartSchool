import mongoose, { Document, Schema } from 'mongoose'

export type DriverStatus = 'active' | 'inactive'

export interface IDriver extends Document {
  schoolId: mongoose.Types.ObjectId
  userId?: mongoose.Types.ObjectId | null
  name: string
  phone: string
  licenseNo: string
  licenseExpiry: Date
  status: DriverStatus
  createdAt: Date
  updatedAt: Date
}

const driverSchema = new Schema<IDriver>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    licenseNo: {
      type: String,
      required: true,
      trim: true,
    },
    licenseExpiry: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true },
)

driverSchema.index({ schoolId: 1, licenseNo: 1 }, { unique: true })
driverSchema.index({ schoolId: 1, status: 1 })

export const Driver = mongoose.model<IDriver>('Driver', driverSchema)
