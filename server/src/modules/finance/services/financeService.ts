import mongoose from 'mongoose'
import { FeeStructure, IFeeStructure } from '../models/FeeStructure.js'
import { FeeInvoice, IFeeInvoice } from '../models/FeeInvoice.js'
import { Payment, IPayment } from '../models/Payment.js'
import { Student } from '../../students/models/Student.js'
import { writeAuditLog } from '../../audit/models/AuditLog.js'
import { dispatchNotification } from '../../notifications/services/notificationService.js'

// ── Helpers ──────────────────────────────────────────────────────────

function toPlain(obj: unknown): Record<string, unknown> {
  if (obj && typeof obj === 'object' && 'toObject' in obj && typeof (obj as { toObject: unknown }).toObject === 'function') {
    return (obj as { toObject: () => Record<string, unknown> }).toObject()
  }
  return obj as Record<string, unknown>
}

function recomputeBalance(invoice: IFeeInvoice) {
  const totalDiscounts = invoice.discounts.reduce((sum, d) => sum + d.amount, 0)
  invoice.balance = Math.max(0, invoice.totalAmount + invoice.lateFeeApplied - totalDiscounts - invoice.amountPaid)

  if (invoice.balance <= 0) {
    invoice.status = 'paid'
  } else if (invoice.amountPaid > 0) {
    invoice.status = 'partially_paid'
  } else {
    invoice.status = 'pending'
  }
}

async function generateReceiptNo(schoolId: string): Promise<string> {
  const count = await Payment.countDocuments({ schoolId })
  const seq = String(count + 1).padStart(6, '0')
  return `RCP-${schoolId.slice(-4).toUpperCase()}-${seq}`
}

// ── Fee Structure CRUD ───────────────────────────────────────────────

export async function createFeeStructure(schoolId: string, data: {
  academicYearId: string
  classId?: string | null
  name: string
  components: { label: string; amount: number }[]
  totalAmount: number
  dueDate: string
  lateFeePolicy?: { gracePeriodDays?: number; lateFeeAmount?: number; lateFeeType?: 'flat' | 'percentage' }
}, actorId: string, actorEmail = 'system') {
  const structure = await FeeStructure.create({
    schoolId,
    academicYearId: data.academicYearId,
    classId: data.classId || null,
    name: data.name,
    components: data.components,
    totalAmount: data.totalAmount,
    dueDate: new Date(data.dueDate),
    lateFeePolicy: data.lateFeePolicy || { gracePeriodDays: 0, lateFeeAmount: 0, lateFeeType: 'flat' },
  })

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail,
    action: 'fee_structure:create',
    entity: 'FeeStructure',
    entityId: (structure._id as mongoose.Types.ObjectId).toString(),
    after: toPlain(structure),
  })

  return structure
}

export async function updateFeeStructure(schoolId: string, structureId: string, data: Partial<{
  name: string
  components: { label: string; amount: number }[]
  totalAmount: number
  dueDate: string
  lateFeePolicy: { gracePeriodDays?: number; lateFeeAmount?: number; lateFeeType?: 'flat' | 'percentage' }
}>, actorId: string, actorEmail = 'system') {
  const structure = await FeeStructure.findOne({ _id: structureId, schoolId })
  if (!structure) throw new Error('Fee structure not found')

  const before = toPlain(structure)

  if (data.name !== undefined) structure.name = data.name
  if (data.components !== undefined) structure.components = data.components as unknown as mongoose.Types.DocumentArray<{ label: string; amount: number }>
  if (data.totalAmount !== undefined) structure.totalAmount = data.totalAmount
  if (data.dueDate !== undefined) structure.dueDate = new Date(data.dueDate)
  if (data.lateFeePolicy !== undefined) {
    structure.lateFeePolicy = { ...structure.lateFeePolicy, ...data.lateFeePolicy }
  }

  await structure.save()

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail,
    action: 'fee_structure:update',
    entity: 'FeeStructure',
    entityId: structureId,
    before,
    after: toPlain(structure),
  })

  return structure
}

