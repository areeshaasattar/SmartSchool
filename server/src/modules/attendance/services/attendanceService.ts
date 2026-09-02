import mongoose from 'mongoose'
import { Attendance, IAttendance, AttendanceStatus } from '../models/Attendance.js'
import { Class } from '../../classes/models/Class.js'
import { Student } from '../../students/models/Student.js'
import { School } from '../../schools/models/School.js'
import { writeAuditLog } from '../../audit/models/AuditLog.js'
import { dispatchNotification } from '../../notifications/services/notificationService.js'

// ── Helper ───────────────────────────────────────────────────────────

function toPlain(obj: unknown): Record<string, unknown> {
  if (obj && typeof obj === 'object' && 'toObject' in obj && typeof (obj as { toObject: unknown }).toObject === 'function') {
    return (obj as { toObject: () => Record<string, unknown> }).toObject()
  }
  return obj as Record<string, unknown>
}

// ── Teacher-class assignment check ───────────────────────────────────

export async function isTeacherAssignedToClass(teacherId: string, classId: string, schoolId: string): Promise<boolean> {
  const cls = await Class.findOne({ _id: classId, schoolId })
  if (!cls) return false

  const teacherObjectId = new mongoose.Types.ObjectId(teacherId)

  // Check classTeacherId
  if (cls.classTeacherId && cls.classTeacherId.equals(teacherObjectId)) return true

  // Check teacherIds array
  if (cls.teacherIds.some((id) => id.equals(teacherObjectId))) return true

  return false
}

// ── Threshold check & alert trigger ───────────────────────────────────

interface PendingNotification {
  type: 'attendance_alert'
  schoolId: string
  studentId: string
  classId: string
  attendancePercentage: number
  threshold: number
  triggeredAt: Date
}

/**
 * Check a student's rolling attendance percentage and trigger an alert if below threshold.
 * Stubbed notification delivery — TODO: replace with BullMQ job dispatch once feature/redis-bullmq lands.
 */
export async function checkAttendanceThreshold(
  schoolId: string,
  studentId: string,
  classId: string,
): Promise<PendingNotification | null> {
  // Get the school's alert threshold (default 75%)
  const school = await School.findById(schoolId)
  const threshold = school?.settings?.attendanceAlertThreshold ?? 75

  // Calculate rolling attendance over the last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const records = await Attendance.find({
    schoolId,
    studentId,
    classId,
    date: { $gte: thirtyDaysAgo },
  })

  if (records.length === 0) return null

  const totalDays = records.length
  const presentDays = records.filter((r) => r.status === 'present' || r.status === 'late' || r.status === 'excused').length
  const percentage = Math.round((presentDays / totalDays) * 100)

  if (percentage < threshold) {
    const notification: PendingNotification = {
      type: 'attendance_alert',
      schoolId,
      studentId,
      classId,
      attendancePercentage: percentage,
      threshold,
      triggeredAt: new Date(),
    }

    // TODO(feature/redis-bullmq): move this dispatch call onto a queue for async/retryable delivery
    // Notify guardians of this student
    try {
      const { Guardian } = await import('../../students/models/Guardian.js')
      const guardians = await Guardian.find({ schoolId, children: studentId })
      for (const guardian of guardians) {
        await dispatchNotification({
          schoolId,
          userId: (guardian.userId as unknown as import('mongoose').Types.ObjectId).toString(),
          type: 'attendance_alert',
          data: {
            studentId,
            classId,
            percentage: String(percentage),
            threshold: String(threshold),
            studentName: studentId,
          },
        })
      }
    } catch {
      // Notification failure should not block attendance logic
    }
    return notification
  }

  return null
}

// ── Mark attendance (bulk) ────────────────────────────────────────────

export interface MarkAttendanceInput {
  classId: string
  date: string
  records: { studentId: string; status: AttendanceStatus; remarks?: string }[]
}

