import { createClassSchema, updateClassSchema, createSubjectSchema, enrollStudentSchema, assignSubjectTeacherSchema, createRoomSchema } from '../../src/modules/classes/schemas/classSchemas.js'

describe('Class validation schemas', () => {
  describe('createClassSchema', () => {
    it('accepts valid class data', () => {
      const result = createClassSchema.safeParse({
        grade: '10',
        section: 'A',
        academicYearId: '507f1f77bcf86cd799439011',
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing grade', () => {
      const result = createClassSchema.safeParse({
        section: 'A',
        academicYearId: '507f1f77bcf86cd799439011',
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing section', () => {
      const result = createClassSchema.safeParse({
        grade: '10',
        academicYearId: '507f1f77bcf86cd799439011',
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing academicYearId', () => {
      const result = createClassSchema.safeParse({
        grade: '10',
        section: 'A',
      })
      expect(result.success).toBe(false)
    })

    it('accepts optional fields', () => {
      const result = createClassSchema.safeParse({
        grade: '10',
        section: 'A',
        academicYearId: '507f1f77bcf86cd799439011',
        roomId: '507f1f77bcf86cd799439012',
        teacherIds: ['507f1f77bcf86cd799439013'],
        classTeacherId: '507f1f77bcf86cd799439014',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('updateClassSchema', () => {
    it('accepts partial updates', () => {
      const result = updateClassSchema.safeParse({ grade: '11' })
      expect(result.success).toBe(true)
    })

    it('accepts empty update', () => {
      const result = updateClassSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('accepts null roomId', () => {
      const result = updateClassSchema.safeParse({ roomId: null })
      expect(result.success).toBe(true)
    })
  })

  describe('createSubjectSchema', () => {
    it('accepts valid subject data', () => {
      const result = createSubjectSchema.safeParse({
        name: 'Mathematics',
        code: 'MATH101',
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing name', () => {
      const result = createSubjectSchema.safeParse({
        code: 'MATH101',
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing code', () => {
      const result = createSubjectSchema.safeParse({
        name: 'Mathematics',
      })
      expect(result.success).toBe(false)
    })

    it('accepts grade mappings', () => {
      const result = createSubjectSchema.safeParse({
        name: 'Mathematics',
        code: 'MATH101',
        gradeMappings: [{ grade: '9' }, { grade: '10' }],
      })
      expect(result.success).toBe(true)
    })

    it('defaults gradeMappings to empty array', () => {
      const result = createSubjectSchema.safeParse({
        name: 'Mathematics',
        code: 'MATH101',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.gradeMappings).toEqual([])
      }
    })
  })

  describe('enrollStudentSchema', () => {
    it('accepts valid student ID', () => {
      const result = enrollStudentSchema.safeParse({
        studentId: '507f1f77bcf86cd799439011',
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing student ID', () => {
      const result = enrollStudentSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('rejects empty student ID', () => {
      const result = enrollStudentSchema.safeParse({ studentId: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('assignSubjectTeacherSchema', () => {
    it('accepts valid data', () => {
      const result = assignSubjectTeacherSchema.safeParse({
        subjectId: '507f1f77bcf86cd799439011',
        teacherId: '507f1f77bcf86cd799439012',
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing subject ID', () => {
      const result = assignSubjectTeacherSchema.safeParse({
        teacherId: '507f1f77bcf86cd799439012',
      })
      expect(result.success).toBe(false)
    })

    it('rejects missing teacher ID', () => {
      const result = assignSubjectTeacherSchema.safeParse({
        subjectId: '507f1f77bcf86cd799439011',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('createRoomSchema', () => {
    it('accepts valid room data', () => {
      const result = createRoomSchema.safeParse({
        name: 'Room 101',
        capacity: 40,
      })
      expect(result.success).toBe(true)
    })

    it('rejects missing name', () => {
      const result = createRoomSchema.safeParse({ capacity: 40 })
      expect(result.success).toBe(false)
    })

    it('rejects zero capacity', () => {
      const result = createRoomSchema.safeParse({ name: 'Room 101', capacity: 0 })
      expect(result.success).toBe(false)
    })
  })
})
