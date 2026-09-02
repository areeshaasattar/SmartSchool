import {
  createStudentSchema,
  updateStudentSchema,
  attachGuardianSchema,
  listStudentsQuerySchema,
} from '../../src/modules/students/schemas/studentSchemas'

describe('Student Validation Schemas', () => {
  describe('createStudentSchema', () => {
    const validStudent = {
      admissionNo: 'ADM001',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        dob: '2010-01-15',
        gender: 'male' as const,
      },
      emergencyContact: {
        name: 'Jane Doe',
        relation: 'Mother',
        phone: '+1234567890',
      },
    }

    it('should accept valid student data', () => {
      const result = createStudentSchema.safeParse(validStudent)
      expect(result.success).toBe(true)
    })

    it('should accept student with optional fields', () => {
      const result = createStudentSchema.safeParse({
        ...validStudent,
        profile: { ...validStudent.profile, bloodGroup: 'O+', photoUrl: 'https://example.com/photo.jpg' },
        academicYearId: '507f1f77bcf86cd799439011',
        classId: '507f1f77bcf86cd799439012',
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty admission number', () => {
      const result = createStudentSchema.safeParse({ ...validStudent, admissionNo: '' })
      expect(result.success).toBe(false)
    })

    it('should reject missing profile firstName', () => {
      const result = createStudentSchema.safeParse({
        ...validStudent,
        profile: { ...validStudent.profile, firstName: '' },
      })
      expect(result.success).toBe(false)
    })

    it('should reject future dob', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 5)
      const result = createStudentSchema.safeParse({
        ...validStudent,
        profile: { ...validStudent.profile, dob: futureDate.toISOString() },
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid gender', () => {
      const result = createStudentSchema.safeParse({
        ...validStudent,
        profile: { ...validStudent.profile, gender: 'unknown' },
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing emergency contact', () => {
      const result = createStudentSchema.safeParse({
        ...validStudent,
        emergencyContact: undefined,
      })
      expect(result.success).toBe(false)
    })

    it('should accept guardian with guardianId', () => {
      const result = createStudentSchema.safeParse({
        ...validStudent,
        guardians: [{ guardianId: '507f1f77bcf86cd799439011', relationship: 'Mother' }],
      })
      expect(result.success).toBe(true)
    })

    it('should accept guardian with email + name', () => {
      const result = createStudentSchema.safeParse({
        ...validStudent,
        guardians: [{
          email: 'parent@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
          relationship: 'Mother',
        }],
      })
      expect(result.success).toBe(true)
    })

    it('should reject guardian with only email (missing name)', () => {
      const result = createStudentSchema.safeParse({
        ...validStudent,
        guardians: [{ email: 'parent@example.com', relationship: 'Mother' }],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateStudentSchema', () => {
    it('should accept partial updates', () => {
      const result = updateStudentSchema.safeParse({ status: 'inactive' })
      expect(result.success).toBe(true)
    })

    it('should accept profile partial update', () => {
      const result = updateStudentSchema.safeParse({
        profile: { firstName: 'Updated' },
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid status', () => {
      const result = updateStudentSchema.safeParse({ status: 'deleted' })
      expect(result.success).toBe(false)
    })
  })

  describe('attachGuardianSchema', () => {
    it('should accept guardianId', () => {
      const result = attachGuardianSchema.safeParse({
        guardianId: '507f1f77bcf86cd799439011',
        relationship: 'Mother',
      })
      expect(result.success).toBe(true)
    })

    it('should accept email + name', () => {
      const result = attachGuardianSchema.safeParse({
        email: 'parent@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        relationship: 'Father',
      })
      expect(result.success).toBe(true)
    })

    it('should reject missing relationship', () => {
      const result = attachGuardianSchema.safeParse({
        guardianId: '507f1f77bcf86cd799439011',
      })
      expect(result.success).toBe(false)
    })

    it('should reject email without name', () => {
      const result = attachGuardianSchema.safeParse({
        email: 'parent@example.com',
        relationship: 'Mother',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('listStudentsQuerySchema', () => {
    it('should use defaults', () => {
      const result = listStudentsQuerySchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
      }
    })

    it('should coerce query params', () => {
      const result = listStudentsQuerySchema.safeParse({ page: '2', limit: '50' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(2)
        expect(result.data.limit).toBe(50)
      }
    })
  })
})
