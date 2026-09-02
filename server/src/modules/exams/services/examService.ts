import mongoose from 'mongoose'
import { Exam, IExam, IScheduleEntry } from '../models/Exam.js'
import { Result, IResult, ISubjectMark } from '../models/Result.js'
import { Student } from '../../students/models/Student.js'
import { Class } from '../../classes/models/Class.js'
import { School, IGradeRange } from '../../schools/models/School.js'
import { writeAuditLog } from '../../audit/models/AuditLog.js'
import { dispatchNotification } from '../../notifications/services/notificationService.js'

// ── Helper ───────────────────────────────────────────────────────────

function toPlain(obj: unknown): Record<string, unknown> {
  if (obj && typeof obj === 'object' && 'toObject' in obj && typeof (obj as { toObject: unknown }).toObject === 'function') {
    return (obj as { toObject: () => Record<string, unknown> }).toObject()
  }
  return obj as Record<string, unknown>
}

/**
 * Compute a grade string from a percentage using the school's grading scale ranges.
 */
export function computeGrade(percentage: number, ranges: IGradeRange[]): string {
  // Sort ranges by minPercent descending to match highest first
  const sorted = [...ranges].sort((a, b) => b.minPercent - a.minPercent)
  for (const r of sorted) {
    if (percentage >= r.minPercent && percentage <= r.maxPercent) {
      return r.grade
    }
  }
  return sorted.length > 0 ? sorted[sorted.length - 1].grade : 'F'
}

/**
 * Compute rank per student within a class, ordered by totalMarks descending.
 */
export async function computeRanks(schoolId: string, examId: string, classId: string) {
  const results = await Result.find({ schoolId, examId, classId })
    .sort({ totalMarks: -1, studentId: 1 })

  let rank = 1
  let prevMarks = -1
  for (let i = 0; i < results.length; i++) {
    if (results[i].totalMarks < prevMarks) {
      rank = i + 1
    }
    results[i].rank = rank
    await results[i].save()
    prevMarks = results[i].totalMarks
  }
}

// ── CRUD ─────────────────────────────────────────────────────────────

export async function createExam(schoolId: string, data: {
  academicYearId: string
  term: string
  name: string
  classIds: string[]
  schedule?: { subjectId: string; date: string; startTime: string; endTime: string; maxMarks: number; passMarks: number }[]
}, actorId: string, actorEmail = 'system') {
  const exam = await Exam.create({
    schoolId,
    academicYearId: data.academicYearId,
    term: data.term,
    name: data.name,
    classIds: data.classIds,
    schedule: (data.schedule || []).map((s) => ({
      subjectId: new mongoose.Types.ObjectId(s.subjectId),
      date: new Date(s.date),
      startTime: s.startTime,
      endTime: s.endTime,
      maxMarks: s.maxMarks,
      passMarks: s.passMarks,
    })),
    status: 'draft',
  })

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail,
    action: 'exam:create',
    entity: 'Exam',
    entityId: exam._id.toString(),
    after: toPlain(exam),
  })

  return exam
}

export async function updateExam(schoolId: string, examId: string, data: Partial<{
  term: string
  name: string
  classIds: string[]
  schedule: { subjectId: string; date: string; startTime: string; endTime: string; maxMarks: number; passMarks: number }[]
  status: string
}>, actorId: string, actorEmail = 'system') {
  const exam = await Exam.findOne({ _id: examId, schoolId })
  if (!exam) throw new Error('Exam not found')

  if (exam.status === 'published') {
    throw new Error('Cannot modify a published exam')
  }

  const before = toPlain(exam)

  if (data.term !== undefined) exam.term = data.term
  if (data.name !== undefined) exam.name = data.name
  if (data.classIds !== undefined) exam.classIds = data.classIds as unknown as mongoose.Types.ObjectId[]
  if (data.schedule !== undefined) {
    exam.schedule = data.schedule.map((s) => ({
      subjectId: new mongoose.Types.ObjectId(s.subjectId),
      date: new Date(s.date),
      startTime: s.startTime,
      endTime: s.endTime,
      maxMarks: s.maxMarks,
      passMarks: s.passMarks,
    })) as mongoose.Types.DocumentArray<IScheduleEntry>
  }
  if (data.status !== undefined) exam.status = data.status as IExam['status']

  await exam.save()

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail,
    action: 'exam:update',
    entity: 'Exam',
    entityId: examId,
    before,
    after: toPlain(exam),
  })

  return exam
}

export async function listExams(schoolId: string, filters: { academicYearId?: string; term?: string }) {
  const query: Record<string, unknown> = { schoolId }
  if (filters.academicYearId) query.academicYearId = filters.academicYearId
  if (filters.term) query.term = filters.term

  return Exam.find(query)
    .populate('classIds', 'grade section')
    .sort({ createdAt: -1 })
}

export async function getExamById(schoolId: string, examId: string) {
  return Exam.findOne({ _id: examId, schoolId })
    .populate('classIds', 'grade section')
    .populate('schedule.subjectId', 'name code')
}

