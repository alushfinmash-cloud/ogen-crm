export interface ScoringRule {
  id: string
  name: string
  trigger_type: string
  trigger_config: Record<string, unknown>
  points: number
  is_active: boolean
  created_at: string
}

export interface LeadScore {
  id: string
  lead_id: string
  current_score: number
  updated_at: string
}

export interface LeadScoreHistory {
  id: string
  lead_id: string
  rule_id: string | null
  points_change: number
  reason: string
  created_at: string
  scoring_rules?: { name: string } | null
}

export const TRIGGER_TYPES: Record<string, string> = {
  lead_created: 'ליד נכנס למערכת',
  whatsapp_opened: 'ליד פתח הודעת WhatsApp',
  whatsapp_replied: 'ליד השיב להודעה',
  email_opened: 'ליד פתח מייל',
  email_replied: 'ליד השיב למייל',
  stage_meeting: 'ליד עבר לסטאג׳ פגישה',
  stage_quote: 'ליד עבר לסטאג׳ הצעת מחיר',
  stage_closing: 'ליד עבר לסטאג׳ סגירה',
  stage_not_relevant: 'ליד עבר ללא רלוונטי',
  no_response_7d: 'ליד לא הגיב 7 ימים',
  no_response_14d: 'ליד לא הגיב 14 ימים',
  meeting_cancelled: 'ליד ביטל פגישה',
  form_submitted: 'ליד מילא טופס',
  link_clicked: 'ליד לחץ על קישור',
  manual: 'שינוי ידני',
}

export function getScoreColor(score: number): string {
  if (score <= 30) return '#ef4444' // red
  if (score <= 60) return '#f59e0b' // amber
  return '#10b981' // green
}

export function getScoreLabel(score: number): string {
  if (score <= 30) return 'קר'
  if (score <= 60) return 'פושר'
  return 'חם'
}

export function getScoreBgClass(score: number): string {
  if (score <= 30) return 'bg-red-100 text-red-700'
  if (score <= 60) return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
}

export const SCORE_THRESHOLDS = {
  hot: 70,
  cold: 20,
}