export async function markAttendance(
  schoolId: string,
  input: MarkAttendanceInput,
  markedByUserId: string,
  actorEmail = 'system',
) {
  const classId = input.classId
  const date = new Date(input.date)

  // Reject future dates
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  if (date > today) {
    throw new Error('Cannot mark attendance for a future date')
  }

  // Verify class exists
  const cls = await Class.findOne({ _id: classId, schoolId })
  if (!cls) throw new Error('Class not found')

  // Get teacher record to use as markedBy
  const Teacher = mongoose.model('Teacher')
  const teacher = await Teacher.findOne({ userId: markedByUserId, schoolId })
  if (!teacher) throw new Error('Teacher profile not found')

  const results: IAttendance[] = []
  const alerts: PendingNotification[] = []

  for (const record of input.records) {
    const student = await Student.findOne({ _id: record.studentId, schoolId, classId })
    if (!student) continue

    // Upsert: if exists for (studentId, classId, date), update; otherwise create
    const attendance = await Attendance.findOneAndUpdate(
      {
        schoolId,
        studentId: record.studentId,
        classId,
        date,
      },
      {
        $set: {
          status: record.status,
          remarks: record.remarks || '',
          markedBy: teacher._id,
          academicYearId: cls.academicYearId,
        },
      },
      { upsert: true, new: true, runValidators: true },
    )

    results.push(attendance)

    // Check threshold for absent records
    if (record.status === 'absent') {
      const alert = await checkAttendanceThreshold(schoolId, record.studentId, classId)
      if (alert) alerts.push(alert)
    }
  }

  return { records: results, alerts }
}

// ── Update single attendance record ───────────────────────────────────

export interface UpdateAttendanceInput {
  status?: AttendanceStatus
  remarks?: string
}

export async function updateAttendance(
  schoolId: string,
  attendanceId: string,
  input: UpdateAttendanceInput,
  actorUserId: string,
  actorEmail = 'system',
) {
  const attendance = await Attendance.findOne({ _id: attendanceId, schoolId })
  if (!attendance) throw new Error('Attendance record not found')

  const before = toPlain(attendance)

  if (input.status !== undefined) attendance.status = input.status
  if (input.remarks !== undefined) attendance.remarks = input.remarks

  await attendance.save()

  // Audit log on corrections (not routine marking)
  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorUserId),
    actorEmail,
    action: 'attendance:update',
    entity: 'Attendance',
    entityId: attendanceId,
    before,
    after: toPlain(attendance),
  })

  return attendance
}

// ── Class attendance view ─────────────────────────────────────────────

export async function getClassAttendance(
  schoolId: string,
  classId: string,
  filters: { startDate?: string; endDate?: string; page?: number; limit?: number },
) {
  const { startDate, endDate, page = 1, limit = 50 } = filters

  const query: Record<string, unknown> = { schoolId, classId }
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {}
    if (startDate) dateFilter.$gte = new Date(startDate)
    if (endDate) dateFilter.$lte = new Date(endDate)
    query.date = dateFilter
  }

  const total = await Attendance.countDocuments(query)
  const records = await Attendance.find(query)
    .populate('studentId', 'admissionNo profile.firstName profile.lastName')
    .populate('markedBy', 'profile.firstName profile.lastName')
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(limit)

  return { records, total, page, limit, totalPages: Math.ceil(total / limit) }
}

// ── Student attendance history ────────────────────────────────────────

export async function getStudentAttendance(
  schoolId: string,
  studentId: string,
  filters: { startDate?: string; endDate?: string; page?: number; limit?: number },
) {
  const { startDate, endDate, page = 1, limit = 50 } = filters

  const query: Record<string, unknown> = { schoolId, studentId }
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {}
    if (startDate) dateFilter.$gte = new Date(startDate)
    if (endDate) dateFilter.$lte = new Date(endDate)
    query.date = dateFilter
  }

  const total = await Attendance.countDocuments(query)
  const records = await Attendance.find(query)
    .populate('classId', 'grade section')
    .populate('markedBy', 'profile.firstName profile.lastName')
    .sort({ date: -1 })
    .skip((page - 1) * limit)
    .limit(limit)

  return { records, total, page, limit, totalPages: Math.ceil(total / limit) }
}

// ── Attendance summary ────────────────────────────────────────────────

export async function getAttendanceSummary(
  schoolId: string,
  filters: { classId?: string; studentId?: string; startDate?: string; endDate?: string },
) {
  const { classId, studentId, startDate, endDate } = filters

  const match: Record<string, unknown> = { schoolId }
  if (classId) match.classId = new mongoose.Types.ObjectId(classId)
  if (studentId) match.studentId = new mongoose.Types.ObjectId(studentId)
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {}
    if (startDate) dateFilter.$gte = new Date(startDate)
    if (endDate) dateFilter.$lte = new Date(endDate)
    match.date = dateFilter
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]

  const statusCounts = await Attendance.aggregate(pipeline)

  const summary: Record<string, number> = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    half_day: 0,
  }

  let totalRecords = 0
  for (const item of statusCounts) {
    summary[item._id] = item.count
    totalRecords += item.count
  }

  const presentEquivalent = summary.present + summary.late + summary.excused
  const percentage = totalRecords > 0 ? Math.round((presentEquivalent / totalRecords) * 100) : 0

  return {
    summary,
    totalRecords,
    percentage,
    classId: classId || null,
    studentId: studentId || null,
  }
}
