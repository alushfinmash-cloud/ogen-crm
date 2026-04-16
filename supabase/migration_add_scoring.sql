-- כללי ניקוד
CREATE TABLE scoring_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB DEFAULT '{}',
  points INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ניקוד לידים
CREATE TABLE lead_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  current_score INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lead_id)
);

-- היסטוריית ניקוד
CREATE TABLE lead_score_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES scoring_rules(id) ON DELETE SET NULL,
  points_change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- אינדקסים
CREATE INDEX idx_lead_scores_lead ON lead_scores(lead_id);
CREATE INDEX idx_lead_scores_score ON lead_scores(current_score);
CREATE INDEX idx_score_history_lead ON lead_score_history(lead_id);
CREATE INDEX idx_score_history_created ON lead_score_history(created_at);

-- כללים ברירת מחדל
INSERT INTO scoring_rules (name, trigger_type, points) VALUES
  ('ליד נכנס למערכת', 'lead_created', 10),
  ('ליד פתח הודעת WhatsApp', 'whatsapp_opened', 15),
  ('ליד השיב להודעה', 'whatsapp_replied', 20),
  ('ליד עבר לסטאג׳ פגישה', 'stage_meeting', 25),
  ('ליד לא הגיב 7 ימים', 'no_response_7d', -10),
  ('ליד ביטל פגישה', 'meeting_cancelled', -15),
  ('ליד עבר ללא רלוונטי', 'stage_not_relevant', -50);
