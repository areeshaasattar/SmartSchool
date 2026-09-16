import { Sparkles } from 'lucide-react'
import { useListInsightsQuery } from '../api/insightsApi'
import type { InsightType } from '../api/insightsApi'
import AIInsightCard from '../components/AIInsightCard'

interface InsightsPageProps {
  /** Restrict which insight types are offered (teacher view: no briefing). */
  allowedTypes?: InsightType[]
  title?: string
}

export default function InsightsPage({ allowedTypes = ['academic', 'attendance', 'briefing'], title = 'AI Insights' }: InsightsPageProps) {
  const { data, isLoading, isError } = useListInsightsQuery({ limit: 10 })

  if (isLoading) return <div className="py-8 text-center text-secondary-500">Loading insights…</div>
  if (isError) return <div className="py-8 text-center text-secondary-400">Failed to load insights</div>

  const insights = data?.insights ?? []

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-text-muted">Aggregated trends, summarized by AI</p>
        <h1 className="flex items-center gap-2 font-heading text-3xl font-bold">
          <Sparkles size={24} className="text-brand-blue-strong" /> {title}
        </h1>
      </div>

      <div className="space-y-6">
        {allowedTypes.map((type) => (
          <AIInsightCard key={type} type={type} insights={insights.filter((i) => i.type === type)} />
        ))}
      </div>
    </div>
  )
}
