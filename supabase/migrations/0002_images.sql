-- ATHERIS AI — Phase 3 schema additions

alter table messages add column if not exists images jsonb;

-- Generated images (separate from chat messages — its own gallery/history)
create table if not exists generated_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  prompt text not null,
  image_data text not null, -- base64 data URI
  flagged boolean not null default false,
  created_at timestamptz not null default now()
);

alter table generated_images enable row level security;

create policy "Users can manage their own generated images"
  on generated_images for all using (auth.uid() = user_id);
