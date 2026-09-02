import { useState, useEffect } from 'react'
import api from '../../../services/api'

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

interface Slot {
  _id: string
  subjectId?: { name: string; code: string } | string
  classId?: { grade: string; section: string } | string
  teacherId?: { profile: { firstName: string; lastName: string } } | string
  roomId?: { name: string } | string | null
  day: string
  startTime: string
  endTime: string
}

interface TodayTimetableProps {
  /** 'class' | 'teacher' — determines which endpoint to call */
  view: 'class' | 'teacher'
  /** The ID of the class or teacher */
  entityId: string
  /** Optional label to show at the top */
  label?: string
}

export default function TodayTimetable({ view, entityId, label }: TodayTimetableProps) {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [todayName] = useState(() => DAY_NAMES[new Date().getDay()])

  useEffect(() => {
    if (!entityId) return
    const endpoint = view === 'class'
      ? `/timetable/class/${entityId}`
      : `/timetable/teacher/${entityId}`

    api.get(endpoint)
      .then((res) => {
        const allSlots: Slot[] = res.data
        setSlots(allSlots.filter((s) => s.day === todayName))
      })
      .catch(() => { /* silent — widget degrades gracefully */ })
      .finally(() => setLoading(false))
  }, [view, entityId, todayName])

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-lg">
        <p className="text-sm text-secondary-500">Loading today's timetable...</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-secondary-900">
          {label || `Today's Timetable`}
        </h3>
        <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700 capitalize">
          {todayName}
        </span>
      </div>

      {slots.length === 0 ? (
        <p className="text-sm text-secondary-500">No classes scheduled today.</p>
      ) : (
        <div className="space-y-2">
          {slots
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .map((slot) => {
              const subject = typeof slot.subjectId === 'object' ? slot.subjectId : null
              const cls = typeof slot.classId === 'object' ? slot.classId : null
              const teacher = typeof slot.teacherId === 'object' ? slot.teacherId : null
              const room = typeof slot.roomId === 'object' ? slot.roomId : null

              return (
                <div
                  key={slot._id}
                  className="flex items-center gap-3 rounded-lg border border-secondary-200 p-2.5 hover:bg-secondary-50 transition-colors"
                >
                  <div className="w-16 text-center">
                    <p className="text-xs font-mono font-semibold text-secondary-900">{slot.startTime}</p>
                    <p className="text-xs text-secondary-400">{slot.endTime}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary-900 truncate">
                      {subject?.name || 'Unknown Subject'}
                    </p>
                    <p className="text-xs text-secondary-500 truncate">
                      {cls ? `${cls.grade} - ${cls.section}` : ''}
                      {teacher ? ` • ${teacher.profile.firstName} ${teacher.profile.lastName}` : ''}
                    </p>
                  </div>
                  {room && (
                    <span className="text-xs text-secondary-500">📍 {room.name}</span>
                  )}
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}
