import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../../services/api'

interface Invoice {
  _id: string
  studentId: { _id: string; admissionNo: string; profile: { firstName: string; lastName: string } }
  feeStructureId: { name: string }
  totalAmount: number
  amountPaid: number
  balance: number
  dueDate: string
  status: string
  lateFeeApplied: number
}

export default function InvoiceListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const statusFilter = searchParams.get('status') || ''

  useEffect(() => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (statusFilter) params.status = statusFilter
    api.get('/fees/invoices', { params })
      .then((res) => setInvoices(res.data))
      .catch(() => setError('Failed to load invoices'))
      .finally(() => setLoading(false))
  }, [statusFilter])

  const statusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700'
      case 'partially_paid': return 'bg-blue-100 text-blue-700'
      case 'overdue': return 'bg-red-100 text-red-700'
      default: return 'bg-secondary-100 text-secondary-700'
    }
  }

  const statuses = ['', 'pending', 'partially_paid', 'paid', 'overdue']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900">Invoices</h1>
        <Link
          to="/fees/invoices/generate"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          + Generate Invoices
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => {
              if (s) setSearchParams({ status: s })
              else setSearchParams({})
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === s || (!statusFilter && !s)
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-secondary-300 text-secondary-700 hover:bg-secondary-50'
            }`}
          >
            {s ? s.replace('_', ' ') : 'All'}
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>}

      {loading ? (
        <div className="text-center text-secondary-500 py-8">Loading...</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <p className="text-secondary-400">No invoices found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-secondary-200">
            <thead className="bg-secondary-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Fee Structure</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Paid</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-secondary-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200">
              {invoices.map((inv) => (
                <tr key={inv._id} className="hover:bg-secondary-50">
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium text-secondary-900">
                      {inv.studentId?.profile?.firstName} {inv.studentId?.profile?.lastName}
                    </div>
                    <div className="text-xs text-secondary-500">{inv.studentId?.admissionNo}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary-700">{inv.feeStructureId?.name}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-secondary-900">
                    ${(inv.totalAmount + inv.lateFeeApplied).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-green-600">${inv.amountPaid.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-secondary-900">${inv.balance.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-secondary-500">{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(inv.status)}`}>
                      {inv.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link to={`/fees/invoices/${inv._id}`} className="text-sm text-primary-600 hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
