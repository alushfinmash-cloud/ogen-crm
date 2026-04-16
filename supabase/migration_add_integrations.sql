-- ============================================================
--  Migration: Module 6 — Integrations
-- ============================================================

create table if not exists integrations (
  id            uuid primary key default uuid_generate_v4(),
  type          text not null unique,
  config        jsonb default '{}',
  is_active     boolean not null default false,
  connected_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table integrations disable row level security;

create table if not exists whatsapp_templates (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  content    text not null,
  status     text not null default 'pending',
  created_at timestamptz not null default now()
);
alter table whatsapp_templates disable row level security;

create table if not exists whatsapp_messages (
  id          uuid primary key default uuid_generate_v4(),
  contact_id  uuid references contacts(id) on delete set null,
  lead_id     uuid references leads(id) on delete set null,
  direction   text not null default 'out',
  content     text not null,
  status      text not null default 'sent',
  sent_at     timestamptz not null default now()
);
alter table whatsapp_messages disable row level security;
create index if not exists idx_wm_contact on whatsapp_messages(contact_id);
create index if not exists idx_wm_lead on whatsapp_messages(lead_id);

create table if not exists emails_sent (
  id          uuid primary key default uuid_generate_v4(),
  contact_id  uuid references contacts(id) on delete set null,
  lead_id     uuid references leads(id) on delete set null,
  subject     text not null,
  body        text not null,
  sent_by     text not null default 'מנהל המערכת',
  sent_at     timestamptz not null default now()
);
alter table emails_sent disable row level security;
create index if not exists idx_es_contact on emails_sent(contact_id);
create index if not exists idx_es_lead on emails_sent(lead_id);

create table if not exists calendar_events (
  id              uuid primary key default uuid_generate_v4(),
  contact_id      uuid references contacts(id) on delete set null,
  lead_id         uuid references leads(id) on delete set null,
  title           text not null,
  description     text,
  start_time      timestamptz not null,
  end_time        timestamptz not null,
  google_event_id text,
  created_by      text not null default 'מנהל המערכת',
  created_at      timestamptz not null default now()
);
alter table calendar_events disable row level security;
create index if not exists idx_ce_contact on calendar_events(contact_id);
create index if not exists idx_ce_lead on calendar_events(lead_id);
