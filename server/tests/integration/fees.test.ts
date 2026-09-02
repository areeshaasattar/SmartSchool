import mongoose from 'mongoose'
import { FeeStructure } from '../../src/modules/finance/models/FeeStructure.js'
import { FeeInvoice } from '../../src/modules/finance/models/FeeInvoice.js'
import { Payment } from '../../src/modules/finance/models/Payment.js'
import { Student } from '../../src/modules/students/models/Student.js'
import * as financeService from '../../src/modules/finance/services/financeService.js'

// ── Mocks ────────────────────────────────────────────────────────────

const schoolId = new mongoose.Types.ObjectId().toString()
const userId = new mongoose.Types.ObjectId().toString()
const studentId = new mongoose.Types.ObjectId().toString()
const classId = new mongoose.Types.ObjectId().toString()
const academicYearId = new mongoose.Types.ObjectId().toString()

jest.mock('../../src/middlewares/auth/authenticate.js', () => ({
  authenticate: jest.fn((req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req.user = { _id: userId, email: 'accountant@test.com', roles: ['accountant'], schoolIds: [schoolId] }
    req.tenantId = schoolId
    next()
  }),
}))

jest.mock('../../src/middlewares/tenant/resolveTenant.js', () => ({
  resolveTenant: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}))

jest.mock('../../src/middlewares/permissions/requireRole.js', () => ({
  requirePermission: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

jest.mock('../../src/middlewares/validation/validate.js', () => ({
  validate: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

jest.mock('../../src/modules/audit/models/AuditLog.js', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}))

// ── Spy on model methods
jest.spyOn(FeeStructure, 'create')
jest.spyOn(FeeStructure, 'findOne')
jest.spyOn(FeeStructure, 'find')
jest.spyOn(FeeInvoice, 'create')
jest.spyOn(FeeInvoice, 'findOne')
jest.spyOn(FeeInvoice, 'find')
jest.spyOn(FeeInvoice, 'countDocuments')
jest.spyOn(Payment, 'create')
jest.spyOn(Payment, 'countDocuments')
jest.spyOn(Student, 'find')

// ── Tests ────────────────────────────────────────────────────────────

describe('Finance Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Fee Structure CRUD', () => {
    it('creates a fee structure', async () => {
      const mockStructure = {
        _id: new mongoose.Types.ObjectId(),
        schoolId,
        name: 'Term 1 Fees',
        components: [{ label: 'Tuition', amount: 500 }],
        totalAmount: 500,
        dueDate: new Date('2026-03-01'),
      }
      ;(FeeStructure.create as jest.Mock).mockResolvedValue(mockStructure)

      const result = await financeService.createFeeStructure(schoolId, {
        academicYearId,
        name: 'Term 1 Fees',
        components: [{ label: 'Tuition', amount: 500 }],
        totalAmount: 500,
        dueDate: '2026-03-01',
      }, userId)

      expect(result.name).toBe('Term 1 Fees')
      expect(FeeStructure.create).toHaveBeenCalled()
    })

    it('updates a fee structure', async () => {
      const mockStructure = {
        _id: new mongoose.Types.ObjectId(),
        schoolId,
        name: 'Term 1 Fees',
        components: [{ label: 'Tuition', amount: 500 }],
        totalAmount: 500,
        save: jest.fn().mockResolvedValue(true),
      }
      ;(FeeStructure.findOne as jest.Mock).mockResolvedValue(mockStructure)

      const result = await financeService.updateFeeStructure(schoolId, mockStructure._id.toString(), {
        name: 'Updated Fees',
      }, userId)

      expect(result.name).toBe('Updated Fees')
      expect(mockStructure.save).toHaveBeenCalled()
    })
  })

  describe('Invoice Generation', () => {
    it('generates invoices for a class', async () => {
      const structureId = new mongoose.Types.ObjectId()
      ;(FeeStructure.findOne as jest.Mock).mockResolvedValue({
        _id: structureId,
        schoolId,
        name: 'Term 1',
        components: [{ label: 'Tuition', amount: 500 }],
        totalAmount: 500,
        dueDate: new Date('2026-03-01'),
        academicYearId,
        lateFeePolicy: { gracePeriodDays: 0, lateFeeAmount: 0, lateFeeType: 'flat' },
      })

      const students = [
        { _id: new mongoose.Types.ObjectId(), schoolId, classId, status: 'active' },
        { _id: new mongoose.Types.ObjectId(), schoolId, classId, status: 'active' },
      ]
      ;(Student.find as jest.Mock).mockResolvedValue(students)
      ;(FeeInvoice.find as jest.Mock).mockResolvedValue([]) // no existing
      ;(FeeInvoice.create as jest.Mock).mockImplementation((data) =>
        Promise.resolve({ ...data, _id: new mongoose.Types.ObjectId() })
      )

      const result = await financeService.generateInvoices(schoolId, {
        feeStructureId: structureId.toString(),
        classId,
      }, userId)

      expect(result.count).toBe(2)
      expect(FeeInvoice.create).toHaveBeenCalledTimes(2)
    })

    it('skips already-invoiced students', async () => {
      const structureId = new mongoose.Types.ObjectId()
      const existingStudentId = new mongoose.Types.ObjectId()
      ;(FeeStructure.findOne as jest.Mock).mockResolvedValue({
        _id: structureId,
        schoolId,
        name: 'Term 1',
        components: [{ label: 'Tuition', amount: 500 }],
        totalAmount: 500,
        dueDate: new Date('2026-03-01'),
        academicYearId,
        lateFeePolicy: { gracePeriodDays: 0, lateFeeAmount: 0, lateFeeType: 'flat' },
      })

      ;(Student.find as jest.Mock).mockResolvedValue([
        { _id: existingStudentId, schoolId, classId, status: 'active' },
        { _id: new mongoose.Types.ObjectId(), schoolId, classId, status: 'active' },
      ])
      // One already exists
      ;(FeeInvoice.find as jest.Mock).mockResolvedValue([{ studentId: existingStudentId }])
      ;(FeeInvoice.create as jest.Mock).mockImplementation((data) =>
        Promise.resolve({ ...data, _id: new mongoose.Types.ObjectId() })
      )

      const result = await financeService.generateInvoices(schoolId, {
        feeStructureId: structureId.toString(),
        classId,
      }, userId)

      // Only 1 new invoice (the second student)
      expect(result.count).toBe(1)
      expect(FeeInvoice.create).toHaveBeenCalledTimes(1)
    })
  })

  describe('Payment Recording', () => {
    it('records a payment and updates invoice', async () => {
      const invoiceId = new mongoose.Types.ObjectId()
      const mockInvoice = {
        _id: invoiceId,
        schoolId,
        studentId: new mongoose.Types.ObjectId(),
        totalAmount: 500,
        amountPaid: 0,
        balance: 500,
        lateFeeApplied: 0,
        discounts: [],
        status: 'pending',
        save: jest.fn().mockResolvedValue(true),
      }
      ;(FeeInvoice.findOne as jest.Mock).mockResolvedValue(mockInvoice)
      ;(Payment.countDocuments as jest.Mock).mockResolvedValue(0)
      ;(Payment.create as jest.Mock).mockImplementation((data) =>
        Promise.resolve({ ...data, _id: new mongoose.Types.ObjectId() })
      )

      const result = await financeService.recordPayment(schoolId, invoiceId.toString(), {
        amount: 200,
        method: 'cash',
      }, userId)

      expect(result.payment.amount).toBe(200)
      expect(mockInvoice.amountPaid).toBe(200)
      expect(mockInvoice.balance).toBe(300)
      expect(mockInvoice.status).toBe('partially_paid')
    })

    it('marks as paid when balance reaches zero', async () => {
      const invoiceId = new mongoose.Types.ObjectId()
      const mockInvoice = {
        _id: invoiceId,
        schoolId,
        studentId: new mongoose.Types.ObjectId(),
        totalAmount: 500,
        amountPaid: 400,
        balance: 100,
        lateFeeApplied: 0,
        discounts: [],
        status: 'partially_paid',
        save: jest.fn().mockResolvedValue(true),
      }
      ;(FeeInvoice.findOne as jest.Mock).mockResolvedValue(mockInvoice)
      ;(Payment.countDocuments as jest.Mock).mockResolvedValue(0)
      ;(Payment.create as jest.Mock).mockImplementation((data) =>
        Promise.resolve({ ...data, _id: new mongoose.Types.ObjectId() })
      )

      const result = await financeService.recordPayment(schoolId, invoiceId.toString(), {
        amount: 100,
        method: 'bank_transfer',
      }, userId)

      expect(result.invoice.status).toBe('paid')
      expect(result.invoice.balance).toBe(0)
    })

    it('rejects overpayment', async () => {
      const invoiceId = new mongoose.Types.ObjectId()
      const mockInvoice = {
        _id: invoiceId,
        schoolId,
        studentId: new mongoose.Types.ObjectId(),
        totalAmount: 500,
        amountPaid: 0,
        balance: 500,
        lateFeeApplied: 0,
        discounts: [],
        status: 'pending',
      }
      ;(FeeInvoice.findOne as jest.Mock).mockResolvedValue(mockInvoice)

      await expect(
        financeService.recordPayment(schoolId, invoiceId.toString(), {
          amount: 600,
          method: 'cash',
        }, userId)
      ).rejects.toThrow('Payment amount')
    })

    it('rejects payment to fully paid invoice', async () => {
      const invoiceId = new mongoose.Types.ObjectId()
      const mockInvoice = {
        _id: invoiceId,
        schoolId,
        studentId: new mongoose.Types.ObjectId(),
        totalAmount: 500,
        amountPaid: 500,
        balance: 0,
        status: 'paid',
      }
      ;(FeeInvoice.findOne as jest.Mock).mockResolvedValue(mockInvoice)

      await expect(
        financeService.recordPayment(schoolId, invoiceId.toString(), {
          amount: 100,
          method: 'cash',
        }, userId)
      ).rejects.toThrow('already fully paid')
    })
  })

  describe('Discount Application', () => {
    it('applies discount and recomputes balance', async () => {
      const invoiceId = new mongoose.Types.ObjectId()
      const mockInvoice = {
        _id: invoiceId,
        schoolId,
        totalAmount: 500,
        amountPaid: 0,
        balance: 500,
        lateFeeApplied: 0,
        discounts: [],
        status: 'pending',
        save: jest.fn().mockResolvedValue(true),
      }
      ;(FeeInvoice.findOne as jest.Mock).mockResolvedValue(mockInvoice)

      const result = await financeService.applyDiscount(schoolId, invoiceId.toString(), {
        label: 'Scholarship',
        amount: 100,
      }, userId)

      expect(result.discounts).toHaveLength(1)
      expect(result.balance).toBe(400)
    })

    it('rejects discount exceeding invoice total', async () => {
      const invoiceId = new mongoose.Types.ObjectId()
      const mockInvoice = {
        _id: invoiceId,
        schoolId,
        totalAmount: 500,
        amountPaid: 0,
        balance: 500,
        lateFeeApplied: 0,
        discounts: [{ label: 'Existing', amount: 400 }],
        status: 'pending',
      }
      ;(FeeInvoice.findOne as jest.Mock).mockResolvedValue(mockInvoice)

      await expect(
        financeService.applyDiscount(schoolId, invoiceId.toString(), {
          label: 'Another',
          amount: 200,
        }, userId)
      ).rejects.toThrow('exceeds invoice total')
    })

    it('rejects discount on paid invoice', async () => {
      const invoiceId = new mongoose.Types.ObjectId()
      const mockInvoice = {
        _id: invoiceId,
        schoolId,
        totalAmount: 500,
        amountPaid: 500,
        balance: 0,
        status: 'paid',
        discounts: [],
        lateFeeApplied: 0,
      }
      ;(FeeInvoice.findOne as jest.Mock).mockResolvedValue(mockInvoice)

      await expect(
        financeService.applyDiscount(schoolId, invoiceId.toString(), {
          label: 'Scholarship',
          amount: 100,
        }, userId)
      ).rejects.toThrow('fully paid')
    })
  })

  describe('Student Fee Summary', () => {
    it('returns correct summary', async () => {
      const sid = new mongoose.Types.ObjectId().toString()
      ;(FeeInvoice.find as jest.Mock).mockResolvedValue([
        { totalAmount: 500, lateFeeApplied: 0, amountPaid: 200, balance: 300, status: 'partially_paid' },
        { totalAmount: 300, lateFeeApplied: 50, amountPaid: 0, balance: 350, status: 'overdue' },
      ])

      const summary = await financeService.getStudentFeeSummary(schoolId, sid)

      expect(summary.totalDue).toBe(850)
      expect(summary.totalPaid).toBe(200)
      expect(summary.outstanding).toBe(650)
      expect(summary.invoiceCount).toBe(2)
      expect(summary.overdueCount).toBe(1)
    })
  })

  describe('Collection Report', () => {
    it('returns correct collection stats', async () => {
      ;(FeeInvoice.find as jest.Mock).mockResolvedValue([
        { totalAmount: 500, lateFeeApplied: 0, amountPaid: 500, balance: 0, status: 'paid' },
        { totalAmount: 300, lateFeeApplied: 0, amountPaid: 100, balance: 200, status: 'partially_paid' },
        { totalAmount: 400, lateFeeApplied: 50, amountPaid: 0, balance: 450, status: 'overdue' },
      ])

      const report = await financeService.getCollectionReport(schoolId, {})

      expect(report.totalInvoiced).toBe(1250) // 500 + 300 + 450
      expect(report.totalCollected).toBe(600)
      expect(report.totalOutstanding).toBe(650)
      expect(report.invoiceStats.paid).toBe(1)
      expect(report.invoiceStats.partiallyPaid).toBe(1)
      expect(report.invoiceStats.overdue).toBe(1)
    })
  })
})
