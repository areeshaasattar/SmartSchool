import mongoose, { Document, Schema } from 'mongoose'

export interface IClass extends Document {
  schoolId: mongoose.Types.ObjectId
  grade: string
  section: string
  roomId?: mongoose.Types.ObjectId | null
  academicYearId: mongoose.Types.ObjectId
  teacherIds: mongoose.Types.ObjectId[]
  classTeacherId?: mongoose.Types.ObjectId | null
  subjectIds: mongoose.Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const classSchema = new Schema<IClass>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    grade: {
      type: String,
      required: true,
      trim: true,
    },
    section: {
      type: String,
      required: true,
      trim: true,
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
    },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    teacherIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Teacher',
      },
    ],
    classTeacherId: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      default: null,
    },
    subjectIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Subject',
      },
    ],
  },
  {
    timestamps: true,
  },
)

// Unique (grade, section, academicYearId) per school
classSchema.index({ schoolId: 1, grade: 1, section: 1, academicYearId: 1 }, { unique: true })
classSchema.index({ schoolId: 1, academicYearId: 1 })

export const Class = mongoose.model<IClass>('Class', classSchema)
