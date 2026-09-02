import { z } from 'zod'

export const attendanceStatusEnum = z.enum(['present', 'absent', 'late', 'excused', 'half_day'])

// ── Bulk mark attendance ──────────────────────────────────────────────

export const attendanceRecordSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  status: attendanceStatusEnum,
  remarks: z.string().max(500).optional(),
})

export const markAttendanceSchema = z.object({
  classId: z.string().min(1, 'Class ID is required'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Valid date is required'),
  records: z.array(attendanceRecordSchema).min(1, 'At least one record is required'),
})

// ── Update single attendance record ───────────────────────────────────

export const updateAttendanceSchema = z.object({
  status: attendanceStatusEnum.optional(),
  remarks: z.string().max(500).optional(),
})

// ── Query parameters ──────────────────────────────────────────────────

export const classAttendanceQuerySchema = z.object({
  classId: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const studentAttendanceQuerySchema = z.object({
  studentId: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const attendanceSummaryQuerySchema = z.object({
  classId: z.string().optional(),
  studentId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})
