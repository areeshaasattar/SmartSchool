import mongoose, { Document, Schema } from 'mongoose'

export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'card_manual'

export interface IPayment extends Document {
  schoolId: mongoose.Types.ObjectId
  invoiceId: mongoose.Types.ObjectId
  studentId: mongoose.Types.ObjectId
  amount: number
  method: PaymentMethod
  reference?: string
  paidAt: Date
  recordedBy: mongoose.Types.ObjectId
  receiptNo: string
  createdAt: Date
  updatedAt: Date
}

const paymentSchema = new Schema<IPayment>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'FeeInvoice',
      required: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    method: {
      type: String,
      enum: ['cash', 'bank_transfer', 'cheque', 'card_manual'],
      required: true,
    },
    reference: {
      type: String,
      trim: true,
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiptNo: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
)

paymentSchema.index({ schoolId: 1, invoiceId: 1 })
paymentSchema.index({ schoolId: 1, studentId: 1 })
paymentSchema.index({ schoolId: 1, receiptNo: 1 }, { unique: true })

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema)
