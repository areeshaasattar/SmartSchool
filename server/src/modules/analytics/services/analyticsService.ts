import mongoose from 'mongoose'
import { Student } from '../../students/models/Student.js'
import { Teacher } from '../../teachers/models/Teacher.js'
import { Attendance } from '../../attendance/models/Attendance.js'
import { FeeInvoice } from '../../finance/models/FeeInvoice.js'
import { Payment } from '../../finance/models/Payment.js'
import { Assignment } from '../../assignments/models/Assignment.js'
import { Submission } from '../../assignments/models/Submission.js'
import { Exam } from '../../exams/models/Exam.js'
import { Result } from '../../exams/models/Result.js'
import { LeaveRequest } from '../../leave/models/LeaveRequest.js'
import { TimetableSlot } from '../../timetables/models/TimetableSlot.js'
import { Guardian } from '../../students/models/Guardian.js'
import { getAttendanceSummary } from '../../attendance/services/attendanceService.js'
import { getCollectionReport } from '../../finance/services/financeService.js'

// ── Helpers ──────────────────────────────────────────────────────────

function getToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function getDayOfWeek(): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[new Date().getDay()]
}

// ── School Admin Overview ────────────────────────────────────────────

export async function getSchoolAdminOverview(schoolId: string) {
  const today = getToday()

  const [studentCount, teacherCount, attendanceToday, feeReport, pendingLeave] = await Promise.all([
    Student.countDocuments({ schoolId, status: 'active' }),
    Teacher.countDocuments({ schoolId, status: 'active' }),
    // Today's attendance: count present vs total
    (async () => {
      const classes = await (await import('../../classes/models/Class.js')).Class.find({ schoolId }).select('_id')
      const classIds = classes.map(c => c._id)
      if (classIds.length === 0) return { percentage: 0, present: 0, total: 0 }

      const present = await Attendance.countDocuments({
        schoolId,
        classId: { $in: classIds },
        date: { $gte: today, $lt: new Date(today.getTime() + 86400000) },
        status: { $in: ['present', 'late'] },
      })
      const total = await Student.countDocuments({ schoolId, status: 'active', classId: { $in: classIds } })
      return {
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
        present,
        total,
      }
    })(),
    getCollectionReport(schoolId, {}),
    LeaveRequest.countDocuments({ schoolId, status: 'pending' }),
  ])

  return {
    studentCount,
    teacherCount,
    attendanceToday: attendanceToday as { percentage: number; present: number; total: number },
    feeCollectionRate: (feeReport as { collectionRate: number }).collectionRate,
    totalOutstanding: (feeReport as { totalOutstanding: number }).totalOutstanding,
    pendingApprovals: pendingLeave,
  }
}

// ── Principal Overview ───────────────────────────────────────────────

