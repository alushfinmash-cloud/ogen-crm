import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'


function getDateRange(range: string, customFrom?: string, customTo?: string) {
  const now = new Date()
  let from: Date
  let to = new Date(now)

  switch (range) {
    case 'today':
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'week':
      from = new Date(now)
      from.setDate(now.getDate() - now.getDay())
      from.setHours(0, 0, 0, 0)
      break
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'quarter':
      from = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      break
    case 'custom':
      from = customFrom ? new Date(customFrom) : new Date(now.getFullYear(), now.getMonth(), 1)
      to = customTo ? new Date(customTo) : now
      break
    default:
      from = new Date(now.getFullYear(), now.getMonth(), 1)
  }

  return { from: from.toISOString(), to: to.toISOString() }
}

function getPreviousPeriod(from: string, to: string) {
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const diff = toDate.getTime() - fromDate.getTime()
  const prevTo = new Date(fromDate.getTime())
  const prevFrom = new Date(fromDate.getTime() - diff)
  return { from: prevFrom.toISOString(), to: prevTo.toISOString() }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const section = searchParams.get('section') || 'kpi'
  const pipelineId = searchParams.get('pipeline_id') || '00000000-0000-0000-0000-000000000001'
  const dateRange = searchParams.get('date_range') || 'month'
  const customFrom = searchParams.get('from') || undefined
  const customTo = searchParams.get('to') || undefined
  const assignee = searchParams.get('assignee') || undefined

  const { from, to } = getDateRange(dateRange, customFrom, customTo)
  const prev = getPreviousPeriod(from, to)

  try {
    switch (section) {
      case 'kpi':
        return await getKPI(pipelineId, from, to, prev)
      case 'leads_by_date':
        return await getLeadsByDate(pipelineId, from, to)
      case 'funnel':
        return await getFunnel(pipelineId)
      case 'agent_performance':
        return await getAgentPerformance(from, to, assignee)
      case 'sources':
        return await getLeadsBySource(pipelineId, from, to)
      case 'activity':
        return await getActivity()
      default:
        return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function getKPI(pipelineId: string, from: string, to: string, prev: { from: string; to: string }) {
  // Get pipeline columns
  const { data: columns } = await supabaseAdmin
    .from('pipeline_columns')
    .select('id, name, position')
    .eq('pipeline_id', pipelineId)
    .order('position')

  const columnIds = columns?.map(c => c.id) || []
  const closingColumns = columns?.filter(c =>
    c.name.includes('סגירה') || c.name.includes('סגור') || c.name.includes('הצלחה')
  ).map(c => c.id) || []

  // Current period leads
  const { count: totalLeadsMonth } = await supabaseAdmin
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .in('column_id', columnIds)
    .gte('created_at', from)
    .lte('created_at', to)

  // Previous period leads
  const { count: prevLeads } = await supabaseAdmin
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .in('column_id', columnIds)
    .gte('created_at', prev.from)
    .lte('created_at', prev.to)

  // New leads this week
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const { count: newLeadsWeek } = await supabaseAdmin
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .in('column_id', columnIds)
    .gte('created_at', weekAgo.toISOString())

  // Previous week leads
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
  const { count: prevWeekLeads } = await supabaseAdmin
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .in('column_id', columnIds)
    .gte('created_at', twoWeeksAgo.toISOString())
    .lt('created_at', weekAgo.toISOString())

  // Conversion rate (leads in closing stages)
  const { count: closedLeads } = await supabaseAdmin
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .in('column_id', closingColumns)
    .gte('created_at', from)
    .lte('created_at', to)

  const { count: prevClosedLeads } = await supabaseAdmin
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .in('column_id', closingColumns)
    .gte('created_at', prev.from)
    .lte('created_at', prev.to)

  // All leads for avg handling time
  const { data: allLeads } = await supabaseAdmin
    .from('leads')
    .select('created_at, updated_at')
    .in('column_id', columnIds)
    .gte('created_at', from)
    .lte('created_at', to)

  let avgHandlingDays = 0
  if (allLeads && allLeads.length > 0) {
    const totalDays = allLeads.reduce((sum, lead) => {
      const created = new Date(lead.created_at).getTime()
      const updated = new Date(lead.updated_at).getTime()
      return sum + (updated - created) / (1000 * 60 * 60 * 24)
    }, 0)
    avgHandlingDays = Math.round((totalDays / allLeads.length) * 10) / 10
  }

  // Open tasks
  const { count: openTasks } = await supabaseAdmin
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .in('status', ['פתוחה', 'בטיפול'])

  const { count: prevOpenTasks } = await supabaseAdmin
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .in('status', ['פתוחה', 'בטיפול'])
    .lte('created_at', prev.to)

  // Overdue tasks
  const { count: overdueTasks } = await supabaseAdmin
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .in('status', ['פתוחה', 'בטיפול'])
    .lt('due_date', new Date().toISOString())

  const total = totalLeadsMonth || 0
  const prevTotal = prevLeads || 0
  const conversionRate = total > 0 ? Math.round(((closedLeads || 0) / total) * 100) : 0
  const prevConversion = prevTotal > 0 ? Math.round(((prevClosedLeads || 0) / prevTotal) * 100) : 0

  return NextResponse.json({
    totalLeadsMonth: total,
    newLeadsWeek: newLeadsWeek || 0,
    conversionRate,
    avgHandlingDays,
    openTasks: openTasks || 0,
    overdueTasks: overdueTasks || 0,
    totalLeadsChange: prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : 0,
    newLeadsChange: (prevWeekLeads || 0) > 0 ? Math.round((((newLeadsWeek || 0) - (prevWeekLeads || 0)) / (prevWeekLeads || 1)) * 100) : 0,
    conversionChange: prevConversion > 0 ? conversionRate - prevConversion : 0,
    openTasksChange: (prevOpenTasks || 0) > 0 ? Math.round((((openTasks || 0) - (prevOpenTasks || 0)) / (prevOpenTasks || 1)) * 100) : 0,
  })
}

async function getLeadsByDate(pipelineId: string, from: string, to: string) {
  const { data: columns } = await supabaseAdmin
    .from('pipeline_columns')
    .select('id')
    .eq('pipeline_id', pipelineId)

  const columnIds = columns?.map(c => c.id) || []

  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('created_at')
    .in('column_id', columnIds)
    .gte('created_at', from)
    .lte('created_at', to)
    .order('created_at')

  // Group by date
  const grouped: Record<string, number> = {}
  leads?.forEach(lead => {
    const date = lead.created_at.split('T')[0]
    grouped[date] = (grouped[date] || 0) + 1
  })

  // Fill missing dates
  const result: { date: string; count: number }[] = []
  const startDate = new Date(from)
  const endDate = new Date(to)
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    result.push({ date: dateStr, count: grouped[dateStr] || 0 })
  }

  return NextResponse.json(result)
}

async function getFunnel(pipelineId: string) {
  const { data: columns } = await supabaseAdmin
    .from('pipeline_columns')
    .select('id, name, color, position')
    .eq('pipeline_id', pipelineId)
    .order('position')

  if (!columns || columns.length === 0) {
    return NextResponse.json([])
  }

  // Count leads per column
  const counts = await Promise.all(
    columns.map(async (col) => {
      const { count } = await supabaseAdmin
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('column_id', col.id)
      return { ...col, count: count || 0 }
    })
  )

  const total = counts.reduce((sum, c) => sum + c.count, 0)

  return NextResponse.json(
    counts.map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      count: c.count,
      percentage: total > 0 ? Math.round((c.count / total) * 100) : 0,
      position: c.position,
    }))
  )
}

