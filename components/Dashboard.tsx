'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Users, UserPlus, Target, Clock,
  CheckSquare, AlertTriangle, RefreshCw, ChevronDown, Filter,
  BarChart3, Activity,
} from 'lucide-react'
import type {
  KPIStats, LeadsByDate, FunnelStage, AgentPerformance,
  LeadsBySource, ActivityItem, DashboardFilters, DateRangeOption,
} from '@/lib/dashboard-types'
import { DATE_RANGE_LABELS, ACTIVITY_ICONS, ACTIVITY_LABELS } from '@/lib/dashboard-types'

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#ec4899']

const FUNNEL_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#059669', '#06b6d4', '#ef4444']

function formatTimeAgo(timestamp: string) {
  const now = new Date().getTime()
  const then = new Date(timestamp).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'עכשיו'
  if (minutes < 60) return `לפני ${minutes} דקות`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `לפני ${hours} שעות`
  const days = Math.floor(hours / 24)
  return `לפני ${days} ימים`
}

export default function Dashboard() {
  const [filters, setFilters] = useState<DashboardFilters>({
    pipelineId: '00000000-0000-0000-0000-000000000001',
    dateRange: 'month',
  })
  const [pipelines, setPipelines] = useState<{ id: string; name: string }[]>([])
  const [kpi, setKpi] = useState<KPIStats | null>(null)
  const [leadsByDate, setLeadsByDate] = useState<LeadsByDate[]>([])
  const [funnel, setFunnel] = useState<FunnelStage[]>([])
  const [agents, setAgents] = useState<AgentPerformance[]>([])
  const [sources, setSources] = useState<LeadsBySource[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar')
  const [showFilters, setShowFilters] = useState(false)
  const [agentSort, setAgentSort] = useState<{ col: string; asc: boolean }>({ col: 'leadsHandled', asc: false })

  // Inbox stats
  const [inboxStats, setInboxStats] = useState<{
    totalConversations: number; openConversations: number; totalUnread: number;
    todayMessages: number; weekMessages: number; incomingWeek: number; outgoingWeek: number;
    byChannel: Record<string, number>; dailyMessages: { date: string; incoming: number; outgoing: number; total: number }[];
    avgResponseMinutes: number;
  } | null>(null)

  const buildParams = useCallback((section: string) => {
    const p = new URLSearchParams({ section, pipeline_id: filters.pipelineId, date_range: filters.dateRange })
    if (filters.customFrom) p.set('from', filters.customFrom)
    if (filters.customTo) p.set('to', filters.customTo)
    if (filters.assignee) p.set('assignee', filters.assignee)
    return p.toString()
  }, [filters])

  const fetchAll = useCallback(async () => {
    try {
      const [kpiRes, datesRes, funnelRes, agentsRes, sourcesRes, activityRes] = await Promise.all([
        fetch(`/api/dashboard?${buildParams('kpi')}`),
        fetch(`/api/dashboard?${buildParams('leads_by_date')}`),
        fetch(`/api/dashboard?${buildParams('funnel')}`),
        fetch(`/api/dashboard?${buildParams('agent_performance')}`),
        fetch(`/api/dashboard?${buildParams('sources')}`),
        fetch(`/api/dashboard?${buildParams('activity')}`),
      ])

      const [kpiData, datesData, funnelData, agentsData, sourcesData, activityData] = await Promise.all([
        kpiRes.json(), datesRes.json(), funnelRes.json(),
        agentsRes.json(), sourcesRes.json(), activityRes.json(),
      ])

      setKpi(kpiData)
      setLeadsByDate(datesData)
      setFunnel(funnelData)
      setAgents(agentsData)
      setSources(sourcesData)
      setActivity(activityData)

      // Fetch inbox stats
      try {
        const inboxRes = await fetch('/api/inbox/stats')
        if (inboxRes.ok) setInboxStats(await inboxRes.json())
      } catch { /* silent */ }
    } catch {
      // silent
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [buildParams])

  useEffect(() => {
    // Load pipelines
    const loadPipelines = async () => {
      try {
        const res = await fetch('/api/pipelines')
        if (res.ok) {
          const data = await res.json()
          setPipelines(data)
        }
      } catch {
        // use default
      }
    }
    loadPipelines()
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchAll()
  }, [fetchAll])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshing(true)
      fetchAll()
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchAll])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchAll()
  }

  const sortedAgents = [...agents].sort((a, b) => {
    const key = agentSort.col as keyof AgentPerformance
    const valA = a[key] as number
    const valB = b[key] as number
    return agentSort.asc ? valA - valB : valB - valA
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        <span className="mr-3 text-slate-500">טוען דשבורד...</span>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 size={28} className="text-blue-600" />
            דשבורד
          </h1>
          <p className="text-slate-500 text-sm mt-1">מבט על מהיר על ביצועי העסק</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
          >
            <Filter size={16} />
            פילטרים
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            רענון
          </button>
        </div>
      </div>

      {/* Global Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-4 items-end">
          {/* Pipeline */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">פייפליין</label>
            <select
              value={filters.pipelineId}
              onChange={(e) => setFilters(f => ({ ...f, pipelineId: e.target.value }))}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              {pipelines.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          {/* Date Range */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">טווח תאריכים</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(f => ({ ...f, dateRange: e.target.value as DateRangeOption }))}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              {Object.entries(DATE_RANGE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          {/* Custom dates */}
          {filters.dateRange === 'custom' && (
            <>
              <div>
                <label className="block text-xs text-slate-500 mb-1">מתאריך</label>
                <input
                  type="date"
                  value={filters.customFrom || ''}
                  onChange={(e) => setFilters(f => ({ ...f, customFrom: e.target.value }))}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">עד תאריך</label>
                <input
                  type="date"
                  value={filters.customTo || ''}
                  onChange={(e) => setFilters(f => ({ ...f, customTo: e.target.value }))}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </>
          )}
          {/* Assignee */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">נציג</label>
            <select
              value={filters.assignee || ''}
              onChange={(e) => setFilters(f => ({ ...f, assignee: e.target.value || undefined }))}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">כל הנציגים</option>
              <option value="מנהל המערכת">מנהל המערכת</option>
              <option value="נציג 1">נציג 1</option>
              <option value="נציג 2">נציג 2</option>
              <option value="נציג 3">נציג 3</option>
            </select>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {kpi && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard
            title="לידים החודש"
            value={kpi.totalLeadsMonth}
            change={kpi.totalLeadsChange}
            icon={<Users size={20} />}
            color="blue"
          />
          <KPICard
            title="לידים חדשים השבוע"
            value={kpi.newLeadsWeek}
            change={kpi.newLeadsChange}
            icon={<UserPlus size={20} />}
            color="green"
          />
          <KPICard
            title="אחוז המרה"
            value={`${kpi.conversionRate}%`}
            change={kpi.conversionChange}
            icon={<Target size={20} />}
            color="purple"
          />
          <KPICard
            title="ממוצע טיפול (ימים)"
            value={kpi.avgHandlingDays}
            icon={<Clock size={20} />}
            color="amber"
          />
          <KPICard
            title="משימות פתוחות"
            value={kpi.openTasks}
            change={kpi.openTasksChange}
            icon={<CheckSquare size={20} />}
            color="cyan"
          />
          <KPICard
            title="משימות באיחור"
            value={kpi.overdueTasks}
            icon={<AlertTriangle size={20} />}
            color="red"
            highlight={kpi.overdueTasks > 0}
          />
        </div>
      )}

      {/* Row: Leads Chart + Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Date Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">לידים לפי זמן</h2>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  chartType === 'bar' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                עמודות
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  chartType === 'line' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                קו
              </button>
            </div>
          </div>
          <div className="h-[280px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={leadsByDate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => {
                      const d = new Date(v)
                      return `${d.getDate()}/${d.getMonth() + 1}`
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(v) => {
                      const d = new Date(v)
                      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
                    }}
                    formatter={(value) => [String(value), 'לידים']}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={leadsByDate}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => {
                      const d = new Date(v)
                      return `${d.getDate()}/${d.getMonth() + 1}`
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(v) => {
                      const d = new Date(v)
                      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
                    }}
                    formatter={(value) => [String(value), 'לידים']}
                  />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Funnel */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">משפך Pipeline</h2>
          {funnel.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-slate-400">
              אין עמודות בפייפליין
            </div>
          ) : (
            <div className="space-y-3">
              {funnel.map((stage, i) => {
                const maxCount = Math.max(...funnel.map(s => s.count), 1)
                const widthPercent = Math.max((stage.count / maxCount) * 100, 8)
                return (
                  <div key={stage.id} className="group cursor-pointer" title={`${stage.count} לידים`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">{stage.name}</span>
                      <span className="text-xs text-slate-500">
                        {stage.count} ({stage.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-8 overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center justify-center text-white text-xs font-medium transition-all group-hover:opacity-80"
                        style={{
                          width: `${widthPercent}%`,
                          backgroundColor: stage.color || FUNNEL_COLORS[i % FUNNEL_COLORS.length],
                        }}
                      >
                        {stage.count > 0 ? stage.count : ''}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row: Sources Pie + Agent Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sources Pie */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">מקורות לידים</h2>
          {sources.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-slate-400">
              אין נתונים
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-[250px] w-[250px] flex-shrink-0" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sources}
                      dataKey="count"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      paddingAngle={2}
                    >
                      {sources.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [String(value), 'לידים']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {sources.map((s, i) => (
                  <div key={s.source} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="text-slate-700">{s.source}</span>
                    </div>
                    <span className="text-slate-500 font-medium">{s.count} ({s.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Agent Performance */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">ביצועי נציגים</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  {[
                    { key: 'name', label: 'נציג' },
                    { key: 'leadsHandled', label: 'לידים' },
                    { key: 'conversions', label: 'המרות' },
                    { key: 'tasksCompleted', label: 'משימות' },
                    { key: 'avgResponseHours', label: 'זמן תגובה (שעות)' },
                  ].map(col => (
                    <th
                      key={col.key}
                      className="py-2 px-2 text-right font-medium text-slate-500 cursor-pointer hover:text-slate-700"
                      onClick={() => setAgentSort(s => ({
                        col: col.key,
                        asc: s.col === col.key ? !s.asc : false,
                      }))}
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        {agentSort.col === col.key && (
                          <ChevronDown size={12} className={agentSort.asc ? 'rotate-180' : ''} />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedAgents.map(agent => (
                  <tr key={agent.name} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2.5 px-2 font-medium text-slate-700">{agent.name}</td>
                    <td className="py-2.5 px-2 text-slate-600">{agent.leadsHandled}</td>
                    <td className="py-2.5 px-2 text-slate-600">{agent.conversions}</td>
                    <td className="py-2.5 px-2 text-slate-600">{agent.tasksCompleted}</td>
                    <td className="py-2.5 px-2 text-slate-600">{agent.avgResponseHours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Activity size={20} className="text-blue-600" />
          פעילות אחרונה
        </h2>
        {activity.length === 0 ? (
          <div className="text-center py-8 text-slate-400">אין פעילות אחרונה</div>
        ) : (
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {activity.map((item, i) => (
              <div
                key={`${item.id}-${i}`}
                className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <span className="text-lg flex-shrink-0">
                  {ACTIVITY_ICONS[item.type as keyof typeof ACTIVITY_ICONS] || '📌'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 truncate">{item.description}</p>
                  {item.userName && (
                    <p className="text-xs text-slate-400">{item.userName}</p>
                  )}
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">
                  {formatTimeAgo(item.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ Inbox Stats Row ═══ */}
      {inboxStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
          {/* Inbox KPIs */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Activity size={16} className="text-blue-600" />
              סטטיסטיקות שיחות
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{inboxStats.totalConversations}</p>
                <p className="text-xs text-blue-600">סה״כ שיחות</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{inboxStats.openConversations}</p>
                <p className="text-xs text-green-600">פתוחות</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-700">{inboxStats.totalUnread}</p>
                <p className="text-xs text-red-600">לא נקראו</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-700">{inboxStats.todayMessages}</p>
                <p className="text-xs text-amber-600">הודעות היום</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">זמן תגובה ממוצע</span>
              <span className="text-sm font-bold text-slate-700">
                {inboxStats.avgResponseMinutes > 0 ? `${inboxStats.avgResponseMinutes} דק׳` : '—'}
              </span>
            </div>
          </div>

          {/* Messages Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">הודעות השבוע</h3>
            {inboxStats.dailyMessages.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={inboxStats.dailyMessages}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value) => [String(value), '']} />
                  <Bar dataKey="incoming" name="נכנסות" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="outgoing" name="יוצאות" fill="#10b981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-slate-400 text-sm">אין נתונים</div>
            )}
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500" /> נכנסות ({inboxStats.incomingWeek})</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-500" /> יוצאות ({inboxStats.outgoingWeek})</span>
            </div>
          </div>

          {/* Channel Distribution */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">שיחות לפי ערוץ</h3>
            {Object.keys(inboxStats.byChannel).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(inboxStats.byChannel)
                  .sort((a, b) => b[1] - a[1])
                  .map(([channel, count]) => {
                    const total = Object.values(inboxStats.byChannel).reduce((s, v) => s + v, 0)
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0
                    const info = { whatsapp: { icon: '💬', label: 'WhatsApp', color: '#25D366' }, facebook: { icon: '📘', label: 'Facebook', color: '#1877F2' }, instagram: { icon: '📸', label: 'Instagram', color: '#E4405F' }, gmail: { icon: '📧', label: 'Gmail', color: '#EA4335' }, sms: { icon: '📱', label: 'SMS', color: '#6B7280' } }[channel] || { icon: '💬', label: channel, color: '#6B7280' }

                    return (
                      <div key={channel}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-700 flex items-center gap-1.5">
                            <span>{info.icon}</span>
                            {info.label}
                          </span>
                          <span className="text-xs text-slate-500">{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: info.color }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-slate-400 text-sm">אין נתונים</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── KPI Card ─── */
function KPICard({
  title, value, change, icon, color, highlight,
}: {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  color: string
  highlight?: boolean
}) {
  const bgMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    red: 'bg-red-50 text-red-600',
  }

  return (
    <div className={`bg-white rounded-xl border p-4 ${highlight ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bgMap[color]}`}>
          {icon}
        </div>
        {change !== undefined && change !== 0 && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${
            change > 0 ? 'text-green-600' : 'text-red-500'
          }`}>
            {change > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{title}</div>
    </div>
  )
}