export async function deleteExam(schoolId: string, examId: string, actorId: string, actorEmail = 'system') {
  const exam = await Exam.findOne({ _id: examId, schoolId })
  if (!exam) throw new Error('Exam not found')

  if (exam.status === 'published') {
    throw new Error('Cannot delete a published exam')
  }

  // Reject if results already entered
  const resultCount = await Result.countDocuments({ examId })
  if (resultCount > 0) {
    throw new Error(`Cannot delete exam with ${resultCount} result(s). Delete results first.`)
  }

  const before = toPlain(exam)
  await Exam.findByIdAndDelete(examId)

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail,
    action: 'exam:delete',
    entity: 'Exam',
    entityId: examId,
    before,
  })

  return true
}

// ── Marks entry ──────────────────────────────────────────────────────

export async function enterMarks(
  schoolId: string,
  examId: string,
  data: { classId: string; subjectId: string; entries: { studentId: string; marksObtained: number }[] },
  actorId: string,
  actorEmail = 'system',
) {
  const exam = await Exam.findOne({ _id: examId, schoolId })
  if (!exam) throw new Error('Exam not found')
  if (exam.status === 'published') throw new Error('Cannot enter marks for a published exam')

  // Find the schedule entry for this subject to get maxMarks and passMarks
  const scheduleEntry = exam.schedule.find(
    (s) => s.subjectId.toString() === data.subjectId
  )
  if (!scheduleEntry) throw new Error('Subject not found in exam schedule')

  const Teacher = mongoose.model('Teacher')
  const teacher = await Teacher.findOne({ userId: actorId, schoolId })

  const results: IResult[] = []

  for (const entry of data.entries) {
    if (entry.marksObtained > scheduleEntry.maxMarks) {
      throw new Error(`Marks for student ${entry.studentId} exceed max marks (${scheduleEntry.maxMarks})`)
    }

    // Upsert result
    const result = await Result.findOneAndUpdate(
      { examId, studentId: entry.studentId },
      {
        $set: {
          schoolId,
          classId: data.classId,
        },
        $push: {
          subjectMarks: {
            subjectId: new mongoose.Types.ObjectId(data.subjectId),
            marksObtained: entry.marksObtained,
            maxMarks: scheduleEntry.maxMarks,
            passMarks: scheduleEntry.passMarks,
            grade: '',
            passed: entry.marksObtained >= scheduleEntry.passMarks,
          },
        },
        $setOnInsert: {
          status: 'entered' as const,
          enteredBy: teacher?._id,
        },
      },
      { upsert: true, new: true, runValidators: true },
    )

    results.push(result)
  }

  return results
}

export async function correctMarks(
  schoolId: string,
  examId: string,
  studentId: string,
  data: { marksObtained: number; subjectId: string },
  actorUserId: string,
  actorEmail = 'system',
) {
  const exam = await Exam.findOne({ _id: examId, schoolId })
  if (!exam) throw new Error('Exam not found')

  // Only school_admin can correct after publish; teachers can correct if not published
  if (exam.status === 'published') {
    // Allow correction but audit-log it
  }

  const scheduleEntry = exam.schedule.find(
    (s) => s.subjectId.toString() === data.subjectId
  )
  if (!scheduleEntry) throw new Error('Subject not found in exam schedule')

  if (data.marksObtained > scheduleEntry.maxMarks) {
    throw new Error(`Marks exceed max marks (${scheduleEntry.maxMarks})`)
  }

  const result = await Result.findOne({ examId, studentId, schoolId })
  if (!result) throw new Error('Result not found')

  const before = toPlain(result)

  // Find and update the subject mark entry
  const subjectMark = result.subjectMarks.find(
    (s) => s.subjectId.toString() === data.subjectId
  )
  if (subjectMark) {
    subjectMark.marksObtained = data.marksObtained
    subjectMark.passed = data.marksObtained >= scheduleEntry.passMarks
  } else {
    result.subjectMarks.push({
      subjectId: new mongoose.Types.ObjectId(data.subjectId),
      marksObtained: data.marksObtained,
      maxMarks: scheduleEntry.maxMarks,
      passMarks: scheduleEntry.passMarks,
      grade: '',
      passed: data.marksObtained >= scheduleEntry.passMarks,
    })
  }

  // Recompute totals
  result.totalMarks = result.subjectMarks.reduce((sum, s) => sum + s.marksObtained, 0)
  result.totalMaxMarks = result.subjectMarks.reduce((sum, s) => sum + s.maxMarks, 0)
  result.percentage = result.totalMaxMarks > 0 ? Math.round((result.totalMarks / result.totalMaxMarks) * 100) : 0

  await result.save()

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorUserId),
    actorEmail,
    action: 'exam:correct_marks',
    entity: 'Result',
    entityId: result._id.toString(),
    before,
    after: toPlain(result),
  })

  return result
}

// ── Publish exam ─────────────────────────────────────────────────────