export async function getPrincipalOverview(schoolId: string) {
  const [academicPerformance, feeReport, supportNeeded, teacherWorkload] = await Promise.all([
    // Academic performance by class: avg exam percentage
    (async () => {
      const classes = await (await import('../../classes/models/Class.js')).Class.find({ schoolId }).select('_id grade section')
      const results: Array<{ classId: string; grade: string; section: string; avgPercentage: number }> = []

      for (const cls of classes) {
        const classResults = await Result.find({
          schoolId,
          classId: cls._id,
          status: 'published',
        }).select('percentage')

        const avg = classResults.length > 0
          ? Math.round(classResults.reduce((sum: number, r: { percentage: number }) => sum + r.percentage, 0) / classResults.length)
          : 0

        results.push({
          classId: (cls._id as mongoose.Types.ObjectId).toString(),
          grade: cls.grade,
          section: cls.section,
          avgPercentage: avg,
        })
      }

      return results
    })(),

    getCollectionReport(schoolId, {}),

    // Support-needed students: low attendance or low exam scores
    (async () => {
      const students = await Student.find({ schoolId, status: 'active' })
        .select('profile.firstName profile.lastName classId')
        .limit(200)

      const supportNeeded: Array<{
        studentId: string
        name: string
        reason: string
        value: number
      }> = []

      for (const student of students.slice(0, 50)) { // Limit to avoid N+1
        const studentId = (student._id as mongoose.Types.ObjectId).toString()

        // Check attendance
        const attendance = await getAttendanceSummary(schoolId, { studentId })
        if ((attendance as { percentage: number }).percentage < 75) {
          supportNeeded.push({
            studentId,
            name: `${student.profile.firstName} ${student.profile.lastName}`,
            reason: 'Low attendance',
            value: (attendance as { percentage: number }).percentage,
          })
        }

        // Check exam scores
        const examResults = await Result.find({ schoolId, studentId }).select('percentage')
        if (examResults.length > 0) {
          const avg = examResults.reduce((sum: number, r: { percentage: number }) => sum + r.percentage, 0) / examResults.length
          if (avg < 40) {
            supportNeeded.push({
              studentId,
              name: `${student.profile.firstName} ${student.profile.lastName}`,
              reason: 'Low exam scores',
              value: Math.round(avg),
            })
          }
        }
      }

      return supportNeeded.slice(0, 10) // Top 10 support-needed
    })(),

    // Teacher workload: class/subject count per teacher
    Teacher.find({ schoolId, status: 'active' })
      .select('profile.firstName profile.lastName classes subjects departments')
      .then(teachers => teachers.map(t => ({
        teacherId: (t._id as mongoose.Types.ObjectId).toString(),
        name: `${t.profile.firstName} ${t.profile.lastName}`,
        classCount: t.classes?.length || 0,
        subjectCount: t.subjects?.length || 0,
        departmentCount: t.departments?.length || 0,
      }))),
  ])

  return {
    academicPerformance,
    feeCollectionRate: (feeReport as { collectionRate: number }).collectionRate,
    totalOutstanding: (feeReport as { totalOutstanding: number }).totalOutstanding,
    supportNeeded,
    teacherWorkload,
  }
}

// ── Teacher Overview ─────────────────────────────────────────────────

export async function getTeacherOverview(schoolId: string, teacherId: string) {
  const today = getDayOfWeek()
  const todayDate = getToday()

  const [todayTimetable, pendingGrading, attendanceStatus, recentMessages] = await Promise.all([
    // Today's timetable
    TimetableSlot.find({
      schoolId,
      teacherId,
      day: today,
    }).sort({ startTime: 1 })
      .populate('classId', 'grade section')
      .populate('subjectId', 'name'),

    // Pending grading: ungraded submissions for assignments by this teacher
    (async () => {
      const assignments = await Assignment.find({
        schoolId,
        teacherId,
        status: { $in: ['published', 'closed'] },
      }).select('_id')

      const assignmentIds = assignments.map(a => a._id)
      if (assignmentIds.length === 0) return 0

      return Submission.countDocuments({
        assignmentId: { $in: assignmentIds },
        status: { $in: ['submitted', 'late'] },
      })
    })(),

    // Today's attendance marking status: which classes have been marked
    (async () => {
      const teacher = await Teacher.findOne({ userId: teacherId, schoolId }).select('classes')
      if (!teacher || !teacher.classes?.length) return { marked: 0, total: 0, classes: [] as string[] }

      const classIds = teacher.classes
      const markedClasses = await Attendance.distinct('classId', {
        schoolId,
        classId: { $in: classIds },
        date: { $gte: todayDate, $lt: new Date(todayDate.getTime() + 86400000) },
      })

      return {
        marked: markedClasses.length,
        total: classIds.length,
        classes: markedClasses.map(c => c.toString()),
      }
    })(),

    // Recent messages count (last 7 days)
    (async () => {
      const { Conversation } = await import('../../communication/models/Conversation.js')
      const conversations = await Conversation.find({
        schoolId,
        participants: teacherId,
      }).select('_id')
      const convIds = conversations.map(c => c._id)
      if (convIds.length === 0) return 0

      const { Message } = await import('../../communication/models/Message.js')
      return Message.countDocuments({
        conversationId: { $in: convIds },
        createdAt: { $gte: new Date(Date.now() - 7 * 86400000) },
      })
    })(),
  ])

  return {
    todayTimetable,
    pendingGrading,
    attendanceStatus,
    recentMessages,
  }
}

// ── Accountant Overview ──────────────────────────────────────────────

