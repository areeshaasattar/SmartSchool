import {
  createSchoolSchema,
  updateSchoolSettingsSchema,
  createAcademicYearSchema,
  updateAcademicYearSchema,
} from '../../src/modules/schools/schemas/schoolSchemas'

describe('School Validation Schemas', () => {
  describe('createSchoolSchema', () => {
    it('should accept valid school data', () => {
      const result = createSchoolSchema.safeParse({ name: 'My School', code: 'MS01' })
      expect(result.success).toBe(true)
    })

    it('should reject empty name', () => {
      const result = createSchoolSchema.safeParse({ name: '', code: 'MS01' })
      expect(result.success).toBe(false)
    })

    it('should reject short code', () => {
      const result = createSchoolSchema.safeParse({ name: 'My School', code: 'A' })
      expect(result.success).toBe(false)
    })

    it('should reject code with special characters', () => {
      const result = createSchoolSchema.safeParse({ name: 'My School', code: 'MS@01' })
      expect(result.success).toBe(false)
    })
  })

  describe('updateSchoolSettingsSchema', () => {
    it('should accept partial updates', () => {
      const result = updateSchoolSettingsSchema.safeParse({ name: 'Updated Name' })
      expect(result.success).toBe(true)
    })

    it('should accept settings update', () => {
      const result = updateSchoolSettingsSchema.safeParse({
        settings: { timezone: 'America/New_York', locale: 'en-US' },
      })
      expect(result.success).toBe(true)
    })

    it('should accept contact update', () => {
      const result = updateSchoolSettingsSchema.safeParse({
        settings: { contact: { email: 'admin@school.com', phone: '+1234567890' } },
      })
      expect(result.success).toBe(true)
    })

    it('should accept branding update', () => {
      const result = updateSchoolSettingsSchema.safeParse({
        settings: { branding: { primaryColor: '#ff0000' } },
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid hex color', () => {
      const result = updateSchoolSettingsSchema.safeParse({
        settings: { branding: { primaryColor: 'not-a-color' } },
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid status', () => {
      const result = updateSchoolSettingsSchema.safeParse({ status: 'deleted' })
      expect(result.success).toBe(false)
    })

    it('should accept academicWeekStart in range', () => {
      const result = updateSchoolSettingsSchema.safeParse({
        settings: { academicWeekStart: 0 },
      })
      expect(result.success).toBe(true)
    })

    it('should reject academicWeekStart out of range', () => {
      const result = updateSchoolSettingsSchema.safeParse({
        settings: { academicWeekStart: 7 },
      })
      expect(result.success).toBe(false)
    })
  })

  describe('createAcademicYearSchema', () => {
    it('should accept valid academic year', () => {
      const result = createAcademicYearSchema.safeParse({
        label: '2025-2026',
        startDate: '2025-08-01',
        endDate: '2026-06-30',
        isCurrent: false,
      })
      expect(result.success).toBe(true)
    })

    it('should accept isCurrent true', () => {
      const result = createAcademicYearSchema.safeParse({
        label: '2025-2026',
        startDate: '2025-08-01',
        endDate: '2026-06-30',
        isCurrent: true,
      })
      expect(result.success).toBe(true)
    })

    it('should reject endDate before startDate', () => {
      const result = createAcademicYearSchema.safeParse({
        label: '2025-2026',
        startDate: '2026-06-30',
        endDate: '2025-08-01',
        isCurrent: false,
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty label', () => {
      const result = createAcademicYearSchema.safeParse({
        label: '',
        startDate: '2025-08-01',
        endDate: '2026-06-30',
        isCurrent: false,
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid date', () => {
      const result = createAcademicYearSchema.safeParse({
        label: '2025-2026',
        startDate: 'not-a-date',
        endDate: '2026-06-30',
        isCurrent: false,
      })
      expect(result.success).toBe(false)
    })

    it('should default isCurrent to false', () => {
      const result = createAcademicYearSchema.safeParse({
        label: '2025-2026',
        startDate: '2025-08-01',
        endDate: '2026-06-30',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isCurrent).toBe(false)
      }
    })
  })

  describe('updateAcademicYearSchema', () => {
    it('should accept partial updates', () => {
      const result = updateAcademicYearSchema.safeParse({ label: 'Updated Label' })
      expect(result.success).toBe(true)
    })

    it('should accept isCurrent update', () => {
      const result = updateAcademicYearSchema.safeParse({ isCurrent: true })
      expect(result.success).toBe(true)
    })

    it('should reject endDate before startDate when both provided', () => {
      const result = updateAcademicYearSchema.safeParse({
        startDate: '2026-06-30',
        endDate: '2025-08-01',
      })
      expect(result.success).toBe(false)
    })
  })
})
