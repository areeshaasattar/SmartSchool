import { z } from 'zod'

// ── Create assignment ────────────────────────────────────────────────

export const attachmentSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  filename: z.string().min(1, 'Filename is required'),
  mimeType: z.string().optional(),
})

export const createAssignmentSchema = z.object({
  classId: z.string().min(1, 'Class ID is required'),
  subjectId: z.string().min(1, 'Subject ID is required'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required').max(5000),
  attachments: z.array(attachmentSchema).optional().default([]),
  dueDate: z.string().refine((val) => {
    const d = new Date(val)
    return !isNaN(d.getTime())
  }, 'Valid date is required'),
  maxMarks: z.number().int().min(1, 'Max marks must be at least 1'),
  academicYearId: z.string().min(1, 'Academic year ID is required'),
})

// ── Update assignment ────────────────────────────────────────────────

export const updateAssignmentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  attachments: z.array(attachmentSchema).optional(),
  dueDate: z.string().refine((val) => {
    const d = new Date(val)
    return !isNaN(d.getTime())
  }, 'Valid date is required').optional(),
  maxMarks: z.number().int().min(1).optional(),
})

// ── Submit assignment ────────────────────────────────────────────────

export const submitAssignmentSchema = z.object({
  content: z.string().max(10000).optional().default(''),
  attachments: z.array(attachmentSchema).optional().default([]),
})

// ── Grade submission ─────────────────────────────────────────────────

export const gradeSubmissionSchema = z.object({
  marks: z.number().min(0, 'Marks cannot be negative'),
  feedback: z.string().max(2000).optional(),
})

// ── Query schemas ────────────────────────────────────────────────────

export const classAssignmentsQuerySchema = z.object({
  classId: z.string().min(1),
  status: z.enum(['draft', 'published', 'closed']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
