-- ============================================================
--  Migration: Module 3 — Workflow Builder
-- ============================================================

-- 1. Workflows table
create table if not exists workflows (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  trigger_type    text not null,           -- 'webhook_lead' | 'column_change'
  trigger_config  jsonb not null default '{}',
  is_active       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table workflows disable row level security;

-- 2. Workflow steps table
create table if not exists workflow_steps (
  id              uuid primary key default uuid_generate_v4(),
  workflow_id     uuid not null references workflows(id) on delete cascade,
  step_order      int not null default 0,
  action_type     text not null,           -- 'create_contact' | 'add_tag' | 'send_whatsapp' | 'wait' | 'stop_previous' | 'send_email' | 'create_reminder'
  action_config   jsonb not null default '{}',
  wait_duration   int,                     -- duration in minutes (for 'wait' action)
  created_at      timestamptz not null default now()
);
alter table workflow_steps disable row level security;
create index if not exists idx_wf_steps_workflow on workflow_steps(workflow_id, step_order);

-- 3. Workflow execution logs
create table if not exists workflow_logs (
  id              uuid primary key default uuid_generate_v4(),
  workflow_id     uuid not null references workflows(id) on delete cascade,
  lead_id         uuid references leads(id) on delete set null,
  step_id         uuid references workflow_steps(id) on delete set null,
  status          text not null default 'running',  -- 'running' | 'completed' | 'failed' | 'waiting' | 'stopped'
  step_order      int,
  details         text,
  executed_at     timestamptz not null default now()
);
alter table workflow_logs disable row level security;
create index if not exists idx_wf_logs_workflow on workflow_logs(workflow_id);
create index if not exists idx_wf_logs_lead on workflow_logs(lead_id);

-- 4. Lead tags table (for add_tag action)
create table if not exists lead_tags (
  id         uuid primary key default uuid_generate_v4(),
  lead_id    uuid not null references leads(id) on delete cascade,
  tag        text not null,
  created_at timestamptz not null default now(),
  unique(lead_id, tag)
);
alter table lead_tags disable row level security;
create index if not exists idx_lead_tags_lead on lead_tags(lead_id);
