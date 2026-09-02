import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../../services/api'

interface Invoice {
  _id: string
  studentId: { _id: string; admissionNo: string; profile: { firstName: string; lastName: string } }
  feeStructureId: { name: string; components: { label: string; amount: number }[] }
  lineItems: { label: string; amount: number }[]
  discounts: { label: string; amount: number; reason?: string }[]
  totalAmount: number
  amountPaid: number
  balance: number
  dueDate: string
  status: string
  lateFeeApplied: number
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Discount form
  const [discountLabel, setDiscountLabel] = useState('')
  const [discountAmount, setDiscountAmount] = useState('')
  const [discountReason, setDiscountReason] = useState('')
  const [discountLoading, setDiscountLoading] = useState(false)

  // Payment form
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<string>('cash')
  const [payReference, setPayReference] = useState('')
  const [payLoading, setPayLoading] = useState(false)

  const loadInvoice = async () => {
    if (!id) return
    try {
      const res = await api.get(`/fees/invoices/${id}`)
      setInvoice(res.data)
    } catch {
      setError('Failed to load invoice')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadInvoice() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDiscount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!discountLabel || !discountAmount) return
    setDiscountLoading(true)
    try {
      await api.post(`/fees/invoices/${id}/discount`, {
        label: discountLabel,
        amount: parseFloat(discountAmount),
        reason: discountReason || undefined,
      })
      setDiscountLabel('')
      setDiscountAmount('')
      setDiscountReason('')
      await loadInvoice()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to apply discount'
      setError(message)
    } finally {
      setDiscountLoading(false)
    }
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payAmount || !payMethod) return
    setPayLoading(true)
    try {
      await api.post(`/fees/invoices/${id}/payments`, {
        amount: parseFloat(payAmount),
        method: payMethod,
        reference: payReference || undefined,
      })
      setPayAmount('')
      setPayReference('')
      await loadInvoice()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record payment'
      setError(message)
    } finally {
      setPayLoading(false)
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700'
      case 'partially_paid': return 'bg-blue-100 text-blue-700'
      case 'overdue': return 'bg-red-100 text-red-700'
      default: return 'bg-secondary-100 text-secondary-700'
    }
  }

  if (loading) return <div className="text-center text-secondary-500 py-8">Loading...</div>
  if (error) return <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>
  if (!invoice) return <div className="text-center py-8 text-secondary-400">Invoice not found</div>

  const totalDiscounts = invoice.discounts.reduce((s, d) => s + d.amount, 0)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/fees/invoices" className="text-sm text-primary-600 hover:underline">← Back to Invoices</Link>
          <h1 className="text-2xl font-bold text-secondary-900 mt-1">
            Invoice — {invoice.studentId?.profile?.firstName} {invoice.studentId?.profile?.lastName}
          </h1>
        </div>
        <div className="flex items-center gap-3"><Link to={`/audit/history?entity=invoice&entityId=${id}`} className="text-sm text-primary-600 hover:underline">View history</Link><span className={`rounded-full px-3 py-1 text-sm font-medium ${statusColor(invoice.status)}`}>{invoice.status.replace('_', ' ')}</span></div>
      </div>

      {/* Invoice Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-secondary-900">Summary</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-secondary-500">Fee Structure:</span> <span className="font-medium">{invoice.feeStructureId?.name}</span></div>
          <div><span className="text-secondary-500">Due Date:</span> <span className="font-medium">{new Date(invoice.dueDate).toLocaleDateString()}</span></div>
        </div>

        {/* Line Items */}
        <div className="border-t pt-3">
          <h3 className="text-xs font-medium text-secondary-500 uppercase mb-2">Line Items</h3>
          {invoice.lineItems.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <span className="text-secondary-700">{item.label}</span>
              <span className="font-medium">${item.amount.toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-medium border-t mt-2 pt-2">
            <span>Subtotal</span>
            <span>${invoice.totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Discounts */}
        {invoice.discounts.length > 0 && (
          <div className="border-t pt-3">
            <h3 className="text-xs font-medium text-secondary-500 uppercase mb-2">Discounts</h3>
            {invoice.discounts.map((d, i) => (
              <div key={i} className="flex justify-between text-sm py-1">
                <span className="text-secondary-700">{d.label} {d.reason && <span className="text-xs text-secondary-400">({d.reason})</span>}</span>
                <span className="text-green-600">-${d.amount.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-medium border-t mt-2 pt-2">
              <span>Total Discounts</span>
              <span className="text-green-600">-${totalDiscounts.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Late Fee */}
        {invoice.lateFeeApplied > 0 && (
          <div className="flex justify-between text-sm text-red-600 border-t pt-3">
            <span>Late Fee Applied</span>
            <span className="font-medium">+${invoice.lateFeeApplied.toFixed(2)}</span>
          </div>
        )}

        {/* Totals */}
        <div className="border-t pt-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-secondary-500">Amount Paid</span>
            <span className="text-green-600 font-medium">${invoice.amountPaid.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Balance Due</span>
            <span className={invoice.balance > 0 ? 'text-red-600' : 'text-green-600'}>
              ${invoice.balance.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Apply Discount */}
      {invoice.status !== 'paid' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-secondary-900 mb-3">Apply Discount</h2>
          <form onSubmit={handleDiscount} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={discountLabel} onChange={(e) => setDiscountLabel(e.target.value)}
                className="rounded-lg border border-secondary-300 px-3 py-2 text-sm" placeholder="Discount label" required />
              <input type="number" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)}
                className="rounded-lg border border-secondary-300 px-3 py-2 text-sm" placeholder="Amount" min="0.01" step="0.01" required />
            </div>
            <input type="text" value={discountReason} onChange={(e) => setDiscountReason(e.target.value)}
              className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm" placeholder="Reason (optional)" />
            <button type="submit" disabled={discountLoading}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50">
              {discountLoading ? 'Applying...' : 'Apply Discount'}
            </button>
          </form>
        </div>
      )}

      {/* Record Payment */}
      {invoice.status !== 'paid' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-secondary-900 mb-3">Record Payment</h2>
          <form onSubmit={handlePayment} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                className="rounded-lg border border-secondary-300 px-3 py-2 text-sm"
                placeholder={`Max: $${invoice.balance.toFixed(2)}`} min="0.01" step="0.01"
                max={invoice.balance} required />
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
                className="rounded-lg border border-secondary-300 px-3 py-2 text-sm">
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="card_manual">Card (Manual)</option>
              </select>
            </div>
            <input type="text" value={payReference} onChange={(e) => setPayReference(e.target.value)}
              className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm" placeholder="Reference (optional)" />
            <button type="submit" disabled={payLoading}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
              {payLoading ? 'Recording...' : 'Record Payment'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
