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

  // ── User management ────────────────────────────────────────────────
  'user:list': ['super_admin', 'school_admin', 'principal'],
  'user:read': ['super_admin', 'school_admin', 'principal'],
  'user:assign_role': ['super_admin', 'school_admin'],

  // ── Auth (existing) ───────────────────────────────────────────────
  'auth:me': ['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent', 'accountant', 'hr', 'transport_manager'],

  // ── Students (stub — feature/students) ─────────────────────────────
  'student:list': ['super_admin', 'school_admin', 'principal', 'teacher'],
  'student:read': ['super_admin', 'school_admin', 'principal', 'teacher', 'parent'],
  'student:create': ['super_admin', 'school_admin', 'principal'],
  'student:update': ['super_admin', 'school_admin', 'principal', 'teacher'],
  'student:delete': ['super_admin', 'school_admin'],

  // ── Attendance (stub — feature/attendance) ─────────────────────────
  'attendance:read': ['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent'],
  'attendance:mark': ['super_admin', 'school_admin', 'principal', 'teacher'],

  // ── Exams (stub — feature/exams) ──────────────────────────────────
  'exam:list': ['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent'],
  'exam:create': ['super_admin', 'school_admin', 'principal'],
  'exam:grade': ['super_admin', 'school_admin', 'principal', 'teacher'],

  // ── Finance (stub — feature/finance) ──────────────────────────────
  'finance:read': ['super_admin', 'school_admin', 'accountant'],
  'finance:manage': ['super_admin', 'school_admin', 'accountant'],

  // ── Transport (stub — feature/transport) ──────────────────────────
  'transport:read': ['super_admin', 'school_admin', 'transport_manager'],
  'transport:manage': ['super_admin', 'school_admin', 'transport_manager'],

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
