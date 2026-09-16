import { useState } from 'react'
import { ChevronDown, ChevronUp, Sparkles, ShieldAlert, CheckCircle2, Loader2, Info } from 'lucide-react'
import { useGenerateInsightMutation, useAcknowledgeInsightMutation } from '../api/insightsApi'
import type { AIInsight, InsightType } from '../api/insightsApi'

const TYPE_LABELS: Record<InsightType, string> = {
  academic: 'Academic Insights',
  attendance: 'Attendance Insights',
  briefing: 'Principal Briefing',
}

const TYPE_DESCRIPTIONS: Record<InsightType, string> = {
  academic: 'Trends in authorized grades and assignment completion',
  attendance: 'Attendance trends and configured threshold concerns',
  briefing: 'Monthly operational summary from approved dashboard data',
}

interface AIInsightCardProps {
  type: InsightType
  /** Past insights to display (already scoped server-side to the caller's role). */
  insights: AIInsight[]
}

/**
 * Human-in-the-loop by design: this card renders AI-generated, non-authoritative
 * summaries. Every number shown is traceable via the "Evidence" section to the
 * exact aggregate that was sent to the model. Acknowledging only records that a
 * human reviewed the insight — it never triggers any automated intervention.
 */
export default function AIInsightCard({ type, insights }: AIInsightCardProps) {
  const [generate, { isLoading: isGenerating }] = useGenerateInsightMutation()
  const [acknowledge, { isLoading: isAcknowledging }] = useAcknowledgeInsightMutation()
  const [error, setError] = useState<string | null>(null)
  const [evidenceOpenId, setEvidenceOpenId] = useState<string | null>(null)

  const handleGenerate = async () => {
    setError(null)
    try {
      await generate({ type }).unwrap()
    } catch (err) {
      const message =
        (err as { data?: { error?: string } })?.data?.error ?? 'Failed to generate insight'
      setError(message)
    }
  }

  const handleAcknowledge = async (id: string) => {
    setError(null)
    try {
      await acknowledge(id).unwrap()
    } catch (err) {
      const message =
        (err as { data?: { error?: string } })?.data?.error ?? 'Failed to acknowledge insight'
      setError(message)
    }
  }

  return (
    <section className="rounded-card bg-surface p-6 shadow-card">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-lavender text-brand-lavender-strong">
              <Sparkles size={16} strokeWidth={1.75} />
            </span>
            <h2 className="font-heading text-lg font-semibold text-text-heading">{TYPE_LABELS[type]}</h2>
          </div>
          <p className="mt-1 text-sm text-text-muted">{TYPE_DESCRIPTIONS[type]}</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-blue-strong px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Generating…
            </>
          ) : (
            'Generate'
          )}
        </button>
      </header>

      {/* Non-authoritative AI banner — always visible */}
      <div className="mb-4 flex items-start gap-2 rounded-xl bg-brand-sky px-3 py-2 text-xs text-text-body">
        <Info size={14} className="mt-0.5 shrink-0 text-brand-blue-strong" />
        <span>
          <strong>AI-generated</strong> — informational only, based on aggregated data. It does not
          decide or take action; human review is required before any intervention.
        </span>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-destructive-50 px-3 py-2 text-sm text-destructive-600">
          <ShieldAlert size={14} /> {error}
        </div>
      )}

      {insights.length === 0 ? (
        <p className="py-4 text-center text-sm text-secondary-400">
          No insights generated yet. Click Generate to summarize the latest aggregates.
        </p>
      ) : (
        <ul className="space-y-4">
          {insights.map((insight) => (
            <li key={insight._id} className="rounded-xl border border-secondary-100 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs text-text-muted">
                  {new Date(insight.createdAt).toLocaleString()} · {insight.scopeDescription}
                </p>
                {insight.status === 'acknowledged' ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-pill bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success">
                    <CheckCircle2 size={12} /> Acknowledged
                  </span>
                ) : (
                  <span className="shrink-0 rounded-pill bg-brand-yellow px-2.5 py-0.5 text-xs font-semibold text-text-heading">
                    Needs review
                  </span>
                )}
              </div>

              <p className="whitespace-pre-line text-sm leading-relaxed text-text-body">{insight.narrative}</p>

              {insight.keyPoints.length > 0 && (
                <div className="mt-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Key points</h3>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-text-body">
                    {insight.keyPoints.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {insight.caveats.length > 0 && (
                <div className="mt-3 rounded-xl bg-brand-yellow/40 px-3 py-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-text-heading">Caveats</h3>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-text-body">
                    {insight.caveats.map((caveat, i) => (
                      <li key={i}>{caveat}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => setEvidenceOpenId(evidenceOpenId === insight._id ? null : insight._id)}
                  className="flex items-center gap-1 text-sm font-medium text-brand-blue-strong hover:underline"
                  aria-expanded={evidenceOpenId === insight._id}
                >
                  Evidence
                  {evidenceOpenId === insight._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {insight.status === 'generated' && (
                  <button
                    onClick={() => handleAcknowledge(insight._id)}
                    disabled={isAcknowledging}
                    className="rounded-xl bg-brand-lavender px-3 py-1.5 text-sm font-semibold text-text-heading transition-transform hover:scale-[1.02] disabled:opacity-60"
                  >
                    Acknowledge
                  </button>
                )}
              </div>

              {evidenceOpenId === insight._id && (
                <div className="mt-2 rounded-xl bg-secondary-50 p-3">
                  <p className="mb-1 text-xs text-text-muted">
                    The exact aggregate data sent to the AI model — no student-level records.
                  </p>
                  <pre className="max-h-64 overflow-auto text-xs leading-relaxed text-text-body">
                    {JSON.stringify(insight.sourceDataSnapshot, null, 2)}
                  </pre>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
