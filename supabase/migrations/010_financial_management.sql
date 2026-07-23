-- Categorias personalizadas e movimentações financeiras privadas.
create table if not exists public.financial_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  kind text not null check (kind in ('income', 'expense')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, name, kind)
);

create table if not exists public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.financial_categories(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete set null,
  description text not null check (char_length(trim(description)) between 2 and 200),
  amount numeric(12,2) not null check (amount > 0),
  entry_date date not null default current_date,
  status text not null default 'planned' check (status in ('planned', 'paid')),
  recurring boolean not null default false,
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists financial_entries_user_date_idx on public.financial_entries(user_id, entry_date);
create index if not exists financial_entries_appointment_idx on public.financial_entries(appointment_id);
drop trigger if exists financial_entries_set_updated_at on public.financial_entries;
create trigger financial_entries_set_updated_at before update on public.financial_entries
for each row execute function public.set_updated_at();

alter table public.financial_categories enable row level security;
alter table public.financial_entries enable row level security;

drop policy if exists "financial_categories_all_own" on public.financial_categories;
create policy "financial_categories_all_own" on public.financial_categories for all
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "financial_entries_all_own" on public.financial_entries;
create policy "financial_entries_all_own" on public.financial_entries for all
using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.financial_categories c where c.id = category_id and c.user_id = (select auth.uid()))
  and (appointment_id is null or exists (select 1 from public.appointments a where a.id = appointment_id and a.user_id = (select auth.uid())))
);

grant select, insert, update, delete on public.financial_categories, public.financial_entries to authenticated;
