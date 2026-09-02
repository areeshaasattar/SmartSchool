import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../services/api'

interface Payment {
  _id: string
  amount: number
  method: string
  receiptNo: string
  paidAt: string
  studentId: { profile: { firstName: string; lastName: string }; admissionNo: string }
}

interface OverviewData {
  collectionRate: number
  totalInvoiced: number
  totalCollected: number
  totalOutstanding: number
  invoiceStats: { total: number; paid: number; partiallyPaid: number; pending: number; overdue: number }
  recentPayments: Payment[]
}

export default function AccountantDashboard() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/analytics/accountant/overview')
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center text-secondary-500 py-8">Loading dashboard...</div>
  if (!data) return <div className="text-center text-secondary-400 py-8">Failed to load dashboard</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-secondary-900">Finance Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Collection Rate */}
        <div className="rounded-xl bg-white p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-secondary-500">Collection Rate</p>
            <span className="text-2xl">📈</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{data.collectionRate}%</p>
          <div className="h-2 bg-secondary-100 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${data.collectionRate}%` }} />
          </div>
        </div>

        {/* Total Collected */}
        <div className="rounded-xl bg-white p-5 shadow-lg">
          <p className="text-sm font-medium text-secondary-500 mb-1">Total Collected</p>
          <p className="text-3xl font-bold text-green-600">${data.totalCollected.toLocaleString()}</p>
          <p className="text-xs text-secondary-400 mt-1">
            of ${data.totalInvoiced.toLocaleString()} invoiced
          </p>
        </div>

        {/* Outstanding */}
        <div className="rounded-xl bg-white p-5 shadow-lg">
          <p className="text-sm font-medium text-secondary-500 mb-1">Outstanding</p>
          <p className={`text-3xl font-bold ${data.totalOutstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ${data.totalOutstanding.toLocaleString()}
          </p>
        </div>

        {/* Invoice Stats */}
        <div className="rounded-xl bg-white p-5 shadow-lg md:col-span-2">
          <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-wide mb-3">Invoice Status</h3>
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{data.invoiceStats.paid}</p>
              <p className="text-xs text-secondary-400">Paid</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{data.invoiceStats.partiallyPaid}</p>
              <p className="text-xs text-secondary-400">Partial</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{data.invoiceStats.pending}</p>
              <p className="text-xs text-secondary-400">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{data.invoiceStats.overdue}</p>
              <p className="text-xs text-secondary-400">Overdue</p>
            </div>
          </div>
          <Link to="/fees/collection" className="text-xs text-primary-600 hover:underline mt-3 inline-block">
            View Collection Report →
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl bg-primary-50 p-5 shadow-lg">
          <p className="text-sm font-bold text-primary-700 mb-3">Quick Actions</p>
          <div className="space-y-2">
            <Link to="/fees/invoices/generate" className="block text-sm text-primary-600 hover:underline">Generate Invoices</Link>
            <Link to="/fees/invoices" className="block text-sm text-primary-600 hover:underline">View Invoices</Link>
            <Link to="/fees/structures" className="block text-sm text-primary-600 hover:underline">Fee Structures</Link>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="rounded-xl bg-white p-5 shadow-lg md:col-span-2">
          <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-wide mb-3">Recent Payments</h3>
          {data.recentPayments.length === 0 ? (
            <p className="text-sm text-secondary-400">No recent payments</p>
          ) : (
            <div className="space-y-2">
              {data.recentPayments.slice(0, 5).map((p) => (
                <div key={p._id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-secondary-900 font-medium">
                      {p.studentId?.profile?.firstName} {p.studentId?.profile?.lastName}
                    </span>
                    <span className="text-secondary-400 ml-2">{p.receiptNo}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-green-600">${p.amount.toLocaleString()}</span>
                    <span className="text-xs text-secondary-400 ml-2">{p.method}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
