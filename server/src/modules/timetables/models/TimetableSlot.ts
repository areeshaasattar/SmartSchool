import mongoose, { Document, Schema } from 'mongoose'

export type TimetableDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export interface ITimetableSlot extends Document {
  schoolId: mongoose.Types.ObjectId
  classId: mongoose.Types.ObjectId
  subjectId: mongoose.Types.ObjectId
  teacherId: mongoose.Types.ObjectId
  roomId?: mongoose.Types.ObjectId | null
  day: TimetableDay
  startTime: string // HH:mm format
  endTime: string // HH:mm format
  academicYearId: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const timetableSlotSchema = new Schema<ITimetableSlot>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
    },
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

// Index for fast conflict queries and views
timetableSlotSchema.index({ schoolId: 1, academicYearId: 1, day: 1 })
timetableSlotSchema.index({ schoolId: 1, classId: 1, day: 1 })
timetableSlotSchema.index({ schoolId: 1, teacherId: 1, day: 1 })
timetableSlotSchema.index({ schoolId: 1, roomId: 1, day: 1 })

export const TimetableSlot = mongoose.model<ITimetableSlot>('TimetableSlot', timetableSlotSchema)
