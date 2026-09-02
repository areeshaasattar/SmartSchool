import mongoose, { Document, Schema } from 'mongoose'

export interface IStopLocation {
  lat: number
  lng: number
}

export interface IStop extends Document {
  schoolId: mongoose.Types.ObjectId
  name: string
  location: IStopLocation
  routeIds: mongoose.Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const stopLocationSchema = new Schema<IStopLocation>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false },
)

const stopSchema = new Schema<IStop>(
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
    location: {
      type: stopLocationSchema,
      required: true,
    },
    routeIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Route',
      },
    ],
  },
  { timestamps: true },
)

stopSchema.index({ schoolId: 1, name: 1 }, { unique: true })

export const Stop = mongoose.model<IStop>('Stop', stopSchema)
