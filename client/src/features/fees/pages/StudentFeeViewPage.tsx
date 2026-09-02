import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import type { RootState } from '../../../store'
import api from '../../../services/api'

interface FeeSummary {
  totalDue: number
  totalPaid: number
  outstanding: number
  invoiceCount: number
  overdueCount: number
}

interface Invoice {
  _id: string
  feeStructureId: { name: string }
  totalAmount: number
  amountPaid: number
  balance: number
  dueDate: string
  status: string
  lateFeeApplied: number
}

export default function StudentFeeViewPage() {
  const selectedChildId = useSelector((state: RootState) => state.parentPortal.selectedChildId)
  const [summary, setSummary] = useState<FeeSummary | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!selectedChildId) { setLoading(false); return }
    setLoading(true)

    Promise.all([
      api.get(`/fees/student/${selectedChildId}/summary`),
      api.get('/fees/invoices', { params: { studentId: selectedChildId } }),
    ])
      .then(([summaryRes, invoicesRes]) => {
        setSummary(summaryRes.data)
        setInvoices(invoicesRes.data)
      })
      .catch(() => setError('Failed to load fee data'))
      .finally(() => setLoading(false))
  }, [selectedChildId])

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
  if (!selectedChildId) return <div className="text-center text-secondary-400 py-8">Select a child to view fees</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-secondary-900">Fee Details</h1>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs font-medium text-secondary-500 uppercase">Total Due</p>
            <p className="text-2xl font-bold text-secondary-900 mt-1">${summary.totalDue.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs font-medium text-secondary-500 uppercase">Paid</p>
            <p className="text-2xl font-bold text-green-600 mt-1">${summary.totalPaid.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs font-medium text-secondary-500 uppercase">Outstanding</p>
            <p className={`text-2xl font-bold mt-1 ${summary.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ${summary.outstanding.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs font-medium text-secondary-500 uppercase">Overdue</p>
            <p className={`text-2xl font-bold mt-1 ${summary.overdueCount > 0 ? 'text-red-600' : 'text-secondary-400'}`}>
              {summary.overdueCount}
            </p>
          </div>
        </div>
      )}

      {/* Invoice list */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-5 border-b">
          <h2 className="font-semibold text-secondary-900">Invoices</h2>
        </div>
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-secondary-400">No invoices found</div>
        ) : (
          <div className="divide-y divide-secondary-100">
            {invoices.map((inv) => (
              <Link key={inv._id} to={`/fees/invoices/${inv._id}`}
                className="flex items-center justify-between p-4 hover:bg-secondary-50 transition-colors">
                <div>
                  <p className="font-medium text-secondary-900">{inv.feeStructureId?.name}</p>
                  <p className="text-sm text-secondary-500">Due: {new Date(inv.dueDate).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-secondary-900">${inv.balance.toFixed(2)}</p>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(inv.status)}`}>
                    {inv.status.replace('_', ' ')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
