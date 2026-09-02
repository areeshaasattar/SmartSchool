import { useSelector, useDispatch } from 'react-redux'
import { switchSchool } from '../../store'
import type { RootState } from '../../store'

/**
 * Simple dropdown that lets a user switch between their assigned schools.
 * Only visible when the user belongs to more than one school.
 */
export default function SchoolSwitcher() {
  const dispatch = useDispatch()
  const user = useSelector((state: RootState) => state.auth.user)
  const activeSchoolId = useSelector((state: RootState) => state.tenant.activeSchoolId)

  const schoolIds = user?.schoolIds || []

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
        className="rounded-lg border border-secondary-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      >
        {schoolIds.map((id) => (
          <option key={id} value={id}>
            School {id.slice(-4)}
          </option>
        ))}
      </select>
    </div>
  )
}
