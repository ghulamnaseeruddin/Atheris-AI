-- ATHERIS AI — Phase 6 (bugfixes + new sections) schema additions

alter table conversations add column if not exists section text not null default 'chat';
alter table conversations drop constraint if exists conversations_section_check;
alter table conversations add constraint conversations_section_check
  check (section in ('chat', 'coding', 'daily-life', 'business'));

create index if not exists conversations_user_section_idx on conversations (user_id, section);
