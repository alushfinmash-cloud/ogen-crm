-- ============================================================
--  Migration: Module 4 — Tasks & Reminders
-- ============================================================

create table if not exists tasks (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null,
  description  text,
  lead_id      uuid references leads(id) on delete set null,
  assigned_to  text not null default 'מנהל המערכת',
  due_date     timestamptz,
  priority     text not null default 'בינונית',  -- נמוכה | בינונית | גבוהה | דחוף
  status       text not null default 'פתוחה',     -- פתוחה | בטיפול | הושלמה | בוטלה
  source       text not null default 'manual',    -- manual | workflow | system
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table tasks disable row level security;
create index if not exists idx_tasks_lead on tasks(lead_id);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_tasks_due on tasks(due_date);
create index if not exists idx_tasks_assigned on tasks(assigned_to);

create table if not exists task_reminders (
  id         uuid primary key default uuid_generate_v4(),
  task_id    uuid not null references tasks(id) on delete cascade,
  remind_at  timestamptz not null,
  is_sent    boolean not null default false,
  created_at timestamptz not null default now()
);
alter table task_reminders disable row level security;
create index if not exists idx_task_reminders_task on task_reminders(task_id);
