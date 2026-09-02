import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
  academicYearId: string
  classId: string | null
  lateFeePolicy: { gracePeriodDays: number; lateFeeAmount: number; lateFeeType: string }
}

export default function FeeStructureFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isEdit = Boolean(id)

  const [name, setName] = useState('')
  const [components, setComponents] = useState<FeeComponent[]>([{ label: '', amount: 0 }])
  const [dueDate, setDueDate] = useState('')
  const [academicYearId, setAcademicYearId] = useState(searchParams.get('academicYearId') || '')
  const [classId, setClassId] = useState(searchParams.get('classId') || '')
  const [gracePeriodDays, setGracePeriodDays] = useState(0)
  const [lateFeeAmount, setLateFeeAmount] = useState(0)
  const [lateFeeType, setLateFeeType] = useState<'flat' | 'percentage'>('flat')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const totalAmount = components.reduce((sum, c) => sum + (c.amount || 0), 0)

  useEffect(() => {
    if (isEdit && id) {
      api.get(`/fees/structures`).then((res) => {
        const struct = res.data.find((s: FeeStructure) => s._id === id)
        if (struct) {
          setName(struct.name)
          setComponents(struct.components.length > 0 ? struct.components : [{ label: '', amount: 0 }])
          setDueDate(struct.dueDate.split('T')[0])
          setAcademicYearId(struct.academicYearId)
          setClassId(struct.classId || '')
          setGracePeriodDays(struct.lateFeePolicy.gracePeriodDays)
          setLateFeeAmount(struct.lateFeePolicy.lateFeeAmount)
          setLateFeeType(struct.lateFeePolicy.lateFeeType as 'flat' | 'percentage')
        }
      })
    }
  }, [id, isEdit])

  const addComponent = () => setComponents([...components, { label: '', amount: 0 }])
  const removeComponent = (index: number) => setComponents(components.filter((_, i) => i !== index))
  const updateComponent = (index: number, field: 'label' | 'amount', value: string | number) => {
    const updated = [...components]
    updated[index] = { ...updated[index], [field]: value }
    setComponents(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !dueDate || !academicYearId || components.some((c) => !c.label || c.amount <= 0)) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError('')

    const payload = {
      name,
      components,
      totalAmount,
      dueDate,
      academicYearId,
      classId: classId || null,
      lateFeePolicy: { gracePeriodDays, lateFeeAmount, lateFeeType },
    }

    try {
      if (isEdit && id) {
        await api.patch(`/fees/structures/${id}`, payload)
      } else {
        await api.post('/fees/structures', payload)
      }
      navigate('/fees/structures')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save fee structure'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-secondary-900 mb-6">
        {isEdit ? 'Edit Fee Structure' : 'New Fee Structure'}
      </h1>

      {error && <div className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600 mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-xl shadow-sm p-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Fee Structure Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
            placeholder="e.g. Term 1 Fees"
            required
          />
        </div>

        {/* Academic Year */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Academic Year ID *</label>
          <input
            type="text"
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)}
            className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
            placeholder="Academic year ID"
            required
          />
        </div>

        {/* Class (optional) */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Class (optional — leave blank for all classes)</label>
          <input
            type="text"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
            placeholder="Class ID (optional)"
          />
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">Due Date *</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
            required
          />
        </div>

        {/* Fee Components */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-secondary-700">Fee Components *</label>
            <button type="button" onClick={addComponent} className="text-sm text-primary-600 hover:text-primary-700">
              + Add Component
            </button>
          </div>
          <div className="space-y-2">
            {components.map((comp, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={comp.label}
                  onChange={(e) => updateComponent(i, 'label', e.target.value)}
                  className="flex-1 rounded-lg border border-secondary-300 px-3 py-2 text-sm"
                  placeholder="Label (e.g. Tuition)"
                  required
                />
                <input
                  type="number"
                  value={comp.amount || ''}
                  onChange={(e) => updateComponent(i, 'amount', parseFloat(e.target.value) || 0)}
                  className="w-28 rounded-lg border border-secondary-300 px-3 py-2 text-sm"
                  placeholder="Amount"
                  min="0"
                  step="0.01"
                  required
                />
                {components.length > 1 && (
                  <button type="button" onClick={() => removeComponent(i)} className="text-destructive-500 hover:text-destructive-700 text-sm">✕</button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-right text-sm font-medium text-secondary-900">
            Total: ${totalAmount.toFixed(2)}
          </div>
        </div>

        {/* Late Fee Policy */}
        <fieldset className="border border-secondary-200 rounded-lg p-4">
          <legend className="text-sm font-medium text-secondary-700 px-2">Late Fee Policy</legend>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div>
              <label className="block text-xs text-secondary-500 mb-1">Grace Period (days)</label>
              <input
                type="number"
                value={gracePeriodDays}
                onChange={(e) => setGracePeriodDays(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm"
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary-500 mb-1">Late Fee Amount</label>
              <input
                type="number"
                value={lateFeeAmount || ''}
                onChange={(e) => setLateFeeAmount(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary-500 mb-1">Type</label>
              <select
                value={lateFeeType}
                onChange={(e) => setLateFeeType(e.target.value as 'flat' | 'percentage')}
                className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm"
              >
                <option value="flat">Flat ($)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
            </div>
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : isEdit ? 'Update Fee Structure' : 'Create Fee Structure'}
        </button>
      </form>
    </div>
  )
}