export async function getAccountantOverview(schoolId: string) {
  const [feeReport, recentPayments] = await Promise.all([
    getCollectionReport(schoolId, {}),

    // Recent payments (last 30 days)
    Payment.find({ schoolId })
      .sort({ paidAt: -1 })
      .limit(10)
      .populate('studentId', 'profile.firstName profile.lastName admissionNo')
      .select('amount method receiptNo paidAt'),
  ])

  const report = feeReport as {
    totalInvoiced: number
    totalCollected: number
    totalOutstanding: number
    collectionRate: number
    invoiceStats: { total: number; paid: number; partiallyPaid: number; pending: number; overdue: number }
  }

  return {
    collectionRate: report.collectionRate,
    totalInvoiced: report.totalInvoiced,
    totalCollected: report.totalCollected,
    totalOutstanding: report.totalOutstanding,
    invoiceStats: report.invoiceStats,
    recentPayments,
  }
}

// ── Student Overview ─────────────────────────────────────────────────

export async function getStudentOverview(schoolId: string, studentId: string) {
  const today = getDayOfWeek()

  const [student, todayTimetable, upcomingExams, pendingAssignments, attendance, recentGrades] = await Promise.all([
    Student.findOne({ _id: studentId, schoolId })
      .select('profile.firstName profile.lastName classId admissionNo'),

    // Today's timetable (via class)
    (async () => {
      const s = await Student.findOne({ _id: studentId, schoolId }).select('classId')
      if (!s?.classId) return []
      return TimetableSlot.find({
        schoolId,
        classId: s.classId,
        day: today,
      }).sort({ startTime: 1 })
        .populate('subjectId', 'name')
        .populate('teacherId', 'profile.firstName profile.lastName')
    })(),

    // Upcoming exams for student's class
    (async () => {
      const s = await Student.findOne({ _id: studentId, schoolId }).select('classId')
      if (!s?.classId) return []
      return Exam.find({
        schoolId,
        classIds: s.classId,
        status: { $in: ['scheduled', 'ongoing'] },
      }).select('name term schedule.date schedule.subjectId')
        .sort({ 'schedule.date': 1 })
        .limit(5)
    })(),

    // Pending assignments for student's class
    (async () => {
      const s = await Student.findOne({ _id: studentId, schoolId }).select('classId')
      if (!s?.classId) return 0
      return Assignment.countDocuments({
        schoolId,
        classId: s.classId,
        status: 'published',
      })
    })(),

    // Attendance percentage
    getAttendanceSummary(schoolId, { studentId }),

    // Recent grades
    Result.find({ schoolId, studentId, status: 'published' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('examId', 'name term')
      .select('totalMarks percentage overallGrade rank'),
  ])

  return {
    student: student ? {
      name: `${student.profile.firstName} ${student.profile.lastName}`,
      admissionNo: student.admissionNo,
    } : null,
    todayTimetable,
    upcomingExams,
    pendingAssignments,
    attendance: (attendance as { percentage: number }).percentage,
    recentGrades,
  }
}

// ── Parent Overview (extends existing parent-portal) ─────────────────

export async function getParentOverview(schoolId: string, userId: string, studentId?: string) {
  // This composes the existing parent-portal dashboard with additional analytics
  const guardians = await Guardian.find({ userId, schoolId }).select('children')
  const childIds = guardians.flatMap(g => g.children.map(c => c.toString()))

  if (childIds.length === 0) {
    return { children: [], selectedChild: null }
  }

  const targetStudentId = studentId && childIds.includes(studentId) ? studentId : childIds[0]

  const [child, attendance, examResults] = await Promise.all([
    Student.findOne({ _id: targetStudentId, schoolId })
      .select('profile.firstName profile.lastName classId admissionNo'),
    getAttendanceSummary(schoolId, { studentId: targetStudentId }),
    Result.find({ schoolId, studentId: targetStudentId, status: 'published' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('examId', 'name term')
      .select('totalMarks percentage overallGrade rank'),
  ])

  return {
    children: childIds,
    selectedChild: targetStudentId,
    childInfo: child ? {
      name: `${child.profile.firstName} ${child.profile.lastName}`,
      admissionNo: child.admissionNo,
    } : null,
    attendance: (attendance as { percentage: number }).percentage,
    recentGrades: examResults,
  }
}
