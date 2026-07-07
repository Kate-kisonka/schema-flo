-- Case-insensitive email uniqueness
create unique index if not exists users_email_lower_uidx on users (lower(email));

-- Auto-update updated_at trigger
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
before update on users
for each row execute function set_updated_at();

drop trigger if exists trg_diary_entries_updated_at on diary_entries;
create trigger trg_diary_entries_updated_at
before update on diary_entries
for each row execute function set_updated_at();

-- Data quality constraints
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'diary_mood_ids_is_array'
  ) then
    alter table diary_entries
      add constraint diary_mood_ids_is_array check (jsonb_typeof(mood_ids) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'diary_schema_ids_is_array'
  ) then
    alter table diary_entries
      add constraint diary_schema_ids_is_array check (jsonb_typeof(active_schema_ids) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'practice_duration_nonnegative'
  ) then
    alter table practice_logs
      add constraint practice_duration_nonnegative check (duration_sec is null or duration_sec >= 0);
  end if;
end $$;
