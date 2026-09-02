import { z } from 'zod'

const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]

const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.com', '.scr', '.pif',
  '.js', '.vbs', '.wsf', '.msi', '.dll', '.sys',
]

export const uploadDocumentSchema = z.object({
  ownerType: z.enum([
    'student',
    'teacher',
    'school',
    'invoice',
    'report_card',
    'assignment_submission',
    'message',
    'discipline',
  ]),
  ownerId: z.string().min(1, 'Owner ID is required'),
  type: z.enum([
    'profile_photo',
    'admission_form',
    'id_proof',
    'generated_report_card',
    'generated_receipt',
    'attachment',
  ]),
  accessPolicy: z.enum(['owner_and_admin', 'tenant_staff', 'public_within_tenant']).default('owner_and_admin'),
})

export const listDocumentsQuerySchema = z.object({
  ownerType: z.string().optional(),
  ownerId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

/**
 * Validate that a file is allowed based on mime type and extension.
 */
export function validateFileType(filename: string, mimeType: string, sizeBytes: number): { valid: boolean; error?: string } {
  // Check size (10MB max)
  if (sizeBytes > 10 * 1024 * 1024) {
    return { valid: false, error: 'File size exceeds 10MB limit' }
  }

  // Check for blocked extensions
  const ext = '.' + filename.split('.').pop()?.toLowerCase()
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `File type ${ext} is not allowed` }
  }

  // Check mime type
  if (!ALLOWED_MIMETYPES.includes(mimeType)) {
    return { valid: false, error: `Mime type ${mimeType} is not allowed` }
  }

  return { valid: true }
}

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>
export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>
