export interface Integration {
  id: string
  type: 'whatsapp' | 'gmail' | 'calendar'
  config: Record<string, string>
  is_active: boolean
  connected_at: string | null
  created_at: string
  updated_at: string
}

export interface WhatsAppTemplate {
  id: string
  name: string
  content: string
  status: 'approved' | 'pending' | 'rejected'
  created_at: string
}

export interface WhatsAppMessage {
  id: string
  contact_id: string | null
  lead_id: string | null
  direction: 'in' | 'out'
  content: string
  status: string
  sent_at: string
}

export interface EmailSent {
  id: string
  contact_id: string | null
  lead_id: string | null
  subject: string
  body: string
  sent_by: string
  sent_at: string
}

export interface CalendarEvent {
  id: string
  contact_id: string | null
  lead_id: string | null
  title: string
  description: string | null
  start_time: string
  end_time: string
  google_event_id: string | null
  created_by: string
  created_at: string
}

export const INTEGRATION_INFO: Record<string, { label: string; icon: string; description: string; color: string; bgColor: string }> = {
  whatsapp: {
    label: 'WhatsApp Business',
    icon: '💬',
    description: 'שליחה וקבלת הודעות WhatsApp, ניהול תבניות',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  gmail: {
    label: 'Gmail',
    icon: '📧',
    description: 'שליחת מיילים דרך חשבון Gmail',
    color: 'text-red-500',
    bgColor: 'bg-red-50',
  },
  calendar: {
    label: 'Google Calendar',
    icon: '📅',
    description: 'יצירת פגישות וסינכרון לוח שנה',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
}

export const TEMPLATE_VARIABLES = [
  { key: '{{שם}}', label: 'שם הלקוח' },
  { key: '{{טלפון}}', label: 'טלפון' },
  { key: '{{אימייל}}', label: 'אימייל' },
  { key: '{{שם_הנציג}}', label: 'שם הנציג' },
  { key: '{{תאריך}}', label: 'תאריך נוכחי' },
]
