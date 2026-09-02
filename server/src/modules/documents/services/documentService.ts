import mongoose from 'mongoose'
import { Document, IDocument } from '../models/Document.js'
import { getStorageProvider } from '../../../shared/storage/storageProvider.js'
import { validateFileType } from '../schemas/documentSchemas.js'
import { writeAuditLog } from '../../audit/models/AuditLog.js'
import { Student } from '../../students/models/Student.js'
import { Teacher } from '../../teachers/models/Teacher.js'
import { Guardian } from '../../students/models/Guardian.js'

// ── Allowed file size limits per type ────────────────────────────────

const SIZE_LIMITS: Record<string, number> = {
  profile_photo: 5 * 1024 * 1024,    // 5MB for images
  admission_form: 10 * 1024 * 1024,
  id_proof: 10 * 1024 * 1024,
  generated_report_card: 10 * 1024 * 1024,
  generated_receipt: 10 * 1024 * 1024,
  attachment: 10 * 1024 * 1024,
}

// ── Upload authorization validation ─────────────────────────────────

async function validateUploadAuthorization(
  schoolId: string,
  uploadedBy: string,
  uploaderRoles: string[],
  ownerType: string,
  ownerId: string,
): Promise<void> {
  const isAdmin = uploaderRoles.some(r => ['super_admin', 'school_admin'].includes(r))
  if (isAdmin) return // Admins can upload to any owner

  switch (ownerType) {
    case 'student': {
      // Teacher: only if assigned to this student's class
      if (uploaderRoles.includes('teacher')) {
        const student = await Student.findOne({ _id: ownerId, schoolId })
        if (!student) throw new Error('Student not found')
        if (student.classId) {
          const teacher = await Teacher.findOne({ userId: uploadedBy, schoolId })
          if (!teacher) throw new Error('Teacher not found')
          const isAssigned = teacher.classes?.some(c => c.toString() === student.classId?.toString())
          if (!isAssigned) throw new Error('You are not assigned to this student\'s class')
        }
        return
      }
      // Parent: only for their own children
      if (uploaderRoles.includes('parent')) {
        const guardians = await Guardian.find({ userId: uploadedBy, schoolId })
        const childIds = guardians.flatMap(g => g.children.map(c => c.toString()))
        if (!childIds.includes(ownerId)) throw new Error('You can only upload documents for your own children')
        return
      }
      // Student: only for themselves
      if (uploaderRoles.includes('student')) {
        const student = await Student.findOne({ userId: uploadedBy, schoolId }).catch(() => null)
        if (student?._id.toString() === ownerId) return
        throw new Error('You can only upload documents for yourself')
      }
      break
    }
    case 'teacher': {
      // Teacher: only for themselves
      if (uploaderRoles.includes('teacher')) {
        const teacher = await Teacher.findOne({ _id: ownerId, schoolId })
        if (teacher?.userId.toString() === uploadedBy) return
        throw new Error('You can only upload documents for yourself')
      }
      break
    }
    default:
      // Other owner types: any authenticated user in the tenant
      break
  }
}

// ── Upload ───────────────────────────────────────────────────────────

export async function uploadDocument(
  schoolId: string,
  uploadedBy: string,
  uploaderRoles: string[],
  file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  data: {
    ownerType: string
    ownerId: string
    type: string
    accessPolicy?: string
  },
): Promise<IDocument> {
  // Validate file type and size
  const typeValidation = validateFileType(file.originalname, file.mimetype, file.size)
  if (!typeValidation.valid) {
    throw new Error(typeValidation.error!)
  }

  // Enforce per-type size limits
  const maxSize = SIZE_LIMITS[data.type] || 10 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error(`File size exceeds limit of ${Math.round(maxSize / 1024 / 1024)}MB for ${data.type}`)
  }

  // Validate uploader authorization for this owner
  await validateUploadAuthorization(schoolId, uploadedBy, uploaderRoles, data.ownerType, data.ownerId)

  // Upload to storage
  const storagePath = `${schoolId}/${data.ownerType}/${data.ownerId}`
  const provider = getStorageProvider()
  const uploadResult = await provider.upload(
    {
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    },
    storagePath,
  )

  // Create document record
  const doc = await Document.create({
    schoolId,
    ownerType: data.ownerType,
    ownerId: data.ownerId,
    uploadedBy,
    storageKey: uploadResult.storageKey,
    filename: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: uploadResult.sizeBytes,
    type: data.type,
    accessPolicy: data.accessPolicy || 'owner_and_admin',
  })

  // Audit log for sensitive owner types
  const sensitiveTypes = ['student', 'discipline', 'invoice']
  if (sensitiveTypes.includes(data.ownerType)) {
    await writeAuditLog({
      schoolId: new mongoose.Types.ObjectId(schoolId),
      actorId: new mongoose.Types.ObjectId(uploadedBy),
      actorEmail: 'system',
      action: 'document:upload',
      entity: 'Document',
      entityId: (doc._id as mongoose.Types.ObjectId).toString(),
      after: {
        ownerType: data.ownerType,
        ownerId: data.ownerId,
        filename: file.originalname,
        type: data.type,
      },
    })
  }

  return doc
}

