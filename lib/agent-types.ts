export interface Agent {
  id: string
  name: string
  avatar: string
  role: string
  model: string
  system_prompt: string | null
  personality: AgentPersonality
  constraints: string | null
  channels: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AgentPersonality {
  tone?: string
  traits?: string
  goal?: string
  core_principles?: string
}

export interface AgentKnowledgeText {
  id: string
  agent_id: string
  title: string | null
  content: string
  created_at: string
}

export interface AgentKnowledgeFaq {
  id: string
  agent_id: string
  question: string
  answer: string
  created_at: string
}

export interface AgentKnowledgeLink {
  id: string
  agent_id: string
  url: string
  description: string | null
  created_at: string
}

export interface AgentAction {
  id: string
  agent_id: string
  action_type: string
  description: string | null
  action_config: Record<string, unknown>
  is_enabled: boolean
  created_at: string
}

export interface AgentConversation {
  id: string
  agent_id: string
  lead_id: string | null
  channel: string
  status: 'active' | 'ended' | 'transferred'
  satisfaction: number | null
  started_at: string
  ended_at: string | null
}

export interface AgentMessage {
  id: string
  conversation_id: string
  role: 'user' | 'agent'
  content: string
  created_at: string
}

export const AI_MODELS = [
  { value: 'claude-sonnet', label: 'Claude Sonnet' },
  { value: 'claude-haiku', label: 'Claude Haiku' },
  { value: 'gemini-flash', label: 'Gemini Flash' },
  { value: 'gemini-pro', label: 'Gemini Pro' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
]

export const AGENT_ROLES = [
  'שירות לקוחות',
  'מכירות',
  'תיאום פגישות',
  'תמיכה טכנית',
  'שיווק',
  'קבלת פניות',
]

export const CHANNELS = [
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'webchat', label: 'צ\'אט באתר', icon: '🌐' },
  { value: 'email', label: 'מייל', icon: '📧' },
]

export const ACTION_TYPES = [
  { value: 'create_lead', label: 'יצירת ליד חדש', icon: '👤', description: 'יוצר ליד חדש במערכת מנתוני השיחה' },
  { value: 'schedule_meeting', label: 'קביעת פגישה', icon: '📅', description: 'קובע פגישה ב-Google Calendar' },
  { value: 'send_email', label: 'שליחת מייל', icon: '📧', description: 'שולח מייל דרך Gmail' },
  { value: 'transfer_human', label: 'העברה לנציג', icon: '🙋', description: 'מעביר את השיחה לנציג אנושי' },
  { value: 'update_lead', label: 'עדכון ליד', icon: '✏️', description: 'מעדכן סטטוס ליד בפייפליין' },
]

export const AVATAR_OPTIONS = ['🤖', '👨‍💼', '👩‍💼', '🧑‍💻', '👩‍🔧', '🦸', '🧠', '💡', '⚡', '🎯', '🏢', '📞']
