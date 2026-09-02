import { z } from 'zod'

export const createLeaveRequestSchema = z.object({
  requesterType: z.enum(['student', 'teacher']),
  requesterId: z.string().min(1, 'Requester ID is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().min(1, 'Reason is required'),
  attachments: z.array(z.object({
    url: z.string().url(),
    filename: z.string(),
    mimeType: z.string(),
  })).optional(),
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  { message: 'End date must be on or after start date', path: ['endDate'] },
)

export const reviewLeaveRequestSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewComment: z.string().optional(),
})

export const listLeaveQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  requesterType: z.enum(['student', 'teacher']).optional(),
})

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>
export type ReviewLeaveRequestInput = z.infer<typeof reviewLeaveRequestSchema>
export type ListLeaveQuery = z.infer<typeof listLeaveQuerySchema>
