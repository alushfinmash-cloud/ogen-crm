-- ============================================================
--  Migration: Module 2 — Webhooks
-- ============================================================

-- 1. Webhooks configuration table
create table if not exists webhooks (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  slug         text not null unique,
  pipeline_id  uuid not null references pipelines(id) on delete cascade,
  column_id    uuid not null references pipeline_columns(id) on delete cascade,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table webhooks disable row level security;
create index if not exists idx_webhooks_slug on webhooks(slug);

-- 2. Webhook incoming logs
create table if not exists webhook_logs (
  id           uuid primary key default uuid_generate_v4(),
  webhook_id   uuid not null references webhooks(id) on delete cascade,
  lead_id      uuid references leads(id) on delete set null,
  payload      jsonb not null default '{}',
  status       text not null default 'success',  -- success | error
  error_message text,
  ip_address   text,
  created_at   timestamptz not null default now()
);

alter table webhook_logs disable row level security;
create index if not exists idx_webhook_logs_webhook_id on webhook_logs(webhook_id);
create index if not exists idx_webhook_logs_created_at on webhook_logs(created_at desc);
