-- RealStudio Founder Desk demo. Run in the project's SQL editor.
-- The public case data and team roster remain static files in the Site.
-- These two tables store only each signed-in viewer's edits.

create table if not exists public.demo_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null check (client_id in ('toom', 'mcneill', 'smilodox')),
  title text not null check (char_length(title) between 1 and 80),
  url text not null check (url ~ '^https://'),
  created_at timestamptz not null default now()
);

create table if not exists public.reviewed_decisions (
  user_id uuid not null references auth.users(id) on delete cascade,
  decision_id text not null check (decision_id in ('d01', 'd02', 'd03')),
  reviewed_at timestamptz not null default now(),
  primary key (user_id, decision_id)
);

alter table public.demo_videos enable row level security;
alter table public.reviewed_decisions enable row level security;

revoke all on public.demo_videos from anon, authenticated;
revoke all on public.reviewed_decisions from anon, authenticated;
grant select, insert, delete on public.demo_videos to authenticated;
grant select, insert, delete on public.reviewed_decisions to authenticated;

create policy "View own demo videos" on public.demo_videos
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Add own demo videos" on public.demo_videos
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Delete own demo videos" on public.demo_videos
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "View own reviewed decisions" on public.reviewed_decisions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Add own reviewed decisions" on public.reviewed_decisions
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Delete own reviewed decisions" on public.reviewed_decisions
  for delete to authenticated using ((select auth.uid()) = user_id);
