import mongoose, { Document, Schema } from 'mongoose'

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'half_day'

export interface IAttendance extends Document {
  schoolId: mongoose.Types.ObjectId
  studentId: mongoose.Types.ObjectId
  classId: mongoose.Types.ObjectId
  date: Date
  status: AttendanceStatus
  markedBy: mongoose.Types.ObjectId
  remarks?: string
  academicYearId?: mongoose.Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const attendanceSchema = new Schema<IAttendance>(
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
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused', 'half_day'],
      required: true,
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    remarks: {
      type: String,
      trim: true,
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

// One attendance record per (studentId, classId, date)
attendanceSchema.index({ schoolId: 1, studentId: 1, classId: 1, date: 1 }, { unique: true })
attendanceSchema.index({ schoolId: 1, classId: 1, date: 1 })
attendanceSchema.index({ schoolId: 1, studentId: 1, date: 1 })
attendanceSchema.index({ classId: 1, date: 1 })

export const Attendance = mongoose.model<IAttendance>('Attendance', attendanceSchema)
