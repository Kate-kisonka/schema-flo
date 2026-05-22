create table if not exists user_states (
  user_id uuid primary key references users(id) on delete cascade,
  cycle_day int,
  period_start_date date,
  period_active boolean not null default false,
  silence_active boolean not null default false,
  silence_start_date date,
  silence_days int not null default 14,
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at_user_states() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_states_updated_at on user_states;
create trigger trg_user_states_updated_at
before update on user_states for each row execute function set_updated_at_user_states();