async function getAgentPerformance(from: string, to: string, assignee?: string) {
  const assignees = ['מנהל המערכת', 'נציג 1', 'נציג 2', 'נציג 3']
  const filtered = assignee ? [assignee] : assignees

  const results = await Promise.all(
    filtered.map(async (name) => {
      // Tasks handled
      const { count: tasksTotal } = await supabaseAdmin
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', name)
        .gte('created_at', from)
        .lte('created_at', to)

      // Tasks completed
      const { count: tasksCompleted } = await supabaseAdmin
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', name)
        .eq('status', 'הושלמה')
        .gte('created_at', from)
        .lte('created_at', to)

      // Leads handled (via lead history)
      const { count: leadsHandled } = await supabaseAdmin
        .from('lead_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_name', name)
        .gte('created_at', from)
        .lte('created_at', to)

      // Conversions (leads moved to closing)
      const { count: conversions } = await supabaseAdmin
        .from('lead_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_name', name)
        .eq('action', 'column_change')
        .ilike('description', '%סגירה%')
        .gte('created_at', from)
        .lte('created_at', to)

      // Avg response time (time between lead creation and first history entry)
      const { data: histories } = await supabaseAdmin
        .from('lead_history')
        .select('lead_id, created_at')
        .eq('user_name', name)
        .eq('action', 'update')
        .gte('created_at', from)
        .lte('created_at', to)
        .limit(50)

      let avgResponseHours = 0
      if (histories && histories.length > 0) {
        // Approximate: use task creation to completion time
        const { data: completedTasks } = await supabaseAdmin
          .from('tasks')
          .select('created_at, updated_at')
          .eq('assigned_to', name)
          .eq('status', 'הושלמה')
          .gte('created_at', from)
          .lte('created_at', to)
          .limit(50)

        if (completedTasks && completedTasks.length > 0) {
          const totalHours = completedTasks.reduce((sum, t) => {
            return sum + (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60)
          }, 0)
          avgResponseHours = Math.round((totalHours / completedTasks.length) * 10) / 10
        }
      }

      return {
        name,
        leadsHandled: leadsHandled || 0,
        conversions: conversions || 0,
        tasksCompleted: tasksCompleted || 0,
        avgResponseHours,
      }
    })
  )

  return NextResponse.json(results)
}

