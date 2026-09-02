import mongoose from 'mongoose'
import { Class } from '../models/Class.js'
import { Subject } from '../models/Subject.js'
import { Room } from '../models/Room.js'
import { Department } from '../models/Department.js'
import { Student } from '../../students/models/Student.js'
import { Teacher } from '../../teachers/models/Teacher.js'
import { writeAuditLog } from '../../audit/models/AuditLog.js'

// ── Helper ───────────────────────────────────────────────────────────

function toPlain(obj: unknown): Record<string, unknown> {
  if (obj && typeof obj === 'object' && 'toObject' in obj && typeof (obj as { toObject: unknown }).toObject === 'function') {
    return (obj as { toObject: () => Record<string, unknown> }).toObject()
  }
  return obj as Record<string, unknown>
}

// ── Rooms ────────────────────────────────────────────────────────────

export async function createRoom(schoolId: string, data: { name: string; capacity: number }, actorEmail = 'system') {
  const room = await Room.create({ schoolId, ...data })
  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(),
    actorEmail,
    action: 'room:create',
    entity: 'Room',
    entityId: room._id.toString(),
    after: toPlain(room),
  })
  return room
}

export async function listRooms(schoolId: string) {
  return Room.find({ schoolId }).sort({ name: 1 })
}

// ── Departments ──────────────────────────────────────────────────────

export async function createDepartment(schoolId: string, data: { name: string }, actorEmail = 'system') {
  const dept = await Department.create({ schoolId, ...data })
  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(),
    actorEmail,
    action: 'department:create',
    entity: 'Department',
    entityId: dept._id.toString(),
    after: toPlain(dept),
  })
  return dept
}

export async function listDepartments(schoolId: string) {
  return Department.find({ schoolId }).sort({ name: 1 })
}

// ── Classes ──────────────────────────────────────────────────────────

export async function createClass(
  schoolId: string,
  data: {
    grade: string
    section: string
    roomId?: string
    academicYearId: string
    teacherIds?: string[]
    classTeacherId?: string
  },
  actorId: string,
  actorEmail = 'system',
) {
  // Check unique (grade, section, academicYearId) per school
  const existing = await Class.findOne({
    schoolId,
    grade: data.grade,
    section: data.section,
    academicYearId: data.academicYearId,
  })
  if (existing) {
    throw new Error(`Class ${data.grade}-${data.section} already exists for this academic year`)
  }

  const cls = await Class.create({
    schoolId,
    grade: data.grade,
    section: data.section,
    roomId: data.roomId || null,
    academicYearId: data.academicYearId,
    teacherIds: data.teacherIds || [],
    classTeacherId: data.classTeacherId || null,
  })

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail,
    action: 'class:create',
    entity: 'Class',
    entityId: cls._id.toString(),
    after: toPlain(cls),
  })

  return cls
}

export async function getClassById(schoolId: string, classId: string) {
  return Class.findOne({ _id: classId, schoolId })
    .populate('roomId', 'name capacity')
    .populate('teacherIds', 'employeeNo profile.firstName profile.lastName')
    .populate('classTeacherId', 'employeeNo profile.firstName profile.lastName')
    .populate('subjectIds', 'name code')
}

export async function listClasses(
  schoolId: string,
  filters: { academicYearId?: string; grade?: string; page?: number; limit?: number },
) {
  const { academicYearId, grade, page = 1, limit = 20 } = filters
  const query: Record<string, unknown> = { schoolId }
  if (academicYearId) query.academicYearId = academicYearId
  if (grade) query.grade = grade

  const total = await Class.countDocuments(query)
  const classes = await Class.find(query)
    .populate('roomId', 'name capacity')
    .populate('classTeacherId', 'profile.firstName profile.lastName')
    .sort({ grade: 1, section: 1 })
    .skip((page - 1) * limit)
    .limit(limit)

  return { classes, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function updateClass(
  schoolId: string,
  classId: string,
  data: Partial<{
    grade: string
    section: string
    roomId: string | null
    academicYearId: string
    teacherIds: string[]
    classTeacherId: string | null
  }>,
  actorId: string,
  actorEmail = 'system',
) {
  const cls = await Class.findOne({ _id: classId, schoolId })
  if (!cls) throw new Error('Class not found')

  const before = toPlain(cls)

  if (data.grade !== undefined) cls.grade = data.grade
  if (data.section !== undefined) cls.section = data.section
  if (data.roomId !== undefined) cls.roomId = data.roomId as unknown as mongoose.Types.ObjectId
  if (data.academicYearId !== undefined) cls.academicYearId = data.academicYearId as unknown as mongoose.Types.ObjectId
  if (data.teacherIds !== undefined) cls.teacherIds = data.teacherIds as unknown as mongoose.Types.ObjectId[]
  if (data.classTeacherId !== undefined) cls.classTeacherId = data.classTeacherId as unknown as mongoose.Types.ObjectId

  await cls.save()

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail,
    action: 'class:update',
    entity: 'Class',
    entityId: classId,
    before,
    after: toPlain(cls),
  })

  return cls
}

export async function deleteClass(schoolId: string, classId: string, actorId: string, actorEmail = 'system') {
  const cls = await Class.findOne({ _id: classId, schoolId })
  if (!cls) throw new Error('Class not found')

  // Reject if students are enrolled
  const enrolledCount = await Student.countDocuments({ classId, schoolId, status: 'active' })
  if (enrolledCount > 0) {
    throw new Error(`Cannot delete class with ${enrolledCount} enrolled students. Unenroll all students first.`)
  }

  const before = toPlain(cls)
  await Class.findByIdAndDelete(classId)

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail,
    action: 'class:delete',
    entity: 'Class',
    entityId: classId,
    before,
  })

  return true
}

