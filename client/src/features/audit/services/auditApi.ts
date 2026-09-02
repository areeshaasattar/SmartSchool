import { createApi } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn } from '@reduxjs/toolkit/query'
import type { AxiosError } from 'axios'
import api from '../../../services/api'

export interface AuditLog { _id: string; schoolId?: string; actorId: string; actorEmail: string; action: string; entity: string; entityId?: string; before?: unknown; after?: unknown; timestamp: string }
export interface AuditFilters { schoolId?: string; entity?: string; action?: string; actorId?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number }
export interface AuditListResponse { logs: AuditLog[]; pagination: { page: number; limit: number; total: number; totalPages: number } }

const axiosBaseQuery: BaseQueryFn<{ url: string; params?: object }, unknown, { status?: number; data?: unknown }> = async ({ url, params }) => {
  try { return { data: (await api.get(url, { params })).data } }
  catch (error) { const err = error as AxiosError; return { error: { status: err.response?.status, data: err.response?.data } } }
}

export const auditApi = createApi({
  reducerPath: 'auditApi', baseQuery: axiosBaseQuery, tagTypes: ['AuditLog'],
  endpoints: (builder) => ({
    getAuditLogs: builder.query<AuditListResponse, AuditFilters>({ query: (params) => ({ url: '/audit/logs', params }), providesTags: ['AuditLog'] }),
    getAuditLog: builder.query<{ log: AuditLog }, string>({ query: (id) => ({ url: `/audit/logs/${id}` }), providesTags: ['AuditLog'] }),
    getEntityHistory: builder.query<{ logs: AuditLog[] }, { entity: string; entityId: string }>({ query: ({ entity, entityId }) => ({ url: `/audit/logs/entity/${entity}/${entityId}` }), providesTags: ['AuditLog'] }),
  }),
})

export const { useGetAuditLogsQuery, useGetAuditLogQuery, useGetEntityHistoryQuery } = auditApi