async function getLeadsBySource(pipelineId: string, from: string, to: string) {
  const { data: columns } = await supabaseAdmin
    .from('pipeline_columns')
    .select('id')
    .eq('pipeline_id', pipelineId)

  const columnIds = columns?.map(c => c.id) || []

  const { data: leads } = await supabaseAdmin
    .from('leads')
    .select('source')
    .in('column_id', columnIds)
    .gte('created_at', from)
    .lte('created_at', to)

  const grouped: Record<string, number> = {}
  leads?.forEach(lead => {
    const src = lead.source || 'אחר'
    grouped[src] = (grouped[src] || 0) + 1
  })

  const total = leads?.length || 0
  const result = Object.entries(grouped)
    .map(([source, count]) => ({
      source,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json(result)
}

async function getActivity() {
  // Get recent lead history
  const { data: history } = await supabaseAdmin
    .from('lead_history')
    .select('id, lead_id, action, description, user_name, created_at, leads(name)')
    .order('created_at', { ascending: false })
    .limit(15)

  // Get recent completed tasks
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, assigned_to, status, created_at, updated_at')
    .in('status', ['הושלמה'])
    .order('updated_at', { ascending: false })
    .limit(5)

  const activities: {
    id: string
    type: string
    description: string
    timestamp: string
    leadName?: string
    userName?: string
  }[] = []

  // Map lead history
  history?.forEach(h => {
    let type = 'lead_created'
    if (h.action === 'column_change') type = 'lead_moved'
    else if (h.action === 'create') type = 'lead_created'
    else type = 'lead_moved'

    const lead = h.leads as unknown as { name: string } | null
    activities.push({
      id: h.id,
      type,
      description: h.description,
      timestamp: h.created_at,
      leadName: lead?.name || undefined,
      userName: h.user_name,
    })
  })

  // Map completed tasks
  tasks?.forEach(t => {
    activities.push({
      id: t.id,
      type: 'task_completed',
      description: `משימה הושלמה — ${t.title}`,
      timestamp: t.updated_at,
      userName: t.assigned_to,
    })
  })

  // Sort by timestamp
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return NextResponse.json(activities.slice(0, 20))
}