// ── Enrollment ───────────────────────────────────────────────────────

export async function enrollStudent(schoolId: string, classId: string, studentId: string, actorId: string, actorEmail = 'system') {
  const cls = await Class.findOne({ _id: classId, schoolId })
  if (!cls) throw new Error('Class not found')

  const student = await Student.findOne({ _id: studentId, schoolId })
  if (!student) throw new Error('Student not found')

  // Validate same academic year
  if (student.academicYearId && student.academicYearId.toString() !== cls.academicYearId.toString()) {
    throw new Error('Student and class must be in the same academic year')
  }

  // Already enrolled?
  if (student.classId && student.classId.toString() === classId) {
    throw new Error('Student is already enrolled in this class')
  }

  const before = toPlain(student)

  student.classId = cls._id
  student.sectionId = cls._id // Section is implicit in the class
  if (!student.academicYearId) student.academicYearId = cls.academicYearId
  await student.save()

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail,
    action: 'enrollment:create',
    entity: 'Student',
    entityId: studentId,
    before,
    after: toPlain(student),
  })

  return student
}

export async function unenrollStudent(schoolId: string, classId: string, studentId: string, actorId: string, actorEmail = 'system') {
  const student = await Student.findOne({ _id: studentId, schoolId, classId })
  if (!student) throw new Error('Student not found in this class')

  const before = toPlain(student)

  student.classId = null
  student.sectionId = null
  await student.save()

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail,
    action: 'enrollment:delete',
    entity: 'Student',
    entityId: studentId,
    before,
    after: toPlain(student),
  })

  return student
}

export async function getClassRoster(schoolId: string, classId: string) {
  const cls = await Class.findOne({ _id: classId, schoolId })
  if (!cls) throw new Error('Class not found')

  const students = await Student.find({
    schoolId,
    classId,
    status: 'active',
  })
    .select('admissionNo profile.firstName profile.lastName profile.gender')
    .sort({ admissionNo: 1 })

  return { class: cls, students }
}

// ── Subject-Teacher Assignment ───────────────────────────────────────

export async function assignSubjectToClass(
  schoolId: string,
  classId: string,
  subjectId: string,
  teacherId: string,
  actorId: string,
  actorEmail = 'system',
) {
  const cls = await Class.findOne({ _id: classId, schoolId })
  if (!cls) throw new Error('Class not found')

  const subject = await Subject.findOne({ _id: subjectId, schoolId })
  if (!subject) throw new Error('Subject not found')

  const teacher = await Teacher.findOne({ _id: teacherId, schoolId })
  if (!teacher) throw new Error('Teacher not found')

  const before = toPlain(cls)

  // Add subject to class if not already there
  const subjectObjectId = new mongoose.Types.ObjectId(subjectId)
  if (!cls.subjectIds.some((id) => id.equals(subjectObjectId))) {
    cls.subjectIds.push(subjectObjectId)
  }

  // Add teacher to class teachers if not already there
  const teacherObjectId = new mongoose.Types.ObjectId(teacherId)
  if (!cls.teacherIds.some((id) => id.equals(teacherObjectId))) {
    cls.teacherIds.push(teacherObjectId)
  }

  await cls.save()

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail,
    action: 'class:assign_subject',
    entity: 'Class',
    entityId: classId,
    before,
    after: toPlain(cls),
  })

  return cls
}

// ── Subjects ─────────────────────────────────────────────────────────

export async function createSubject(
  schoolId: string,
  data: { name: string; code: string; gradeMappings?: { grade: string }[] },
  actorId: string,
  actorEmail = 'system',
) {
  const existing = await Subject.findOne({ schoolId, code: data.code })
  if (existing) throw new Error(`Subject with code ${data.code} already exists`)

  const subject = await Subject.create({ schoolId, ...data })

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail,
    action: 'subject:create',
    entity: 'Subject',
    entityId: subject._id.toString(),
    after: toPlain(subject),
  })

  return subject
}

export async function listSubjects(schoolId: string) {
  return Subject.find({ schoolId }).sort({ name: 1 })
}

export async function getSubjectById(schoolId: string, subjectId: string) {
  return Subject.findOne({ _id: subjectId, schoolId })
}

export async function updateSubject(
  schoolId: string,
  subjectId: string,
  data: Partial<{ name: string; code: string; gradeMappings: { grade: string }[] }>,
  actorId: string,
  actorEmail = 'system',
) {
  const subject = await Subject.findOne({ _id: subjectId, schoolId })
  if (!subject) throw new Error('Subject not found')

  const before = toPlain(subject)

  if (data.name !== undefined) subject.name = data.name
  if (data.code !== undefined) subject.code = data.code
  if (data.gradeMappings !== undefined) subject.gradeMappings = data.gradeMappings

  await subject.save()

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail,
    action: 'subject:update',
    entity: 'Subject',
    entityId: subjectId,
    before,
    after: toPlain(subject),
  })

  return subject
}

export async function deleteSubject(schoolId: string, subjectId: string, actorId: string, actorEmail = 'system') {
  const subject = await Subject.findOne({ _id: subjectId, schoolId })
  if (!subject) throw new Error('Subject not found')

  // Check if any class references this subject
  const classUsing = await Class.findOne({ schoolId, subjectIds: subjectId })
  if (classUsing) {
    throw new Error('Cannot delete subject that is assigned to a class. Remove the assignment first.')
  }

  const before = toPlain(subject)
  await Subject.findByIdAndDelete(subjectId)

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail,
    action: 'subject:delete',
    entity: 'Subject',
    entityId: subjectId,
    before,
  })

  return true
}
