export interface Pipeline {
  id: string
  name: string
  color: string
  icon?: string
  created_at: string
}

export interface PipelineColumn {
  id: string
  name: string
  color: string
  position: number
  pipeline_id: string
  created_at: string
}

export interface Lead {
  id: string
  name: string
  phone: string
  email?: string
  source: string
  status: string
  notes?: string
  column_id: string
  position: number
  value?: number
  created_at: string
  updated_at: string
}

export interface LeadHistory {
  id: string
  lead_id: string
  action: string
  description: string
  user_name: string
  created_at: string
}

export const LEAD_SOURCES = [
  'אתר אינטרנט',
  'הפניה',
  'פייסבוק',
  'אינסטגרם',
  'Google Ads',
  'WhatsApp',
  'שיחה קרה',
  'אחר',
]

export const LEAD_STATUSES = [
  'חדש',
  'פעיל',
  'בהמתנה',
  'סגור - הצלחה',
  'לא רלוונטי',
]

export const COLUMN_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#6366f1',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#64748b',
]

export const SOURCE_COLORS: Record<string, string> = {
  'אתר אינטרנט': 'bg-blue-100 text-blue-700',
  'הפניה': 'bg-green-100 text-green-700',
  'פייסבוק': 'bg-indigo-100 text-indigo-700',
  'אינסטגרם': 'bg-pink-100 text-pink-700',
  'Google Ads': 'bg-yellow-100 text-yellow-700',
  'WhatsApp': 'bg-emerald-100 text-emerald-700',
  'שיחה קרה': 'bg-gray-100 text-gray-700',
  'אחר': 'bg-purple-100 text-purple-700',
}

export const STATUS_COLORS: Record<string, string> = {
  'חדש': 'bg-blue-100 text-blue-700',
  'פעיל': 'bg-green-100 text-green-700',
  'בהמתנה': 'bg-yellow-100 text-yellow-700',
  'סגור - הצלחה': 'bg-slate-100 text-slate-700',
  'לא רלוונטי': 'bg-red-100 text-red-700',
}
