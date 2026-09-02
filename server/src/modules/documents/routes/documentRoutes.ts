import { Router, Request, Response } from 'express'
import multer from 'multer'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { resolveTenant } from '../../../middlewares/tenant/resolveTenant.js'
import { requirePermission } from '../../../middlewares/permissions/requireRole.js'
import { uploadDocumentSchema, listDocumentsQuerySchema } from '../schemas/documentSchemas.js'
import * as documentService from '../services/documentService.js'

const router = Router()

// Configure multer for in-memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
})

// ── Upload document ──────────────────────────────────────────────────

router.post(
  '/upload',
  authenticate,
  resolveTenant,
  requirePermission('document:upload'),
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file provided' })
        return
      }

      // Parse metadata from body
      const metadata = uploadDocumentSchema.parse({
        ownerType: req.body.ownerType,
        ownerId: req.body.ownerId,
        type: req.body.type,
        accessPolicy: req.body.accessPolicy,
      })

      const doc = await documentService.uploadDocument(
        req.tenantId!,
        req.user!.id,
        req.user!.roles,
        {
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
        metadata,
      )

      res.status(201).json(doc)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload document'
      res.status(400).json({ error: message })
    }
  },
)

// ── Get document metadata + signed URL ───────────────────────────────

router.get(
  '/:id',
  authenticate,
  resolveTenant,
  requirePermission('document:read'),
  async (req: Request, res: Response) => {
    try {
      const result = await documentService.getDocumentWithUrl(
        req.tenantId!,
        String(req.params.id),
        req.user!.id,
        req.user!.roles,
      )
      if (!result) {
        res.status(404).json({ error: 'Document not found or access denied' })
        return
      }
      res.json(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get document'
      res.status(400).json({ error: message })
    }
  },
)

// ── Delete document ──────────────────────────────────────────────────

router.delete(
  '/:id',
  authenticate,
  resolveTenant,
  requirePermission('document:delete'),
  async (req: Request, res: Response) => {
    try {
      await documentService.deleteDocument(
        req.tenantId!,
        String(req.params.id),
        req.user!.id,
        req.user!.roles,
      )
      res.json({ message: 'Document deleted' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete document'
      res.status(400).json({ error: message })
    }
  },
)

// ── List documents for an owner ──────────────────────────────────────

router.get(
  '/',
  authenticate,
  resolveTenant,
  requirePermission('document:read'),
  async (req: Request, res: Response) => {
    try {
      const parsed = listDocumentsQuerySchema.parse(req.query)
      const result = await documentService.listDocuments(
        req.tenantId!,
        req.user!.id,
        req.user!.roles,
        parsed,
      )
      res.json(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list documents'
      res.status(400).json({ error: message })
    }
  },
)

export default router
