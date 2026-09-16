/**
 * Server-side upload validation — the last line of defense before Cloudinary.
 *
 * The client-supplied multipart Content-Type is trivially spoofable, so beyond
 * the mimetype allowlist we verify MAGIC BYTES (file signature) server-side and
 * enforce the central size cap. Files whose bytes disagree with their declared
 * mime type are rejected.
 */
import { env, allowedUploadMimetypes } from '../config/env.js'

export interface UploadValidationResult {
  valid: boolean
  error?: string
}

/** Magic-byte signatures for the allowed mime types. */
const SIGNATURES: Array<{ mime: string; bytes: number[][]; exts?: string[] }> = [
  // JPEG: FF D8 FF
  { mime: 'image/jpeg', bytes: [[0xff, 0xd8, 0xff]] },
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  { mime: 'image/png', bytes: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]] },
  // GIF87a / GIF89a
  { mime: 'image/gif', bytes: [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]] },
  // WEBP: RIFF....WEBP
  { mime: 'image/webp', bytes: [[0x52, 0x49, 0x46, 0x46]] },
  // PDF: %PDF-
  { mime: 'application/pdf', bytes: [[0x25, 0x50, 0x44, 0x46]] },
]

/** Text formats validated as decodable UTF-8 (no signature). */
const TEXT_MIMES = new Set(['text/plain', 'text/csv'])

const OFFICE_ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04] // docx/xlsx are ZIP containers
const OFFICE_MIMES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

function startsWith(buffer: Buffer, bytes: number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false
  return bytes.every((b, i) => buffer[offset + i] === b)
}

/**
 * Validate a multipart upload server-side.
 *
 * @param mimetype   client-declared mime type (distrust, verify via magic bytes)
 * @param filename   original filename (extension blocklist)
 * @param sizeBytes  actual byte count (server-measured, not header-declared)
 * @param buffer     first bytes of the file for signature checks
 */
export function validateServerSideUpload(
  mimetype: string,
  filename: string,
  sizeBytes: number,
  buffer: Buffer,
): UploadValidationResult {
  // 1. Central size cap from env
  if (sizeBytes <= 0) {
    return { valid: false, error: 'Empty files are not allowed' }
  }
  if (sizeBytes > env.MAX_UPLOAD_BYTES) {
    return { valid: false, error: `File size exceeds limit of ${Math.round(env.MAX_UPLOAD_BYTES / 1024 / 1024)}MB` }
  }

  // 2. Extension blocklist (defense-in-depth alongside the mime allowlist)
  const ext = `.${filename.split('.').pop()?.toLowerCase() ?? ''}`
  const BLOCKED = [
    '.exe', '.bat', '.cmd', '.sh', '.ps1', '.com', '.scr', '.pif',
    '.js', '.mjs', '.cjs', '.vbs', '.wsf', '.msi', '.dll', '.sys', '.php', '.jsp', '.asp', '.aspx',
  ]
  if (BLOCKED.includes(ext)) {
    return { valid: false, error: `File type ${ext} is not allowed` }
  }

  // 3. Declared mime must be in the env-configured allowlist
  if (!allowedUploadMimetypes().has(mimetype)) {
    return { valid: false, error: `Mime type ${mimetype} is not allowed` }
  }

  // 4. Magic-byte verification — bytes must agree with the declared type
  const head = buffer.subarray(0, 16)

  if (TEXT_MIMES.has(mimetype)) {
    // Text files: must decode as UTF-8 and contain no NUL bytes (binary marker)
    const sample = buffer.subarray(0, 4096)
    if (sample.includes(0)) {
      return { valid: false, error: 'File content does not match its declared type' }
    }
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(sample)
    } catch {
      return { valid: false, error: 'File content does not match its declared type' }
    }
    return { valid: true }
  }

  if (OFFICE_MIMES.has(mimetype)) {
    if (!startsWith(head, OFFICE_ZIP_MAGIC)) {
      return { valid: false, error: 'File content does not match its declared type' }
    }
    return { valid: true }
  }

  const sig = SIGNATURES.find((s) => s.mime === mimetype)
  if (sig) {
    const matched = sig.bytes.some((variant) => startsWith(head, variant))
    if (!matched) {
      return { valid: false, error: 'File content does not match its declared type' }
    }
    return { valid: true }
  }

  // Allowed mime with no known signature: pass through (mime allowlist already gates it)
  return { valid: true }
}
