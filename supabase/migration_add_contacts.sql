-- ============================================================
--  Migration: Module 7 — Contacts
-- ============================================================

create table if not exists contacts (
  id          uuid primary key default uuid_generate_v4(),
  first_name  text not null,
  last_name   text,
  phone       text unique not null,
  email       text,
  tags        text[] default '{}',
  source      text not null default 'manual',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table contacts disable row level security;
create index if not exists idx_contacts_phone on contacts(phone);
create index if not exists idx_contacts_email on contacts(email);
create index if not exists idx_contacts_tags on contacts using gin(tags);

create table if not exists contact_notes (
  id          uuid primary key default uuid_generate_v4(),
  contact_id  uuid not null references contacts(id) on delete cascade,
  content     text not null,
  created_by  text not null default 'מנהל המערכת',
  created_at  timestamptz not null default now()
);
alter table contact_notes disable row level security;
create index if not exists idx_cn_contact on contact_notes(contact_id);

-- Link leads to contacts by phone
alter table leads add column if not exists contact_id uuid references contacts(id) on delete set null;
create index if not exists idx_leads_contact on leads(contact_id);
