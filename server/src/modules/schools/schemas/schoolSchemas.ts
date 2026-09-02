import { z } from 'zod'

// ── School creation (unchanged from RBAC branch) ─────────────────────

export const createSchoolSchema = z.object({
  name: z.string().min(1, 'School name is required').max(200),
  code: z
    .string()
    .min(2, 'School code must be at least 2 characters')
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/, 'Code can only contain letters, numbers, and hyphens'),
})

// ── School settings update ───────────────────────────────────────────

const contactSchema = z.object({
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
})

const brandingSchema = z.object({
  logoUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  primaryColor: z
    .string()
    .regex(/^#([0-9A-Fa-f]{3}){1,2}$/, 'Must be a valid hex color')
    .optional()
    .or(z.literal('')),
})

export const updateSchoolSettingsSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  settings: z
    .object({
      timezone: z.string().min(1).max(50).optional(),
      locale: z.string().min(1).max(10).optional(),
      academicWeekStart: z.number().int().min(0).max(6).optional(),
      gradingScale: z.string().min(1).max(30).optional(),
      contact: contactSchema.optional(),
      branding: brandingSchema.optional(),
    })
    .optional(),
})

// ── Academic year ────────────────────────────────────────────────────

export const createAcademicYearSchema = z
  .object({
    label: z.string().min(1, 'Label is required').max(50),
    startDate: z.string().or(z.date()).refine((val) => !isNaN(new Date(val).getTime()), {
      message: 'Invalid start date',
    }),
    endDate: z.string().or(z.date()).refine((val) => !isNaN(new Date(val).getTime()), {
      message: 'Invalid end date',
    }),
    isCurrent: z.boolean().default(false),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate)
      const end = new Date(data.endDate)
      return end > start
    },
    { message: 'End date must be after start date', path: ['endDate'] },
  )

export const updateAcademicYearSchema = z
  .object({
    label: z.string().min(1).max(50).optional(),
    startDate: z.string().or(z.date()).optional(),
    endDate: z.string().or(z.date()).optional(),
    isCurrent: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate)
        const end = new Date(data.endDate)
        return end > start
      }
      return true
    },
    { message: 'End date must be after start date', path: ['endDate'] },
  )

// ── Export types ─────────────────────────────────────────────────────

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>
export type UpdateSchoolSettingsInput = z.infer<typeof updateSchoolSettingsSchema>
export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>
export type UpdateAcademicYearInput = z.infer<typeof updateAcademicYearSchema>
