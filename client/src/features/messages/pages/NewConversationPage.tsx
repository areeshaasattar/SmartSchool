import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../../services/api'

interface Teacher {
  _id: string
  userId: string
  profile: { firstName: string; lastName: string }
  employment?: { designation: string }
}

export default function NewConversationPage() {
  const navigate = useNavigate()
  const [contextType, setContextType] = useState<'general' | 'student'>('general')
  const [studentId, setStudentId] = useState('')
  const [targetUserId, setTargetUserId] = useState('')
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load teachers for student context
  useEffect(() => {
    if (contextType === 'student' && studentId) {
      api.get('/teachers')
        .then((res) => setTeachers(res.data))
        .catch(() => {})
    }
  }, [contextType, studentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetUserId) {
      setError('Select a conversation partner')
      return
    }

    setLoading(true)
    setError('')

    try {
      const payload: {
        participantIds: string[]
        contextType: string
        studentId?: string
      } = {
        participantIds: [targetUserId],
        contextType,
      }
      if (contextType === 'student' && studentId) {
        payload.studentId = studentId
      }

      const res = await api.post('/messages/conversations', payload)
      navigate(`/messages/${res.data._id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create conversation'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-secondary-900 mb-6">Start a Conversation</h1>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600 mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl shadow-sm p-6">
        {/* Context type */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">Conversation Type</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setContextType('general'); setStudentId('') }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                contextType === 'general'
                  ? 'bg-primary-600 text-white'
                  : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
              }`}
            >
              General
            </button>
            <button
              type="button"
              onClick={() => setContextType('student')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                contextType === 'student'
                  ? 'bg-primary-600 text-white'
                  : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
              }`}
            >
              Regarding a Student
            </button>
          </div>
        </div>

        {/* Student ID (if student context) */}
        {contextType === 'student' && (
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Student ID</label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="Enter student ID"
              required
            />
          </div>
        )}

        {/* Target user */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">
            {contextType === 'student' ? 'Select Teacher' : 'User ID to message'}
          </label>
          {contextType === 'student' && teachers.length > 0 ? (
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
              required
            >
              <option value="">Select a teacher...</option>
              {teachers.map((t) => (
                <option key={t.userId} value={t.userId}>
                  {t.profile.firstName} {t.profile.lastName}
                  {t.employment?.designation ? ` (${t.employment.designation})` : ''}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="Enter user ID"
              required
            />
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Start Conversation'}
        </button>
      </form>
    </div>
  )
}
