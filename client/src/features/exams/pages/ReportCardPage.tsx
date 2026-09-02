import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../../services/api'

interface ReportCard {
  student: { admissionNo: string; profile: { firstName: string; lastName: string } }
  exam: { name: string; term: string }
  class: { grade: string; section: string }
  subjectMarks: { subjectId: { name: string; code: string }; marksObtained: number; maxMarks: number; grade: string; passed: boolean }[]
  totalMarks: number
  totalMaxMarks: number
  percentage: number
  overallGrade: string
  rank?: number
  attendancePercentage: number
  publishedAt: string
  pdfAvailable: boolean
}

export default function ReportCardPage() {
  const { id: examId, studentId } = useParams<{ id: string; studentId: string }>()
  const [report, setReport] = useState<ReportCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!examId || !studentId) return
    api.get(`/exams/${examId}/report-card/${studentId}`)
      .then((res) => setReport(res.data))
      .catch(() => setError('Failed to load report card'))
      .finally(() => setLoading(false))
  }, [examId, studentId])

  if (loading) return <div className="text-center text-secondary-500 py-8">Loading...</div>
  if (error) return <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600 m-6">{error}</div>
  if (!report) return <div className="text-center text-secondary-500 py-8">Report card not found.</div>

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-secondary-900">Report Card</h2>
        <div className="flex gap-2">
          <Link to={`/exams/${examId}/results`} className="text-sm text-primary-700 hover:underline">← Results</Link>
        </div>
      </div>

      {/* Header */}
      <div className="rounded-xl bg-white p-6 shadow-lg text-center">
        <h3 className="text-lg font-bold text-secondary-900">{report.exam.name} — {report.exam.term}</h3>
        <p className="text-sm text-secondary-500">
          {report.class.grade} - {report.class.section} | {report.student.profile.firstName} {report.student.profile.lastName}
        </p>
        <p className="text-xs text-secondary-400 mt-1">Admission No: {report.student.admissionNo}</p>
      </div>

      {/* Subject-wise marks */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <h4 className="text-sm font-bold text-secondary-900 mb-3 uppercase tracking-wide">Subject-wise Marks</h4>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-secondary-200">
            <tr>
              <th className="pb-2 font-medium text-secondary-700">Subject</th>
              <th className="pb-2 font-medium text-secondary-700 text-right">Marks</th>
              <th className="pb-2 font-medium text-secondary-700 text-right">Grade</th>
              <th className="pb-2 font-medium text-secondary-700 text-center">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-100">
            {report.subjectMarks.map((sm, i) => (
              <tr key={i}>
                <td className="py-2 text-secondary-900">{sm.subjectId?.name}</td>
                <td className="py-2 text-right text-secondary-600">{sm.marksObtained} / {sm.maxMarks}</td>
                <td className="py-2 text-right font-medium text-secondary-900">{sm.grade}</td>
                <td className="py-2 text-center">
                  <span className={`text-xs font-medium ${sm.passed ? 'text-green-600' : 'text-red-600'}`}>
                    {sm.passed ? 'Pass' : 'Fail'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl bg-white p-4 shadow-lg text-center">
          <p className="text-xs text-secondary-500 uppercase">Total</p>
          <p className="text-lg font-bold text-secondary-900">{report.totalMarks}/{report.totalMaxMarks}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-lg text-center">
          <p className="text-xs text-secondary-500 uppercase">Percentage</p>
          <p className={`text-lg font-bold ${report.percentage >= 50 ? 'text-green-600' : 'text-red-600'}`}>
            {report.percentage}%
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-lg text-center">
          <p className="text-xs text-secondary-500 uppercase">Grade</p>
          <p className="text-lg font-bold text-primary-700">{report.overallGrade}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-lg text-center">
          <p className="text-xs text-secondary-500 uppercase">Rank</p>
          <p className="text-lg font-bold text-secondary-900">#{report.rank || '—'}</p>
        </div>
      </div>

      {/* Attendance */}
      <div className="rounded-xl bg-white p-4 shadow-lg">
        <p className="text-xs text-secondary-500 uppercase mb-1">Attendance</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-4 rounded-full bg-secondary-100 overflow-hidden">
            <div className={`h-full rounded-full ${report.attendancePercentage >= 75 ? 'bg-green-500' : report.attendancePercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${report.attendancePercentage}%` }} />
          </div>
          <span className="text-sm font-medium text-secondary-900">{report.attendancePercentage}%</span>
        </div>
      </div>

      {/* PDF stub */}
      <div className="rounded-xl bg-secondary-50 p-4 text-center">
        <button disabled
          className="rounded-lg bg-secondary-300 px-6 py-2.5 text-sm font-medium text-secondary-600 cursor-not-allowed">
          Download PDF (Coming Soon)
        </button>
        <p className="text-xs text-secondary-400 mt-2">PDF export will be available once document generation pipeline is implemented.</p>
      </div>

      <p className="text-xs text-secondary-400 text-center">
        Published: {report.publishedAt ? new Date(report.publishedAt).toLocaleDateString() : '—'}
      </p>
    </div>
  )
}
