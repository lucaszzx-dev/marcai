-- Marcaí: schema inicial. Execute no SQL Editor de um projeto Supabase novo.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  business_name text check (business_name is null or char_length(business_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  phone text check (phone is null or char_length(phone) <= 30),
  email text check (email is null or char_length(email) <= 254),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text check (description is null or char_length(description) <= 1000),
  price numeric(10,2) not null check (price >= 0),
  duration_minutes integer not null check (duration_minutes between 5 and 1440),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled');
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'pending',
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_valid_period check (ends_at > starts_at)
);

create index clients_user_name_idx on public.clients(user_id, name);
create index services_user_active_idx on public.services(user_id, active);
create index appointments_user_starts_idx on public.appointments(user_id, starts_at);
create index appointments_client_idx on public.appointments(client_id);

create function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger clients_set_updated_at before update on public.clients for each row execute function public.set_updated_at();
create trigger services_set_updated_at before update on public.services for each row execute function public.set_updated_at();
create trigger appointments_set_updated_at before update on public.appointments for each row execute function public.set_updated_at();

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, business_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)), nullif(trim(new.raw_user_meta_data ->> 'business_name'), ''));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;

create policy "profiles_select_own" on public.profiles for select using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "clients_select_own" on public.clients for select using ((select auth.uid()) = user_id);
create policy "clients_insert_own" on public.clients for insert with check ((select auth.uid()) = user_id);
create policy "clients_update_own" on public.clients for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "clients_delete_own" on public.clients for delete using ((select auth.uid()) = user_id);
create policy "services_select_own" on public.services for select using ((select auth.uid()) = user_id);
create policy "services_insert_own" on public.services for insert with check ((select auth.uid()) = user_id);
create policy "services_update_own" on public.services for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "services_delete_own" on public.services for delete using ((select auth.uid()) = user_id);
create policy "appointments_select_own" on public.appointments for select using ((select auth.uid()) = user_id);
create policy "appointments_insert_own" on public.appointments for insert with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.clients c where c.id = client_id and c.user_id = (select auth.uid()))
  and exists (select 1 from public.services s where s.id = service_id and s.user_id = (select auth.uid()))
);
create policy "appointments_update_own" on public.appointments for update using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.clients c where c.id = client_id and c.user_id = (select auth.uid()))
  and exists (select 1 from public.services s where s.id = service_id and s.user_id = (select auth.uid()))
);
create policy "appointments_delete_own" on public.appointments for delete using ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.clients, public.services, public.appointments to authenticated;
