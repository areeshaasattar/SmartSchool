/**
 * Shared form-validation plumbing used by all create/edit forms.
 *
 * Provides:
 *  - extractServerError(): maps backend validation responses into banner text
 *    + per-field errors keyed by form field ids. Handles BOTH server shapes:
 *      • Zod (validate middleware):  details: [{ field, message }, ...]
 *      • Mongoose (global handler):  details: { field: message, ... }
 *    This function is fully defensive — it can never throw.
 *  - focusFirstError(): scrolls to and focuses the first invalid input.
 */

export type FieldErrors = Record<string, string>

export interface ServerValidationError {
  response?: {
    data?: {
      error?: string
      details?: unknown
    }
  }
}

export interface ServerValidation {
  /** Summary banner text: names the failing fields, not just "Validation failed". */
  banner: string
  /** Per-field errors keyed by form field id. */
  fieldErrors: FieldErrors
}

interface NormalizedDetail {
  field: string
  message: string
}

/** Accept either `[{field, message}]` or `{field: message}` shapes. */
function normalizeDetails(details: unknown): NormalizedDetail[] {
  if (Array.isArray(details)) {
    return details.filter(
      (d): d is NormalizedDetail =>
        !!d &&
        typeof d === 'object' &&
        typeof (d as NormalizedDetail).field === 'string' &&
        typeof (d as NormalizedDetail).message === 'string',
    )
  }
  if (details && typeof details === 'object') {
    return Object.entries(details as Record<string, unknown>).map(([field, message]) => ({
      field,
      message: typeof message === 'string' ? message : String(message),
    }))
  }
  return []
}

function humanize(path: string): string {
  return path
    .split(/[.\-_]/)
    .filter(Boolean)
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1))
    .join(' ')
}

/**
 * Map a Zod detail field path to the form's field id.
 * - `profile.firstName` -> `firstName` (nested profile maps to flat form ids)
 * - `emergencyContact.name` -> resolved via `aliases` if provided
 * - `guardians.0.email` -> `guardian-0-email` when `guardianPrefix` is given
 */
function mapDetailField(
  field: string,
  aliases: Record<string, string>,
  guardianPrefix?: string,
): string {
  if (aliases[field]) return aliases[field]
  const segs = field.split('.')
  // Indexed arrays: guardians.0.email
  if (segs.length >= 3 && /^\d+$/.test(segs[1]) && guardianPrefix) {
    return `${guardianPrefix}-${segs[1]}-${segs.slice(2).join('-')}`
  }
  // Nested object: take the last segment if the form uses flat ids
  const last = segs[segs.length - 1]
  return aliases[last] ?? last
}

export function extractServerError(
  err: unknown,
  fallback: string,
  opts: { aliases?: Record<string, string>; guardianPrefix?: string } = {},
): ServerValidation {
  try {
    const axiosErr = err as ServerValidationError
    const topError = axiosErr?.response?.data?.error
    const details = normalizeDetails(axiosErr?.response?.data?.details)

    if (details.length === 0) {
      return { banner: topError || fallback, fieldErrors: {} }
    }

    const fieldErrors: FieldErrors = {}
    const lines: string[] = []
    for (const d of details) {
      const id = mapDetailField(d.field, opts.aliases ?? {}, opts.guardianPrefix)
      if (!fieldErrors[id]) fieldErrors[id] = d.message
      lines.push(`${humanize(d.field)}: ${d.message}`)
    }

    const count = details.length
    const banner =
      topError && topError !== 'Validation failed'
        ? `${topError}: ${lines.join(' · ')}`
        : `${count} field${count === 1 ? '' : 's'} need${count === 1 ? 's' : ''} your attention — ${lines.join(' · ')}`

    return { banner, fieldErrors }
  } catch {
    // Never let error extraction crash the form — degrade to the fallback text
    return { banner: fallback, fieldErrors: {} }
  }
}

/** Scroll to and focus the first invalid field (by form field id). */
export function focusFirstError(errors: FieldErrors): void {
  const firstId = Object.keys(errors)[0]
  if (!firstId) return
  const el = document.getElementById(firstId)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    ;(el as HTMLElement).focus({ preventScroll: true })
  }
}
