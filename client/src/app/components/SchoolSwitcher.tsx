import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { switchSchool } from '../../store'
import type { RootState } from '../../store'
import api from '../../services/api'

interface SchoolInfo {
  id: string
  name: string
  code: string
}

/**
 * School switcher dropdown. Fetches real school names for the user's
 * assigned schools and stores the active school ID.
 */
export default function SchoolSwitcher() {
  const dispatch = useDispatch()
  const user = useSelector((state: RootState) => state.auth.user)
  const activeSchoolId = useSelector((state: RootState) => state.tenant.activeSchoolId)

  const [schools, setSchools] = useState<SchoolInfo[]>([])
  const [loading, setLoading] = useState(true)

  const schoolIds = user?.schoolIds || []

  useEffect(() => {
    if (schoolIds.length === 0) {
      setLoading(false)
      return
    }

    // Fetch details for each school the user belongs to
    Promise.all(
      schoolIds.map((id) =>
        api
          .get(`/schools/${id}`)
          .then((res) => ({
            id,
            name: res.data.school.name,
            code: res.data.school.code,
          }))
          .catch(() => ({ id, name: `School ${id.slice(-4)}`, code: '' })),
      ),
    )
      .then(setSchools)
      .finally(() => setLoading(false))
  }, [schoolIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  if (schoolIds.length <= 1) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="school-switcher" className="text-sm font-medium text-secondary-700">
        School:
      </label>
      <select
        id="school-switcher"
        value={activeSchoolId || ''}
        onChange={(e) => dispatch(switchSchool(e.target.value || null))}
        disabled={loading}
        className="rounded-lg border border-secondary-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      >
        {loading ? (
          <option>Loading...</option>
        ) : (
          schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.code ? ` (${s.code})` : ''}
            </option>
          ))
        )}
      </select>
    </div>
  )
}
