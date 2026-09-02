import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../../services/api'

interface Result {
  _id: string
  studentId: { _id: string; admissionNo: string; profile: { firstName: string; lastName: string } }
  totalMarks: number
  totalMaxMarks: number
  percentage: number
  overallGrade: string
  rank?: number
  subjectMarks: { subjectId: { name: string }; marksObtained: number; maxMarks: number; grade: string; passed: boolean }[]
}

export default function ResultsViewPage() {
  const { id: examId } = useParams<{ id: string }>()
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadResults = useCallback(async () => {
    if (!examId) return
    setLoading(true)
    try {
      // Get exam details to find class IDs
      const examRes = await api.get(`/exams/${examId}`)
      const exam = examRes.data
      const classIds: string[] = exam.classIds?.map((c: { _id: string }) => c._id) || []

      // Load results for each class
      const allResults: Result[] = []
      for (const classId of classIds) {
        try {
          const res = await api.get(`/exams/${examId}/results/class/${classId}`)
          allResults.push(...res.data)
        } catch {
          // class may have no results yet
        }
      }
      setResults(allResults)
    } catch {
      setError('Failed to load results')
    } finally {
      setLoading(false)
    }
  }, [examId])

  useEffect(() => { loadResults() }, [loadResults])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-secondary-900">Exam Results</h2>
        <Link to="/exams" className="text-sm text-primary-700 hover:underline">← Back</Link>
      </div>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>}

      {loading ? (
        <div className="text-center text-secondary-500 py-8">Loading...</div>
      ) : results.length === 0 ? (
        <div className="text-center text-secondary-500 py-8">No results published yet.</div>
      ) : (
        <div className="rounded-xl bg-white shadow-lg overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-secondary-200 bg-secondary-50">
              <tr>
                <th className="px-4 py-3 font-medium text-secondary-700">Rank</th>
                <th className="px-4 py-3 font-medium text-secondary-700">Student</th>
                <th className="px-4 py-3 font-medium text-secondary-700">Total</th>
                <th className="px-4 py-3 font-medium text-secondary-700">Percentage</th>
                <th className="px-4 py-3 font-medium text-secondary-700">Grade</th>
                <th className="px-4 py-3 font-medium text-secondary-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {results.sort((a, b) => (a.rank || 999) - (b.rank || 999)).map((r) => (
                <tr key={r._id} className="hover:bg-secondary-50">
                  <td className="px-4 py-3 font-bold text-secondary-900">#{r.rank || '—'}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-secondary-900">
                      {r.studentId?.profile.firstName} {r.studentId?.profile.lastName}
                    </p>
                    <p className="text-xs text-secondary-500">{r.studentId?.admissionNo}</p>
                  </td>
                  <td className="px-4 py-3 text-secondary-600">
                    {r.totalMarks} / {r.totalMaxMarks}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${r.percentage >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                      {r.percentage}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-bold text-primary-800">
                      {r.overallGrade}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/exams/${examId}/report-card/${r.studentId?._id}`}
                      className="text-xs text-primary-700 hover:underline">Report Card</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
