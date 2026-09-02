import mongoose from 'mongoose'
import { Guardian } from '../../students/models/Guardian.js'
import { Student } from '../../students/models/Student.js'
import { Attendance } from '../../attendance/models/Attendance.js'
import { Exam } from '../../exams/models/Exam.js'
import { Result } from '../../exams/models/Result.js'
import { Assignment } from '../../assignments/models/Assignment.js'
import { Submission } from '../../assignments/models/Submission.js'

// ── Children list ────────────────────────────────────────────────────

export async function getMyChildren(parentUserId: string, schoolId: string) {
  const guardians = await Guardian.find({ userId: parentUserId, schoolId })
  if (guardians.length === 0) return []

  const childIds = guardians.flatMap((g: { children: mongoose.Types.ObjectId[] }) => g.children)
  if (childIds.length === 0) return []

  return Student.find({ _id: { $in: childIds }, schoolId })
    .select('admissionNo profile status classId sectionId academicYearId')
}

// ── Dashboard aggregation ────────────────────────────────────────────

export async function getDashboard(parentUserId: string, schoolId: string, studentId: string) {
  // Verify parent owns this child
  const guardian = await Guardian.findOne({ userId: parentUserId, schoolId, children: studentId })
  if (!guardian) {
    throw new Error('Access denied: this student is not your child')
  }

  const student = await Student.findOne({ _id: studentId, schoolId })
    .select('admissionNo profile status classId sectionId academicYearId')
  if (!student) throw new Error('Student not found')

  const classId = student.classId?.toString()

  // ── Attendance percentage ───────────────────────────────────────
  let attendancePercentage = 0
  if (classId) {
    const totalDays = await Attendance.countDocuments({ schoolId, studentId, classId })
    const presentDays = await Attendance.countDocuments({
      schoolId, studentId, classId,
      status: { $in: ['present', 'late', 'excused'] },
    })
    attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
  }

  // ── Upcoming exams ─────────────────────────────────────────────
  const upcomingExams = classId
    ? await Exam.find({
        schoolId,
        classIds: classId,
        status: { $in: ['scheduled', 'ongoing'] },
      })
        .select('name term schedule date status')
        .sort({ 'schedule.date': 1 })
        .limit(5)
    : []

  // ── Recent published results ───────────────────────────────────
  const recentResults = await Result.find({
    schoolId,
    studentId,
    status: 'published',
  })
    .populate('examId', 'name term')
    .sort({ publishedAt: -1 })
    .limit(3)

  // ── Recent/pending assignments ─────────────────────────────────
  const recentAssignments = classId
    ? await Assignment.find({
        schoolId,
        classId,
        status: 'published',
      })
        .populate('subjectId', 'name code')
        .sort({ dueDate: -1 })
        .limit(5)
    : []

  // Attach submission status to each assignment
  const assignmentsWithStatus = await Promise.all(
    recentAssignments.map(async (a) => {
      const sub = await Submission.findOne({ assignmentId: a._id, studentId })
      return {
        _id: a._id,
        title: a.title,
        subject: a.subjectId,
        dueDate: a.dueDate,
        maxMarks: a.maxMarks,
        submissionStatus: sub?.status || 'not_submitted',
        marks: sub?.marks,
      }
    })
  )

  // ── Stubbed sections ───────────────────────────────────────────
  const fees = { balance: 0, currency: 'USD', lastPayment: null, upcomingDue: null }
  const messages = { unread: 0, recent: [] }
  const leave = { pending: 0, approved: 0, recent: [] }
  const announcements = { count: 0, recent: [] }

  return {
    student: {
      id: (student._id as mongoose.Types.ObjectId).toString(),
      admissionNo: student.admissionNo,
      profile: student.profile,
      status: student.status,
      classId: student.classId,
      sectionId: student.sectionId,
    },
    attendance: {
      percentage: attendancePercentage,
    },
    upcomingExams: upcomingExams.map((e) => ({
      _id: e._id,
      name: e.name,
      term: e.term,
      schedule: e.schedule,
      status: e.status,
    })),
    recentResults: recentResults.map((r) => ({
      _id: r._id,
      examName: (r.examId as unknown as { name: string })?.name || '',
      term: (r.examId as unknown as { term: string })?.term || '',
      totalMarks: r.totalMarks,
      totalMaxMarks: r.totalMaxMarks,
      percentage: r.percentage,
      overallGrade: r.overallGrade,
      rank: r.rank,
      publishedAt: r.publishedAt,
    })),
    recentAssignments: assignmentsWithStatus,
    fees,
    messages,
    leave,
    announcements,
  }
}
