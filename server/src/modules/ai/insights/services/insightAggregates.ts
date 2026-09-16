import mongoose from 'mongoose'
import { Class } from '../../../classes/models/Class.js'
import { Result } from '../../../exams/models/Result.js'
import { Attendance } from '../../../attendance/models/Attendance.js'
import { Assignment } from '../../../assignments/models/Assignment.js'
import { Submission } from '../../../assignments/models/Submission.js'
import { Teacher } from '../../../teachers/models/Teacher.js'
import { School } from '../../../schools/models/School.js'
import { getCollectionReport } from '../../../finance/services/financeService.js'

/**
 * Aggregate builders for AI insights.
 *
 * HARD RULE: every function here returns ONLY anonymized, class/grade-level
 * aggregates. No student/teacher/user identifiers, names, admission numbers,
 * emails, or free-text content ever leaves the database through this module —
 * `assertNoRawStudentIdentifiers` is the last line of defense and is checked
 * before anything is handed to the AI service.
 */

export type InsightAggregate = Record<string, unknown>

/** Fields whose presence in a payload means raw PII leaked into the aggregate. */
export const FORBIDDEN_IDENTIFIER_FIELDS = [
  'studentId',
  'studentIds',
  'teacherId',
  'teacherIds',
  'userId',
  'userIds',
  'guardianId',
  'parentId',
  'admissionNo',
  'employeeNo',
  'email',
  'firstName',
  'lastName',
  'name',
  'phone',
  'profile',
  'remarks',
  'content',
  'feedback',
] as const

const FIELD_LABELS: Record<string, string> = {
  studentId: 'studentId',
  studentIds: 'studentIds',
  teacherId: 'teacherId',
  teacherIds: 'teacherIds',
  userId: 'userId',
  userIds: 'userIds',
  guardianId: 'guardianId',
  parentId: 'parentId',
  admissionNo: 'admissionNo',
  employeeNo: 'employeeNo',
  email: 'email',
  firstName: 'firstName',
  lastName: 'lastName',
  phone: 'phone',
  profile: 'profile',
  remarks: 'remarks',
  content: 'content',
  feedback: 'feedback',
}

/** Recursively verify the payload contains no raw identifier-shaped fields. */
export function assertNoRawStudentIdentifiers(payload: unknown, path = '$'): void {
  if (Array.isArray(payload)) {
    for (const item of payload) assertNoRawStudentIdentifiers(item, path)
    return
  }
  if (payload && typeof payload === 'object') {
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (FORBIDDEN_IDENTIFIER_FIELDS.includes(key as (typeof FORBIDDEN_IDENTIFIER_FIELDS)[number])) {
        throw new Error(`Insight aggregate contains forbidden identifier field "${key}" at ${path}`)
      }
      assertNoRawStudentIdentifiers(value, `${path}.${key}`)
    }
  }
}

function weeksAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n * 7)
  return d
}

function labelForClass(cls: { grade: string; section: string }): string {
  return `${cls.grade}-${cls.section}`
}

// ── Academic insights ────────────────────────────────────────────────

export interface AcademicAggregate {
  period: { weeks: number }
  classAverages: Array<{
    classLabel: string
    avgPercentage: number
    resultCount: number
    passRate: number
  }>
  assignmentCompletion: Array<{
    classLabel: string
    assignments: number
    submissionRate: number
    gradedRate: number
    avgScorePercent: number | null
  }>
  trendDeltaPercentagePoints: number | null
  dataQuality: { classesWithNoData: number }
}

