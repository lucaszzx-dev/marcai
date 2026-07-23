-- Perfil público, horários de trabalho e bloqueios de agenda.
alter table public.profiles
  add column phone text check (phone is null or char_length(phone) <= 30),
  add column slug text check (slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  add column bio text check (bio is null or char_length(bio) <= 600),
  add column timezone text not null default 'America/Sao_Paulo',
  add column public_booking_enabled boolean not null default false;

create unique index profiles_slug_unique_idx on public.profiles(lower(slug)) where slug is not null;

create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null default '09:00',
  end_time time not null default '18:00',
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, weekday),
  check (end_time > start_time)
);

create table public.blocked_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text check (reason is null or char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index blocked_periods_user_starts_idx on public.blocked_periods(user_id, starts_at);
create trigger business_hours_set_updated_at before update on public.business_hours for each row execute function public.set_updated_at();

alter table public.business_hours enable row level security;
alter table public.blocked_periods enable row level security;

create policy "business_hours_all_own" on public.business_hours for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "blocked_periods_all_own" on public.blocked_periods for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.business_hours, public.blocked_periods to authenticated;
