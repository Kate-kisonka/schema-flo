alter table users
  add column if not exists email_verified_at timestamptz;

update users
set email_verified_at = coalesce(email_verified_at, created_at, now())
where email_verified_at is null;

create table if not exists email_verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  code_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists idx_email_verification_codes_user_created
  on email_verification_codes(user_id, created_at desc);

create index if not exists idx_email_verification_codes_active
  on email_verification_codes(user_id, code_hash, expires_at)
  where used_at is null;
