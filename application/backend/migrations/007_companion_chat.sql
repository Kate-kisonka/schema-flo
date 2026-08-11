create table if not exists companion_chat_consents (
  user_id uuid primary key references users(id) on delete cascade,
  consented_at timestamptz not null default now(),
  revoked_at timestamptz,
  retention_days integer not null
    constraint companion_chat_consents_retention_days_check
    check (retention_days between 1 and 3650),
  chat_version bigint not null default 0
    constraint companion_chat_consents_chat_version_check
    check (chat_version >= 0),
  constraint companion_chat_consents_revoked_at_check
    check (revoked_at is null or revoked_at >= consented_at)
);

create table if not exists companion_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('user', 'companion')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_companion_messages_user_created_id
  on companion_messages(user_id, created_at desc, id desc);
