import mongoose from 'mongoose'
import { z } from 'zod'
import { AIInsight, IAIInsight, AIInsightType } from '../models/AIInsight.js'
import { AIQueryLog } from '../../models/AIQueryLog.js'
import {
  AIServiceClientError,
  summarizeInsight,
  InsightSummaryResponse,
} from '../../services/aiServiceClient.js'
import {
  buildAcademicAggregate,
  buildAttendanceAggregate,
  buildBriefingAggregate,
  assertNoRawStudentIdentifiers,
} from './insightAggregates.js'

export const INSIGHT_TYPES: AIInsightType[] = ['academic', 'attendance', 'briefing']

export class InsightError extends Error {
  constructor(message: string, public readonly statusCode = 400) {
    super(message)
  }
}

const generateSchema = z.object({
  weeks: z.number().int().min(1).max(26).optional(),
})

const listSchema = z.object({
  type: z.enum(['academic', 'attendance', 'briefing']).optional(),
  limit: z.number().int().min(1).max(50).optional(),
})

export interface GenerateInsightInput {
  schoolId: string
  requestedBy: string
  type: AIInsightType
  body: unknown
  classIds?: string[]
}

/**
 * Generate one insight.
 *
 * Flow: build aggregate (no PII) -> guardrail check -> AI summarize ->
 * persist snapshot + narrative -> log to aiquerylogs.
 * The AI never sees raw student documents and never triggers actions;
 * a human must acknowledge the result afterwards.
 */
export async function generateInsight(input: GenerateInsightInput): Promise<IAIInsight> {
  const parsed = generateSchema.safeParse(input.body ?? {})
  if (!parsed.success) {
    throw new InsightError('Invalid request body: expected optional integer weeks (1-26)')
  }
  const weeks = parsed.data.weeks ?? 8

  // ── (a)+(b): build the anonymized aggregate for the requested scope ──
  let aggregate: Record<string, unknown>
  let scopeDescription: string

  try {
    if (input.type === 'academic') {
      aggregate = (await buildAcademicAggregate(input.schoolId, { weeks, classIds: input.classIds })) as unknown as Record<string, unknown>
      scopeDescription = input.classIds?.length
        ? `Academic performance for ${input.classIds.length} assigned class(es), last ${weeks} weeks`
        : `Academic performance across all classes, last ${weeks} weeks`
    } else if (input.type === 'attendance') {
      aggregate = (await buildAttendanceAggregate(input.schoolId, { weeks, classIds: input.classIds })) as unknown as Record<string, unknown>
      scopeDescription = input.classIds?.length
        ? `Attendance for ${input.classIds.length} assigned class(es), last ${weeks} weeks`
        : `Attendance across all classes, last ${weeks} weeks`
    } else {
      aggregate = (await buildBriefingAggregate(input.schoolId)) as unknown as Record<string, unknown>
      scopeDescription = `Monthly operational briefing (last 30 days) from approved dashboard data`
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build insight aggregate'
    throw new InsightError(message, 500)
  }

  // ── HARD RULE enforcement: refuse to send anything identifier-shaped ──
  assertNoRawStudentIdentifiers(aggregate)

  // ── (c): ask the AI service to narrate the aggregate ────────────────
  let summary: InsightSummaryResponse
  try {
    summary = await summarizeInsight({
      insightType: input.type,
      aggregateData: aggregate,
      schoolContext: {
        scopeDescription,
        periodWeeks: input.type === 'briefing' ? undefined : weeks,
      },
    })
  } catch (error) {
    const message = error instanceof AIServiceClientError ? error.message : 'AI service request failed'
    throw new InsightError(message, 502)
  }

  if (summary.status === 'error') {
    throw new InsightError(summary.result.message || 'AI service returned an error', 502)
  }

  // ── (d): persist with the exact aggregate that was sent ─────────────
  const insight = await AIInsight.create({
    schoolId: new mongoose.Types.ObjectId(input.schoolId),
    type: input.type,
    requestedBy: new mongoose.Types.ObjectId(input.requestedBy),
    scopeDescription,
    sourceDataSnapshot: aggregate,
    narrative: summary.result.narrative,
    keyPoints: summary.result.keyPoints,
    caveats: summary.result.caveats,
    status: 'generated',
  })

  await AIQueryLog.create({
    schoolId: new mongoose.Types.ObjectId(input.schoolId),
    userId: new mongoose.Types.ObjectId(input.requestedBy),
    requestType: `insight_${input.type}`,
    answered: summary.status === 'ok',
    feature: 'insight',
  })

  return insight
}

export interface ListInsightsInput {
  schoolId: string
  query: unknown
}

export async function listInsights(input: ListInsightsInput): Promise<{
  insights: IAIInsight[]
  total: number
}> {
  const parsed = listSchema.safeParse(input.query ?? {})
  if (!parsed.success) {
    throw new InsightError('Invalid query: type must be academic|attendance|briefing, limit 1-50')
  }
  const { type, limit = 10 } = parsed.data

  const query: Record<string, unknown> = {
    schoolId: new mongoose.Types.ObjectId(input.schoolId),
  }
  if (type) query.type = type

  const [insights, total] = await Promise.all([
    AIInsight.find(query).sort({ createdAt: -1 }).limit(limit),
    AIInsight.countDocuments(query),
  ])

  return { insights, total }
}

export interface AcknowledgeInput {
  schoolId: string
  insightId: string
  acknowledgedBy: string
}

/**
 * Human-in-the-loop: mark an insight as reviewed. Acknowledging NEVER
 * triggers any automated intervention — it only records that a human saw it.
 */
export async function acknowledgeInsight(input: AcknowledgeInput): Promise<IAIInsight | null> {
  return AIInsight.findOneAndUpdate(
    {
      _id: input.insightId,
      schoolId: new mongoose.Types.ObjectId(input.schoolId),
    },
    {
      $set: {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedBy: new mongoose.Types.ObjectId(input.acknowledgedBy),
      },
    },
    { new: true },
  )
}
