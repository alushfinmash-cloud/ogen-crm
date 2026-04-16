export interface Workflow {
  id: string
  name: string
  trigger_type: TriggerType
  trigger_config: TriggerConfig
  is_active: boolean
  created_at: string
  updated_at: string
  steps?: WorkflowStep[]
}

export interface WorkflowStep {
  id: string
  workflow_id: string
  step_order: number
  action_type: ActionType
  action_config: Record<string, unknown>
  wait_duration: number | null
  created_at: string
}

export interface WorkflowLog {
  id: string
  workflow_id: string
  lead_id: string | null
  step_id: string | null
  status: 'running' | 'completed' | 'failed' | 'waiting' | 'stopped'
  step_order: number | null
  details: string | null
  executed_at: string
}

export type TriggerType = 'webhook_lead' | 'column_change'

export interface TriggerConfig {
  pipeline_id?: string
  column_id?: string
  webhook_id?: string
}

export type ActionType =
  | 'create_contact'
  | 'add_tag'
  | 'send_whatsapp'
  | 'wait'
  | 'stop_previous'
  | 'send_email'
  | 'create_reminder'

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  webhook_lead: 'ליד נכנס דרך Webhook',
  column_change: 'ליד הועבר לעמודה',
}

export const TRIGGER_ICONS: Record<TriggerType, string> = {
  webhook_lead: 'Webhook',
  column_change: 'ArrowLeftRight',
}

export const ACTION_LABELS: Record<ActionType, string> = {
  create_contact: 'יצירת איש קשר',
  add_tag: 'הוספת תג',
  send_whatsapp: 'שליחת WhatsApp',
  wait: 'המתנה',
  stop_previous: 'עצירת workflow קודם',
  send_email: 'שליחת מייל',
  create_reminder: 'יצירת תזכורת',
}

export const ACTION_COLORS: Record<ActionType, { bg: string; text: string; border: string }> = {
  create_contact: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  add_tag: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  send_whatsapp: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  wait: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  stop_previous: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  send_email: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  create_reminder: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
}

export const WAIT_UNITS = [
  { value: 1, label: 'דקות' },
  { value: 60, label: 'שעות' },
  { value: 1440, label: 'ימים' },
]
