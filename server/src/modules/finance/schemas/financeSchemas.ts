import { z } from 'zod'

// ── Fee Structure ────────────────────────────────────────────────────

const feeComponentSchema = z.object({
  label: z.string().min(1, 'Component label is required'),
  amount: z.number().min(0, 'Amount must be non-negative'),
})

const lateFeePolicySchema = z.object({
  gracePeriodDays: z.number().int().min(0).default(0),
  lateFeeAmount: z.number().min(0).default(0),
  lateFeeType: z.enum(['flat', 'percentage']).default('flat'),
})

export const createFeeStructureSchema = z.object({
  academicYearId: z.string().min(1, 'Academic year is required'),
  classId: z.string().nullable().optional(),
  name: z.string().min(1, 'Fee structure name is required'),
  components: z.array(feeComponentSchema).min(1, 'At least one fee component is required'),
  totalAmount: z.number().min(0, 'Total amount must be non-negative'),
  dueDate: z.string().min(1, 'Due date is required'),
  lateFeePolicy: lateFeePolicySchema.optional(),
})

export const updateFeeStructureSchema = z.object({
  name: z.string().min(1).optional(),
  components: z.array(feeComponentSchema).min(1).optional(),
  totalAmount: z.number().min(0).optional(),
  dueDate: z.string().optional(),
  lateFeePolicy: lateFeePolicySchema.optional(),
})

// ── Invoice Generation ───────────────────────────────────────────────

export const generateInvoiceSchema = z.object({
  feeStructureId: z.string().min(1, 'Fee structure ID is required'),
  studentIds: z.array(z.string()).optional(),
  classId: z.string().optional(),
}).refine(
  (data) => data.studentIds || data.classId,
  'Either studentIds or classId must be provided',
)

// ── Discount ─────────────────────────────────────────────────────────

export const applyDiscountSchema = z.object({
  label: z.string().min(1, 'Discount label is required'),
  amount: z.number().min(0.01, 'Discount amount must be positive'),
  reason: z.string().optional(),
})

// ── Payment ──────────────────────────────────────────────────────────

export const recordPaymentSchema = z.object({
  amount: z.number().min(0.01, 'Payment amount must be positive'),
  method: z.enum(['cash', 'bank_transfer', 'cheque', 'card_manual']),
  reference: z.string().optional(),
  paidAt: z.string().optional(),
})

// ── Query schemas ────────────────────────────────────────────────────

export const listInvoicesQuerySchema = z.object({
  status: z.enum(['pending', 'partially_paid', 'paid', 'overdue']).optional(),
  classId: z.string().optional(),
  studentId: z.string().optional(),
  academicYearId: z.string().optional(),
})

export const collectionReportQuerySchema = z.object({
  academicYearId: z.string().optional(),
  classId: z.string().optional(),
})
