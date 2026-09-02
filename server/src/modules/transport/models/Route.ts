import mongoose, { Document, Schema } from 'mongoose'

export interface IRouteStop {
  stopId: mongoose.Types.ObjectId
  order: number
  estimatedTime: string // HH:mm format
}

export interface IRoute extends Document {
  schoolId: mongoose.Types.ObjectId
  name: string
  vehicleId: mongoose.Types.ObjectId
  driverId: mongoose.Types.ObjectId
  stops: IRouteStop[]
  createdAt: Date
  updatedAt: Date
}

const routeStopSchema = new Schema<IRouteStop>(
  {
    stopId: { type: Schema.Types.ObjectId, ref: 'Stop', required: true },
    order: { type: Number, required: true },
    estimatedTime: { type: String, required: true },
  },
  { _id: false },
)

const routeSchema = new Schema<IRoute>(
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
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
    },
    stops: {
      type: [routeStopSchema],
      validate: {
        validator: (v: IRouteStop[]) => v.length >= 2,
        message: 'A route must have at least 2 stops',
      },
    },
  },
  { timestamps: true },
)

routeSchema.index({ schoolId: 1, name: 1 })
routeSchema.index({ schoolId: 1, vehicleId: 1 })
routeSchema.index({ schoolId: 1, driverId: 1 })

export const Route = mongoose.model<IRoute>('Route', routeSchema)