export async function listFeeStructures(schoolId: string, academicYearId?: string) {
  const query: Record<string, unknown> = { schoolId }
  if (academicYearId) query.academicYearId = academicYearId
  return FeeStructure.find(query).sort({ createdAt: -1 })
}

export async function getFeeStructureById(schoolId: string, structureId: string) {
  return FeeStructure.findOne({ _id: structureId, schoolId })
}

// ── Invoice Generation ───────────────────────────────────────────────

export async function generateInvoices(schoolId: string, data: {
  feeStructureId: string
  studentIds?: string[]
  classId?: string
}, actorId: string, actorEmail = 'system') {
  const structure = await FeeStructure.findOne({ _id: data.feeStructureId, schoolId })
  if (!structure) throw new Error('Fee structure not found')

  // Determine target students
  let studentFilter: Record<string, unknown> = { schoolId, status: 'active' }
  if (data.studentIds && data.studentIds.length > 0) {
    studentFilter._id = { $in: data.studentIds }
  } else if (data.classId) {
    studentFilter.classId = data.classId
  } else {
    throw new Error('Either studentIds or classId must be provided')
  }

  const students = await Student.find(studentFilter)
  if (students.length === 0) throw new Error('No students found matching criteria')

  // Check for existing invoices to avoid duplicates
  const studentIds = students.map((s) => s._id)
  const existingInvoices = await FeeInvoice.find({
    schoolId,
    feeStructureId: structure._id,
    studentId: { $in: studentIds },
  })
  const existingStudentIds = new Set(existingInvoices.map((inv) => inv.studentId.toString()))

  const newInvoices: IFeeInvoice[] = []

  for (const student of students) {
    const studentIdStr = (student._id as mongoose.Types.ObjectId).toString()
    if (existingStudentIds.has(studentIdStr)) continue // skip already-invoiced

    const invoice = await FeeInvoice.create({
      schoolId,
      studentId: student._id,
      feeStructureId: structure._id,
      academicYearId: structure.academicYearId,
      lineItems: structure.components.map((c) => ({ label: c.label, amount: c.amount })),
      discounts: [],
      totalAmount: structure.totalAmount,
      amountPaid: 0,
      balance: structure.totalAmount,
      dueDate: structure.dueDate,
      status: 'pending',
      lateFeeApplied: 0,
    })

    newInvoices.push(invoice)
  }

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail,
    action: 'invoice:generate',
    entity: 'FeeInvoice',
    entityId: structure._id.toString(),
    after: { count: newInvoices.length, studentCount: students.length },
  })

  return { count: newInvoices.length, invoices: newInvoices }
}

// ── Invoice Queries ──────────────────────────────────────────────────

export async function listInvoices(schoolId: string, filters: {
  status?: string
  classId?: string
  studentId?: string
  academicYearId?: string
}) {
  const query: Record<string, unknown> = { schoolId }
  if (filters.status) query.status = filters.status
  if (filters.studentId) query.studentId = filters.studentId
  if (filters.academicYearId) query.academicYearId = filters.academicYearId
  if (filters.classId) {
    // Get students in that class
    const students = await Student.find({ schoolId, classId: filters.classId }).select('_id')
    query.studentId = { $in: students.map((s) => s._id) }
  }

  return FeeInvoice.find(query)
    .populate('studentId', 'admissionNo profile.firstName profile.lastName')
    .populate('feeStructureId', 'name')
    .sort({ dueDate: 1 })
}

export async function getInvoiceById(schoolId: string, invoiceId: string) {
  return FeeInvoice.findOne({ _id: invoiceId, schoolId })
    .populate('studentId', 'admissionNo profile.firstName profile.lastName')
    .populate('feeStructureId', 'name components')
}

// ── Discount ─────────────────────────────────────────────────────────

