import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../../../services/api'
import AIInsightCard from '../../ai/insights/components/AIInsightCard'
import { useListInsightsQuery } from '../../ai/insights/api/insightsApi'

interface ClassPerformance {
  classId: string
  grade: string
  section: string
  avgPercentage: number
}

interface SupportStudent {
  studentId: string
  name: string
  reason: string
  value: number
}

interface TeacherWorkload {
  teacherId: string
  name: string
  classCount: number
  subjectCount: number
}

interface OverviewData {
  academicPerformance: ClassPerformance[]
  feeCollectionRate: number
  totalOutstanding: number
  supportNeeded: SupportStudent[]
  teacherWorkload: TeacherWorkload[]
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']

export default function PrincipalDashboard() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const { data: insightsData } = useListInsightsQuery({ limit: 5 })

  useEffect(() => {
    api.get('/analytics/principal/overview')
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center text-secondary-500 py-8">Loading dashboard...</div>
  if (!data) return <div className="text-center text-secondary-400 py-8">Failed to load dashboard</div>

  const perfData = data.academicPerformance.map(p => ({
    name: `${p.grade}-${p.section}`,
    percentage: p.avgPercentage,
  }))

  const workloadData = data.teacherWorkload.slice(0, 8).map(t => ({
    name: t.name.split(' ')[0],
    classes: t.classCount,
    subjects: t.subjectCount,
  }))

  const supportPieData = [
    { name: 'Low Attendance', value: data.supportNeeded.filter(s => s.reason === 'Low attendance').length },
    { name: 'Low Exam Scores', value: data.supportNeeded.filter(s => s.reason === 'Low exam scores').length },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-secondary-900">Principal Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Fee Overview */}
        <div className="rounded-xl bg-white p-5 shadow-lg">
          <p className="text-sm font-medium text-secondary-500 mb-1">Fee Collection Rate</p>
          <p className="text-3xl font-bold text-green-600">{data.feeCollectionRate}%</p>
          <p className="text-xs text-secondary-400 mt-1">
            ${data.totalOutstanding.toLocaleString()} outstanding
          </p>
          <Link to="/fees/collection" className="text-xs text-primary-600 hover:underline mt-2 inline-block">
            View Details →
          </Link>
        </div>

        {/* Support Needed */}
        <div className="rounded-xl bg-white p-5 shadow-lg">
          <p className="text-sm font-medium text-secondary-500 mb-1">Students Needing Support</p>
          <p className="text-3xl font-bold text-orange-600">{data.supportNeeded.length}</p>
          {supportPieData.length > 0 && (
            <div className="h-24 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={supportPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={40}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {supportPieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Teacher Workload Summary */}
        <div className="rounded-xl bg-white p-5 shadow-lg">
          <p className="text-sm font-medium text-secondary-500 mb-1">Active Teachers</p>
          <p className="text-3xl font-bold text-blue-600">{data.teacherWorkload.length}</p>
          <p className="text-xs text-secondary-400 mt-1">
            avg {data.teacherWorkload.length > 0
              ? Math.round(data.teacherWorkload.reduce((s, t) => s + t.classCount, 0) / data.teacherWorkload.length)
              : 0} classes/teacher
          </p>
        </div>

        {/* Academic Performance Chart */}
        <div className="rounded-xl bg-white p-5 shadow-lg md:col-span-2">
          <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-wide mb-3">
            Academic Performance by Class
          </h3>
          {perfData.length === 0 ? (
            <p className="text-sm text-secondary-400">No exam data available</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perfData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis domain={[0, 100]} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="percentage" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Teacher Workload Chart */}
        <div className="rounded-xl bg-white p-5 shadow-lg">
          <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-wide mb-3">
            Teacher Workload
          </h3>
          {workloadData.length === 0 ? (
            <p className="text-sm text-secondary-400">No teacher data</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis dataKey="name" type="category" width={60} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="classes" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Support-Needed Students List */}
        {data.supportNeeded.length > 0 && (
          <div className="rounded-xl bg-white p-5 shadow-lg md:col-span-2 lg:col-span-3">
            <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-wide mb-3">
              Students Needing Attention
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-secondary-500 border-b">
                    <th className="pb-2 font-medium">Student</th>
                    <th className="pb-2 font-medium">Reason</th>
                    <th className="pb-2 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.supportNeeded.map((s) => (
                    <tr key={s.studentId} className="border-b last:border-0">
                      <td className="py-2 text-secondary-900">{s.name}</td>
                      <td className="py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.reason === 'Low attendance' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {s.reason}
                        </span>
                      </td>
                      <td className="py-2 text-secondary-700">{s.value}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* AI Insights — aggregated summaries, human-in-the-loop */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AIInsightCard type="academic" insights={(insightsData?.insights ?? []).filter((i) => i.type === 'academic')} />
        <AIInsightCard type="attendance" insights={(insightsData?.insights ?? []).filter((i) => i.type === 'attendance')} />
      </div>
      <AIInsightCard type="briefing" insights={(insightsData?.insights ?? []).filter((i) => i.type === 'briefing')} />
    </div>
  )
}
