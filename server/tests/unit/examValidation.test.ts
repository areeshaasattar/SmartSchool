import { createExamSchema, marksEntrySchema, correctMarksSchema } from '../../src/modules/exams/schemas/examSchemas.js'
import { computeGrade } from '../../src/modules/exams/services/examService.js'
import type { IGradeRange } from '../../src/modules/schools/models/School.js'

describe('Exam validation schemas', () => {
  describe('createExamSchema', () => {
    const validExam = {
      academicYearId: '507f1f77bcf86cd799439011',
      term: 'Term 1',
      name: 'Mid-Term',
      classIds: ['507f1f77bcf86cd799439012'],
      schedule: [],
    }

    it('accepts valid exam data', () => {
      expect(createExamSchema.safeParse(validExam).success).toBe(true)
    })

    it('accepts with schedule', () => {
      const withSchedule = {
        ...validExam,
        schedule: [{
          subjectId: '507f1f77bcf86cd799439013',
          date: '2026-01-15',
          startTime: '09:00',
          endTime: '10:00',
          maxMarks: 100,
          passMarks: 40,
        }],
      }
      expect(createExamSchema.safeParse(withSchedule).success).toBe(true)
    })

    it('rejects duplicate subject in schedule', () => {
      const withDup = {
        ...validExam,
        schedule: [
          { subjectId: '507f1f77bcf86cd799439013', date: '2026-01-15', startTime: '09:00', endTime: '10:00', maxMarks: 100, passMarks: 40 },
          { subjectId: '507f1f77bcf86cd799439013', date: '2026-01-16', startTime: '09:00', endTime: '10:00', maxMarks: 100, passMarks: 40 },
        ],
      }
      expect(createExamSchema.safeParse(withDup).success).toBe(false)
    })

    it('rejects missing classIds', () => {
      expect(createExamSchema.safeParse({ ...validExam, classIds: [] }).success).toBe(false)
    })
  })

  describe('marksEntrySchema', () => {
    it('accepts valid marks entry', () => {
      expect(marksEntrySchema.safeParse({
        classId: '507f1f77bcf86cd799439011',
        subjectId: '507f1f77bcf86cd799439012',
        entries: [{ studentId: '507f1f77bcf86cd799439013', marksObtained: 85 }],
      }).success).toBe(true)
    })

    it('rejects negative marks', () => {
      expect(marksEntrySchema.safeParse({
        classId: '507f1f77bcf86cd799439011',
        subjectId: '507f1f77bcf86cd799439012',
        entries: [{ studentId: '507f1f77bcf86cd799439013', marksObtained: -5 }],
      }).success).toBe(false)
    })

    it('rejects empty entries', () => {
      expect(marksEntrySchema.safeParse({
        classId: '507f1f77bcf86cd799439011',
        subjectId: '507f1f77bcf86cd799439012',
        entries: [],
      }).success).toBe(false)
    })
  })

  describe('correctMarksSchema', () => {
    it('accepts valid correction', () => {
      expect(correctMarksSchema.safeParse({
        marksObtained: 90,
        subjectId: '507f1f77bcf86cd799439011',
      }).success).toBe(true)
    })
  })
})

describe('computeGrade', () => {
  const defaultRanges: IGradeRange[] = [
    { minPercent: 90, maxPercent: 100, grade: 'A+' },
    { minPercent: 80, maxPercent: 89, grade: 'A' },
    { minPercent: 70, maxPercent: 79, grade: 'B+' },
    { minPercent: 60, maxPercent: 69, grade: 'B' },
    { minPercent: 50, maxPercent: 59, grade: 'C' },
    { minPercent: 0, maxPercent: 49, grade: 'F' },
  ]

  it('returns A+ for 95%', () => {
    expect(computeGrade(95, defaultRanges)).toBe('A+')
  })

  it('returns A for 85%', () => {
    expect(computeGrade(85, defaultRanges)).toBe('A')
  })

  it('returns F for 30%', () => {
    expect(computeGrade(30, defaultRanges)).toBe('F')
  })

  it('returns A+ for exactly 90%', () => {
    expect(computeGrade(90, defaultRanges)).toBe('A+')
  })

  it('returns A for exactly 80%', () => {
    expect(computeGrade(80, defaultRanges)).toBe('A')
  })

  it('returns C for exactly 50%', () => {
    expect(computeGrade(50, defaultRanges)).toBe('C')
  })

  it('returns F for 0%', () => {
    expect(computeGrade(0, defaultRanges)).toBe('F')
  })

  it('handles empty ranges gracefully', () => {
    expect(computeGrade(85, [])).toBe('F')
  })
})
