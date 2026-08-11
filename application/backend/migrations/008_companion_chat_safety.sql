create table if not exists companion_chat_consents (
  user_id uuid primary key references users(id) on delete cascade,
  consented_at timestamptz not null default now(),
  revoked_at timestamptz,
  retention_days integer not null default 30,
  chat_version bigint not null default 0
);

alter table companion_chat_consents
  add column if not exists user_id uuid,
  add column if not exists consented_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists retention_days integer,
  add column if not exists chat_version bigint;

update companion_chat_consents
set consented_at = coalesce(consented_at, now()),
    retention_days = case when retention_days between 1 and 3650 then retention_days else 30 end,
    chat_version = case when chat_version >= 0 then chat_version else 0 end,
    revoked_at = case
      when revoked_at is not null and revoked_at < coalesce(consented_at, now())
        then coalesce(consented_at, now())
      else revoked_at
    end;

delete from companion_chat_consents as consent
where consent.user_id is null
   or not exists (select 1 from users where users.id = consent.user_id);

with ranked_consents as (
  select ctid,
         row_number() over (
           partition by user_id
           order by consented_at desc nulls last, ctid desc
         ) as duplicate_number
  from companion_chat_consents
)
delete from companion_chat_consents
where ctid in (
  select ctid from ranked_consents where duplicate_number > 1
);

alter table companion_chat_consents
  alter column user_id set not null,
  alter column consented_at set default now(),
  alter column consented_at set not null,
  alter column retention_days set default 30,
  alter column retention_days set not null,
  alter column chat_version set default 0,
  alter column chat_version set not null;

create unique index if not exists idx_companion_chat_consents_user_id_unique
  on companion_chat_consents(user_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'companion_chat_consents_user_id_fkey'
      and conrelid = 'companion_chat_consents'::regclass
  ) then
    alter table companion_chat_consents
      add constraint companion_chat_consents_user_id_fkey
      foreign key (user_id) references users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'companion_chat_consents_retention_days_check'
      and conrelid = 'companion_chat_consents'::regclass
  ) then
    alter table companion_chat_consents
      add constraint companion_chat_consents_retention_days_check
      check (retention_days between 1 and 3650);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'companion_chat_consents_chat_version_check'
      and conrelid = 'companion_chat_consents'::regclass
  ) then
    alter table companion_chat_consents
      add constraint companion_chat_consents_chat_version_check
      check (chat_version >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'companion_chat_consents_revoked_at_check'
      and conrelid = 'companion_chat_consents'::regclass
  ) then
    alter table companion_chat_consents
      add constraint companion_chat_consents_revoked_at_check
      check (revoked_at is null or revoked_at >= consented_at);
  end if;
end $$;

create table if not exists companion_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('user', 'companion')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table companion_messages
  add column if not exists id uuid,
  add column if not exists user_id uuid,
  add column if not exists role text,
  add column if not exists content text,
  add column if not exists created_at timestamptz;

update companion_messages
set id = coalesce(id, gen_random_uuid()),
    created_at = coalesce(created_at, now());

delete from companion_messages as message
where message.user_id is null
   or message.content is null
   or message.role is null
   or message.role not in ('user', 'companion')
   or not exists (select 1 from users where users.id = message.user_id);

with ranked_messages as (
  select ctid,
         row_number() over (partition by id order by created_at asc, ctid asc) as duplicate_number
  from companion_messages
)
update companion_messages as message
set id = gen_random_uuid()
from ranked_messages
where message.ctid = ranked_messages.ctid
  and ranked_messages.duplicate_number > 1;

alter table companion_messages
  alter column id set default gen_random_uuid(),
  alter column id set not null,
  alter column user_id set not null,
  alter column role set not null,
  alter column content set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

create unique index if not exists idx_companion_messages_id_unique
  on companion_messages(id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'companion_messages_user_id_fkey'
      and conrelid = 'companion_messages'::regclass
  ) then
    alter table companion_messages
      add constraint companion_messages_user_id_fkey
      foreign key (user_id) references users(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'companion_messages_role_check'
      and conrelid = 'companion_messages'::regclass
  ) then
    alter table companion_messages
      add constraint companion_messages_role_check
      check (role in ('user', 'companion'));
  end if;
end $$;

create index if not exists idx_companion_messages_user_created_id
  on companion_messages(user_id, created_at desc, id desc);
