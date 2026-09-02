import mongoose from 'mongoose'
import { DisciplineRecord, IDisciplineRecord } from '../models/DisciplineRecord.js'
import { writeAuditLog } from '../../audit/models/AuditLog.js'

// ── Create discipline record ─────────────────────────────────────────

export async function createDisciplineRecord(
  schoolId: string,
  reportedBy: string,
  data: {
    studentId: string
    incidentDate: string
    category: 'behavior' | 'academic_integrity' | 'attendance' | 'other'
    description: string
    severity: 'minor' | 'moderate' | 'major'
    actionTaken?: string
  },
): Promise<IDisciplineRecord> {
  // Validate student belongs to this school
  const Student = (await import('../../students/models/Student.js')).Student
  const student = await Student.findOne({ _id: data.studentId, schoolId })
  if (!student) throw new Error('Student not found in this school')

  const record = await DisciplineRecord.create({
    schoolId,
    studentId: data.studentId,
    incidentDate: new Date(data.incidentDate),
    category: data.category,
    description: data.description,
    reportedBy,
    severity: data.severity,
    actionTaken: data.actionTaken,
    status: 'open',
  })

  // Audit log
  await writeAuditLog({
    schoolId,
    actorId: reportedBy,
    action: 'discipline:create',
    entity: 'DisciplineRecord',
    entityId: record._id.toString(),
    after: {
      studentId: data.studentId,
      category: data.category,
      severity: data.severity,
    },
  })

  return record
}

// ── List discipline records (visibility-scoped) ──────────────────────

export async function listDisciplineRecords(
  schoolId: string,
  userId: string,
  roles: string[],
  filters: {
    page?: number
    limit?: number
    status?: string
    category?: string
    severity?: string
    studentId?: string
  },
) {
  const { page = 1, limit = 20, status, category, severity, studentId } = filters

  const query: Record<string, unknown> = { schoolId }

  if (status) query.status = status
  if (category) query.category = category
  if (severity) query.severity = severity
  if (studentId) query.studentId = studentId

  // Visibility: school_admin/principal see all; teacher sees only their own reports
  const isAdmin = roles.some(r => ['super_admin', 'school_admin', 'principal'].includes(r))
  if (!isAdmin) {
    // Teacher only sees records they reported
    query.reportedBy = userId
  }

  // NEVER expose to parent/student
  const isVisibleToParent = roles.some(r => ['parent', 'student'].includes(r))
  if (isVisibleToParent) {
    throw new Error('Access denied: discipline records are not visible to parents/students')
  }

  const [records, total] = await Promise.all([
    DisciplineRecord.find(query)
      .sort({ incidentDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    DisciplineRecord.countDocuments(query),
  ])

  return {
    records,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }
}

// ── Get discipline record by ID (visibility-scoped) ──────────────────

export async function getDisciplineRecordById(
  schoolId: string,
  recordId: string,
  userId: string,
  roles: string[],
): Promise<IDisciplineRecord | null> {
  // Never expose to parent/student
  const isVisibleToParent = roles.some(r => ['parent', 'student'].includes(r))
  if (isVisibleToParent) return null

  const record = await DisciplineRecord.findOne({ _id: recordId, schoolId })
  if (!record) return null

  const isAdmin = roles.some(r => ['super_admin', 'school_admin', 'principal'].includes(r))
  if (isAdmin) return record

  // Teacher can only see records they reported
  if (record.reportedBy.toString() === userId) return record

  return null
}

// ── Update discipline record ─────────────────────────────────────────

export async function updateDisciplineRecord(
  schoolId: string,
  recordId: string,
  userId: string,
  roles: string[],
  data: {
    status?: 'open' | 'resolved'
    actionTaken?: string
    severity?: 'minor' | 'moderate' | 'major'
  },
): Promise<IDisciplineRecord> {
  const record = await DisciplineRecord.findOne({ _id: recordId, schoolId })
  if (!record) throw new Error('Discipline record not found')

  const isAdmin = roles.some(r => ['super_admin', 'school_admin', 'principal'].includes(r))
  const isReportingTeacher = record.reportedBy.toString() === userId

  if (!isAdmin && !isReportingTeacher) {
    throw new Error('Access denied: you can only update records you reported')
  }

  if (data.status) record.status = data.status
  if (data.actionTaken !== undefined) record.actionTaken = data.actionTaken
  if (data.severity) record.severity = data.severity

  await record.save()

  // Audit log
  await writeAuditLog({
    schoolId,
    actorId: userId,
    action: 'discipline:update',
    entity: 'DisciplineRecord',
    entityId: record._id.toString(),
    after: data,
  })

  return record
}

// ── Add follow-up note ───────────────────────────────────────────────

export async function addFollowUp(
  schoolId: string,
  recordId: string,
  userId: string,
  roles: string[],
  note: string,
): Promise<IDisciplineRecord> {
  const record = await DisciplineRecord.findOne({ _id: recordId, schoolId })
  if (!record) throw new Error('Discipline record not found')

  const isAdmin = roles.some(r => ['super_admin', 'school_admin', 'principal'].includes(r))
  const isReportingTeacher = record.reportedBy.toString() === userId

  if (!isAdmin && !isReportingTeacher) {
    throw new Error('Access denied: you can only add follow-ups to records you reported')
  }

  record.followUp.push({
    date: new Date(),
    note,
    recordedBy: new mongoose.Types.ObjectId(userId),
  } as any)

  await record.save()

  // Audit log
  await writeAuditLog({
    schoolId,
    actorId: userId,
    action: 'discipline:follow_up',
    entity: 'DisciplineRecord',
    entityId: record._id.toString(),
    after: { note },
  })

  return record
}
