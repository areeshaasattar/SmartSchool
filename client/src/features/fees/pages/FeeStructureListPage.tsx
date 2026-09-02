import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../services/api'

interface FeeComponent {
  label: string
  amount: number
}

interface FeeStructure {
  _id: string
  name: string
  components: FeeComponent[]
  totalAmount: number
  dueDate: string
  classId: string | null
  lateFeePolicy: { gracePeriodDays: number; lateFeeAmount: number; lateFeeType: string }
}

export default function FeeStructureListPage() {
  const [structures, setStructures] = useState<FeeStructure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get('/fees/structures')
      .then((res) => setStructures(res.data))
      .catch(() => setError('Failed to load fee structures'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900">Fee Structures</h1>
        <Link
          to="/fees/structures/new"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          + New Fee Structure
        </Link>
      </div>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">{error}</div>}

      {loading ? (
        <div className="text-center text-secondary-500 py-8">Loading...</div>
      ) : structures.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <p className="text-secondary-400">No fee structures yet</p>
          <p className="text-xs text-secondary-300 mt-2">Create your first fee structure to start generating invoices.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {structures.map((s) => (
            <div key={s._id} className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-secondary-900">{s.name}</h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-secondary-500">
                    <span>Total: <span className="font-medium text-secondary-700">${s.totalAmount.toFixed(2)}</span></span>
                    <span>Due: {new Date(s.dueDate).toLocaleDateString()}</span>
                    {s.lateFeePolicy.lateFeeAmount > 0 && (
                      <span className="text-amber-600">
                        Late fee: ${s.lateFeePolicy.lateFeeAmount} ({s.lateFeePolicy.lateFeeType})
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {s.components.map((c, i) => (
                      <span key={i} className="rounded-full bg-secondary-100 px-2.5 py-0.5 text-xs text-secondary-600">
                        {c.label}: ${c.amount}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/fees/structures/${s._id}/edit`}
                    className="rounded-lg border border-secondary-300 px-3 py-1.5 text-sm text-secondary-700 hover:bg-secondary-50"
                  >
                    Edit
                  </Link>
                  <Link
                    to={`/fees/invoices/generate?structureId=${s._id}`}
                    className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm text-white hover:bg-primary-700"
                  >
                    Generate Invoices
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
