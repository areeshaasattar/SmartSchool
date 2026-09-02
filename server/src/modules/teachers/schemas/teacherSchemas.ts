import { z } from 'zod'

// ── Qualification sub-schema ─────────────────────────────────────────

const qualificationSchema = z.object({
  degree: z.string().min(1, 'Degree is required').max(100),
  institution: z.string().min(1, 'Institution is required').max(200),
  year: z.number().int().min(1900).max(2100),
})

// ── Create teacher ───────────────────────────────────────────────────

export const createTeacherSchema = z.object({
  employeeNo: z.string().min(1, 'Employee number is required').max(30),
  profile: z.object({
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    dob: z.string().or(z.date()).optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    photoUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
    phone: z.string().max(30).optional(),
  }),
  employment: z.object({
    designation: z.string().min(1, 'Designation is required').max(100),
    joiningDate: z.string().or(z.date()).refine((val) => !isNaN(new Date(val).getTime()), {
      message: 'Invalid joining date',
    }),
    employmentType: z.enum(['full_time', 'part_time', 'contract']),
    status: z.enum(['active', 'on_leave', 'inactive']).default('active'),
  }),
  departments: z.array(z.string().max(100)).optional(),
  subjects: z.array(z.string().max(100)).optional(),
  qualifications: z.array(qualificationSchema).optional(),
  // User account creation/linking
  user: z.object({
    userId: z.string().optional(),
    email: z.string().email('Invalid email').optional(),
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    phone: z.string().optional(),
  }).refine(
    (data) => data.userId || (data.email && data.firstName && data.lastName),
    { message: 'Must provide either userId or email + firstName + lastName' },
  ),
})

// ── Update teacher ───────────────────────────────────────────────────

export const updateTeacherSchema = z.object({
  employeeNo: z.string().min(1).max(30).optional(),
  profile: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    dob: z.string().or(z.date()).optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    photoUrl: z.string().url().optional().or(z.literal('')),
    phone: z.string().max(30).optional(),
  }).optional(),
  employment: z.object({
    designation: z.string().min(1).max(100).optional(),
    joiningDate: z.string().or(z.date()).optional(),
    employmentType: z.enum(['full_time', 'part_time', 'contract']).optional(),
    status: z.enum(['active', 'on_leave', 'inactive']).optional(),
  }).optional(),
  departments: z.array(z.string().max(100)).optional(),
  subjects: z.array(z.string().max(100)).optional(),
  qualifications: z.array(qualificationSchema).optional(),
})

// ── Self-edit (teacher updating own profile) ─────────────────────────

export const teacherSelfEditSchema = z.object({
  profile: z.object({
    phone: z.string().max(30).optional(),
    photoUrl: z.string().url().optional().or(z.literal('')),
  }).optional(),
})

// ── Query schemas ────────────────────────────────────────────────────

export const listTeachersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['active', 'on_leave', 'inactive']).optional(),
  department: z.string().optional(),
}).passthrough()

// ── Export types ─────────────────────────────────────────────────────

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>
export type TeacherSelfEditInput = z.infer<typeof teacherSelfEditSchema>
export type ListTeachersQuery = z.infer<typeof listTeachersQuerySchema>
