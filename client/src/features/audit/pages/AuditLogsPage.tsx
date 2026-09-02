import { Link, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../store'
import { useGetAuditLogsQuery, useGetEntityHistoryQuery } from '../services/auditApi'

const entities = ['', 'student', 'invoice', 'exam', 'teacher', 'attendance', 'payment', 'class', 'transport']

export default function AuditLogsPage({ history }: { history?: boolean }) {
  const [params, setParams] = useSearchParams()
  const user = useSelector((state: RootState) => state.auth.user)
  const entity = params.get('entity') || ''
  const entityId = params.get('entityId') || ''
  const page = Number(params.get('page') || 1)
  const filters = { entity: entity || undefined, action: params.get('action') || undefined, actorId: params.get('actorId') || undefined, dateFrom: params.get('dateFrom') || undefined, dateTo: params.get('dateTo') || undefined, schoolId: user?.roles.includes('super_admin') ? params.get('schoolId') || undefined : undefined, page, limit: 25 }
  const list = useGetAuditLogsQuery(filters, { skip: history })
  const entityHistory = useGetEntityHistoryQuery({ entity, entityId }, { skip: !history || !entity || !entityId })
  const logs = history ? entityHistory.data?.logs : list.data?.logs
  const error = history ? entityHistory.error : list.error
  const loading = history ? entityHistory.isLoading : list.isLoading
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); value ? next.set(key, value) : next.delete(key); if (key !== 'page') next.delete('page'); setParams(next) }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold text-secondary-900">{history ? 'Entity history' : 'Audit logs'}</h1><p className="mt-1 text-sm text-secondary-500">{history ? `${entity} · ${entityId}` : 'Review sensitive changes across the school.'}</p></div>{history && <Link to="/audit/logs" className="text-sm text-primary-600 hover:underline">View all logs</Link>}</div>
    {!history && <div className="grid gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
      <select value={entity} onChange={(e) => update('entity', e.target.value)} className="rounded-lg border border-secondary-300 px-3 py-2 text-sm">{entities.map((item) => <option key={item} value={item}>{item || 'All entities'}</option>)}</select>
      <input value={params.get('action') || ''} onChange={(e) => update('action', e.target.value)} placeholder="Action (e.g. update)" className="rounded-lg border border-secondary-300 px-3 py-2 text-sm" />
      <input type="date" value={params.get('dateFrom') || ''} onChange={(e) => update('dateFrom', e.target.value)} className="rounded-lg border border-secondary-300 px-3 py-2 text-sm" />
      <input type="date" value={params.get('dateTo') || ''} onChange={(e) => update('dateTo', e.target.value)} className="rounded-lg border border-secondary-300 px-3 py-2 text-sm" />
      {user?.roles.includes('super_admin') && <input value={params.get('schoolId') || ''} onChange={(e) => update('schoolId', e.target.value)} placeholder="School ID (optional)" className="rounded-lg border border-secondary-300 px-3 py-2 text-sm" />}
    </div>}
    {loading ? <p className="py-8 text-center text-secondary-500">Loading audit logs...</p> : error ? <p className="rounded-lg bg-destructive-50 p-4 text-sm text-destructive-600">Unable to load audit logs.</p> : !logs?.length ? <p className="rounded-xl bg-white p-8 text-center text-secondary-500 shadow-sm">No audit records found.</p> : <div className="overflow-x-auto rounded-xl bg-white shadow-sm"><table className="w-full text-left text-sm"><thead className="bg-secondary-50 text-secondary-600"><tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th><th className="px-4 py-3">Review</th></tr></thead><tbody className="divide-y divide-secondary-100">{logs.map((log) => <tr key={log._id}><td className="whitespace-nowrap px-4 py-3 text-secondary-600">{new Date(log.timestamp).toLocaleString()}</td><td className="px-4 py-3">{log.actorEmail}</td><td className="px-4 py-3 font-medium capitalize">{log.action.replaceAll('_', ' ')}</td><td className="px-4 py-3 capitalize">{log.entity}{log.entityId ? <span className="text-secondary-400"> · {log.entityId}</span> : ''}</td><td className="px-4 py-3"><Link to={`/audit/logs/${log._id}`} className="text-primary-600 hover:underline">Details</Link></td></tr>)}</tbody></table></div>}
    {!history && list.data && <div className="flex items-center justify-between text-sm"><span className="text-secondary-500">{list.data.pagination.total} records</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => update('page', String(page - 1))} className="rounded border px-3 py-1 disabled:opacity-40">Previous</button><button disabled={page >= list.data.pagination.totalPages} onClick={() => update('page', String(page + 1))} className="rounded border px-3 py-1 disabled:opacity-40">Next</button></div></div>}
  </div>
}
