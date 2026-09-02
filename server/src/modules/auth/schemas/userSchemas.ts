import { z } from 'zod'
import { ALL_ROLES, UserRole } from '../models/User.js'

export const assignRoleSchema = z.object({
  role: z.enum(ALL_ROLES as [UserRole, ...UserRole[]]),
  schoolId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid school ID format'),
})

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  role: z.enum(ALL_ROLES as [UserRole, ...UserRole[]]).optional(),
}).passthrough()

export type AssignRoleInput = z.infer<typeof assignRoleSchema>
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>
