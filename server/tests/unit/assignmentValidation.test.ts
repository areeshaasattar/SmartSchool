import {
  createAssignmentSchema,
  updateAssignmentSchema,
  submitAssignmentSchema,
  gradeSubmissionSchema,
} from '../../src/modules/assignments/schemas/assignmentSchemas.js'

describe('Assignment validation schemas', () => {
  describe('createAssignmentSchema', () => {
    const validAssignment = {
      classId: '507f1f77bcf86cd799439011',
      subjectId: '507f1f77bcf86cd799439012',
      title: 'Math Homework',
      description: 'Complete exercises 1-10',
      dueDate: '2026-12-31',
      maxMarks: 100,
      academicYearId: '507f1f77bcf86cd799439013',
    }

    it('accepts valid assignment data', () => {
      expect(createAssignmentSchema.safeParse(validAssignment).success).toBe(true)
    })

    it('accepts with attachments', () => {
      const withAttachments = {
        ...validAssignment,
        attachments: [
          { url: 'https://example.com/file.pdf', filename: 'homework.pdf' },
        ],
      }
      expect(createAssignmentSchema.safeParse(withAttachments).success).toBe(true)
    })

    it('rejects missing title', () => {
      const { title, ...rest } = validAssignment
      expect(createAssignmentSchema.safeParse(rest).success).toBe(false)
    })

    it('rejects zero maxMarks', () => {
      expect(createAssignmentSchema.safeParse({ ...validAssignment, maxMarks: 0 }).success).toBe(false)
    })

    it('rejects negative maxMarks', () => {
      expect(createAssignmentSchema.safeParse({ ...validAssignment, maxMarks: -1 }).success).toBe(false)
    })

    it('rejects invalid dueDate', () => {
      expect(createAssignmentSchema.safeParse({ ...validAssignment, dueDate: 'not-a-date' }).success).toBe(false)
    })

    it('rejects invalid attachment URL', () => {
      const withBadUrl = {
        ...validAssignment,
        attachments: [{ url: 'not-a-url', filename: 'file.pdf' }],
      }
      expect(createAssignmentSchema.safeParse(withBadUrl).success).toBe(false)
    })
  })

  describe('gradeSubmissionSchema', () => {
    it('accepts valid grade', () => {
      expect(gradeSubmissionSchema.safeParse({ marks: 85 }).success).toBe(true)
    })

    it('accepts grade with feedback', () => {
      expect(gradeSubmissionSchema.safeParse({ marks: 85, feedback: 'Good work!' }).success).toBe(true)
    })

    it('accepts zero marks', () => {
      expect(gradeSubmissionSchema.safeParse({ marks: 0 }).success).toBe(true)
    })

    it('rejects negative marks', () => {
      expect(gradeSubmissionSchema.safeParse({ marks: -5 }).success).toBe(false)
    })

    it('marks exceeding maxMarks is validated in service, not schema', () => {
      // Schema allows any non-negative number; service checks against maxMarks
      expect(gradeSubmissionSchema.safeParse({ marks: 1000 }).success).toBe(true)
    })
  })

  describe('submitAssignmentSchema', () => {
    it('accepts empty submission', () => {
      expect(submitAssignmentSchema.safeParse({}).success).toBe(true)
    })

    it('accepts content only', () => {
      expect(submitAssignmentSchema.safeParse({ content: 'My answer' }).success).toBe(true)
    })

    it('accepts with attachments', () => {
      expect(submitAssignmentSchema.safeParse({
        content: 'My answer',
        attachments: [{ url: 'https://example.com/file.pdf', filename: 'answer.pdf' }],
      }).success).toBe(true)
    })
  })
})
