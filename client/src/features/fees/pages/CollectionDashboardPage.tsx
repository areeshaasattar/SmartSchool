import { useState, useEffect } from 'react'
import api from '../../../services/api'

interface CollectionReport {
  totalInvoiced: number
  totalCollected: number
  totalOutstanding: number
  collectionRate: number
  invoiceStats: {
    total: number
    paid: number
    partiallyPaid: number
    pending: number
    overdue: number
  }
}

export default function CollectionDashboardPage() {
  const [report, setReport] = useState<CollectionReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get('/fees/reports/collection')
      .then((res) => setReport(res.data))
      .catch(() => setError('Failed to load collection report'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center text-secondary-500 py-8">Loading...</div>
  if (error) return <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>
  if (!report) return null

  const stats = [
    { label: 'Total Invoiced', value: `$${report.totalInvoiced.toLocaleString()}`, color: 'text-secondary-900' },
    { label: 'Total Collected', value: `$${report.totalCollected.toLocaleString()}`, color: 'text-green-600' },
    { label: 'Outstanding', value: `$${report.totalOutstanding.toLocaleString()}`, color: 'text-red-600' },
    { label: 'Collection Rate', value: `${report.collectionRate}%`, color: 'text-primary-600' },
  ]

  const statusBreakdown = [
    { label: 'Paid', count: report.invoiceStats.paid, color: 'bg-green-500', pct: report.invoiceStats.total ? (report.invoiceStats.paid / report.invoiceStats.total * 100) : 0 },
    { label: 'Partially Paid', count: report.invoiceStats.partiallyPaid, color: 'bg-blue-500', pct: report.invoiceStats.total ? (report.invoiceStats.partiallyPaid / report.invoiceStats.total * 100) : 0 },
    { label: 'Pending', count: report.invoiceStats.pending, color: 'bg-secondary-400', pct: report.invoiceStats.total ? (report.invoiceStats.pending / report.invoiceStats.total * 100) : 0 },
    { label: 'Overdue', count: report.invoiceStats.overdue, color: 'bg-red-500', pct: report.invoiceStats.total ? (report.invoiceStats.overdue / report.invoiceStats.total * 100) : 0 },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-secondary-900">Collection Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs font-medium text-secondary-500 uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Collection rate bar */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-bold text-secondary-900 uppercase tracking-wide mb-3">Collection Rate</h2>
        <div className="h-6 rounded-full bg-secondary-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${report.collectionRate}%` }}
          />
        </div>
        <p className="text-sm text-secondary-500 mt-2">{report.collectionRate}% of total invoiced amount collected</p>
      </div>

      {/* Invoice status breakdown */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-bold text-secondary-900 uppercase tracking-wide mb-3">
          Invoice Status ({report.invoiceStats.total} total)
        </h2>
        <div className="space-y-3">
          {statusBreakdown.map((s) => (
            <div key={s.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-secondary-700">{s.label}</span>
                <span className="font-medium text-secondary-900">{s.count}</span>
              </div>
              <div className="h-2 rounded-full bg-secondary-100 overflow-hidden">
                <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
