import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export type InsightType = 'academic' | 'attendance' | 'briefing'
export type InsightStatus = 'generated' | 'acknowledged'

export interface AIInsight {
  _id: string
  type: InsightType
  scopeDescription: string
  sourceDataSnapshot: Record<string, unknown>
  narrative: string
  keyPoints: string[]
  caveats: string[]
  status: InsightStatus
  requestedBy?: { _id: string; profile?: { firstName: string; lastName: string } }
  acknowledgedAt?: string
  createdAt: string
}

interface InsightsListResponse {
  insights: AIInsight[]
  total: number
}

export interface GenerateInsightResponse extends AIInsight {}

export const insightsApi = createApi({
  reducerPath: 'insightsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/ai/insights' }),
  tagTypes: ['Insights'],
  endpoints: (build) => ({
    listInsights: build.query<InsightsListResponse, { type?: InsightType; limit?: number }>({
      query: ({ type, limit = 10 } = {}) => {
        const params = new URLSearchParams()
        if (type) params.set('type', type)
        params.set('limit', String(limit))
        return { url: '', params }
      },
      providesTags: ['Insights'],
    }),

    generateInsight: build.mutation<GenerateInsightResponse, { type: InsightType; weeks?: number }>({
      query: ({ type, weeks }) => {
        const urls: Record<InsightType, string> = {
          academic: '/academic',
          attendance: '/attendance',
          briefing: '/principal-briefing',
        }
        return { url: urls[type], method: 'POST', body: weeks ? { weeks } : {} }
      },
      invalidatesTags: ['Insights'],
    }),

    acknowledgeInsight: build.mutation<AIInsight, string>({
      query: (id) => ({ url: `/${id}/acknowledge`, method: 'POST', body: {} }),
      invalidatesTags: ['Insights'],
    }),
  }),
})

export const { useListInsightsQuery, useGenerateInsightMutation, useAcknowledgeInsightMutation } = insightsApi
