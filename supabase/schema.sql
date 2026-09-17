-- API Monitor - Supabase PostgreSQL schema
-- Run this once in Supabase SQL Editor before starting the backend.

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(), name text not null, description text,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists services_user_id_idx on public.services(user_id);

DO $$ BEGIN CREATE TYPE public.monitor_status AS ENUM ('UP', 'DOWN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.http_method AS ENUM ('GET'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.incident_status AS ENUM ('OPEN', 'RESOLVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

create table if not exists public.monitors (
  id uuid primary key default gen_random_uuid(), name text not null, url text not null,
  method public.http_method not null default 'GET', interval integer not null default 60 check (interval >= 60),
  timeout integer not null default 10000 check (timeout >= 1000), expected_status integer not null default 200 check (expected_status between 100 and 599),
  is_active boolean not null default true, service_id uuid not null references public.services(id) on delete cascade,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists monitors_service_id_idx on public.monitors(service_id);
create index if not exists monitors_is_active_idx on public.monitors(is_active);

create table if not exists public.check_results (
  id uuid primary key default gen_random_uuid(), monitor_id uuid not null references public.monitors(id) on delete cascade,
  status public.monitor_status not null, status_code integer, response_time integer, error text, checked_at timestamptz not null default now()
);
create index if not exists check_results_monitor_checked_at_idx on public.check_results(monitor_id, checked_at desc);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(), monitor_id uuid not null references public.monitors(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade, status public.incident_status not null default 'OPEN',
  started_at timestamptz not null default now(), resolved_at timestamptz, last_error text
);
create index if not exists incidents_monitor_status_idx on public.incidents(monitor_id, status);
create index if not exists incidents_user_started_at_idx on public.incidents(user_id, started_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

DROP TRIGGER IF EXISTS users_set_updated_at ON public.users;
create trigger users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
DROP TRIGGER IF EXISTS services_set_updated_at ON public.services;
create trigger services_set_updated_at before update on public.services for each row execute function public.set_updated_at();
DROP TRIGGER IF EXISTS monitors_set_updated_at ON public.monitors;
create trigger monitors_set_updated_at before update on public.monitors for each row execute function public.set_updated_at();

create schema if not exists private;
create or replace function private.handle_new_auth_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.users (id, email) values (new.id, coalesce(new.email, new.id::text || '@unknown.local')) on conflict (id) do update set email = excluded.email, updated_at = now(); return new; end; $$;
revoke execute on function private.handle_new_auth_user() from public;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_auth_user();

alter table public.users enable row level security;
alter table public.services enable row level security;
alter table public.monitors enable row level security;
alter table public.check_results enable row level security;
alter table public.incidents enable row level security;

revoke all on table public.users from anon, authenticated;
revoke all on table public.services from anon, authenticated;
revoke all on table public.monitors from anon, authenticated;
revoke all on table public.check_results from anon, authenticated;
revoke all on table public.incidents from anon, authenticated;
grant select, insert, update, delete on table public.users to authenticated;
grant select, insert, update, delete on table public.services to authenticated;
grant select, insert, update, delete on table public.monitors to authenticated;
grant select, insert, update, delete on table public.check_results to authenticated;
grant select, insert, update, delete on table public.incidents to authenticated;

DROP POLICY IF EXISTS users_select_own ON public.users;
create policy users_select_own on public.users for select to authenticated using ((select auth.uid()) is not null and (select auth.uid()) = id);
DROP POLICY IF EXISTS users_update_own ON public.users;
create policy users_update_own on public.users for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

DROP POLICY IF EXISTS services_select_own ON public.services;
create policy services_select_own on public.services for select to authenticated using ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS services_insert_own ON public.services;
create policy services_insert_own on public.services for insert to authenticated with check ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS services_update_own ON public.services;
create policy services_update_own on public.services for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS services_delete_own ON public.services;
create policy services_delete_own on public.services for delete to authenticated using ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS monitors_select_own ON public.monitors;
create policy monitors_select_own on public.monitors for select to authenticated using (exists (select 1 from public.services s where s.id = service_id and s.user_id = (select auth.uid())));
DROP POLICY IF EXISTS monitors_insert_own ON public.monitors;
create policy monitors_insert_own on public.monitors for insert to authenticated with check (exists (select 1 from public.services s where s.id = service_id and s.user_id = (select auth.uid())));
DROP POLICY IF EXISTS monitors_update_own ON public.monitors;
create policy monitors_update_own on public.monitors for update to authenticated using (exists (select 1 from public.services s where s.id = service_id and s.user_id = (select auth.uid()))) with check (exists (select 1 from public.services s where s.id = service_id and s.user_id = (select auth.uid())));
DROP POLICY IF EXISTS monitors_delete_own ON public.monitors;
create policy monitors_delete_own on public.monitors for delete to authenticated using (exists (select 1 from public.services s where s.id = service_id and s.user_id = (select auth.uid())));

DROP POLICY IF EXISTS check_results_select_own ON public.check_results;
create policy check_results_select_own on public.check_results for select to authenticated using (exists (select 1 from public.monitors m join public.services s on s.id = m.service_id where m.id = monitor_id and s.user_id = (select auth.uid())));
DROP POLICY IF EXISTS check_results_insert_own ON public.check_results;
create policy check_results_insert_own on public.check_results for insert to authenticated with check (exists (select 1 from public.monitors m join public.services s on s.id = m.service_id where m.id = monitor_id and s.user_id = (select auth.uid())));
DROP POLICY IF EXISTS check_results_delete_own ON public.check_results;
create policy check_results_delete_own on public.check_results for delete to authenticated using (exists (select 1 from public.monitors m join public.services s on s.id = m.service_id where m.id = monitor_id and s.user_id = (select auth.uid())));

DROP POLICY IF EXISTS incidents_select_own ON public.incidents;
create policy incidents_select_own on public.incidents for select to authenticated using ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS incidents_insert_own ON public.incidents;
create policy incidents_insert_own on public.incidents for insert to authenticated with check ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS incidents_update_own ON public.incidents;
create policy incidents_update_own on public.incidents for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS incidents_delete_own ON public.incidents;
create policy incidents_delete_own on public.incidents for delete to authenticated using ((select auth.uid()) = user_id);