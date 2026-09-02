import mongoose, { Document, Schema } from 'mongoose'

export type TransportAssignmentStatus = 'active' | 'inactive'

export interface ITransportAssignment extends Document {
  schoolId: mongoose.Types.ObjectId
  studentId: mongoose.Types.ObjectId
  routeId: mongoose.Types.ObjectId
  stopId: mongoose.Types.ObjectId
  academicYearId: mongoose.Types.ObjectId
  status: TransportAssignmentStatus
  createdAt: Date
  updatedAt: Date
}

const transportAssignmentSchema = new Schema<ITransportAssignment>(
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
    routeId: {
      type: Schema.Types.ObjectId,
      ref: 'Route',
      required: true,
    },
    stopId: {
      type: Schema.Types.ObjectId,
      ref: 'Stop',
      required: true,
    },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
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

// One active assignment per (studentId, academicYearId)
transportAssignmentSchema.index(
  { schoolId: 1, studentId: 1, academicYearId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
)
transportAssignmentSchema.index({ schoolId: 1, routeId: 1 })
transportAssignmentSchema.index({ schoolId: 1, stopId: 1 })

export const TransportAssignment = mongoose.model<ITransportAssignment>(
  'TransportAssignment',
  transportAssignmentSchema,
)
