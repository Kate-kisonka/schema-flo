alter table users
  alter column password_hash drop not null;

create table if not exists oauth_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null,
  provider_user_id text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_user_id),
  unique (provider, user_id)
);

create index if not exists idx_oauth_accounts_user_id
  on oauth_accounts(user_id);

drop trigger if exists trg_oauth_accounts_updated_at on oauth_accounts;
create trigger trg_oauth_accounts_updated_at
before update on oauth_accounts
for each row execute function set_updated_at();
