create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  entry_date date not null default current_date,
  mood_ids jsonb not null default '[]'::jsonb,
  active_schema_ids jsonb not null default '[]'::jsonb,
  intensity int check (intensity between 1 and 10),
  notes text not null default '',
  cycle_day int,
  phase_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_diary_user_created_at
  on diary_entries(user_id, created_at desc);
create index if not exists idx_diary_user_entry_date
  on diary_entries(user_id, entry_date desc);

create table if not exists cycle_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  period_start_date date not null,
  cycle_length int,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_cycle_user_period_start
  on cycle_entries(user_id, period_start_date desc);

create table if not exists practice_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  practice_type text not null,
  duration_sec int,
  logged_at timestamptz not null default now()
);

create index if not exists idx_practice_user_logged_at
  on practice_logs(user_id, logged_at desc);
