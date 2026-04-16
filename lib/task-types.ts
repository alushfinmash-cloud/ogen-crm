export interface Task {
  id: string
  title: string
  description?: string
  lead_id?: string
  assigned_to: string
  due_date?: string
  priority: TaskPriority
  status: TaskStatus
  source: 'manual' | 'workflow' | 'system'
  created_at: string
  updated_at: string
  leads?: { name: string; phone: string } | null
}

export type TaskPriority = 'נמוכה' | 'בינונית' | 'גבוהה' | 'דחוף'
export type TaskStatus = 'פתוחה' | 'בטיפול' | 'הושלמה' | 'בוטלה'

export const PRIORITIES: TaskPriority[] = ['נמוכה', 'בינונית', 'גבוהה', 'דחוף']
export const STATUSES: TaskStatus[] = ['פתוחה', 'בטיפול', 'הושלמה', 'בוטלה']

export const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string; dot: string }> = {
  'נמוכה': { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  'בינונית': { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  'גבוהה': { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  'דחוף': { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
}

export const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string }> = {
  'פתוחה': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'בטיפול': { bg: 'bg-amber-100', text: 'text-amber-700' },
  'הושלמה': { bg: 'bg-green-100', text: 'text-green-700' },
  'בוטלה': { bg: 'bg-slate-100', text: 'text-slate-500' },
}

export const ASSIGNEES = [
  'מנהל המערכת',
  'נציג 1',
  'נציג 2',
  'נציג 3',
]

export function isOverdue(task: Task): boolean {
  if (!task.due_date) return false
  if (task.status === 'הושלמה' || task.status === 'בוטלה') return false
  return new Date(task.due_date) < new Date()
}

export function isDueToday(task: Task): boolean {
  if (!task.due_date) return false
  const due = new Date(task.due_date)
  const now = new Date()
  return due.toDateString() === now.toDateString()
}
