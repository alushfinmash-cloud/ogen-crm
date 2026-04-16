export interface KPIStats {
  totalLeadsMonth: number
  newLeadsWeek: number
  conversionRate: number
  avgHandlingDays: number
  openTasks: number
  overdueTasks: number
  // Comparison to previous period
  totalLeadsChange: number
  newLeadsChange: number
  conversionChange: number
  openTasksChange: number
}

export interface LeadsByDate {
  date: string
  count: number
}

export interface FunnelStage {
  id: string
  name: string
  color: string
  count: number
  percentage: number
  position: number
}

export interface AgentPerformance {
  name: string
  leadsHandled: number
  conversions: number
  tasksCompleted: number
  avgResponseHours: number
}

export interface LeadsBySource {
  source: string
  count: number
  percentage: number
}

export interface ActivityItem {
  id: string
  type: 'lead_created' | 'lead_moved' | 'task_completed' | 'task_created' | 'contact_created'
  description: string
  timestamp: string
  leadName?: string
  userName?: string
}

export interface DashboardFilters {
  pipelineId: string
  dateRange: DateRangeOption
  customFrom?: string
  customTo?: string
  assignee?: string
}

export type DateRangeOption = 'today' | 'week' | 'month' | 'quarter' | 'custom'

export const DATE_RANGE_LABELS: Record<DateRangeOption, string> = {
  today: 'היום',
  week: 'השבוע',
  month: 'החודש',
  quarter: 'רבעון',
  custom: 'מותאם אישית',
}

export const ACTIVITY_ICONS: Record<ActivityItem['type'], string> = {
  lead_created: '🟢',
  lead_moved: '➡️',
  task_completed: '✅',
  task_created: '📋',
  contact_created: '👤',
}

export const ACTIVITY_LABELS: Record<ActivityItem['type'], string> = {
  lead_created: 'ליד חדש נכנס',
  lead_moved: 'ליד עבר שלב',
  task_completed: 'משימה הושלמה',
  task_created: 'משימה נוצרה',
  contact_created: 'איש קשר חדש',
}
