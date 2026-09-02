import mongoose, { Document, Schema } from 'mongoose'

export type VehicleType = 'bus' | 'van' | 'other'
export type VehicleStatus = 'active' | 'maintenance' | 'inactive'

export interface IVehicle extends Document {
  schoolId: mongoose.Types.ObjectId
  registrationNo: string
  type: VehicleType
  capacity: number
  status: VehicleStatus
  gpsDeviceId?: string | null
  createdAt: Date
  updatedAt: Date
}

const vehicleSchema = new Schema<IVehicle>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    registrationNo: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['bus', 'van', 'other'],
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['active', 'maintenance', 'inactive'],
      default: 'active',
    },
    gpsDeviceId: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true },
)

vehicleSchema.index({ schoolId: 1, registrationNo: 1 }, { unique: true })
vehicleSchema.index({ schoolId: 1, status: 1 })

export const Vehicle = mongoose.model<IVehicle>('Vehicle', vehicleSchema)
