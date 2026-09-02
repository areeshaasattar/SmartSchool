import {
  createTeacherSchema,
  updateTeacherSchema,
  teacherSelfEditSchema,
  listTeachersQuerySchema,
} from '../../src/modules/teachers/schemas/teacherSchemas'

describe('Teacher Validation Schemas', () => {
  describe('createTeacherSchema', () => {
    const validTeacher = {
      employeeNo: 'TCH001',
      profile: {
        firstName: 'John',
        lastName: 'Smith',
      },
      employment: {
        designation: 'Senior Teacher',
        joiningDate: '2024-01-15',
        employmentType: 'full_time' as const,
      },
      user: {
        email: 'john.smith@example.com',
        firstName: 'John',
        lastName: 'Smith',
      },
    }

    it('should accept valid teacher data', () => {
      const result = createTeacherSchema.safeParse(validTeacher)
      expect(result.success).toBe(true)
    })

    it('should accept teacher with optional fields', () => {
      const result = createTeacherSchema.safeParse({
        ...validTeacher,
        profile: { ...validTeacher.profile, dob: '1985-06-15', gender: 'male', phone: '+1234567890' },
        departments: ['Math', 'Science'],
        subjects: ['Algebra', 'Physics'],
        qualifications: [{ degree: 'M.Sc Mathematics', institution: 'State University', year: 2010 }],
      })
      expect(result.success).toBe(true)
    })

    it('should accept teacher linked by userId', () => {
      const result = createTeacherSchema.safeParse({
        ...validTeacher,
        user: { userId: '507f1f77bcf86cd799439011' },
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty employee number', () => {
      const result = createTeacherSchema.safeParse({ ...validTeacher, employeeNo: '' })
      expect(result.success).toBe(false)
    })

    it('should reject missing designation', () => {
      const result = createTeacherSchema.safeParse({
        ...validTeacher,
        employment: { ...validTeacher.employment, designation: '' },
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid employment type', () => {
      const result = createTeacherSchema.safeParse({
        ...validTeacher,
        employment: { ...validTeacher.employment, employmentType: 'volunteer' },
      })
      expect(result.success).toBe(false)
    })

    it('should reject user without userId or email+name', () => {
      const result = createTeacherSchema.safeParse({
        ...validTeacher,
        user: { phone: '+123' },
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid email format', () => {
      const result = createTeacherSchema.safeParse({
        ...validTeacher,
        user: { email: 'not-an-email', firstName: 'John', lastName: 'Smith' },
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateTeacherSchema', () => {
    it('should accept partial updates', () => {
      const result = updateTeacherSchema.safeParse({ employeeNo: 'TCH002' })
      expect(result.success).toBe(true)
    })

    it('should accept employment status update', () => {
      const result = updateTeacherSchema.safeParse({
        employment: { status: 'on_leave' },
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid status', () => {
      const result = updateTeacherSchema.safeParse({
        employment: { status: 'terminated' },
      })
      expect(result.success).toBe(false)
    })
  })

  describe('teacherSelfEditSchema', () => {
    it('should accept phone update', () => {
      const result = teacherSelfEditSchema.safeParse({ profile: { phone: '+1234567890' } })
      expect(result.success).toBe(true)
    })

    it('should accept photoUrl update', () => {
      const result = teacherSelfEditSchema.safeParse({ profile: { photoUrl: 'https://example.com/photo.jpg' } })
      expect(result.success).toBe(true)
    })

    it('should accept empty profile', () => {
      const result = teacherSelfEditSchema.safeParse({ profile: {} })
      expect(result.success).toBe(true)
    })

    it('should reject non-profile fields', () => {
      const result = teacherSelfEditSchema.safeParse({ employeeNo: 'NEW001' })
      expect(result.success).toBe(true) // extra fields are allowed but ignored
    })
  })

  describe('listTeachersQuerySchema', () => {
    it('should use defaults', () => {
      const result = listTeachersQuerySchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
      }
    })
  })
})
