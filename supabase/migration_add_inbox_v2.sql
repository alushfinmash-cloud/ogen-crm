-- ═══════════════════════════════════════════
-- Module 10 v2 — Quick Replies, Notes, Labels
-- ═══════════════════════════════════════════

-- טבלת תבניות תגובה מהירה
CREATE TABLE IF NOT EXISTS quick_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  shortcut TEXT,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- טבלת הערות פנימיות על שיחות
CREATE TABLE IF NOT EXISTS conversation_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author TEXT DEFAULT 'מנהל המערכת',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- טבלת תגיות לשיחות
CREATE TABLE IF NOT EXISTS conversation_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, tag)
);

-- אינדקסים
CREATE INDEX IF NOT EXISTS idx_quick_replies_active ON quick_replies(is_active);
CREATE INDEX IF NOT EXISTS idx_quick_replies_category ON quick_replies(category);
CREATE INDEX IF NOT EXISTS idx_conv_notes_conv ON conversation_notes(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_tags_conv ON conversation_tags(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_tags_tag ON conversation_tags(tag);

-- תבניות ברירת מחדל
INSERT INTO quick_replies (title, content, category, shortcut) VALUES
  ('ברכת פתיחה', 'שלום! תודה שפנית אלינו. איך אוכל לעזור?', 'general', '/hi'),
  ('בקשת פרטים', 'אשמח לקבל ממך את הפרטים הבאים: שם מלא, מספר טלפון ומייל.', 'general', '/details'),
  ('תודה', 'תודה רבה! נחזור אליך בהקדם.', 'general', '/thanks'),
  ('בדיקה', 'אני בודק את העניין ואחזור אליך עם תשובה בהקדם.', 'general', '/check'),
  ('פגישה', 'אשמח לקבוע איתך פגישה. מתי נוח לך?', 'scheduling', '/meet'),
  ('הצעת מחיר', 'הצעת המחיר נשלחה אליך למייל. אשמח לשמוע חוות דעתך.', 'sales', '/quote'),
  ('סגירה', 'תודה על הפנייה! אם תצטרך משהו נוסף, אל תהסס לפנות.', 'general', '/close'),
  ('המתנה', 'ממתין לתשובתך. אל תהסס לפנות בכל שאלה.', 'followup', '/wait')
ON CONFLICT DO NOTHING;
