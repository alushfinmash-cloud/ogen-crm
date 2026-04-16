-- ============================================================
--  Migration: Module 5 — AI Agents
-- ============================================================

create table if not exists agents (
  id             uuid primary key default uuid_generate_v4(),
  name           text not null,
  avatar         text default '🤖',
  role           text not null default 'שירות לקוחות',
  model          text not null default 'claude-sonnet',
  system_prompt  text,
  personality    jsonb default '{}',
  constraints    text,
  channels       text[] default '{}',
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table agents disable row level security;

create table if not exists agent_knowledge_text (
  id         uuid primary key default uuid_generate_v4(),
  agent_id   uuid not null references agents(id) on delete cascade,
  title      text,
  content    text not null,
  created_at timestamptz not null default now()
);
alter table agent_knowledge_text disable row level security;
create index if not exists idx_akt_agent on agent_knowledge_text(agent_id);

create table if not exists agent_knowledge_faq (
  id         uuid primary key default uuid_generate_v4(),
  agent_id   uuid not null references agents(id) on delete cascade,
  question   text not null,
  answer     text not null,
  created_at timestamptz not null default now()
);
alter table agent_knowledge_faq disable row level security;
create index if not exists idx_akf_agent on agent_knowledge_faq(agent_id);

create table if not exists agent_knowledge_links (
  id          uuid primary key default uuid_generate_v4(),
  agent_id    uuid not null references agents(id) on delete cascade,
  url         text not null,
  description text,
  created_at  timestamptz not null default now()
);
alter table agent_knowledge_links disable row level security;
create index if not exists idx_akl_agent on agent_knowledge_links(agent_id);

create table if not exists agent_actions (
  id            uuid primary key default uuid_generate_v4(),
  agent_id      uuid not null references agents(id) on delete cascade,
  action_type   text not null,
  description   text,
  action_config jsonb default '{}',
  is_enabled    boolean not null default true,
  created_at    timestamptz not null default now()
);
alter table agent_actions disable row level security;
create index if not exists idx_aa_agent on agent_actions(agent_id);

create table if not exists agent_conversations (
  id          uuid primary key default uuid_generate_v4(),
  agent_id    uuid not null references agents(id) on delete cascade,
  lead_id     uuid references leads(id) on delete set null,
  channel     text not null default 'whatsapp',
  status      text not null default 'active',
  satisfaction integer,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz
);
alter table agent_conversations disable row level security;
create index if not exists idx_ac_agent on agent_conversations(agent_id);
create index if not exists idx_ac_lead on agent_conversations(lead_id);

create table if not exists agent_messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references agent_conversations(id) on delete cascade,
  role            text not null,
  content         text not null,
  created_at      timestamptz not null default now()
);
alter table agent_messages disable row level security;
create index if not exists idx_am_conv on agent_messages(conversation_id);
