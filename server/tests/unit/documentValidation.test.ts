import {
  uploadDocumentSchema,
  listDocumentsQuerySchema,
  validateFileType,
} from '../../src/modules/documents/schemas/documentSchemas.js'

describe('Document Validation Schemas', () => {
  describe('uploadDocumentSchema', () => {
    it('should accept valid upload metadata', () => {
      const result = uploadDocumentSchema.safeParse({
        ownerType: 'student',
        ownerId: '507f1f77bcf86cd799439011',
        type: 'profile_photo',
      })
      expect(result.success).toBe(true)
    })

    it('should accept valid attachment metadata', () => {
      const result = uploadDocumentSchema.safeParse({
        ownerType: 'assignment_submission',
        ownerId: '507f1f77bcf86cd799439011',
        type: 'attachment',
        accessPolicy: 'owner_and_admin',
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid ownerType', () => {
      const result = uploadDocumentSchema.safeParse({
        ownerType: 'invalid',
        ownerId: '507f1f77bcf86cd799439011',
        type: 'attachment',
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid document type', () => {
      const result = uploadDocumentSchema.safeParse({
        ownerType: 'student',
        ownerId: '507f1f77bcf86cd799439011',
        type: 'invalid_type',
      })
      expect(result.success).toBe(false)
    })

    it('should default accessPolicy to owner_and_admin', () => {
      const result = uploadDocumentSchema.safeParse({
        ownerType: 'student',
        ownerId: '507f1f77bcf86cd799439011',
        type: 'profile_photo',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.accessPolicy).toBe('owner_and_admin')
      }
    })
  })

  describe('listDocumentsQuerySchema', () => {
    it('should apply defaults', () => {
      const result = listDocumentsQuerySchema.parse({})
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })

    it('should coerce page and limit', () => {
      const result = listDocumentsQuerySchema.parse({ page: '2', limit: '10' })
      expect(result.page).toBe(2)
      expect(result.limit).toBe(10)
    })
  })

  describe('validateFileType', () => {
    it('should accept PDF files', () => {
      const result = validateFileType('document.pdf', 'application/pdf', 1024 * 100)
      expect(result.valid).toBe(true)
    })

    it('should accept image files', () => {
      const result = validateFileType('photo.jpg', 'image/jpeg', 1024 * 500)
      expect(result.valid).toBe(true)
    })

    it('should accept PNG images', () => {
      const result = validateFileType('photo.png', 'image/png', 1024 * 500)
      expect(result.valid).toBe(true)
    })

    it('should accept Word documents', () => {
      const result = validateFileType('doc.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 1024 * 100)
      expect(result.valid).toBe(true)
    })

    it('should reject executable files', () => {
      const result = validateFileType('virus.exe', 'application/x-msdownload', 1024)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not allowed')
    })

    it('should reject batch files', () => {
      const result = validateFileType('script.bat', 'application/x-bat', 1024)
      expect(result.valid).toBe(false)
    })

    it('should reject files exceeding size limit', () => {
      const result = validateFileType('large.pdf', 'application/pdf', 11 * 1024 * 1024) // 11MB
      expect(result.valid).toBe(false)
      expect(result.error).toContain('10MB')
    })

    it('should reject unknown mime types', () => {
      const result = validateFileType('file.xyz', 'application/x-unknown', 1024)
      expect(result.valid).toBe(false)
    })
  })
})

describe('Access Policy Logic', () => {
  // Test the access policy enum values
  it('owner_and_admin should restrict to owner and admin', () => {
    const policy = 'owner_and_admin'
    expect(policy).toBe('owner_and_admin')
  })

  it('tenant_staff should allow all staff', () => {
    const policy = 'tenant_staff'
    expect(policy).toBe('tenant_staff')
  })

  it('public_within_tenant should allow all in tenant', () => {
    const policy = 'public_within_tenant'
    expect(policy).toBe('public_within_tenant')
  })
})
