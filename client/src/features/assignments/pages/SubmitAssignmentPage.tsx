import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../../../services/api'
import FileUploader from '../../documents/components/FileUploader'

interface Assignment {
  _id: string
  title: string
  description: string
  subjectId: { name: string }
  classId: { grade: string; section: string }
  dueDate: string
  maxMarks: number
  attachments: { url: string; filename: string }[]
}

interface ExistingSubmission {
  content: string
  attachments: { url: string; filename: string }[]
  submittedAt: string
  status: string
}

export default function SubmitAssignmentPage() {
  const { id: assignmentId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [existing, setExisting] = useState<ExistingSubmission | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<{ url: string; filename: string }[]>([])

  useEffect(() => {
    if (!assignmentId) return
    Promise.all([
      api.get(`/assignments/${assignmentId}`),
    ]).then(([assignRes]) => {
      setAssignment(assignRes.data)
    }).catch(() => setError('Failed to load assignment'))

    // Try to load existing submission
    api.get('/students/me').then((studentRes) => {
      const student = studentRes.data.student || studentRes.data
      const studentId = student?._id || student?.id
      if (studentId && assignmentId) {
        api.get(`/assignments/${assignmentId}/submissions/${studentId}`)
          .then((subRes) => {
            const sub = subRes.data
            setExisting(sub)
            setContent(sub.content || '')
            setAttachments(sub.attachments || [])
          })
          .catch(() => { /* no existing submission */ })
          .finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    }).catch(() => setLoading(false))
  }, [assignmentId])

  const handleAttachmentUploaded = (doc: { _id: string; filename: string; url: string }) => {
    setAttachments(prev => [...prev, { url: doc.url, filename: doc.filename }])
  }

  const removeAttachment = (idx: number) => {
    setAttachments(attachments.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    if (!assignmentId) return
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await api.post(`/assignments/${assignmentId}/submit`, { content, attachments })
      setSuccess(existing ? 'Resubmission successful!' : 'Submission successful!')
      setTimeout(() => navigate('/assignments'), 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  const isPastDue = assignment ? new Date(assignment.dueDate) < new Date() : false

  if (loading) return <div className="text-center text-secondary-500 py-8">Loading...</div>

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-secondary-900">
          {existing ? 'Resubmit' : 'Submit'} Assignment
        </h2>
        <Link to="/assignments" className="text-sm text-primary-700 hover:underline">← Back</Link>
      </div>

      {/* Assignment info */}
      {assignment && (
        <div className="rounded-xl bg-white p-4 shadow-lg">
          <h3 className="font-semibold text-secondary-900">{assignment.title}</h3>
          <p className="text-sm text-secondary-500 mt-1">
            {assignment.subjectId?.name} | {assignment.classId?.grade} - {assignment.classId?.section}
          </p>
          <p className="text-sm text-secondary-500">
            Due: {new Date(assignment.dueDate).toLocaleString()} | Max Marks: {assignment.maxMarks}
          </p>
          <p className="text-sm text-secondary-600 mt-2 whitespace-pre-wrap">{assignment.description}</p>
          {assignment.attachments?.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-secondary-700">Teacher Attachments:</p>
              {assignment.attachments.map((att, i) => (
                <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary-600 hover:underline block">{att.filename}</a>
              ))}
            </div>
          )}
        </div>
      )}

      {isPastDue && (
        <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-700">
          ⚠️ This assignment is past due. Your submission will be marked as <strong>late</strong>.
        </div>
      )}

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>}
      {success && <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">{success}</div>}

      {/* Submission form */}
      <div className="rounded-xl bg-white p-6 shadow-lg space-y-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Your Answer</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-secondary-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
            placeholder="Write your answer or paste content here..."
          />
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Attachments</label>
          {attachments.map((att, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <a href={att.url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-primary-600 hover:underline truncate flex-1">{att.filename}</a>
              <button onClick={() => removeAttachment(i)} className="text-xs text-red-600 hover:underline">Remove</button>
            </div>
          ))}
          <FileUploader
            ownerType="assignment_submission"
            ownerId={assignmentId || ''}
            type="attachment"
            onUploadComplete={handleAttachmentUploaded}
            className="mt-2"
          />
        </div>

        <button onClick={handleSubmit} disabled={submitting}
          className="w-full rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
          {submitting ? 'Submitting...' : existing ? 'Resubmit' : 'Submit Assignment'}
        </button>
      </div>
    </div>
  )
}
