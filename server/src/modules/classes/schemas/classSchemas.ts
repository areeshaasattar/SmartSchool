import { z } from 'zod'

// ── Room ─────────────────────────────────────────────────────────────
export const createRoomSchema = z.object({
  name: z.string().min(1, 'Room name is required').max(100),
  capacity: z.number().int().min(1, 'Capacity must be at least 1'),
})

// ── Department ───────────────────────────────────────────────────────
export const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Department name is required').max(100),
})

// ── Class ────────────────────────────────────────────────────────────
export const createClassSchema = z.object({
  grade: z.string().min(1, 'Grade is required').max(50),
  section: z.string().min(1, 'Section is required').max(50),
  roomId: z.string().optional(),
  academicYearId: z.string().min(1, 'Academic year ID is required'),
  teacherIds: z.array(z.string()).optional(),
  classTeacherId: z.string().optional(),
})

export const updateClassSchema = z.object({
  grade: z.string().min(1).max(50).optional(),
  section: z.string().min(1).max(50).optional(),
  roomId: z.string().nullable().optional(),
  academicYearId: z.string().optional(),
  teacherIds: z.array(z.string()).optional(),
  classTeacherId: z.string().nullable().optional(),
})

export const listClassesQuerySchema = z.object({
  academicYearId: z.string().optional(),
  grade: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// ── Subject ──────────────────────────────────────────────────────────
export const createSubjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required').max(100),
  code: z.string().min(1, 'Subject code is required').max(50),
  gradeMappings: z
    .array(
      z.object({
        grade: z.string().min(1),
      }),
    )
    .optional()
    .default([]),
})

export const updateSubjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(1).max(50).optional(),
  gradeMappings: z
    .array(
      z.object({
        grade: z.string().min(1),
      }),
    )
    .optional(),
})

// ── Enrollment ───────────────────────────────────────────────────────
export const enrollStudentSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
})

export const unenrollStudentSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
})

// ── Subject-teacher assignment ───────────────────────────────────────
export const assignSubjectTeacherSchema = z.object({
  subjectId: z.string().min(1, 'Subject ID is required'),
  teacherId: z.string().min(1, 'Teacher ID is required'),
})
