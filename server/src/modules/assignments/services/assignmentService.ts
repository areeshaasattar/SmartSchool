import mongoose from 'mongoose'
import { Assignment, IAssignment } from '../models/Assignment.js'
import { Submission, ISubmission } from '../models/Submission.js'
import { Class } from '../../classes/models/Class.js'
import { Student } from '../../students/models/Student.js'
import { writeAuditLog } from '../../audit/models/AuditLog.js'
import { dispatchNotification } from '../../notifications/services/notificationService.js'

// ── Helper ───────────────────────────────────────────────────────────

function toPlain(obj: unknown): Record<string, unknown> {
  if (obj && typeof obj === 'object' && 'toObject' in obj && typeof (obj as { toObject: unknown }).toObject === 'function') {
    return (obj as { toObject: () => Record<string, unknown> }).toObject()
  }
  return obj as Record<string, unknown>
}

// ── Teacher-class assignment check (reuse from attendance) ───────────

export async function isTeacherAssignedToClass(teacherId: string, classId: string, schoolId: string): Promise<boolean> {
  const cls = await Class.findOne({ _id: classId, schoolId })
  if (!cls) return false
  const teacherObjectId = new mongoose.Types.ObjectId(teacherId)
  if (cls.classTeacherId && cls.classTeacherId.equals(teacherObjectId)) return true
  if (cls.teacherIds.some((id) => id.equals(teacherObjectId))) return true
  return false
}

// ── CRUD ─────────────────────────────────────────────────────────────

export interface CreateAssignmentInput {
  classId: string
  subjectId: string
  title: string
  description: string
  attachments?: { url: string; filename: string; mimeType?: string }[]
  dueDate: string
  maxMarks: number
  academicYearId: string
}

export async function createAssignment(schoolId: string, input: CreateAssignmentInput, teacherUserId: string, actorEmail = 'system') {
  // Get teacher record
  const Teacher = mongoose.model('Teacher')
  const teacher = await Teacher.findOne({ userId: teacherUserId, schoolId })
  if (!teacher) throw new Error('Teacher profile not found')

  // Validate teacher is assigned to this class
  const isAssigned = await isTeacherAssignedToClass(teacherUserId, input.classId, schoolId)
  if (!isAssigned) throw new Error('You are not assigned to this class')

  const assignment = await Assignment.create({
    schoolId,
    classId: input.classId,
    subjectId: input.subjectId,
    teacherId: teacher._id,
    academicYearId: input.academicYearId,
    title: input.title,
    description: input.description,
    attachments: input.attachments || [],
    dueDate: new Date(input.dueDate),
    maxMarks: input.maxMarks,
    status: 'draft',
  })

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(teacherUserId),
    actorEmail,
    action: 'assignment:create',
    entity: 'Assignment',
    entityId: assignment._id.toString(),
    after: toPlain(assignment),
  })

  return assignment
}

export async function updateAssignment(
  schoolId: string,
  assignmentId: string,
  input: Partial<{
    title: string
    description: string
    attachments: { url: string; filename: string; mimeType?: string }[]
    dueDate: string
    maxMarks: number
  }>,
  actorUserId: string,
  actorEmail = 'system',
) {
  const assignment = await Assignment.findOne({ _id: assignmentId, schoolId })
  if (!assignment) throw new Error('Assignment not found')

  // Only draft assignments can be edited
  if (assignment.status !== 'draft') {
    throw new Error('Only draft assignments can be edited')
  }

  const before = toPlain(assignment)

  if (input.title !== undefined) assignment.title = input.title
  if (input.description !== undefined) assignment.description = input.description
  if (input.attachments !== undefined) assignment.attachments = input.attachments
  if (input.dueDate !== undefined) assignment.dueDate = new Date(input.dueDate)
  if (input.maxMarks !== undefined) assignment.maxMarks = input.maxMarks

  await assignment.save()

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorUserId),
    actorEmail,
    action: 'assignment:update',
    entity: 'Assignment',
    entityId: assignmentId,
    before,
    after: toPlain(assignment),
  })

  return assignment
}

export async function publishAssignment(schoolId: string, assignmentId: string, actorUserId: string, actorEmail = 'system') {
  const assignment = await Assignment.findOne({ _id: assignmentId, schoolId })
  if (!assignment) throw new Error('Assignment not found')
  if (assignment.status !== 'draft') throw new Error('Only draft assignments can be published')

  const before = toPlain(assignment)
  assignment.status = 'published'
  await assignment.save()

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorUserId),
    actorEmail,
    action: 'assignment:publish',
    entity: 'Assignment',
    entityId: assignmentId,
    before,
    after: toPlain(assignment),
  })

  return assignment
}

export async function deleteAssignment(schoolId: string, assignmentId: string, actorUserId: string, actorEmail = 'system') {
  const assignment = await Assignment.findOne({ _id: assignmentId, schoolId })
  if (!assignment) throw new Error('Assignment not found')

  // Reject if submissions already exist
  const submissionCount = await Submission.countDocuments({ assignmentId })
  if (submissionCount > 0) {
    throw new Error(`Cannot delete assignment with ${submissionCount} submission(s). Close it instead.`)
  }

  const before = toPlain(assignment)
  await Assignment.findByIdAndDelete(assignmentId)

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorUserId),
    actorEmail,
    action: 'assignment:delete',
    entity: 'Assignment',
    entityId: assignmentId,
    before,
  })

  return true
}

