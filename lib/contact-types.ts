export interface Contact {
  id: string
  first_name: string
  last_name: string | null
  phone: string
  email: string | null
  tags: string[]
  source: string
  created_at: string
  updated_at: string
}

export interface ContactNote {
  id: string
  contact_id: string
  content: string
  created_by: string
  created_at: string
}

export const CONTACT_SOURCES = ['manual', 'import', 'webhook', 'system']

export const SOURCE_LABELS: Record<string, string> = {
  manual: 'ידני',
  import: 'ייבוא',
  webhook: 'Webhook',
  system: 'מערכת',
}
