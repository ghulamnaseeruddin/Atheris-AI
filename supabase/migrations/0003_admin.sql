-- ATHERIS AI — Phase 4 schema additions (Admin)

alter table profiles add column if not exists is_admin boolean not null default false;
alter table profiles add column if not exists is_suspended boolean not null default false;

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table announcements enable row level security;

-- Everyone (any authenticated user) can read active announcements.
create policy "Anyone can read active announcements"
  on announcements for select using (active = true);

-- Only service-role (admin API routes) writes announcements — no public
-- insert/update/delete policy is defined, so writes only succeed via the
-- server-side admin client, which bypasses RLS.

-- To make your own account an admin, run this once with your user id
-- (find it in Supabase Dashboard > Authentication > Users):
-- update profiles set is_admin = true where id = '<your-user-uuid>';
