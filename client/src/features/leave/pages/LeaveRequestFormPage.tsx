import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../../services/api'
import FileUploader from '../../documents/components/FileUploader'

interface Child {
  id: string
  profile: { firstName: string; lastName: string }
}

export default function LeaveRequestFormPage() {
  const navigate = useNavigate()
  const [children, setChildren] = useState<Child[]>([])
  const [requesterType, setRequesterType] = useState<'student' | 'teacher'>('student')
  const [requesterId, setRequesterId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [attachments, setAttachments] = useState<{ url: string; filename: string; mimeType: string }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Load children for parent role
  useEffect(() => {
    api.get('/parent-portal/children')
      .then((res) => setChildren(res.data.children || []))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await api.post('/leave', {
        requesterType,
        requesterId,
        startDate,
        endDate,
        reason,
        attachments,
      })
      navigate('/leave')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit leave request'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-secondary-900 mb-6">Request Leave</h1>

      {error && (
        <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600 mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl p-6 shadow-lg">
        {/* Requester Type */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Request for</label>
          <select
            value={requesterType}
            onChange={(e) => {
              setRequesterType(e.target.value as 'student' | 'teacher')
              setRequesterId('')
            }}
            className="w-full rounded-lg border border-secondary-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
          >
            <option value="student">My Child</option>
            <option value="teacher">Myself (Teacher)</option>
          </select>
        </div>

        {/* Requester Selection */}
        {requesterType === 'student' ? (
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Select Child</label>
            <select
              value={requesterId}
              onChange={(e) => setRequesterId(e.target.value)}
              required
              className="w-full rounded-lg border border-secondary-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
            >
              <option value="">Select a child</option>
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.profile.firstName} {child.profile.lastName}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full rounded-lg border border-secondary-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              min={startDate}
              className="w-full rounded-lg border border-secondary-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={4}
            className="w-full rounded-lg border border-secondary-300 px-4 py-2 focus:border-primary-500 focus:outline-none"
            placeholder="Please provide a reason for the leave request..."
          />
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Attachments (optional)</label>
          {attachments.length > 0 && (
            <div className="mb-2 space-y-1">
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-secondary-600">
                  <span>📎 {att.filename}</span>
                  <button type="button" onClick={() => setAttachments(attachments.filter((_, j) => j !== i))} className="text-red-500 hover:underline">Remove</button>
                </div>
              ))}
            </div>
          )}
          <FileUploader
            ownerType="student"
            ownerId={requesterId || 'pending'}
            type="attachment"
            onUploadComplete={(doc) => setAttachments(prev => [...prev, { url: doc.url, filename: doc.filename, mimeType: 'application/octet-stream' }])}
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/leave')}
            className="rounded-lg px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !requesterId || !startDate || !endDate || !reason}
            className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  )
}
