import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../store'
import api from '../../../services/api'
import RequireRole from '../../../app/components/RequireRole'

interface ClassOption {
  _id: string
  grade: string
  section: string
  classTeacherId?: { _id: string; profile: { firstName: string; lastName: string } }
  teacherIds?: { _id: string }[]
}

interface Student {
  _id: string
  admissionNo: string
  profile: { firstName: string; lastName: string }
}

interface AttendanceRecord {
  studentId: string
  status: 'present' | 'absent' | 'late' | 'excused' | 'half_day'
  remarks: string
}

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'absent', label: 'Absent', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'late', label: 'Late', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'excused', label: 'Excused', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'half_day', label: 'Half Day', color: 'bg-purple-100 text-purple-700 border-purple-300' },
] as const

export default function MarkAttendancePage() {
  const user = useSelector((state: RootState) => state.auth.user)

  const [classes, setClasses] = useState<ClassOption[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [students, setStudents] = useState<Student[]>([])
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [alerts, setAlerts] = useState<unknown[]>([])

  // Load classes assigned to this teacher
  useEffect(() => {
    api.get('/classes?limit=100').then((res) => {
      const data = res.data
      const classList = data.classes || data
      // Filter to classes where teacher is assigned
      const myClasses = classList.filter((c: ClassOption) => {
        if (user?.roles.includes('school_admin') || user?.roles.includes('super_admin')) return true
        if (c.classTeacherId?._id) return true
        return c.teacherIds?.some((t: { _id: string }) => t._id === user?.id)
      })
      setClasses(myClasses)
    }).catch(() => { /* silent */ })
  }, [user])

  // Load roster when class is selected
  const loadRoster = useCallback(async () => {
    if (!selectedClassId) return
    setLoading(true)
    setError('')
    try {
      const res = await api.get(`/classes/${selectedClassId}/roster`)
      const data = res.data
      const rosterStudents: Student[] = data.students || []
      setStudents(rosterStudents)

      // Initialize records with 'present' as default
      const initial: Record<string, AttendanceRecord> = {}
      rosterStudents.forEach((s) => {
        initial[s._id] = { studentId: s._id, status: 'present', remarks: '' }
      })
      setRecords(initial)
    } catch {
      setError('Failed to load class roster')
    } finally {
      setLoading(false)
    }
  }, [selectedClassId])

  useEffect(() => {
    loadRoster()
  }, [loadRoster])

  const updateRecord = (studentId: string, field: 'status' | 'remarks', value: string) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }))
  }

  const setAllStatus = (status: AttendanceRecord['status']) => {
    const updated: Record<string, AttendanceRecord> = {}
    Object.keys(records).forEach((studentId) => {
      updated[studentId] = { ...records[studentId], status }
    })
    setRecords(updated)
  }

  const handleSubmit = async () => {
    if (!selectedClassId || Object.keys(records).length === 0) return
    setSaving(true)
    setError('')
    setSuccess('')
    setAlerts([])

    try {
      const payload = {
        classId: selectedClassId,
        date,
        records: Object.values(records),
      }
      const res = await api.post('/attendance/mark', payload)
      const data = res.data
      setSuccess(`Attendance marked for ${data.records} students`)
      if (data.alerts?.length > 0) {
        setAlerts(data.alerts)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to mark attendance'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-secondary-900">Mark Attendance</h2>

      {error && (
        <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">{success}</div>
      )}

      {alerts.length > 0 && (
        <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-700">
          <p className="font-medium">⚠️ Attendance Alerts Triggered</p>
          {alerts.map((a: unknown, i: number) => {
            const alert = a as { studentId: string; attendancePercentage: number; threshold: number }
            return (
              <p key={i} className="mt-1">
                Student {alert.studentId}: {alert.attendancePercentage}% attendance (threshold: {alert.threshold}%)
              </p>
            )
          })}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Class *</label>
          <select
            value={selectedClassId}
            onChange={(e) => { setSelectedClassId(e.target.value); setRecords({}); setStudents([]) }}
            className="rounded-lg border border-secondary-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Select a class</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                {c.grade} - {c.section}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Date *</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="rounded-lg border border-secondary-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-end gap-2">
          <RequireRole roles={['school_admin', 'principal', 'teacher']}>
            <button
              onClick={() => setAllStatus('present')}
              className="rounded-lg border border-green-300 bg-green-50 px-3 py-2.5 text-sm font-medium text-green-700 hover:bg-green-100"
            >
              All Present
            </button>
            <button
              onClick={() => setAllStatus('absent')}
              className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              All Absent
            </button>
          </RequireRole>
        </div>
      </div>

      {/* Roster */}
      {loading && <div className="text-center text-secondary-500 py-8">Loading roster...</div>}

      {!loading && students.length > 0 && (
        <div className="rounded-xl bg-white shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-secondary-200 bg-secondary-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-secondary-700">Admission No</th>
                  <th className="px-4 py-3 font-medium text-secondary-700">Name</th>
                  <th className="px-4 py-3 font-medium text-secondary-700">Status</th>
                  <th className="px-4 py-3 font-medium text-secondary-700">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {students.map((s) => {
                  const record = records[s._id]
                  return (
                    <tr key={s._id} className="hover:bg-secondary-50">
                      <td className="px-4 py-3 font-mono text-secondary-600">{s.admissionNo}</td>
                      <td className="px-4 py-3 font-medium text-secondary-900">
                        {s.profile.firstName} {s.profile.lastName}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => updateRecord(s._id, 'status', opt.value)}
                              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                record?.status === opt.value
                                  ? opt.color
                                  : 'border-secondary-200 bg-white text-secondary-500 hover:bg-secondary-50'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          placeholder="Optional remark"
                          value={record?.remarks || ''}
                          onChange={(e) => updateRecord(s._id, 'remarks', e.target.value)}
                          className="w-40 rounded border border-secondary-300 px-2 py-1 text-xs focus:border-primary-500 focus:outline-none"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-secondary-200 px-4 py-3">
            <button
              onClick={handleSubmit}
              disabled={saving || Object.keys(records).length === 0}
              className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : `Save Attendance (${Object.keys(records).length} students)`}
            </button>
          </div>
        </div>
      )}

      {!loading && selectedClassId && students.length === 0 && (
        <div className="text-center text-secondary-500 py-8">No students in this class.</div>
      )}
    </div>
  )
}
