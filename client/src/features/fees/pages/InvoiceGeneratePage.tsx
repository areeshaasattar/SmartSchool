import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../../services/api'

export default function InvoiceGeneratePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [feeStructureId, setFeeStructureId] = useState(searchParams.get('structureId') || '')
  const [classId, setClassId] = useState('')
  const [studentIds, setStudentIds] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ count: number } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feeStructureId) {
      setError('Fee structure ID is required')
      return
    }
    if (!classId && !studentIds) {
      setError('Provide either a class ID or student IDs')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const payload: Record<string, unknown> = { feeStructureId }
      if (studentIds) {
        payload.studentIds = studentIds.split(',').map((s) => s.trim()).filter(Boolean)
      } else {
        payload.classId = classId
      }
      const res = await api.post('/fees/invoices/generate', payload)
      setResult(res.data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate invoices'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-secondary-900 mb-6">Generate Invoices</h1>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600 mb-4">{error}</div>}

      {result ? (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h2 className="text-lg font-semibold text-secondary-900 mb-2">Invoices Generated</h2>
          <p className="text-secondary-500 mb-4">{result.count} invoice(s) created successfully</p>
          <button onClick={() => navigate('/fees/invoices')}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            View Invoices
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl shadow-sm p-6">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Fee Structure ID *</label>
            <input type="text" value={feeStructureId} onChange={(e) => setFeeStructureId(e.target.value)}
              className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm" required />
          </div>
          <div className="text-xs text-secondary-400 text-center">— Provide class ID OR student IDs —</div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Class ID (for bulk generation)</label>
            <input type="text" value={classId} onChange={(e) => setClassId(e.target.value)}
              className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm" placeholder="Class ID" />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Student IDs (comma-separated)</label>
            <input type="text" value={studentIds} onChange={(e) => setStudentIds(e.target.value)}
              className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm" placeholder="id1, id2, id3" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
            {loading ? 'Generating...' : 'Generate Invoices'}
          </button>
        </form>
      )}
    </div>
  )
}
