import { markAttendanceSchema, updateAttendanceSchema, attendanceSummaryQuerySchema, attendanceStatusEnum } from '../../src/modules/attendance/schemas/attendanceSchemas.js'

describe('Attendance validation schemas', () => {
  describe('attendanceStatusEnum', () => {
    it('accepts all valid statuses', () => {
      expect(attendanceStatusEnum.safeParse('present').success).toBe(true)
      expect(attendanceStatusEnum.safeParse('absent').success).toBe(true)
      expect(attendanceStatusEnum.safeParse('late').success).toBe(true)
      expect(attendanceStatusEnum.safeParse('excused').success).toBe(true)
      expect(attendanceStatusEnum.safeParse('half_day').success).toBe(true)
    })

    it('rejects invalid status', () => {
      expect(attendanceStatusEnum.safeParse('unknown').success).toBe(false)
    })
  })

  describe('markAttendanceSchema', () => {
    it('accepts valid bulk mark payload', () => {
      const result = markAttendanceSchema.safeParse({
        classId: '507f1f77bcf86cd799439011',
        date: '2026-01-15',
        records: [
          { studentId: '507f1f77bcf86cd799439012', status: 'present' },
          { studentId: '507f1f77bcf86cd799439013', status: 'absent', remarks: 'Sick' },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing classId', () => {
      const result = markAttendanceSchema.safeParse({
        date: '2026-01-15',
        records: [{ studentId: '507f1f77bcf86cd799439012', status: 'present' }],
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid date', () => {
      const result = markAttendanceSchema.safeParse({
        classId: '507f1f77bcf86cd799439011',
        date: 'not-a-date',
        records: [{ studentId: '507f1f77bcf86cd799439012', status: 'present' }],
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty records array', () => {
      const result = markAttendanceSchema.safeParse({
        classId: '507f1f77bcf86cd799439011',
        date: '2026-01-15',
        records: [],
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid status in record', () => {
      const result = markAttendanceSchema.safeParse({
        classId: '507f1f77bcf86cd799439011',
        date: '2026-01-15',
        records: [{ studentId: '507f1f77bcf86cd799439012', status: 'invalid' }],
      })
      expect(result.success).toBe(false)
    })

    it('accepts records with optional remarks', () => {
      const result = markAttendanceSchema.safeParse({
        classId: '507f1f77bcf86cd799439011',
        date: '2026-01-15',
        records: [
          { studentId: '507f1f77bcf86cd799439012', status: 'late', remarks: 'Arrived 10 minutes late' },
        ],
      })
      expect(result.success).toBe(true)
    })
  })

  describe('updateAttendanceSchema', () => {
    it('accepts valid update with status', () => {
      const result = updateAttendanceSchema.safeParse({ status: 'present' })
      expect(result.success).toBe(true)
    })

    it('accepts valid update with remarks', () => {
      const result = updateAttendanceSchema.safeParse({ remarks: 'Corrected by admin' })
      expect(result.success).toBe(true)
    })

    it('accepts empty update', () => {
      const result = updateAttendanceSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('rejects invalid status', () => {
      const result = updateAttendanceSchema.safeParse({ status: 'unknown' })
      expect(result.success).toBe(false)
    })
  })

  describe('attendanceSummaryQuerySchema', () => {
    it('accepts valid query with classId', () => {
      const result = attendanceSummaryQuerySchema.safeParse({
        classId: '507f1f77bcf86cd799439011',
      })
      expect(result.success).toBe(true)
    })

    it('accepts valid query with studentId', () => {
      const result = attendanceSummaryQuerySchema.safeParse({
        studentId: '507f1f77bcf86cd799439011',
      })
      expect(result.success).toBe(true)
    })

    it('accepts empty query', () => {
      const result = attendanceSummaryQuerySchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('accepts date range', () => {
      const result = attendanceSummaryQuerySchema.safeParse({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      })
      expect(result.success).toBe(true)
    })
  })
})
