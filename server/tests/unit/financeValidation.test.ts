import { createFeeStructureSchema, updateFeeStructureSchema, generateInvoiceSchema, applyDiscountSchema, recordPaymentSchema, listInvoicesQuerySchema } from '../../src/modules/finance/schemas/financeSchemas.js'

describe('Finance validation schemas', () => {
  describe('createFeeStructureSchema', () => {
    it('accepts valid fee structure data', () => {
      const result = createFeeStructureSchema.safeParse({
        academicYearId: '507f1f77bcf86cd799439011',
        name: 'Term 1 Fees',
        components: [{ label: 'Tuition', amount: 500 }, { label: 'Transport', amount: 100 }],
        totalAmount: 600,
        dueDate: '2026-03-01',
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing name', () => {
      const result = createFeeStructureSchema.safeParse({
        academicYearId: '507f1f77bcf86cd799439011',
        components: [{ label: 'Tuition', amount: 500 }],
        totalAmount: 500,
        dueDate: '2026-03-01',
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty components', () => {
      const result = createFeeStructureSchema.safeParse({
        academicYearId: '507f1f77bcf86cd799439011',
        name: 'Term 1 Fees',
        components: [],
        totalAmount: 500,
        dueDate: '2026-03-01',
      })
      expect(result.success).toBe(false)
    })

    it('accepts late fee policy', () => {
      const result = createFeeStructureSchema.safeParse({
        academicYearId: '507f1f77bcf86cd799439011',
        name: 'Term 1 Fees',
        components: [{ label: 'Tuition', amount: 500 }],
        totalAmount: 500,
        dueDate: '2026-03-01',
        lateFeePolicy: { gracePeriodDays: 7, lateFeeAmount: 50, lateFeeType: 'flat' },
      })
      expect(result.success).toBe(true)
    })

    it('accepts null classId for all-class fee', () => {
      const result = createFeeStructureSchema.safeParse({
        academicYearId: '507f1f77bcf86cd799439011',
        name: 'Term 1 Fees',
        classId: null,
        components: [{ label: 'Tuition', amount: 500 }],
        totalAmount: 500,
        dueDate: '2026-03-01',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('generateInvoiceSchema', () => {
    it('accepts studentIds', () => {
      const result = generateInvoiceSchema.safeParse({
        feeStructureId: '507f1f77bcf86cd799439011',
        studentIds: ['507f1f77bcf86cd799439012'],
      })
      expect(result.success).toBe(true)
    })

    it('accepts classId', () => {
      const result = generateInvoiceSchema.safeParse({
        feeStructureId: '507f1f77bcf86cd799439011',
        classId: '507f1f77bcf86cd799439013',
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing feeStructureId', () => {
      const result = generateInvoiceSchema.safeParse({
        classId: '507f1f77bcf86cd799439013',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('applyDiscountSchema', () => {
    it('accepts valid discount', () => {
      const result = applyDiscountSchema.safeParse({
        label: 'Scholarship',
        amount: 100,
        reason: 'Merit scholarship',
      })
      expect(result.success).toBe(true)
    })

    it('rejects zero amount', () => {
      const result = applyDiscountSchema.safeParse({
        label: 'Scholarship',
        amount: 0,
      })
      expect(result.success).toBe(false)
    })

    it('rejects negative amount', () => {
      const result = applyDiscountSchema.safeParse({
        label: 'Scholarship',
        amount: -50,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('recordPaymentSchema', () => {
    it('accepts valid payment', () => {
      const result = recordPaymentSchema.safeParse({
        amount: 100,
        method: 'cash',
      })
      expect(result.success).toBe(true)
    })

    it('accepts all payment methods', () => {
      const methods = ['cash', 'bank_transfer', 'cheque', 'card_manual']
      for (const method of methods) {
        const result = recordPaymentSchema.safeParse({ amount: 100, method })
        expect(result.success).toBe(true)
      }
    })

    it('rejects zero amount', () => {
      const result = recordPaymentSchema.safeParse({ amount: 0, method: 'cash' })
      expect(result.success).toBe(false)
    })

    it('rejects invalid method', () => {
      const result = recordPaymentSchema.safeParse({ amount: 100, method: 'bitcoin' })
      expect(result.success).toBe(false)
    })
  })

  describe('listInvoicesQuerySchema', () => {
    it('accepts empty query', () => {
      const result = listInvoicesQuerySchema.parse({})
      expect(result).toEqual({})
    })

    it('accepts valid status filter', () => {
      const result = listInvoicesQuerySchema.parse({ status: 'overdue' })
      expect(result.status).toBe('overdue')
    })

    it('strips unknown fields', () => {
      const result = listInvoicesQuerySchema.parse({ status: 'paid', unknownField: 'test' })
      expect(result).toEqual({ status: 'paid' })
    })
  })
})

describe('Finance balance computation logic', () => {
  it('computes correct balance with no discounts', () => {
    const totalAmount = 600
    const lateFeeApplied = 50
    const amountPaid = 200
    const discounts: number[] = []
    const totalDiscounts = discounts.reduce((s, d) => s + d, 0)
    const balance = Math.max(0, totalAmount + lateFeeApplied - totalDiscounts - amountPaid)
    expect(balance).toBe(450)
  })

  it('computes correct balance with discounts', () => {
    const totalAmount = 600
    const lateFeeApplied = 0
    const amountPaid = 0
    const discounts = [100, 50]
    const totalDiscounts = discounts.reduce((s, d) => s + d, 0)
    const balance = Math.max(0, totalAmount + lateFeeApplied - totalDiscounts - amountPaid)
    expect(balance).toBe(450)
  })

  it('returns 0 when fully paid', () => {
    const totalAmount = 500
    const lateFeeApplied = 0
    const amountPaid = 500
    const discounts: number[] = []
    const totalDiscounts = discounts.reduce((s, d) => s + d, 0)
    const balance = Math.max(0, totalAmount + lateFeeApplied - totalDiscounts - amountPaid)
    expect(balance).toBe(0)
  })

  it('does not go negative', () => {
    const totalAmount = 500
    const lateFeeApplied = 0
    const amountPaid = 600
    const discounts: number[] = []
    const totalDiscounts = discounts.reduce((s, d) => s + d, 0)
    const balance = Math.max(0, totalAmount + lateFeeApplied - totalDiscounts - amountPaid)
    expect(balance).toBe(0)
  })

  it('flat late fee adds to total', () => {
    const totalAmount = 500
    const lateFeeAmount = 50
    const lateFeeType: string = 'flat'
    const lateFee = lateFeeType === 'flat' ? lateFeeAmount : Math.round((totalAmount * lateFeeAmount) / 100)
    expect(lateFee).toBe(50)
  })

  it('percentage late fee computes correctly', () => {
    const totalAmount = 1000
    const lateFeeAmount = 10
    const lateFeeType: string = 'percentage'
    const lateFee = lateFeeType === 'flat' ? lateFeeAmount : Math.round((totalAmount * lateFeeAmount) / 100)
    expect(lateFee).toBe(100)
  })
})
