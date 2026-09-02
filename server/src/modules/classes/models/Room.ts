import mongoose, { Document, Schema } from 'mongoose'

export interface IRoom extends Document {
  schoolId: mongoose.Types.ObjectId
  name: string
  capacity: number
  createdAt: Date
  updatedAt: Date
}

const roomSchema = new Schema<IRoom>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    timestamps: true,
  },
)

roomSchema.index({ schoolId: 1, name: 1 }, { unique: true })

export const Room = mongoose.model<IRoom>('Room', roomSchema)
