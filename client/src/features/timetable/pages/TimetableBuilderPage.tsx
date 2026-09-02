import { useState, useEffect, useCallback } from 'react'
import api from '../../../services/api'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00',
]

interface Slot {
  _id: string
  classId: { _id: string; grade: string; section: string }
  subjectId: { _id: string; name: string; code: string }
  teacherId: { _id: string; profile: { firstName: string; lastName: string } }
  roomId?: { _id: string; name: string } | null
  day: string
  startTime: string
  endTime: string
}

interface ClassOption { _id: string; grade: string; section: string }
interface SubjectOption { _id: string; name: string; code: string }
interface TeacherOption { _id: string; profile: { firstName: string; lastName: string }; employeeNo: string }
interface RoomOption { _id: string; name: string; capacity: number }

export default function TimetableBuilderPage() {
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [teachers, setTeachers] = useState<TeacherOption[]>([])
  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null)
  const [form, setForm] = useState({
    day: 'monday',
    startTime: '09:00',
    endTime: '10:00',
    subjectId: '',
    teacherId: '',
    roomId: '',
  })
  const [availability, setAvailability] = useState<{ isAvailable: boolean; busySlots: Record<string, unknown> } | null>(null)
  const [checkingAvailability, setCheckingAvailability] = useState(false)

  // Load dropdown data
  useEffect(() => {
    Promise.all([
      api.get('/classes?limit=100'),
      api.get('/subjects'),
      api.get('/teachers'),
      api.get('/classes/rooms'),
    ]).then(([classRes, subRes, teachRes, roomRes]) => {
      setClasses(classRes.data.classes || classRes.data)
      setSubjects(subRes.data)
      setTeachers(teachRes.data.teachers || teachRes.data)
      setRooms(roomRes.data)
    }).catch(() => { /* silent */ })
  }, [])

  // Load slots when class is selected
  const loadSlots = useCallback(async () => {
    if (!selectedClassId) { setSlots([]); return }
    setLoading(true)
    try {
      const res = await api.get(`/timetable/class/${selectedClassId}`)
      setSlots(res.data)
    } catch {
      setError('Failed to load timetable')
    } finally {
      setLoading(false)
    }
  }, [selectedClassId])

  useEffect(() => { loadSlots() }, [loadSlots])

  // Live availability check
  useEffect(() => {
    if (!showModal || !form.teacherId) { setAvailability(null); return }
    const timer = setTimeout(async () => {
      setCheckingAvailability(true)
      try {
        const params = new URLSearchParams({
          teacherId: form.teacherId,
          day: form.day,
          startTime: form.startTime,
          endTime: form.endTime,
        })
        if (form.roomId) params.set('roomId', form.roomId)
        if (selectedClassId) params.set('classId', selectedClassId)
        const res = await api.get(`/timetable/availability?${params}`)
        setAvailability(res.data)
      } catch {
        setAvailability(null)
      } finally {
        setCheckingAvailability(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [form.teacherId, form.roomId, form.day, form.startTime, form.endTime, showModal, selectedClassId])

  const openCreateModal = (day: string, startTime: string) => {
    setEditingSlot(null)
    const startIdx = TIME_SLOTS.indexOf(startTime)
    setForm({ day, startTime, endTime: TIME_SLOTS[startIdx + 1] || '09:30', subjectId: '', teacherId: '', roomId: '' })
    setAvailability(null)
    setShowModal(true)
  }

  const openEditModal = (slot: Slot) => {
    setEditingSlot(slot)
    setForm({
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      subjectId: slot.subjectId._id,
      teacherId: slot.teacherId._id,
      roomId: slot.roomId?._id || '',
    })
    setAvailability(null)
    setShowModal(true)
  }

  const handleSubmit = async () => {
    setError('')
    setSuccess('')
    try {
      const payload = {
        ...form,
        classId: selectedClassId,
        roomId: form.roomId || undefined,
        academicYearId: '', // will be resolved server-side
      }

      if (editingSlot) {
        await api.patch(`/timetable/slots/${editingSlot._id}`, payload)
        setSuccess('Slot updated successfully')
      } else {
        await api.post('/timetable/slots', payload)
        setSuccess('Slot created successfully')
      }
      setShowModal(false)
      loadSlots()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save slot'
      setError(msg)
    }
  }

  const handleDelete = async (slotId: string) => {
    if (!confirm('Delete this slot?')) return
    try {
      await api.delete(`/timetable/slots/${slotId}`)
      setSuccess('Slot deleted')
      loadSlots()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete slot'
      setError(msg)
    }
  }

  // Group slots by day + startTime for grid
  const grid: Record<string, Slot> = {}
  slots.forEach((s) => {
    const key = `${s.day}-${s.startTime}`
    grid[key] = s
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-secondary-900">Timetable Builder</h2>
      </div>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>}
      {success && <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">{success}</div>}

      {/* Class selector */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 mb-1">Select Class *</label>
        <select
          value={selectedClassId}
          onChange={(e) => { setSelectedClassId(e.target.value); setSlots([]) }}
          className="rounded-lg border border-secondary-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
        >
          <option value="">Choose a class</option>
          {classes.map((c) => (
            <option key={c._id} value={c._id}>{c.grade} - {c.section}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {selectedClassId && (
        <div className="rounded-xl bg-white shadow-lg overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-secondary-500">Loading timetable...</div>
          ) : (
            <table className="w-full text-left text-sm min-w-[800px]">
              <thead className="border-b border-secondary-200 bg-secondary-50">
                <tr>
                  <th className="px-3 py-3 font-medium text-secondary-700 w-20">Time</th>
                  {DAYS.map((day) => (
                    <th key={day} className="px-3 py-3 font-medium text-secondary-700 capitalize">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {TIME_SLOTS.slice(0, -1).map((time, idx) => (
                  <tr key={time} className="hover:bg-secondary-50">
                    <td className="px-3 py-2 font-mono text-xs text-secondary-600">
                      {time}
                      <br />
                      <span className="text-secondary-400">{TIME_SLOTS[idx + 1]}</span>
                    </td>
                    {DAYS.map((day) => {
                      const slot = grid[`${day}-${time}`]
                      if (slot) {
                        return (
                          <td key={day} className="px-2 py-2">
                            <div className="rounded-lg border border-primary-200 bg-primary-50 p-2">
                              <p className="text-xs font-semibold text-primary-800">{slot.subjectId.name}</p>
                              <p className="text-xs text-primary-600">{slot.teacherId.profile.firstName} {slot.teacherId.profile.lastName}</p>
                              {slot.roomId && <p className="text-xs text-primary-500">📍 {slot.roomId.name}</p>}
                              <div className="mt-1 flex gap-1">
                                <button onClick={() => openEditModal(slot)} className="text-xs text-primary-700 hover:underline">Edit</button>
                                <button onClick={() => handleDelete(slot._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                              </div>
                            </div>
                          </td>
                        )
                      }
                      return (
                        <td key={day} className="px-2 py-2">
                          <button
                            onClick={() => openCreateModal(day, time)}
                            className="w-full h-16 rounded-lg border-2 border-dashed border-secondary-200 text-xs text-secondary-400 hover:border-primary-300 hover:text-primary-500 transition-colors"
                          >
                            + Add
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-secondary-900 mb-4">
              {editingSlot ? 'Edit Slot' : 'Add Slot'}
            </h3>

            {availability && !availability.isAvailable && (
              <div className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700">
                ⚠️ Conflict detected! The server will reject this if submitted.
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-secondary-700 mb-1">Day</label>
                <select value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}
                  className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm">
                  {DAYS.map((d) => <option key={d} value={d} className="capitalize">{d}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-secondary-700 mb-1">Start Time</label>
                  <select value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm">
                    {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-secondary-700 mb-1">End Time</label>
                  <select value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm">
                    {TIME_SLOTS.filter((t) => t > form.startTime).map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-700 mb-1">Subject *</label>
                <select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                  className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm">
                  <option value="">Select subject</option>
                  {subjects.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-700 mb-1">Teacher *</label>
                <select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                  className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm">
                  <option value="">Select teacher</option>
                  {teachers.map((t) => <option key={t._id} value={t._id}>{t.profile.firstName} {t.profile.lastName} ({t.employeeNo})</option>)}
                </select>
                {checkingAvailability && <p className="text-xs text-secondary-400 mt-1">Checking availability...</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-700 mb-1">Room</label>
                <select value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                  className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm">
                  <option value="">No room</option>
                  {rooms.map((r) => <option key={r._id} value={r._id}>{r.name} (cap: {r.capacity})</option>)}
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-2 justify-end">
              <button onClick={() => setShowModal(false)}
                className="rounded-lg border border-secondary-300 px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50">
                Cancel
              </button>
              <button onClick={handleSubmit}
                disabled={checkingAvailability || (availability !== null && !availability.isAvailable)}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                {editingSlot ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
