-- ═══════════════════════════════════════
-- Comment-to-DM Automation
-- תגובה אוטומטית בהודעה פרטית לתגובות בפוסטים
-- ═══════════════════════════════════════

-- Rules table: each row = one keyword trigger on a specific post
CREATE TABLE IF NOT EXISTS comment_auto_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  post_id TEXT NOT NULL,           -- Meta post ID
  post_url TEXT,                   -- URL of the post (for display)
  post_title TEXT,                 -- Short description of the post
  keyword TEXT NOT NULL,           -- Keyword to match in comment (case-insensitive)
  dm_message TEXT NOT NULL,        -- Message to send as DM
  public_reply TEXT,               -- Optional public reply to the comment
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs table: track every auto-reply sent
CREATE TABLE IF NOT EXISTS comment_auto_reply_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES comment_auto_replies(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  post_id TEXT NOT NULL,
  comment_id TEXT NOT NULL,
  commenter_id TEXT NOT NULL,
  commenter_name TEXT,
  comment_text TEXT,
  keyword_matched TEXT,
  dm_sent BOOLEAN DEFAULT false,
  public_reply_sent BOOLEAN DEFAULT false,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS (consistent with other tables in the project)
ALTER TABLE comment_auto_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_auto_reply_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on comment_auto_replies" ON comment_auto_replies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on comment_auto_reply_logs" ON comment_auto_reply_logs FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comment_auto_replies_platform ON comment_auto_replies(platform);
CREATE INDEX IF NOT EXISTS idx_comment_auto_replies_post_id ON comment_auto_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_comment_auto_replies_active ON comment_auto_replies(is_active);
CREATE INDEX IF NOT EXISTS idx_comment_auto_reply_logs_rule ON comment_auto_reply_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_comment_auto_reply_logs_created ON comment_auto_reply_logs(created_at);