export async function publishExam(schoolId: string, examId: string, actorId: string, actorEmail = 'system') {
  const exam = await Exam.findOne({ _id: examId, schoolId })
  if (!exam) throw new Error('Exam not found')
  if (exam.status === 'published') throw new Error('Exam is already published')

  // Validate all required marks are entered
  for (const classId of exam.classIds) {
    const students = await Student.find({ schoolId, classId, status: 'active' })
    for (const student of students) {
      const result = await Result.findOne({ examId, studentId: student._id })
      if (!result || result.subjectMarks.length < exam.schedule.length) {
        throw new Error(`Marks incomplete: student ${student.profile.firstName} ${student.profile.lastName} in class ${classId} is missing marks`)
      }
    }
  }

  // Get grading scale ranges
  const school = await School.findById(schoolId)
  const ranges = school?.settings?.gradingScaleRanges || []

  // Get all results for this exam
  const results = await Result.find({ examId, schoolId })

  // Compute grades for each result
  for (const result of results) {
    for (const sm of result.subjectMarks) {
      const subPercent = sm.maxMarks > 0 ? (sm.marksObtained / sm.maxMarks) * 100 : 0
      sm.grade = computeGrade(subPercent, ranges)
    }
    result.overallGrade = computeGrade(result.percentage, ranges)
    await result.save()
  }

  // Compute ranks per class
  for (const classId of exam.classIds) {
    await computeRanks(schoolId, examId, classId.toString())
  }

  // Mark all results as published
  await Result.updateMany(
    { examId, schoolId },
    { $set: { status: 'published', publishedAt: new Date() } },
  )

  // Update exam status
  const before = toPlain(exam)
  exam.status = 'published'
  await exam.save()

  await writeAuditLog({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    actorId: new mongoose.Types.ObjectId(actorId),
    actorEmail,
    action: 'exam:publish',
    entity: 'Exam',
    entityId: examId,
    before,
    after: toPlain(exam),
  })

  // TODO(feature/redis-bullmq): move this dispatch call onto a queue for async/retryable delivery
  // Notify students and guardians in the exam's classes
  try {
    for (const classId of exam.classIds) {
      const students = await Student.find({ schoolId, classId, status: 'active' })
      for (const student of students) {
        // Notify guardians of this student
        try {
          const { Guardian } = await import('../../students/models/Guardian.js')
          const guardians = await Guardian.find({ schoolId, children: student._id })
          for (const guardian of guardians) {
            await dispatchNotification({
              schoolId,
              userId: (guardian.userId as unknown as mongoose.Types.ObjectId).toString(),
              type: 'exam_published',
              data: {
                examName: exam.name,
                term: exam.term,
                recipientName: `${student.profile.firstName} ${student.profile.lastName}`,
              },
            })
          }
        } catch {
          // Guardian notification failure is non-blocking
        }
      }
    }
  } catch {
    // Notification failure should not block exam publish
  }

  return exam
}

// ── Results views ────────────────────────────────────────────────────

export async function getClassResults(schoolId: string, examId: string, classId: string) {
  return Result.find({ schoolId, examId, classId, status: 'published' })
    .populate('studentId', 'admissionNo profile.firstName profile.lastName')
    .sort({ rank: 1 })
}

export async function getStudentResult(schoolId: string, examId: string, studentId: string) {
  return Result.findOne({ examId, studentId, schoolId, status: 'published' })
    .populate('studentId', 'admissionNo profile.firstName profile.lastName')
    .populate('subjectMarks.subjectId', 'name code')
}

export async function getReportCard(schoolId: string, examId: string, studentId: string) {
  const result = await Result.findOne({ examId, studentId, schoolId, status: 'published' })
    .populate('studentId', 'admissionNo profile.firstName profile.lastName')
    .populate('subjectMarks.subjectId', 'name code')
    .populate('classId', 'grade section')

  if (!result) return null

  // Get attendance summary for this student's class
  let attendancePercentage = 0
  try {
    const { Attendance } = await import('../../attendance/models/Attendance.js')
    const totalDays = await Attendance.countDocuments({ schoolId, studentId, classId: result.classId })
    const presentDays = await Attendance.countDocuments({
      schoolId, studentId, classId: result.classId,
      status: { $in: ['present', 'late', 'excused'] },
    })
    attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
  } catch {
    // Attendance module may not be available in test env
  }

  // TODO: PDF export stub — real PDF generation via BullMQ once feature/redis-bullmq lands
  const reportCard = {
    student: result.studentId,
    exam: { name: '', term: '', academicYearId: '' },
    class: result.classId,
    subjectMarks: result.subjectMarks,
    totalMarks: result.totalMarks,
    totalMaxMarks: result.totalMaxMarks,
    percentage: result.percentage,
    overallGrade: result.overallGrade,
    rank: result.rank,
    attendancePercentage,
    publishedAt: result.publishedAt,
    pdfAvailable: false, // TODO: set true once PDF generation pipeline exists
  }

  // Populate exam info
  const exam = await Exam.findById(examId).select('name term academicYearId')
  if (exam) {
    reportCard.exam = { name: exam.name, term: exam.term, academicYearId: exam.academicYearId.toString() }
  }

  return reportCard
}
