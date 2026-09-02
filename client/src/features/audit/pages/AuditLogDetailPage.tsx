import { Link, useParams } from 'react-router-dom'
import { useGetAuditLogQuery } from '../services/auditApi'

function Value({ value }: { value: unknown }) { return <pre className="max-h-96 overflow-auto rounded-lg bg-secondary-950 p-4 text-xs leading-5 text-secondary-100">{JSON.stringify(value ?? {}, null, 2)}</pre> }
export default function AuditLogDetailPage() {
  const { id = '' } = useParams(); const { data, isLoading, error } = useGetAuditLogQuery(id)
  if (isLoading) return <p className="py-8 text-center text-secondary-500">Loading audit record...</p>
  if (error || !data) return <p className="rounded-lg bg-destructive-50 p-4 text-destructive-600">Audit record not found.</p>
  const { log } = data
  return <div className="space-y-6"><div><Link to="/audit/logs" className="text-sm text-primary-600 hover:underline">← Back to audit logs</Link><h1 className="mt-2 text-2xl font-bold capitalize text-secondary-900">{log.action.replaceAll('_', ' ')} {log.entity}</h1><p className="text-sm text-secondary-500">{log.actorEmail} · {new Date(log.timestamp).toLocaleString()}</p></div><div className="grid gap-4 rounded-xl bg-white p-5 text-sm shadow-sm sm:grid-cols-2"><p><span className="text-secondary-500">Entity ID:</span> {log.entityId || '—'}</p><p><span className="text-secondary-500">School ID:</span> {log.schoolId || 'Platform'}</p></div><div className="grid gap-6 lg:grid-cols-2"><section><h2 className="mb-2 font-semibold text-secondary-900">Before</h2><Value value={log.before} /></section><section><h2 className="mb-2 font-semibold text-secondary-900">After</h2><Value value={log.after} /></section></div></div>
}
