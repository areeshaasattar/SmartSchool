import mongoose, { Document, Schema } from 'mongoose'

export type InvoiceStatus = 'pending' | 'partially_paid' | 'paid' | 'overdue'

export interface IDiscount {
  label: string
  amount: number
  reason?: string
}

export interface IInvoiceLineItem {
  label: string
  amount: number
}

export interface IFeeInvoice extends Document {
  schoolId: mongoose.Types.ObjectId
  studentId: mongoose.Types.ObjectId
  feeStructureId: mongoose.Types.ObjectId
  academicYearId: mongoose.Types.ObjectId
  lineItems: IInvoiceLineItem[]
  discounts: IDiscount[]
  totalAmount: number
  amountPaid: number
  balance: number
  dueDate: Date
  status: InvoiceStatus
  lateFeeApplied: number
  createdAt: Date
  updatedAt: Date
}

const discountSchema = new Schema<IDiscount>(
  {
    label: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, trim: true },
  },
  { _id: false },
)

const lineItemSchema = new Schema<IInvoiceLineItem>(
  {
    label: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const feeInvoiceSchema = new Schema<IFeeInvoice>(
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
    feeStructureId: {
      type: Schema.Types.ObjectId,
      ref: 'FeeStructure',
      required: true,
    },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    lineItems: {
      type: [lineItemSchema],
      default: [],
    },
    discounts: {
      type: [discountSchema],
      default: [],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    balance: {
      type: Number,
      required: true,
      min: 0,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'partially_paid', 'paid', 'overdue'],
      default: 'pending',
    },
    lateFeeApplied: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
)

feeInvoiceSchema.index({ schoolId: 1, studentId: 1, status: 1 })
feeInvoiceSchema.index({ schoolId: 1, feeStructureId: 1 })
feeInvoiceSchema.index({ schoolId: 1, dueDate: 1, status: 1 })

export const FeeInvoice = mongoose.model<IFeeInvoice>('FeeInvoice', feeInvoiceSchema)
