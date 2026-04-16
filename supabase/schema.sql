-- ============================================================
--  עוגן פיננסי CRM — Supabase Schema
--  Module 1: Pipeline Kanban
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- Table: pipeline_columns
-- ─────────────────────────────────────────────
create table if not exists pipeline_columns (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  color      text not null default '#3b82f6',
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Table: leads
-- ─────────────────────────────────────────────
create table if not exists leads (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  phone      text,
  email      text,
  source     text default 'אחר',
  status     text default 'חדש',
  notes      text,
  value      numeric(12, 2),
  column_id  uuid not null references pipeline_columns(id) on delete restrict,
  position   int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Table: lead_history
-- ─────────────────────────────────────────────
create table if not exists lead_history (
  id          uuid primary key default uuid_generate_v4(),
  lead_id     uuid not null references leads(id) on delete cascade,
  action      text not null,           -- create | update | column_change | note
  description text not null,
  user_name   text not null default 'מנהל המערכת',
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────
create index if not exists idx_leads_column_id  on leads(column_id);
create index if not exists idx_leads_position   on leads(position);
create index if not exists idx_history_lead_id  on lead_history(lead_id);

-- ─────────────────────────────────────────────
-- Auto-update updated_at trigger
-- ─────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger leads_updated_at
  before update on leads
  for each row execute function update_updated_at();

-- ─────────────────────────────────────────────
-- RLS — disable for local dev (enable in prod)
-- ─────────────────────────────────────────────
alter table pipeline_columns disable row level security;
alter table leads             disable row level security;
alter table lead_history      disable row level security;

-- ─────────────────────────────────────────────
-- Seed: default pipeline columns
-- ─────────────────────────────────────────────
insert into pipeline_columns (name, color, position) values
  ('ליד חדש',      '#3b82f6', 0),
  ('בטיפול',       '#f59e0b', 1),
  ('הצעת מחיר',   '#8b5cf6', 2),
  ('בסגירה',       '#10b981', 3),
  ('סגור - הצלחה','#059669', 4)
on conflict do nothing;
