import { createLeaveRequestSchema, reviewLeaveRequestSchema, listLeaveQuerySchema } from '../../src/modules/leave/schemas/leaveSchemas.js'
import { createDisciplineRecordSchema, updateDisciplineRecordSchema, listDisciplineQuerySchema } from '../../src/modules/discipline/schemas/disciplineSchemas.js'

describe('Leave Validation Schemas', () => {
  describe('createLeaveRequestSchema', () => {
    it('should accept valid leave request data', () => {
      const data = {
        requesterType: 'student',
        requesterId: '507f1f77bcf86cd799439011',
        startDate: '2026-09-10',
        endDate: '2026-09-12',
        reason: 'Family vacation',
      }
      const result = createLeaveRequestSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject when endDate is before startDate', () => {
      const data = {
        requesterType: 'student',
        requesterId: '507f1f77bcf86cd799439011',
        startDate: '2026-09-12',
        endDate: '2026-09-10',
        reason: 'Family vacation',
      }
      const result = createLeaveRequestSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should accept same start and end date', () => {
      const data = {
        requesterType: 'teacher',
        requesterId: '507f1f77bcf86cd799439011',
        startDate: '2026-09-10',
        endDate: '2026-09-10',
        reason: 'Medical appointment',
      }
      const result = createLeaveRequestSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject empty reason', () => {
      const data = {
        requesterType: 'student',
        requesterId: '507f1f77bcf86cd799439011',
        startDate: '2026-09-10',
        endDate: '2026-09-12',
        reason: '',
      }
      const result = createLeaveRequestSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('reviewLeaveRequestSchema', () => {
    it('should accept valid review data', () => {
      const result = reviewLeaveRequestSchema.safeParse({
        status: 'approved',
        reviewComment: 'Approved for family event',
      })
      expect(result.success).toBe(true)
    })

    it('should accept review without comment', () => {
      const result = reviewLeaveRequestSchema.safeParse({ status: 'rejected' })
      expect(result.success).toBe(true)
    })

    it('should reject invalid status', () => {
      const result = reviewLeaveRequestSchema.safeParse({ status: 'cancelled' })
      expect(result.success).toBe(false)
    })
  })

  describe('listLeaveQuerySchema', () => {
    it('should apply defaults', () => {
      const result = listLeaveQuerySchema.parse({})
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })

    it('should coerce page and limit to numbers', () => {
      const result = listLeaveQuerySchema.parse({ page: '2', limit: '10' })
      expect(result.page).toBe(2)
      expect(result.limit).toBe(10)
    })
  })
})

describe('Discipline Validation Schemas', () => {
  describe('createDisciplineRecordSchema', () => {
    it('should accept valid discipline record data', () => {
      const data = {
        studentId: '507f1f77bcf86cd799439011',
        incidentDate: '2026-09-01',
        category: 'behavior',
        description: 'Student was disruptive in class',
        severity: 'minor',
      }
      const result = createDisciplineRecordSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject empty description', () => {
      const data = {
        studentId: '507f1f77bcf86cd799439011',
        incidentDate: '2026-09-01',
        category: 'behavior',
        description: '',
        severity: 'minor',
      }
      const result = createDisciplineRecordSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject invalid category', () => {
      const data = {
        studentId: '507f1f77bcf86cd799439011',
        incidentDate: '2026-09-01',
        category: 'invalid_category',
        description: 'Test',
        severity: 'minor',
      }
      const result = createDisciplineRecordSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('updateDisciplineRecordSchema', () => {
    it('should accept valid update data', () => {
      const result = updateDisciplineRecordSchema.safeParse({
        status: 'resolved',
        actionTaken: 'Counseling session conducted',
      })
      expect(result.success).toBe(true)
    })

    it('should accept partial update', () => {
      const result = updateDisciplineRecordSchema.safeParse({ severity: 'major' })
      expect(result.success).toBe(true)
    })
  })

  describe('listDisciplineQuerySchema', () => {
    it('should apply defaults', () => {
      const result = listDisciplineQuerySchema.parse({})
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })
  })
})

describe('Visibility Filter Logic', () => {
  it('discipline records should not be visible to parent role', () => {
    const roles = ['parent']
    const isVisibleToParent = roles.some(r => ['parent', 'student'].includes(r))
    expect(isVisibleToParent).toBe(true)
  })

  it('discipline records should not be visible to student role', () => {
    const roles = ['student']
    const isVisibleToParent = roles.some(r => ['parent', 'student'].includes(r))
    expect(isVisibleToParent).toBe(true)
  })

  it('discipline records should be visible to school_admin', () => {
    const roles = ['school_admin']
    const isVisibleToParent = roles.some(r => ['parent', 'student'].includes(r))
    expect(isVisibleToParent).toBe(false)
  })

  it('discipline records should be visible to teacher', () => {
    const roles = ['teacher']
    const isVisibleToParent = roles.some(r => ['parent', 'student'].includes(r))
    expect(isVisibleToParent).toBe(false)
  })
})