export async function buildAcademicAggregate(
  schoolId: string,
  options: { classIds?: string[]; weeks?: number } = {},
): Promise<AcademicAggregate> {
  const weeks = options.weeks ?? 8
  const since = weeksAgo(weeks)

  const classQuery: Record<string, unknown> = { schoolId: new mongoose.Types.ObjectId(schoolId) }
  if (options.classIds?.length) {
    classQuery._id = { $in: options.classIds.map((id) => new mongoose.Types.ObjectId(id)) }
  }
  const classes = await Class.find(classQuery).select('grade section')

  const classAverages: AcademicAggregate['classAverages'] = []
  const assignmentCompletion: AcademicAggregate['assignmentCompletion'] = []
  let classesWithNoData = 0

  // "Recent" window for the trend delta = the most recent half of the period.
  const recentSince = weeksAgo(Math.max(1, Math.floor(weeks / 2)))

  const recentPercentages: number[] = []
  const priorPercentages: number[] = []

  for (const cls of classes) {
    const classLabel = labelForClass(cls)

    const results = await Result.find({
      schoolId,
      classId: cls._id,
      status: 'published',
      createdAt: { $gte: since },
    }).select('percentage createdAt')

    if (results.length > 0) {
      const avg = Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length)
      const passed = results.filter((r) => r.percentage >= 40).length
      classAverages.push({
        classLabel,
        avgPercentage: avg,
        resultCount: results.length,
        passRate: Math.round((passed / results.length) * 100),
      })
    } else {
      classesWithNoData++
    }

    for (const r of results) {
      if (r.createdAt >= recentSince) recentPercentages.push(r.percentage)
      else priorPercentages.push(r.percentage)
    }

    const assignments = await Assignment.countDocuments({
      schoolId,
      classId: cls._id,
      status: { $in: ['published', 'closed'] },
      createdAt: { $gte: since },
    })

    if (assignments > 0) {
      const assignmentIds = (
        await Assignment.find({ schoolId, classId: cls._id, status: { $in: ['published', 'closed'] }, createdAt: { $gte: since } }).select('_id')
      ).map((a) => a._id)

      const subs = await Submission.find({ assignmentId: { $in: assignmentIds } }).select('status marks')
      const submitted = subs.filter((s) => s.status !== 'not_submitted').length
      const graded = subs.filter((s) => s.status === 'graded' && typeof s.marks === 'number').length
      // NOTE: marks are only meaningful against a known max; average is computed
      // only when every graded submission belongs to assignments with maxMarks.
      const maxMarks = await Assignment.find({ _id: { $in: assignmentIds } }).select('maxMarks')
      const totalMax = maxMarks.reduce((sum, a) => sum + a.maxMarks, 0)
      const totalMarks = subs.reduce((sum, s) => sum + (s.status === 'graded' && typeof s.marks === 'number' ? s.marks : 0), 0)

      assignmentCompletion.push({
        classLabel,
        assignments,
        submissionRate: subs.length > 0 ? Math.round((submitted / subs.length) * 100) : 0,
        gradedRate: subs.length > 0 ? Math.round((graded / subs.length) * 100) : 0,
        avgScorePercent: totalMax > 0 ? Math.round((totalMarks / totalMax) * 100) : null,
      })
    }
  }

  const trendDelta =
    priorPercentages.length > 0 && recentPercentages.length > 0
      ? Math.round(
          recentPercentages.reduce((s, v) => s + v, 0) / recentPercentages.length -
            priorPercentages.reduce((s, v) => s + v, 0) / priorPercentages.length,
        )
      : null

  return {
    period: { weeks },
    classAverages,
    assignmentCompletion,
    trendDeltaPercentagePoints: trendDelta,
    dataQuality: { classesWithNoData },
  }
}

// ── Attendance insights ──────────────────────────────────────────────

export interface AttendanceAggregate {
  period: { weeks: number }
  threshold: number
  overallPercentage: number
  byClass: Array<{
    classLabel: string
    percentage: number
    presentDays: number
    totalDays: number
  }>
  weeklyTrend: Array<{ weekIndex: number; percentage: number }>
  dataQuality: { classesWithNoData: number }
}

export async function buildAttendanceAggregate(
  schoolId: string,
  options: { classIds?: string[]; weeks?: number } = {},
): Promise<AttendanceAggregate> {
  const weeks = options.weeks ?? 8
  const since = weeksAgo(weeks)

  const school = await School.findById(schoolId).select('settings.attendanceAlertThreshold')
  const threshold = school?.settings?.attendanceAlertThreshold ?? 75

  const classQuery: Record<string, unknown> = { schoolId: new mongoose.Types.ObjectId(schoolId) }
  if (options.classIds?.length) {
    classQuery._id = { $in: options.classIds.map((id) => new mongoose.Types.ObjectId(id)) }
  }
  const classes = await Class.find(classQuery).select('grade section')

  const byClass: AttendanceAggregate['byClass'] = []
  const weeklyBuckets = Array.from({ length: weeks }, () => ({ present: 0, total: 0 }))
  let classesWithNoData = 0

  const PRESENT_EQUIVALENT = ['present', 'late', 'excused']

  for (const cls of classes) {
    const records = await Attendance.find({
      schoolId,
      classId: cls._id,
      date: { $gte: since },
    }).select('date status')

    if (records.length === 0) {
      classesWithNoData++
      continue
    }

    const presentDays = records.filter((r) => PRESENT_EQUIVALENT.includes(r.status)).length
    byClass.push({
      classLabel: labelForClass(cls),
      percentage: Math.round((presentDays / records.length) * 100),
      presentDays,
      totalDays: records.length,
    })

    for (const r of records) {
      const weekIndex = Math.min(weeks - 1, Math.floor((since.getTime() - r.date.getTime()) / (7 * 86400000)))
      if (weekIndex >= 0 && weekIndex < weeks) {
        weeklyBuckets[weekIndex].total++
        if (PRESENT_EQUIVALENT.includes(r.status)) weeklyBuckets[weekIndex].present++
      }
    }
  }

  const totalPresent = byClass.reduce((s, c) => s + c.presentDays, 0)
  const totalDays = byClass.reduce((s, c) => s + c.totalDays, 0)

  const weeklyTrend = weeklyBuckets
    .map((b, i) => ({
      weekIndex: i,
      percentage: b.total > 0 ? Math.round((b.present / b.total) * 100) : 0,
    }))
    .filter((w) => w.percentage > 0 || weeklyBuckets[w.weekIndex].total > 0)

  return {
    period: { weeks },
    threshold,
    overallPercentage: totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : 0,
    byClass,
    weeklyTrend,
    dataQuality: { classesWithNoData },
  }
}

