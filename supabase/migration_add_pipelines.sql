-- ============================================================
--  Migration: Add multi-pipeline support
-- ============================================================

-- 1. Create pipelines table
create table if not exists pipelines (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  color      text not null default '#3b82f6',
  icon       text default 'pipe',
  created_at timestamptz not null default now()
);

alter table pipelines disable row level security;

-- 2. Insert default pipeline
insert into pipelines (id, name, color) values
  ('00000000-0000-0000-0000-000000000001', 'פייפליין ראשי', '#3b82f6');

-- 3. Add pipeline_id column to pipeline_columns
alter table pipeline_columns
  add column if not exists pipeline_id uuid references pipelines(id) on delete cascade;

-- 4. Assign all existing columns to the default pipeline
update pipeline_columns
  set pipeline_id = '00000000-0000-0000-0000-000000000001'
  where pipeline_id is null;

-- 5. Make pipeline_id NOT NULL going forward
alter table pipeline_columns
  alter column pipeline_id set not null;

-- 6. Index
create index if not exists idx_columns_pipeline_id on pipeline_columns(pipeline_id);
