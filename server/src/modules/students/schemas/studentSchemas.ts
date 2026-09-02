import { z } from 'zod'

// ── Student schemas ──────────────────────────────────────────────────

const emergencyContactSchema = z.object({
  name: z.string().min(1, 'Emergency contact name is required').max(100),
  relation: z.string().min(1, 'Relation is required').max(50),
  phone: z.string().min(1, 'Phone is required').max(30),
})

const studentProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  dob: z.string().or(z.date()).refine((val) => {
    const d = new Date(val)
    return !isNaN(d.getTime()) && d < new Date()
  }, { message: 'Date of birth must be a valid past date' }),
  gender: z.enum(['male', 'female', 'other']),
  photoUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  bloodGroup: z.string().max(10).optional(),
})

export const createStudentSchema = z.object({
  admissionNo: z.string().min(1, 'Admission number is required').max(30),
  profile: studentProfileSchema,
  emergencyContact: emergencyContactSchema,
  academicYearId: z.string().optional().nullable(),
  classId: z.string().optional().nullable(),
  sectionId: z.string().optional().nullable(),
  guardians: z.array(z.object({
    guardianId: z.string().optional(),
    email: z.string().email().optional(),
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    phone: z.string().optional(),
    relationship: z.string().min(1, 'Relationship is required').max(50),
  })).optional(),
}).refine(
  (data) => {
    // Each guardian entry must have either guardianId or (email + firstName + lastName)
    return (data.guardians || []).every((g) => {
      if (g.guardianId) return true
      return g.email && g.firstName && g.lastName
    })
  },
  { message: 'Each guardian must have either a guardianId or email + firstName + lastName', path: ['guardians'] },
)

export const updateStudentSchema = z.object({
  admissionNo: z.string().min(1).max(30).optional(),
  profile: studentProfileSchema.partial().optional(),
  emergencyContact: emergencyContactSchema.partial().optional(),
  status: z.enum(['active', 'inactive', 'graduated', 'transferred']).optional(),
  academicYearId: z.string().optional().nullable(),
  classId: z.string().optional().nullable(),
  sectionId: z.string().optional().nullable(),
})

// ── Guardian schemas ─────────────────────────────────────────────────

export const attachGuardianSchema = z.object({
  guardianId: z.string().optional(),
  email: z.string().email('Invalid email').optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().optional(),
  relationship: z.string().min(1, 'Relationship is required').max(50),
}).refine(
  (data) => data.guardianId || (data.email && data.firstName && data.lastName),
  { message: 'Must provide either guardianId or email + firstName + lastName' },
)

// ── Query schemas ────────────────────────────────────────────────────

export const listStudentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'graduated', 'transferred']).optional(),
  classId: z.string().optional(),
}).passthrough()

// ── Export types ─────────────────────────────────────────────────────

export type CreateStudentInput = z.infer<typeof createStudentSchema>
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>
export type AttachGuardianInput = z.infer<typeof attachGuardianSchema>
export type ListStudentsQuery = z.infer<typeof listStudentsQuerySchema>
