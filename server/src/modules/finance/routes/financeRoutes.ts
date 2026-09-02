import { Router, Request, Response } from 'express'
import { authenticate } from '../../../middlewares/auth/authenticate.js'
import { requirePermission } from '../../../middlewares/permissions/requireRole.js'
import { resolveTenant } from '../../../middlewares/tenant/resolveTenant.js'
import {
  createFeeStructureSchema,
  updateFeeStructureSchema,
  generateInvoiceSchema,
  applyDiscountSchema,
  recordPaymentSchema,
  listInvoicesQuerySchema,
  collectionReportQuerySchema,
} from '../schemas/financeSchemas.js'
import * as financeService from '../services/financeService.js'
import mongoose from 'mongoose'
import { FeeInvoice } from '../models/FeeInvoice.js'
import { exportData, type ExportFormat } from '../../../shared/importExport/spreadsheet.js'

const router = Router()

// ── Fee Structures ───────────────────────────────────────────────────

router.post(
  '/structures',
  authenticate,
  resolveTenant,
  requirePermission('finance:manage'),
  async (req: Request, res: Response) => {
    try {
      const parsed = createFeeStructureSchema.parse(req.body)
      const tenantId = req.tenantId!
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()
      const structure = await financeService.createFeeStructure(tenantId, parsed, userId, req.user!.email)
      res.status(201).json(structure)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create fee structure'
      res.status(400).json({ error: message })
    }
  },
)

router.get(
  '/structures',
  authenticate,
  resolveTenant,
  requirePermission('finance:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const academicYearId = typeof req.query.academicYearId === 'string' ? req.query.academicYearId : undefined
      const structures = await financeService.listFeeStructures(tenantId, academicYearId)
      res.json(structures)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list fee structures'
      res.status(500).json({ error: message })
    }
  },
)

router.patch(
  '/structures/:id',
  authenticate,
  resolveTenant,
  requirePermission('finance:manage'),
  async (req: Request, res: Response) => {
    try {
      const parsed = updateFeeStructureSchema.parse(req.body)
      const tenantId = req.tenantId!
      const structureId = String(req.params.id)
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()
      const structure = await financeService.updateFeeStructure(tenantId, structureId, parsed, userId, req.user!.email)
      res.json(structure)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update fee structure'
      res.status(400).json({ error: message })
    }
  },
)

// ── Invoices ─────────────────────────────────────────────────────────

router.get('/invoices/export', authenticate, resolveTenant, requirePermission('finance:read'), async (req: Request, res: Response) => {
  const format = String(req.query.format || 'csv') as ExportFormat
  if (!['csv', 'xlsx', 'pdf'].includes(format)) { res.status(400).json({ error: 'format must be csv, xlsx, or pdf' }); return }
  const invoices = await FeeInvoice.find({ schoolId: req.tenantId! }).populate('studentId', 'admissionNo profile.firstName profile.lastName').lean()
  const file = await exportData({ format, columns: [{ key: 'student', label: 'Student' }, { key: 'total', label: 'Total' }, { key: 'paid', label: 'Paid' }, { key: 'balance', label: 'Balance' }, { key: 'status', label: 'Status' }], rows: invoices.map((invoice) => ({ student: `${(invoice.studentId as any)?.profile?.firstName ?? ''} ${(invoice.studentId as any)?.profile?.lastName ?? ''}`.trim(), total: invoice.totalAmount, paid: invoice.amountPaid, balance: invoice.balance, status: invoice.status })) })
  res.type(file.contentType).attachment(`invoices.${file.extension}`).send(file.buffer)
})

router.post(
  '/invoices/generate',
  authenticate,
  resolveTenant,
  requirePermission('finance:manage'),
  async (req: Request, res: Response) => {
    try {
      const parsed = generateInvoiceSchema.parse(req.body)
      const tenantId = req.tenantId!
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()
      const result = await financeService.generateInvoices(tenantId, parsed, userId, req.user!.email)
      res.status(201).json(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate invoices'
      res.status(400).json({ error: message })
    }
  },
)

router.get(
  '/invoices',
  authenticate,
  resolveTenant,
  requirePermission('finance:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const parsed = listInvoicesQuerySchema.parse(req.query)
      const invoices = await financeService.listInvoices(tenantId, parsed)
      res.json(invoices)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list invoices'
      res.status(500).json({ error: message })
    }
  },
)

router.get(
  '/invoices/:id',
  authenticate,
  resolveTenant,
  requirePermission('finance:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const invoiceId = String(req.params.id)
      const invoice = await financeService.getInvoiceById(tenantId, invoiceId)
      if (!invoice) {
        res.status(404).json({ error: 'Invoice not found' })
        return
      }
      res.json(invoice)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get invoice'
      res.status(500).json({ error: message })
    }
  },
)

router.post(
  '/invoices/:id/discount',
  authenticate,
  resolveTenant,
  requirePermission('finance:manage'),
  async (req: Request, res: Response) => {
    try {
      const parsed = applyDiscountSchema.parse(req.body)
      const tenantId = req.tenantId!
      const invoiceId = String(req.params.id)
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()
      const invoice = await financeService.applyDiscount(tenantId, invoiceId, parsed, userId, req.user!.email)
      res.json(invoice)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to apply discount'
      res.status(400).json({ error: message })
    }
  },
)

// ── Payments ─────────────────────────────────────────────────────────

router.post(
  '/invoices/:id/payments',
  authenticate,
  resolveTenant,
  requirePermission('finance:manage'),
  async (req: Request, res: Response) => {
    try {
      const parsed = recordPaymentSchema.parse(req.body)
      const tenantId = req.tenantId!
      const invoiceId = String(req.params.id)
      const userId = (req.user!._id as mongoose.Types.ObjectId).toString()
      const result = await financeService.recordPayment(tenantId, invoiceId, parsed, userId, req.user!.email)
      res.status(201).json(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record payment'
      res.status(400).json({ error: message })
    }
  },
)

router.get(
  '/payments/:id/receipt',
  authenticate,
  resolveTenant,
  requirePermission('finance:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const paymentId = String(req.params.id)
      const receipt = await financeService.getReceipt(tenantId, paymentId)
      if (!receipt) {
        res.status(404).json({ error: 'Receipt not found' })
        return
      }
      res.json(receipt)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get receipt'
      res.status(500).json({ error: message })
    }
  },
)

// ── Student Summary ──────────────────────────────────────────────────

router.get(
  '/student/:studentId/summary',
  authenticate,
  resolveTenant,
  requirePermission('finance:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const studentId = String(req.params.studentId)
      const summary = await financeService.getStudentFeeSummary(tenantId, studentId)
      res.json(summary)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get student fee summary'
      res.status(500).json({ error: message })
    }
  },
)

// ── Collection Report ────────────────────────────────────────────────

router.get(
  '/reports/collection',
  authenticate,
  resolveTenant,
  requirePermission('finance:read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const parsed = collectionReportQuerySchema.parse(req.query)
      const report = await financeService.getCollectionReport(tenantId, parsed)
      res.json(report)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get collection report'
      res.status(500).json({ error: message })
    }
  },
)

// ── Overdue Check (admin-triggered for now) ──────────────────────────

router.post(
  '/overdue-check',
  authenticate,
  resolveTenant,
  requirePermission('finance:manage'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!
      const result = await financeService.checkOverdueInvoices(tenantId)
      res.json(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to run overdue check'
      res.status(500).json({ error: message })
    }
  },
)

export default router
