export interface Channel {
  id: string
  type: ChannelType
  name: string
  config: Record<string, unknown>
  is_active: boolean
  created_at: string
}

export type ChannelType = 'whatsapp' | 'facebook' | 'instagram' | 'gmail' | 'sms' | 'telegram' | 'webchat'

export interface Conversation {
  id: string
  lead_id: string | null
  contact_id: string | null
  channel: ChannelType
  contact_name: string
  contact_phone: string | null
  contact_email: string | null
  last_message: string | null
  last_message_at: string
  unread_count: number
  assigned_to: string
  status: 'open' | 'closed' | 'archived'
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  direction: 'in' | 'out'
  channel: ChannelType
  content: string
  media_url: string | null
  media_type: string | null
  status: 'sent' | 'delivered' | 'read' | 'failed'
  sender_name: string | null
  external_id: string | null
  created_at: string
}

export const CHANNEL_INFO: Record<ChannelType, { label: string; icon: string; color: string; bgClass: string }> = {
  whatsapp: { label: 'WhatsApp', icon: '💬', color: '#25D366', bgClass: 'bg-green-100 text-green-700' },
  facebook: { label: 'Facebook', icon: '📘', color: '#1877F2', bgClass: 'bg-blue-100 text-blue-700' },
  instagram: { label: 'Instagram', icon: '📸', color: '#E4405F', bgClass: 'bg-pink-100 text-pink-700' },
  gmail: { label: 'Gmail', icon: '📧', color: '#EA4335', bgClass: 'bg-red-100 text-red-700' },
  sms: { label: 'SMS', icon: '📱', color: '#6B7280', bgClass: 'bg-slate-100 text-slate-700' },
  telegram: { label: 'Telegram', icon: '✈️', color: '#0088CC', bgClass: 'bg-cyan-100 text-cyan-700' },
  webchat: { label: 'צ\'אט באתר', icon: '🌐', color: '#8B5CF6', bgClass: 'bg-purple-100 text-purple-700' },
}

export const STATUS_LABELS: Record<string, string> = {
  open: 'פתוח',
  closed: 'סגור',
  archived: 'בארכיון',
}

export const MESSAGE_STATUS_LABELS: Record<string, string> = {
  sent: 'נשלח',
  delivered: 'הגיע',
  read: 'נקרא',
  failed: 'נכשל',
}

export function formatTimeShort(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return 'עכשיו'
  if (minutes < 60) return `${minutes}ד'`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}ש'`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}י'`
  return `${date.getDate()}/${date.getMonth() + 1}`
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return parts[0][0] + parts[1][0]
  return parts[0]?.substring(0, 2) || '?'
}
