import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../../services/api'

interface Receipt {
  receiptNo: string
  amount: number
  method: string
  reference?: string
  paidAt: string
  student: { admissionNo: string; profile: { firstName: string; lastName: string } }
  invoice: { totalAmount: number; amountPaid: number; balance: number; dueDate: string }
  recordedBy: { email: string }
  pdfAvailable: boolean
}

export default function ReceiptViewPage() {
  const { id } = useParams<{ id: string }>()
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    api.get(`/fees/payments/${id}/receipt`)
      .then((res) => setReceipt(res.data))
      .catch(() => setError('Failed to load receipt'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-center text-secondary-500 py-8">Loading...</div>
  if (error) return <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>
  if (!receipt) return <div className="text-center py-8 text-secondary-400">Receipt not found</div>

  const methodLabels: Record<string, string> = {
    cash: 'Cash',
    bank_transfer: 'Bank Transfer',
    cheque: 'Cheque',
    card_manual: 'Card (Manual)',
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link to="/portal/fees" className="text-sm text-primary-600 hover:underline">← Back to Fees</Link>

      <div className="mt-4 bg-white rounded-xl shadow-sm p-8">
        {/* Header */}
        <div className="text-center border-b pb-4 mb-6">
          <h1 className="text-xl font-bold text-secondary-900">Payment Receipt</h1>
          <p className="text-sm text-secondary-500 mt-1">Receipt #{receipt.receiptNo}</p>
        </div>

        {/* Receipt Details */}
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-secondary-500">Student</span>
            <span className="font-medium text-secondary-900">
              {receipt.student?.profile?.firstName} {receipt.student?.profile?.lastName}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-secondary-500">Admission No</span>
            <span className="font-medium text-secondary-900">{receipt.student?.admissionNo}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-secondary-500">Amount Paid</span>
            <span className="text-lg font-bold text-green-600">${receipt.amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-secondary-500">Payment Method</span>
            <span className="font-medium text-secondary-900">{methodLabels[receipt.method] || receipt.method}</span>
          </div>
          {receipt.reference && (
            <div className="flex justify-between text-sm">
              <span className="text-secondary-500">Reference</span>
              <span className="font-medium text-secondary-900">{receipt.reference}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-secondary-500">Date</span>
            <span className="font-medium text-secondary-900">{new Date(receipt.paidAt).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-secondary-500">Recorded By</span>
            <span className="font-medium text-secondary-900">{receipt.recordedBy?.email}</span>
          </div>

          {/* Invoice Balance */}
          <div className="border-t pt-4 mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-secondary-500">Invoice Total</span>
              <span className="font-medium">${receipt.invoice?.totalAmount?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary-500">Total Paid</span>
              <span className="font-medium text-green-600">${receipt.invoice?.amountPaid?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>Remaining Balance</span>
              <span className={receipt.invoice?.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                ${receipt.invoice?.balance?.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* PDF Download Stub */}
        <div className="mt-6 text-center">
          <button disabled className="rounded-lg bg-secondary-200 px-6 py-2.5 text-sm font-medium text-secondary-500 cursor-not-allowed">
            Download PDF (Coming Soon)
          </button>
          <p className="text-xs text-secondary-300 mt-2">PDF export will be available once the document generation pipeline is built.</p>
        </div>
      </div>
    </div>
  )
}
