import { useState } from 'react'
import type { FormEvent } from 'react'
import api from '../../../services/api'

export default function AIAssistantPage() {
  const [requestType, setRequestType] = useState('school_policy_query')
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await api.post('/ai/query', { requestType, payload: { query } })
      setResponse(JSON.stringify(result.data, null, 2))
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined
      setError(message || 'Unable to reach the AI service.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">AI Assistant</h1>
        <p className="mt-1 text-sm text-secondary-500">A placeholder connection for upcoming SmartSchool AI tools.</p>
      </div>
      <form onSubmit={submit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium text-secondary-700">
          Request type
          <input value={requestType} onChange={(event) => setRequestType(event.target.value)} required className="mt-1 w-full rounded-lg border border-secondary-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium text-secondary-700">
          Query
          <textarea value={query} onChange={(event) => setQuery(event.target.value)} className="mt-1 min-h-28 w-full rounded-lg border border-secondary-300 px-3 py-2" placeholder="Ask a future AI capability..." />
        </label>
        <button disabled={loading} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {loading ? 'Sending…' : 'Send request'}
        </button>
      </form>
      {error && <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {response && <pre className="overflow-auto rounded-xl bg-secondary-900 p-5 text-sm text-secondary-100">{response}</pre>}
    </div>
  )
}
