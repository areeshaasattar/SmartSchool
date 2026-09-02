import { z } from 'zod'

export const timetableDayEnum = z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

// ── Create slot ──────────────────────────────────────────────────────

export const createSlotSchema = z.object({
  classId: z.string().min(1, 'Class ID is required'),
  subjectId: z.string().min(1, 'Subject ID is required'),
  teacherId: z.string().min(1, 'Teacher ID is required'),
  roomId: z.string().optional(),
  day: timetableDayEnum,
  startTime: z.string().regex(timeRegex, 'Time must be in HH:mm format (e.g. 09:00)'),
  endTime: z.string().regex(timeRegex, 'Time must be in HH:mm format (e.g. 10:00)'),
  academicYearId: z.string().min(1, 'Academic year ID is required'),
}).refine((data) => data.startTime < data.endTime, {
  message: 'End time must be after start time',
  path: ['endTime'],
})

// ── Update slot ──────────────────────────────────────────────────────

export const updateSlotSchema = z.object({
  classId: z.string().min(1).optional(),
  subjectId: z.string().min(1).optional(),
  teacherId: z.string().min(1).optional(),
  roomId: z.string().nullable().optional(),
  day: timetableDayEnum.optional(),
  startTime: z.string().regex(timeRegex).optional(),
  endTime: z.string().regex(timeRegex).optional(),
  academicYearId: z.string().min(1).optional(),
}).refine((data) => {
  if (data.startTime && data.endTime) return data.startTime < data.endTime
  return true
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
})

// ── Availability query ───────────────────────────────────────────────

export const availabilityQuerySchema = z.object({
  teacherId: z.string().optional(),
  roomId: z.string().optional(),
  classId: z.string().optional(),
  day: timetableDayEnum,
  startTime: z.string().regex(timeRegex),
  endTime: z.string().regex(timeRegex),
}).refine((data) => data.teacherId || data.roomId || data.classId, {
  message: 'At least one of teacherId, roomId, or classId is required',
})
