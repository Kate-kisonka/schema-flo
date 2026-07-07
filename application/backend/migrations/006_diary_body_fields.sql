-- Расширенные поля дневника (симптомы, цикл тела, упражнения)
alter table diary_entries
  add column if not exists symptoms jsonb not null default '[]'::jsonb,
  add column if not exists discharge text,
  add column if not exists digestion text,
  add column if not exists libido text,
  add column if not exists symptom_notes text not null default '',
  add column if not exists completed_exercise_ids jsonb not null default '[]'::jsonb;

-- Метаданные практик (дневник тишины и др.)
alter table practice_logs
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Удаляем дубликаты перед уникальными индексами
delete from diary_entries a
using diary_entries b
where a.user_id = b.user_id
  and a.entry_date = b.entry_date
  and a.created_at < b.created_at;

delete from cycle_entries a
using cycle_entries b
where a.user_id = b.user_id
  and a.period_start_date = b.period_start_date
  and a.created_at < b.created_at;

create unique index if not exists diary_entries_user_date_uidx
  on diary_entries (user_id, entry_date);

create unique index if not exists cycle_entries_user_period_uidx
  on cycle_entries (user_id, period_start_date);

create unique index if not exists practice_logs_silence_user_date_uidx
  on practice_logs (user_id, ((logged_at at time zone 'UTC')::date))
  where practice_type = 'silence';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'diary_symptoms_is_array'
  ) then
    alter table diary_entries
      add constraint diary_symptoms_is_array check (jsonb_typeof(symptoms) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'diary_exercises_is_array'
  ) then
    alter table diary_entries
      add constraint diary_exercises_is_array check (jsonb_typeof(completed_exercise_ids) = 'array');
  end if;
end $$;