export async function applyDiscount(schoolId: string, invoiceId: string, data: {
  label: string
  amount: number
  reason?: string
}, actorId: string, actorEmail = 'system') {
  const invoice = await FeeInvoice.findOne({ _id: invoiceId, schoolId })
  if (!invoice) throw new Error('Invoice not found')
  if (invoice.status === 'paid') throw new Error('Cannot apply discount to a fully paid invoice')

  const totalDiscounts = invoice.discounts.reduce((sum, d) => sum + d.amount, 0) + data.amount
  if (totalDiscounts > invoice.totalAmount + invoice.lateFeeApplied) {
    throw new Error('Discount amount exceeds invoice total')
  }

  const before = toPlain(invoice)

  invoice.discounts.push({ label: data.label, amount: data.amount, reason: data.reason })
  recomputeBalance(invoice)
  await invoice.save()

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail,
    action: 'invoice:discount',
    entity: 'FeeInvoice',
    entityId: invoiceId,
    before,
    after: toPlain(invoice),
  })

  return invoice
}

// ── Payment Recording ────────────────────────────────────────────────

export async function recordPayment(schoolId: string, invoiceId: string, data: {
  amount: number
  method: 'cash' | 'bank_transfer' | 'cheque' | 'card_manual'
  reference?: string
  paidAt?: string
}, actorId: string, actorEmail = 'system') {
  const invoice = await FeeInvoice.findOne({ _id: invoiceId, schoolId })
  if (!invoice) throw new Error('Invoice not found')
  if (invoice.status === 'paid') throw new Error('Invoice is already fully paid')

  const totalDiscounts = invoice.discounts.reduce((sum, d) => sum + d.amount, 0)
  const remainingBalance = invoice.totalAmount + invoice.lateFeeApplied - totalDiscounts - invoice.amountPaid

  if (data.amount > remainingBalance) {
    throw new Error(`Payment amount (${data.amount}) exceeds remaining balance (${remainingBalance})`)
  }

  const receiptNo = await generateReceiptNo(schoolId)

  const payment = await Payment.create({
    schoolId,
    invoiceId,
    studentId: invoice.studentId,
    amount: data.amount,
    method: data.method,
    reference: data.reference,
    paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
    recordedBy: new mongoose.Types.ObjectId(actorId),
    receiptNo,
  })

  // Update invoice
  const before = toPlain(invoice)
  invoice.amountPaid += data.amount
  recomputeBalance(invoice)
  await invoice.save()

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail,
    action: 'payment:record',
    entity: 'Payment',
    entityId: (payment._id as mongoose.Types.ObjectId).toString(),
    before,
    after: toPlain(payment),
  })

  return { payment, invoice }
}

export async function getReceipt(schoolId: string, paymentId: string) {
  const payment = await Payment.findOne({ _id: paymentId, schoolId })
    .populate('invoiceId', 'totalAmount amountPaid balance dueDate')
    .populate('studentId', 'admissionNo profile.firstName profile.lastName')
    .populate('recordedBy', 'email')

  if (!payment) return null

  // TODO: PDF export stub — real PDF generation via BullMQ once feature/redis-bullmq lands
  return {
    receiptNo: payment.receiptNo,
    amount: payment.amount,
    method: payment.method,
    reference: payment.reference,
    paidAt: payment.paidAt,
    student: payment.studentId,
    invoice: payment.invoiceId,
    recordedBy: payment.recordedBy,
    pdfAvailable: false,
  }
}

// ── Student Fee Summary ──────────────────────────────────────────────

export async function getStudentFeeSummary(schoolId: string, studentId: string) {
  const invoices = await FeeInvoice.find({ schoolId, studentId })

  let totalDue = 0
  let totalPaid = 0
  let outstanding = 0

  for (const inv of invoices) {
    totalDue += inv.totalAmount + inv.lateFeeApplied
    totalPaid += inv.amountPaid
    outstanding += inv.balance
  }

  return {
    totalDue,
    totalPaid,
    outstanding,
    invoiceCount: invoices.length,
    overdueCount: invoices.filter((i) => i.status === 'overdue').length,
  }
}

// ── Collection Report ────────────────────────────────────────────────

