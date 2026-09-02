import { z } from 'zod'

// ── Schedule entry ───────────────────────────────────────────────────

const scheduleEntrySchema = z.object({
  subjectId: z.string().min(1),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Valid date required'),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  maxMarks: z.number().int().min(1),
  passMarks: z.number().int().min(0),
})

// ── Create exam ──────────────────────────────────────────────────────

export const createExamSchema = z.object({
  academicYearId: z.string().min(1, 'Academic year ID is required'),
  term: z.string().min(1, 'Term is required').max(50),
  name: z.string().min(1, 'Exam name is required').max(200),
  classIds: z.array(z.string()).min(1, 'At least one class is required'),
  schedule: z.array(scheduleEntrySchema).optional().default([]),
}).refine((data) => {
  // Validate no duplicate subjectId in schedule
  const subjectIds = data.schedule.map((s) => s.subjectId)
  return new Set(subjectIds).size === subjectIds.length
}, {
  message: 'Duplicate subject entries are not allowed in the schedule',
  path: ['schedule'],
})

// ── Update exam ──────────────────────────────────────────────────────

export const updateExamSchema = z.object({
  term: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(200).optional(),
  classIds: z.array(z.string()).optional(),
  schedule: z.array(scheduleEntrySchema).optional(),
  status: z.enum(['draft', 'scheduled', 'ongoing', 'completed']).optional(),
})

// ── Bulk marks entry ─────────────────────────────────────────────────

export const marksEntrySchema = z.object({
  classId: z.string().min(1, 'Class ID is required'),
  subjectId: z.string().min(1, 'Subject ID is required'),
  entries: z.array(z.object({
    studentId: z.string().min(1),
    marksObtained: z.number().min(0),
  })).min(1, 'At least one entry is required'),
})

// ── Correct single student marks ─────────────────────────────────────

export const correctMarksSchema = z.object({
  marksObtained: z.number().min(0),
  subjectId: z.string().min(1),
})
