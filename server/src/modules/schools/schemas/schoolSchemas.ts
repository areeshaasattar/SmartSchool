import { z } from 'zod'

export const createSchoolSchema = z.object({
  name: z.string().min(1, 'School name is required').max(200),
  code: z
    .string()
    .min(2, 'School code must be at least 2 characters')
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/, 'Code can only contain letters, numbers, and hyphens'),
})

export const listSchoolsSchema = z.object({}).passthrough()

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>
export type ListSchoolsInput = z.infer<typeof listSchoolsSchema>
