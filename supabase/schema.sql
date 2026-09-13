-- API Monitor - Supabase PostgreSQL schema
-- Run this once in Supabase SQL Editor before starting the backend.

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists services_user_id_idx on public.services(user_id);

create type public.monitor_status as enum ('UP', 'DOWN');
create type public.http_method as enum ('GET');

create table if not exists public.monitors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  method public.http_method not null default 'GET',
  interval integer not null default 60 check (interval >= 60),
  timeout integer not null default 10000 check (timeout >= 1000),
  expected_status integer not null default 200 check (expected_status between 100 and 599),
  is_active boolean not null default true,
  service_id uuid not null references public.services(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists monitors_service_id_idx on public.monitors(service_id);
create index if not exists monitors_is_active_idx on public.monitors(is_active);

create table if not exists public.check_results (
  id uuid primary key default gen_random_uuid(),
  monitor_id uuid not null references public.monitors(id) on delete cascade,
  status public.monitor_status not null,
  status_code integer,
  response_time integer,
  error text,
  checked_at timestamptz not null default now()
);

create index if not exists check_results_monitor_checked_at_idx
  on public.check_results(monitor_id, checked_at desc);

-- Keep updated_at current for mutable tables.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create trigger services_set_updated_at
before update on public.services
for each row execute function public.set_updated_at();

create trigger monitors_set_updated_at
before update on public.monitors
for each row execute function public.set_updated_at();

-- Create the application profile automatically after Supabase Auth signup.
create schema if not exists private;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email)
  values (
    new.id,
    coalesce(new.email, new.id::text || '@unknown.local')
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

revoke execute on function private.handle_new_auth_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

-- Defense in depth for the Supabase Data API.
alter table public.users enable row level security;
alter table public.services enable row level security;
alter table public.monitors enable row level security;
alter table public.check_results enable row level security;

revoke all on table public.users from anon, authenticated;
revoke all on table public.services from anon, authenticated;
revoke all on table public.monitors from anon, authenticated;
revoke all on table public.check_results from anon, authenticated;

grant select, insert, update, delete on table public.users to authenticated;
grant select, insert, update, delete on table public.services to authenticated;
grant select, insert, update, delete on table public.monitors to authenticated;
grant select, insert, update, delete on table public.check_results to authenticated;

-- Users can only access their own profile.
create policy users_select_own on public.users
  for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = id);

create policy users_update_own on public.users
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Services are owned directly by users.
create policy services_select_own on public.services
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy services_insert_own on public.services
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy services_update_own on public.services
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy services_delete_own on public.services
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Monitors inherit ownership from their service.
create policy monitors_select_own on public.monitors
  for select to authenticated
  using (
    exists (
      select 1 from public.services s
      where s.id = service_id and s.user_id = (select auth.uid())
    )
  );

create policy monitors_insert_own on public.monitors
  for insert to authenticated
  with check (
    exists (
      select 1 from public.services s
      where s.id = service_id and s.user_id = (select auth.uid())
    )
  );

create policy monitors_update_own on public.monitors
  for update to authenticated
  using (
    exists (
      select 1 from public.services s
      where s.id = service_id and s.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.services s
      where s.id = service_id and s.user_id = (select auth.uid())
    )
  );

create policy monitors_delete_own on public.monitors
  for delete to authenticated
  using (
    exists (
      select 1 from public.services s
      where s.id = service_id and s.user_id = (select auth.uid())
    )
  );

-- Check results are readable/manageable only through an owned monitor.
create policy check_results_select_own on public.check_results
  for select to authenticated
  using (
    exists (
      select 1
      from public.monitors m
      join public.services s on s.id = m.service_id
      where m.id = monitor_id and s.user_id = (select auth.uid())
    )
  );

create policy check_results_insert_own on public.check_results
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.monitors m
      join public.services s on s.id = m.service_id
      where m.id = monitor_id and s.user_id = (select auth.uid())
    )
  );

create policy check_results_delete_own on public.check_results
  for delete to authenticated
  using (
    exists (
      select 1
      from public.monitors m
      join public.services s on s.id = m.service_id
      where m.id = monitor_id and s.user_id = (select auth.uid())
    )
  );
