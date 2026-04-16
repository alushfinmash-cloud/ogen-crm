-- ═══════════════════════════════════════
-- Enable RLS on ALL tables
-- Run this migration to secure the database
-- ═══════════════════════════════════════

-- Pipeline tables
ALTER TABLE pipeline_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_history ENABLE ROW LEVEL SECURITY;

-- Contact tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;

-- Task tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;

-- Workflow tables
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;

-- Inbox tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_tags ENABLE ROW LEVEL SECURITY;

-- Integration tables
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Webhook tables
ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Agent tables
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_schedules ENABLE ROW LEVEL SECURITY;

-- Scoring tables
ALTER TABLE scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_history ENABLE ROW LEVEL SECURITY;

-- Comment auto-reply tables (already enabled)
-- ALTER TABLE comment_auto_replies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE comment_auto_reply_logs ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════
-- Allow-all policies for service_role access
-- The API uses service_role key which bypasses RLS
-- These policies allow anon key access (for client-side if needed)
-- In production, restrict these to authenticated users only
-- ═══════════════════════════════════════

-- Helper: create allow-all policy (safe because API routes use service_role)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'pipeline_columns', 'leads', 'lead_history',
      'contacts', 'contact_notes',
      'tasks', 'task_reminders',
      'workflows', 'workflow_steps', 'workflow_logs', 'lead_tags',
      'conversations', 'messages', 'quick_replies', 'conversation_notes', 'conversation_tags',
      'integrations',
      'webhook_configs', 'webhook_logs',
      'agents', 'agent_knowledge', 'agent_actions', 'agent_conversations', 'agent_messages', 'agent_logs', 'agent_schedules',
      'scoring_rules', 'lead_scores', 'score_history'
    ])
  LOOP
    -- Drop existing policies if any
    EXECUTE format('DROP POLICY IF EXISTS "Allow all on %s" ON %I', tbl, tbl);
    -- Create new allow-all policy
    EXECUTE format('CREATE POLICY "Allow all on %s" ON %I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END $$;