// ── Get document with signed URL ─────────────────────────────────────

export async function getDocumentWithUrl(
  schoolId: string,
  documentId: string,
  userId: string,
  userRoles: string[],
): Promise<{ document: IDocument; signedUrl: string } | null> {
  const doc = await Document.findOne({ _id: documentId, schoolId, deleted: false })
  if (!doc) return null

  // Access control check
  const hasAccess = await checkAccess(doc, userId, userRoles)
  if (!hasAccess) return null

  // Generate signed URL
  const provider = getStorageProvider()
  const signedUrl = await provider.getSignedUrl(doc.storageKey, 3600) // 1 hour

  return { document: doc, signedUrl }
}

// ── Delete document (soft delete) ────────────────────────────────────

export async function deleteDocument(
  schoolId: string,
  documentId: string,
  userId: string,
  userRoles: string[],
): Promise<void> {
  const doc = await Document.findOne({ _id: documentId, schoolId, deleted: false })
  if (!doc) throw new Error('Document not found')

  // Only uploader or school_admin can delete
  const isUploader = doc.uploadedBy.toString() === userId
  const isAdmin = userRoles.includes('school_admin') || userRoles.includes('super_admin')
  if (!isUploader && !isAdmin) {
    throw new Error('Access denied: you can only delete your own documents')
  }

  doc.deleted = true
  await doc.save()

  // Async delete from storage (non-blocking)
  const provider = getStorageProvider()
  provider.delete(doc.storageKey).catch(() => {})

  // Audit log for sensitive types
  const sensitiveTypes = ['student', 'discipline', 'invoice']
  if (sensitiveTypes.includes(doc.ownerType)) {
    await writeAuditLog({
      schoolId: new mongoose.Types.ObjectId(schoolId),
      actorId: new mongoose.Types.ObjectId(userId),
      actorEmail: 'system',
      action: 'document:delete',
      entity: 'Document',
      entityId: documentId,
      before: { ownerType: doc.ownerType, filename: doc.filename },
    })
  }
}

// ── List documents for an owner ──────────────────────────────────────

export async function listDocuments(
  schoolId: string,
  userId: string,
  userRoles: string[],
  filters: {
    ownerType?: string
    ownerId?: string
    page?: number
    limit?: number
  },
) {
  const { ownerType, ownerId, page = 1, limit = 20 } = filters

  const query: Record<string, unknown> = { schoolId, deleted: false }
  if (ownerType) query.ownerType = ownerType
  if (ownerId) query.ownerId = ownerId

  const [docs, total] = await Promise.all([
    Document.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Document.countDocuments(query),
  ])

  // Filter by access control
  const accessibleDocs: IDocument[] = []
  for (const doc of docs) {
    if (await checkAccess(doc, userId, userRoles)) {
      accessibleDocs.push(doc)
    }
  }

  return {
    documents: accessibleDocs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }
}

// ── Access control ───────────────────────────────────────────────────

async function checkAccess(
  doc: IDocument,
  userId: string,
  userRoles: string[],
): Promise<boolean> {
  const isAdmin = userRoles.some(r => ['super_admin', 'school_admin', 'principal'].includes(r))

  switch (doc.accessPolicy) {
    case 'public_within_tenant':
      // Anyone in the tenant can access
      return true

    case 'tenant_staff':
      // Staff only (not students/parents)
      return !userRoles.some(r => ['student', 'parent'].includes(r))

    case 'owner_and_admin':
    default:
      // Owner + admin only
      if (isAdmin) return true

      // Check if user is the uploader
      if (doc.uploadedBy.toString() === userId) return true

      // Check if user owns the document via owner type
      return await checkOwnerAccess(doc, userId, userRoles)
  }
}

async function checkOwnerAccess(
  doc: IDocument,
  userId: string,
  userRoles: string[],
): Promise<boolean> {
  switch (doc.ownerType) {
    case 'student': {
      // Student: check if the student is the owner (has a User account)
      // or if the user is a guardian of this student
      const student = await Student.findOne({ _id: doc.ownerId })
      if (!student) return false

      // Check if user is a teacher assigned to this student's class
      if (userRoles.includes('teacher')) {
        const teacher = await Teacher.findOne({ userId, schoolId: doc.schoolId })
        if (teacher && student.classId && teacher.classes?.includes(student.classId)) {
          return true
        }
      }

      // Check if user is a guardian of this student
      const guardians = await Guardian.find({ schoolId: doc.schoolId, children: doc.ownerId })
      return guardians.some(g => g.userId.toString() === userId)
    }

    case 'teacher': {
      const teacher = await Teacher.findOne({ _id: doc.ownerId })
      return teacher?.userId.toString() === userId
    }

    case 'message': {
      // Message attachments: check if user is a participant in the conversation
      // Simplified: trust the conversation middleware for now
      return userRoles.length > 0
    }

    default:
      return false
  }
}
