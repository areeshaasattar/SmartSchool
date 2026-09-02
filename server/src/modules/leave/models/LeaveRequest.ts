import mongoose, { Document, Schema } from 'mongoose'

export type LeaveRequesterType = 'student' | 'teacher'
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface ILeaveRequest extends Document {
  schoolId: mongoose.Types.ObjectId
  requesterType: LeaveRequesterType
  requesterId: mongoose.Types.ObjectId // studentId or teacherId
  submittedBy: mongoose.Types.ObjectId // userId (parent or teacher)
  startDate: Date
  endDate: Date
  reason: string
  attachments: Array<{ url: string; filename: string; mimeType: string }>
  status: LeaveStatus
  reviewedBy?: mongoose.Types.ObjectId
  reviewedAt?: Date
  reviewComment?: string
  createdAt: Date
  updatedAt: Date
}

const leaveRequestSchema = new Schema<ILeaveRequest>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    requesterType: {
      type: String,
      enum: ['student', 'teacher'],
      required: true,
    },
    requesterId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'requesterType',
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: [
      {
        url: { type: String, trim: true },
        filename: { type: String, trim: true },
        mimeType: { type: String, trim: true },
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    reviewComment: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
)

leaveRequestSchema.index({ schoolId: 1, requesterType: 1, requesterId: 1 })
leaveRequestSchema.index({ schoolId: 1, status: 1 })
leaveRequestSchema.index({ schoolId: 1, startDate: 1, endDate: 1 })

export const LeaveRequest = mongoose.model<ILeaveRequest>('LeaveRequest', leaveRequestSchema)
