/**
 * ── Access Control Kill Switch ────────────────────────────────────────────
 *
 * DEVELOPMENT MODE: role-based page guards are DISABLED so every feature is
 * reachable while building. Set ROLE_GUARDS_ENABLED to true to re-enable the
 * Access Denied behavior everywhere it is enforced (RequireRole route guard,
 * teacher-tools page guards, and per-page capability checks).
 *
 * NOTE: this only relaxes the FRONTEND guards. The server still enforces its
 * permission policy on every API call — as super_admin you already pass all
 * of those, so nothing else needs to change.
 */
export const ROLE_GUARDS_ENABLED = false
