import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../../services/api'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00',
]

interface Slot {
  _id: string
  classId: { grade: string; section: string }
  subjectId: { name: string; code: string }
  roomId?: { name: string } | null
  day: string
  startTime: string
  endTime: string
}

export default function TeacherTimetablePage() {
  const { teacherId } = useParams<{ teacherId: string }>()
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadSlots = useCallback(async () => {
    if (!teacherId) return
    setLoading(true)
    try {
      const res = await api.get(`/timetable/teacher/${teacherId}`)
      setSlots(res.data)
    } catch {
      setError('Failed to load schedule')
    } finally {
      setLoading(false)
    }
  }, [teacherId])

  useEffect(() => { loadSlots() }, [loadSlots])

  // Group by day + startTime
  const grid: Record<string, Slot> = {}
  slots.forEach((s) => { grid[`${s.day}-${s.startTime}`] = s })

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-secondary-900">Teacher Schedule</h2>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>}

      {loading ? (
        <div className="text-center text-secondary-500 py-8">Loading...</div>
      ) : (
        <div className="rounded-xl bg-white shadow-lg overflow-x-auto">
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
                    {time}<br /><span className="text-secondary-400">{TIME_SLOTS[idx + 1]}</span>
                  </td>
                  {DAYS.map((day) => {
                    const slot = grid[`${day}-${time}`]
                    if (slot) {
                      return (
                        <td key={day} className="px-2 py-2">
                          <div className="rounded-lg border border-green-200 bg-green-50 p-2">
                            <p className="text-xs font-semibold text-green-800">{slot.subjectId?.name}</p>
                            <p className="text-xs text-green-600">{slot.classId?.grade} - {slot.classId?.section}</p>
                            {slot.roomId && <p className="text-xs text-green-500">📍 {slot.roomId.name}</p>}
                          </div>
                        </td>
                      )
                    }
                    return <td key={day} className="px-2 py-2 text-center text-secondary-300">—</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
