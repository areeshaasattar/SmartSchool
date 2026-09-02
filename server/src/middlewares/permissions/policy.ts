/**
 * Role → Permission policy map.
 *
 * Each key is an action string (e.g. "school:create", "user:assign_role").
 * The value is the set of roles allowed to perform that action.
 *
 * Stub entries for future modules are prefixed with `#` comments so the
 * pattern is established early — extend, don't reinvent.
 */

type Permission = string[]

export const permissionPolicy: Record<string, Permission> = {
  // ── School management ──────────────────────────────────────────────
  'school:create': ['super_admin'],
  'school:list': ['super_admin'],
  'school:read': ['super_admin', 'school_admin', 'principal'],
  'school:update': ['super_admin', 'school_admin'],
  'school:update_settings': ['super_admin', 'school_admin'],

  // ── Academic year management ───────────────────────────────────────
  'academic_year:list': ['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent', 'accountant', 'hr', 'transport_manager'],
  'academic_year:create': ['super_admin', 'school_admin'],
  'academic_year:update': ['super_admin', 'school_admin'],

  // ── User management ────────────────────────────────────────────────
  'user:list': ['super_admin', 'school_admin', 'principal'],
  'user:read': ['super_admin', 'school_admin', 'principal'],
  'user:assign_role': ['super_admin', 'school_admin'],

  // ── Auth (existing) ───────────────────────────────────────────────
  'auth:me': ['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent', 'accountant', 'hr', 'transport_manager'],

  // ── Teachers ──────────────────────────────────────────────────────
  'teacher:list': ['super_admin', 'school_admin', 'principal', 'hr', 'teacher'],
  'teacher:read': ['super_admin', 'school_admin', 'principal', 'hr', 'teacher'],
  'teacher:create': ['super_admin', 'school_admin', 'principal', 'hr'],
  'teacher:update': ['super_admin', 'school_admin', 'principal', 'hr'],
  'teacher:delete': ['super_admin', 'school_admin', 'hr'],

  // ── Students ───────────────────────────────────────────────────────
  'student:list': ['super_admin', 'school_admin', 'principal', 'teacher', 'parent'],
  'student:read': ['super_admin', 'school_admin', 'principal', 'teacher', 'parent'],
  'student:create': ['super_admin', 'school_admin', 'principal'],
  'student:update': ['super_admin', 'school_admin', 'principal'],
  'student:delete': ['super_admin', 'school_admin'],

  // ── Attendance ────────────────────────────────────────────────────
  'attendance:read': ['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent'],
  'attendance:mark': ['super_admin', 'school_admin', 'principal', 'teacher'],
  'attendance:update': ['super_admin', 'school_admin', 'principal', 'teacher'],

  // ── Exams ────────────────────────────────────────────────────────
  'exam:list': ['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent'],
  'exam:create': ['super_admin', 'school_admin', 'principal'],
  'exam:grade': ['super_admin', 'school_admin', 'principal', 'teacher'],

  // ── Finance ─────────────────────────────────────────────────────
  'finance:read': ['super_admin', 'school_admin', 'principal', 'accountant', 'parent', 'student'],
  'finance:manage': ['super_admin', 'school_admin', 'accountant'],

  // ── Transport (stub — feature/transport) ──────────────────────────
  'transport:read': ['super_admin', 'school_admin', 'transport_manager'],
  'transport:manage': ['super_admin', 'school_admin', 'transport_manager'],

  // ── Classes ──────────────────────────────────────────────────────
  'class:list': ['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent'],
  'class:read': ['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent'],
  'class:create': ['super_admin', 'school_admin'],
  'class:update': ['super_admin', 'school_admin'],
  'class:delete': ['super_admin', 'school_admin'],

  // ── Subjects ──────────────────────────────────────────────────────
  'subject:list': ['super_admin', 'school_admin', 'principal', 'teacher', 'student'],
  'subject:read': ['super_admin', 'school_admin', 'principal', 'teacher', 'student'],
  'subject:create': ['super_admin', 'school_admin'],
  'subject:update': ['super_admin', 'school_admin'],
  'subject:delete': ['super_admin', 'school_admin'],

  // ── Timetable ────────────────────────────────────────────────────
  'timetable:read': ['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent'],
  'timetable:create': ['super_admin', 'school_admin'],
  'timetable:update': ['super_admin', 'school_admin'],
  'timetable:delete': ['super_admin', 'school_admin'],

  // ── Assignments ──────────────────────────────────────────────────
  'assignment:read': ['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent'],
  'assignment:create': ['super_admin', 'school_admin', 'principal', 'teacher'],
  'assignment:update': ['super_admin', 'school_admin', 'principal', 'teacher'],
  'assignment:delete': ['super_admin', 'school_admin', 'principal', 'teacher'],
  'assignment:submit': ['super_admin', 'school_admin', 'student'],
  'assignment:grade': ['super_admin', 'school_admin', 'principal', 'teacher'],

  // ── Parent portal ────────────────────────────────────────────────
  'portal:read': ['parent'],

  // ── Messaging ──────────────────────────────────────────────────
  'message:read': ['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent', 'accountant', 'hr', 'transport_manager'],
  'message:send': ['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent', 'accountant', 'hr', 'transport_manager'],
  'message:create_conversation': ['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent', 'accountant', 'hr', 'transport_manager'],

  // ── Notifications ──────────────────────────────────────────────
  'notification:read': ['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent', 'accountant', 'hr', 'transport_manager'],
  'notification:manage': ['super_admin', 'school_admin'],

  // ── Leave ───────────────────────────────────────────────────────
  'leave:read': ['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent', 'hr'],
  'leave:create': ['super_admin', 'school_admin', 'principal', 'teacher', 'parent'],
  'leave:review': ['super_admin', 'school_admin', 'principal', 'hr'],

  // ── Discipline ────────────────────────────────────────────────────
  'discipline:read': ['super_admin', 'school_admin', 'principal', 'teacher'],
  'discipline:create': ['super_admin', 'school_admin', 'principal', 'teacher'],
  'discipline:update': ['super_admin', 'school_admin', 'principal', 'teacher'],

  // ── Audit logs (stub — feature/audit-logs) ────────────────────────
  'audit:read': ['super_admin', 'school_admin'],
}

/**
 * Check whether a given role is allowed to perform an action.
 */
export function isRoleAllowed(role: string, action: string): boolean {
  const allowedRoles = permissionPolicy[action]
  if (!allowedRoles) return false
  return allowedRoles.includes(role)
}

/**
 * Check whether any of the user's roles grants them the given action.
 */
export function hasPermission(userRoles: string[], action: string): boolean {
  return userRoles.some((role) => isRoleAllowed(role, action))
}