export async function getCollectionReport(schoolId: string, filters: {
  academicYearId?: string
  classId?: string
}) {
  const query: Record<string, unknown> = { schoolId }
  if (filters.academicYearId) query.academicYearId = filters.academicYearId
  if (filters.classId) {
    const students = await Student.find({ schoolId, classId: filters.classId }).select('_id')
    query.studentId = { $in: students.map((s) => s._id) }
  }

  const invoices = await FeeInvoice.find(query)

  let totalInvoiced = 0
  let totalCollected = 0
  let totalOutstanding = 0
  let overdueCount = 0
  let paidCount = 0
  let pendingCount = 0
  let partiallyPaidCount = 0

  for (const inv of invoices) {
    totalInvoiced += inv.totalAmount + inv.lateFeeApplied
    totalCollected += inv.amountPaid
    totalOutstanding += inv.balance
    if (inv.status === 'overdue') overdueCount++
    else if (inv.status === 'paid') paidCount++
    else if (inv.status === 'partially_paid') partiallyPaidCount++
    else pendingCount++
  }

  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0

  return {
    totalInvoiced,
    totalCollected,
    totalOutstanding,
    collectionRate,
    invoiceStats: {
      total: invoices.length,
      paid: paidCount,
      partiallyPaid: partiallyPaidCount,
      pending: pendingCount,
      overdue: overdueCount,
    },
  }
}

// ── Overdue / Late Fee Check (stub for BullMQ) ──────────────────────

export async function checkOverdueInvoices(schoolId: string) {
  const now = new Date()

  // Find invoices past dueDate that are still pending/partially_paid
  const invoices = await FeeInvoice.find({
    schoolId,
    status: { $in: ['pending', 'partially_paid'] },
    dueDate: { $lt: now },
  }).populate('feeStructureId', 'lateFeePolicy')

  let updatedCount = 0

  for (const invoice of invoices) {
    const structure = invoice.feeStructureId as unknown as { lateFeePolicy?: { gracePeriodDays: number; lateFeeAmount: number; lateFeeType: string } }
    const policy = structure?.lateFeePolicy
    if (!policy) continue

    const graceDeadline = new Date(invoice.dueDate)
    graceDeadline.setDate(graceDeadline.getDate() + policy.gracePeriodDays)

    if (now > graceDeadline && invoice.lateFeeApplied === 0) {
      // Apply late fee
      let lateFee = 0
      if (policy.lateFeeType === 'flat') {
        lateFee = policy.lateFeeAmount
      } else {
        lateFee = Math.round((invoice.totalAmount * policy.lateFeeAmount) / 100)
      }

      invoice.lateFeeApplied = lateFee
      invoice.status = 'overdue'
      recomputeBalance(invoice)
      await invoice.save()
      updatedCount++
    } else if (now > invoice.dueDate && invoice.status !== 'overdue') {
      // Past due but within grace period — just mark overdue
      invoice.status = 'overdue'
      await invoice.save()
      updatedCount++
    }
  }

  // TODO(feature/redis-bullmq): move this dispatch call onto a queue for async/retryable delivery
  // Send fee reminders for newly overdue invoices
  for (const invoice of invoices) {
    if (invoice.status === 'overdue') {
      try {
        const student = await Student.findOne({ _id: invoice.studentId, schoolId })
        const studentName = student ? `${student.profile.firstName} ${student.profile.lastName}` : 'your child'
        // Notify guardians
        try {
          const { Guardian } = await import('../../students/models/Guardian.js')
          const guardians = await Guardian.find({ schoolId, children: invoice.studentId })
          for (const guardian of guardians) {
            await dispatchNotification({
              schoolId,
              userId: (guardian.userId as unknown as mongoose.Types.ObjectId).toString(),
              type: 'fee_reminder',
              data: {
                studentName,
                status: 'overdue',
                amount: String(invoice.balance),
                dueDate: invoice.dueDate.toISOString().split('T')[0],
              },
            })
          }
        } catch {
          // Guardian notification failure is non-blocking
        }
      } catch {
        // Notification failure should not block fee processing
      }
    }
  }

  return { updatedCount }
}