// ── Views ────────────────────────────────────────────────────────────

export async function listClassAssignments(
  schoolId: string,
  classId: string,
  filters: { status?: string; page?: number; limit?: number },
  isTeacherOrAdmin = false,
) {
  const { status, page = 1, limit = 20 } = filters

  const query: Record<string, unknown> = { schoolId, classId }

  // Students/parents only see published; teachers/admins see draft+published
  if (!isTeacherOrAdmin) {
    query.status = 'published'
  } else if (status) {
    query.status = status
  }

  const total = await Assignment.countDocuments(query)
  const assignments = await Assignment.find(query)
    .populate('subjectId', 'name code')
    .populate('teacherId', 'profile.firstName profile.lastName')
    .sort({ dueDate: -1 })
    .skip((page - 1) * limit)
    .limit(limit)

  return { assignments, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function getAssignmentById(schoolId: string, assignmentId: string) {
  return Assignment.findOne({ _id: assignmentId, schoolId })
    .populate('classId', 'grade section')
    .populate('subjectId', 'name code')
    .populate('teacherId', 'profile.firstName profile.lastName')
}

// ── Submission ───────────────────────────────────────────────────────

export async function submitToAssignment(
  schoolId: string,
  assignmentId: string,
  studentUserId: string,
  input: { content?: string; attachments?: { url: string; filename: string; mimeType?: string }[] },
  actorEmail = 'system',
) {
  const assignment = await Assignment.findOne({ _id: assignmentId, schoolId })
  if (!assignment) throw new Error('Assignment not found')
  if (assignment.status !== 'published') throw new Error('Assignment is not published')

  // Get student record
  const StudentModel = mongoose.model('Student')
  const student = await StudentModel.findOne({ userId: studentUserId, schoolId })
  if (!student) throw new Error('Student profile not found')

  // Verify student is enrolled in this class
  if (!student.classId || student.classId.toString() !== assignment.classId.toString()) {
    throw new Error('You are not enrolled in this class')
  }

  const now = new Date()
  const isLate = now > assignment.dueDate

  // Upsert: resubmission updates existing record
  const submission = await Submission.findOneAndUpdate(
    { assignmentId, studentId: student._id },
    {
      $set: {
        schoolId,
        content: input.content || '',
        attachments: input.attachments || [],
        submittedAt: now,
        status: isLate ? 'late' : 'submitted',
      },
    },
    { upsert: true, new: true, runValidators: true },
  )

  return submission
}

export async function listSubmissions(schoolId: string, assignmentId: string) {
  return Submission.find({ assignmentId, schoolId })
    .populate('studentId', 'admissionNo profile.firstName profile.lastName')
    .populate('gradedBy', 'profile.firstName profile.lastName')
    .sort({ submittedAt: -1 })
}

export async function getSubmission(
  schoolId: string,
  assignmentId: string,
  studentId: string,
) {
  return Submission.findOne({ assignmentId, studentId, schoolId })
    .populate('studentId', 'admissionNo profile.firstName profile.lastName')
    .populate('gradedBy', 'profile.firstName profile.lastName')
}

export async function gradeSubmission(
  schoolId: string,
  assignmentId: string,
  studentId: string,
  input: { marks: number; feedback?: string },
  teacherUserId: string,
  actorEmail = 'system',
) {
  const assignment = await Assignment.findOne({ _id: assignmentId, schoolId })
  if (!assignment) throw new Error('Assignment not found')

  // Validate marks don't exceed max
  if (input.marks > assignment.maxMarks) {
    throw new Error(`Marks cannot exceed max marks (${assignment.maxMarks})`)
  }

  const submission = await Submission.findOne({ assignmentId, studentId, schoolId })
  if (!submission) throw new Error('Submission not found')

  const before = toPlain(submission)

  // Get teacher record
  const Teacher = mongoose.model('Teacher')
  const teacher = await Teacher.findOne({ userId: teacherUserId, schoolId })

  submission.marks = input.marks
  submission.feedback = input.feedback || ''
  submission.status = 'graded'
  submission.gradedBy = teacher?._id
  submission.gradedAt = new Date()

  await submission.save()

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(teacherUserId),
    actorEmail,
    action: 'assignment:grade',
    entity: 'Submission',
    entityId: submission._id.toString(),
    before,
    after: toPlain(submission),
  })

  // TODO(feature/redis-bullmq): move this dispatch call onto a queue for async/retryable delivery
  // Notify guardians of grading
  try {
    const { Guardian } = await import('../../students/models/Guardian.js')
    const guardians = await Guardian.find({ schoolId, children: studentId })
    for (const guardian of guardians) {
      await dispatchNotification({
        schoolId,
        userId: (guardian.userId as unknown as mongoose.Types.ObjectId).toString(),
        type: 'assignment_graded',
        data: {
          assignmentTitle: assignment.title,
          marks: String(input.marks),
          maxMarks: String(assignment.maxMarks),
        },
      })
    }
  } catch {
    // Notification failure should not block grading
  }

  return submission
}
