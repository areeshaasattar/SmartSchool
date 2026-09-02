import mongoose, { Document, Schema } from 'mongoose'

export type LateFeeType = 'flat' | 'percentage'

export interface ILateFeePolicy {
  gracePeriodDays: number
  lateFeeAmount: number
  lateFeeType: LateFeeType
}

export interface IFeeComponent {
  label: string
  amount: number
}

export interface IFeeStructure extends Document {
  schoolId: mongoose.Types.ObjectId
  academicYearId: mongoose.Types.ObjectId
  classId?: mongoose.Types.ObjectId | null  // null = applies to all classes
  name: string
  components: IFeeComponent[]
  totalAmount: number
  dueDate: Date
  lateFeePolicy: ILateFeePolicy
  createdAt: Date
  updatedAt: Date
}

const feeComponentSchema = new Schema<IFeeComponent>(
  {
    label: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const lateFeePolicySchema = new Schema<ILateFeePolicy>(
  {
    gracePeriodDays: { type: Number, default: 0, min: 0 },
    lateFeeAmount: { type: Number, default: 0, min: 0 },
    lateFeeType: { type: String, enum: ['flat', 'percentage'], default: 'flat' },
  },
  { _id: false },
)

const feeStructureSchema = new Schema<IFeeStructure>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    components: {
      type: [feeComponentSchema],
      validate: {
        validator: (v: IFeeComponent[]) => v.length > 0,
        message: 'At least one fee component is required',
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    lateFeePolicy: {
      type: lateFeePolicySchema,
      default: () => ({ gracePeriodDays: 0, lateFeeAmount: 0, lateFeeType: 'flat' }),
    },
  },
  { timestamps: true },
)

feeStructureSchema.index({ schoolId: 1, academicYearId: 1 })
feeStructureSchema.index({ schoolId: 1, classId: 1 })

export const FeeStructure = mongoose.model<IFeeStructure>('FeeStructure', feeStructureSchema)
