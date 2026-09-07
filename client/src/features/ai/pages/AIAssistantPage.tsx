import { useState } from 'react'
import type { FormEvent } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../store'
import api from '../../../services/api'

interface Source { documentId: string; title: string; chunkIndex: number }
interface Message { role: 'user' | 'assistant'; text: string; sources?: Source[] }

export default function AIAssistantPage() {
  const roles = useSelector((state: RootState) => state.auth.user?.roles || [])
  const isParent = roles.includes('parent')
  const canUsePolicy = roles.some((role) => ['school_admin', 'principal', 'teacher'].includes(role))
  const [requestType, setRequestType] = useState(isParent ? 'parent_academic_query' : 'school_policy_query')
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const userQuery = query.trim()
    if (!userQuery) return
    setMessages((current) => [...current, { role: 'user', text: userQuery }])
    setQuery('')
    setLoading(true)
    setError('')
    try {
      const result = await api.post('/ai/query', { requestType, payload: { query: userQuery } })
      setMessages((current) => [...current, {
        role: 'assistant', text: result.data.result?.answer || 'I could not produce an answer.', sources: result.data.sources || [],
      }])
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined
      setError(message || 'Unable to reach the AI service.')
    } finally {
      setLoading(false)
    }
  }

  if (!isParent && !canUsePolicy) return <div className="rounded-xl bg-white p-6 text-secondary-600 shadow-sm">The AI Assistant is not available for your role.</div>

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">AI Assistant</h1>
        <p className="mt-1 text-sm text-secondary-500">Answers are grounded only in information you are authorized to access.</p>
      </div>
      {isParent && canUsePolicy && <select value={requestType} onChange={(event) => setRequestType(event.target.value)} className="w-fit rounded-lg border border-secondary-300 px-3 py-2 text-sm"><option value="parent_academic_query">My child’s academic assistant</option><option value="school_policy_query">School policy assistant</option></select>}
      <div className="min-h-80 space-y-4 rounded-xl bg-white p-5 shadow-sm">
        {messages.length === 0 && <p className="text-sm text-secondary-400">Ask a question to start a grounded conversation.</p>}
        {messages.map((message, index) => <div key={index} className={message.role === 'user' ? 'ml-auto max-w-[80%] rounded-xl bg-primary-600 p-3 text-sm text-white' : 'max-w-[90%] rounded-xl bg-secondary-50 p-3 text-sm text-secondary-800'}><p>{message.text}</p>{!!message.sources?.length && <div className="mt-3 border-t border-secondary-200 pt-2 text-xs text-secondary-500"><p className="font-semibold">Sources</p>{message.sources.map((source) => <a key={`${source.documentId}-${source.chunkIndex}`} href={`/documents/${source.documentId}`} className="mt-1 block text-primary-700 hover:underline">{source.title}</a>)}</div>}</div>)}
        {loading && <p className="text-sm text-secondary-500">Finding authorized information…</p>}
      </div>
      {error && <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      <form onSubmit={submit} className="flex gap-3"><textarea value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-12 flex-1 rounded-lg border border-secondary-300 px-3 py-2" placeholder="Ask a question…" /><button disabled={loading} className="rounded-lg bg-primary-600 px-5 text-sm font-medium text-white disabled:opacity-50">Send</button></form>
    </div>
  )
}
