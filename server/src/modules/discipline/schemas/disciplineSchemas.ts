import { z } from 'zod'

export const createDisciplineRecordSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  incidentDate: z.string().min(1, 'Incident date is required'),
  category: z.enum(['behavior', 'academic_integrity', 'attendance', 'other']),
  description: z.string().min(1, 'Description is required'),
  severity: z.enum(['minor', 'moderate', 'major']),
  actionTaken: z.string().optional(),
})

export const updateDisciplineRecordSchema = z.object({
  status: z.enum(['open', 'resolved']).optional(),
  actionTaken: z.string().optional(),
  severity: z.enum(['minor', 'moderate', 'major']).optional(),
})

export const addFollowUpSchema = z.object({
  note: z.string().min(1, 'Follow-up note is required'),
})

export const listDisciplineQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['open', 'resolved']).optional(),
  category: z.enum(['behavior', 'academic_integrity', 'attendance', 'other']).optional(),
  severity: z.enum(['minor', 'moderate', 'major']).optional(),
  studentId: z.string().optional(),
})

export type CreateDisciplineRecordInput = z.infer<typeof createDisciplineRecordSchema>
export type UpdateDisciplineRecordInput = z.infer<typeof updateDisciplineRecordSchema>
export type AddFollowUpInput = z.infer<typeof addFollowUpSchema>
export type ListDisciplineQuery = z.infer<typeof listDisciplineQuerySchema>
