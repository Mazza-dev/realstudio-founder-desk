create table if not exists public.workspace_statuses (
  record_type text not null check (record_type in ('client', 'task')),
  record_id text not null,
  status text not null check (status in ('To plan', 'In progress', 'In review', 'Waiting', 'Needs decision', 'Done')),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (record_type, record_id),
  constraint known_record check (
    (record_type = 'client' and record_id in ('toom', 'mcneill', 'smilodox')) or
    (record_type = 'task' and record_id in ('w01', 'w02', 'w03', 'w04', 'w05', 'w06'))
  )
);

alter table public.workspace_statuses enable row level security;
revoke all on public.workspace_statuses from anon, authenticated;
grant select, insert, update on public.workspace_statuses to authenticated;

create policy "Team can see statuses" on public.workspace_statuses
  for select to authenticated using (true);
create policy "Team can add statuses" on public.workspace_statuses
  for insert to authenticated with check ((select auth.uid()) = updated_by);
create policy "Team can change statuses" on public.workspace_statuses
  for update to authenticated using (true)
  with check ((select auth.uid()) = updated_by);
