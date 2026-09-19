-- ATHERIS AI — Phase 5 schema additions

-- Folders / projects
create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table conversations add column if not exists folder_id uuid references folders(id) on delete set null;

-- Shareable read-only chat links
alter table conversations add column if not exists shared boolean not null default false;
alter table conversations add column if not exists share_slug text unique;

-- Saved prompt templates
create table if not exists prompt_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- Referrals
alter table profiles add column if not exists referral_code text unique;
alter table profiles add column if not exists referred_by uuid references profiles(id);

-- Backfill a referral code for any existing users (new signups get one at insert time — see trigger update below)
update profiles set referral_code = substr(md5(random()::text || id::text), 1, 8)
  where referral_code is null;

-- Update the new-user trigger to also assign a referral code and honor a referred_by code passed at signup
create or replace function handle_new_user()
returns trigger as $$
declare
  ref_code text;
  referrer_id uuid;
begin
  ref_code := substr(md5(random()::text || new.id::text), 1, 8);
  referrer_id := null;

  if new.raw_user_meta_data->>'referred_by_code' is not null then
    select id into referrer_id from public.profiles
      where referral_code = new.raw_user_meta_data->>'referred_by_code';
  end if;

  insert into public.profiles (id, full_name, referral_code, referred_by)
  values (new.id, new.raw_user_meta_data->>'full_name', ref_code, referrer_id);

  -- Bonus credits for both referrer and new user, if a valid referral code was used
  if referrer_id is not null then
    update public.profiles set credits_remaining = credits_remaining + 30 where id = referrer_id;
    update public.profiles set credits_remaining = credits_remaining + 30 where id = new.id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Row Level Security
alter table folders enable row level security;
alter table prompt_templates enable row level security;

create policy "Users can manage their own folders"
  on folders for all using (auth.uid() = user_id);

create policy "Users can manage their own prompt templates"
  on prompt_templates for all using (auth.uid() = user_id);

-- Public (unauthenticated) read access to a conversation and its messages
-- when it has been explicitly shared, for the read-only share page.
create policy "Anyone can read a shared conversation"
  on conversations for select using (shared = true);

create policy "Anyone can read messages of a shared conversation"
  on messages for select using (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
      and conversations.shared = true
    )
  );