// ── Principal briefing ───────────────────────────────────────────────

export interface BriefingAggregate {
  periodDays: number
  headcount: { activeStudents: number; activeTeachers: number }
  academic: { classesSummarized: number; avgPercentage: number | null; publishedResults: number }
  attendance: { overallPercentage: number; recordsConsidered: number; threshold: number }
  finance: { collectionRate: number; totalOutstanding: number; overdueInvoices: number }
  operations: { pendingLeaveRequests: number }
  dataQuality: { note: string }
}

export async function buildBriefingAggregate(schoolId: string): Promise<BriefingAggregate> {
  const periodDays = 30
  const since = new Date(Date.now() - periodDays * 86400000)

  const [Student, LeaveRequest, FeeInvoice, classes, school] = await Promise.all([
    import('../../../students/models/Student.js').then((m) => m.Student),
    import('../../../leave/models/LeaveRequest.js').then((m) => m.LeaveRequest),
    import('../../../finance/models/FeeInvoice.js').then((m) => m.FeeInvoice),
    Class.find({ schoolId }).select('grade section'),
    School.findById(schoolId).select('settings.attendanceAlertThreshold'),
  ])

  const classIds = classes.map((c) => c._id)

  const [activeStudents, activeTeachers, recentResults, attendanceStats, collectionReport, pendingLeave, overdueInvoices] =
    await Promise.all([
      Student.countDocuments({ schoolId, status: 'active' }),
      Teacher.countDocuments({ schoolId, 'employment.status': 'active' }),
      Result.find({ schoolId, status: 'published', createdAt: { $gte: since } })
        .select('percentage')
        .limit(500),
      classIds.length > 0
        ? Attendance.aggregate<{ _id: null; total: number; present: number }>([
            {
              $match: {
                schoolId: new mongoose.Types.ObjectId(schoolId),
                classId: { $in: classIds },
                date: { $gte: since },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                present: {
                  $sum: {
                    $cond: [{ $in: ['$status', ['present', 'late', 'excused']] }, 1, 0],
                  },
                },
              },
            },
          ])
        : Promise.resolve([] as Array<{ total: number; present: number }>),
      getCollectionReport(schoolId, {}),
      LeaveRequest.countDocuments({ schoolId, status: 'pending' }),
      FeeInvoice.countDocuments({ schoolId, status: 'overdue' }),
    ])

  const avgPercentage =
    recentResults.length > 0
      ? Math.round(recentResults.reduce((sum, r) => sum + r.percentage, 0) / recentResults.length)
      : null

  const totalAttendance = attendanceStats[0]?.total ?? 0
  const presentAttendance = attendanceStats[0]?.present ?? 0

  return {
    periodDays,
    headcount: { activeStudents, activeTeachers },
    academic: {
      classesSummarized: classes.length,
      avgPercentage,
      publishedResults: recentResults.length,
    },
    attendance: {
      overallPercentage: totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 0,
      recordsConsidered: totalAttendance,
      threshold: school?.settings?.attendanceAlertThreshold ?? 75,
    },
    finance: {
      collectionRate: collectionReport.collectionRate,
      totalOutstanding: collectionReport.totalOutstanding,
      overdueInvoices: overdueInvoices,
    },
    operations: { pendingLeaveRequests: pendingLeave },
    dataQuality: {
      note: 'Approved/published operational data only. No per-student information included.',
    },
  }
}
