-- Orçamentos estruturados e aprovação privada por token.
alter table public.appointments
  drop constraint if exists appointments_workflow_stage_check;
alter table public.appointments
  add constraint appointments_workflow_stage_check check (
    workflow_stage in (
      'request_received', 'measuring', 'quote_sent', 'awaiting_approval',
      'approved', 'material_ordered', 'in_production', 'ready', 'completed'
    )
  );

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete set null,
  public_token uuid not null default gen_random_uuid() unique,
  number bigint generated always as identity,
  status text not null default 'draft' check (status in ('draft','sent','approved','rejected','expired')),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  valid_until date,
  payment_terms text check (payment_terms is null or char_length(payment_terms) <= 1000),
  notes text check (notes is null or char_length(notes) <= 2000),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  description text not null check (char_length(trim(description)) between 2 and 300),
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index quotes_user_created_idx on public.quotes(user_id, created_at desc);
create index quote_items_quote_idx on public.quote_items(quote_id, position);
create trigger quotes_set_updated_at before update on public.quotes
for each row execute function public.set_updated_at();

alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
create policy "quotes_all_own" on public.quotes for all
using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.clients c where c.id = client_id and c.user_id = (select auth.uid()))
  and (appointment_id is null or exists (select 1 from public.appointments a where a.id = appointment_id and a.user_id = (select auth.uid())))
);
create policy "quote_items_all_own" on public.quote_items for all
using (exists (select 1 from public.quotes q where q.id = quote_id and q.user_id = (select auth.uid())))
with check (exists (select 1 from public.quotes q where q.id = quote_id and q.user_id = (select auth.uid())));
grant select, insert, update, delete on public.quotes, public.quote_items to authenticated;

create function public.get_public_quote(p_token uuid)
returns jsonb language sql security definer stable set search_path = '' as $$
  select jsonb_build_object(
    'quote', jsonb_build_object(
      'number', q.number, 'status', q.status, 'discount', q.discount,
      'valid_until', q.valid_until, 'payment_terms', q.payment_terms,
      'notes', q.notes, 'created_at', q.created_at
    ),
    'business', jsonb_build_object(
      'name', coalesce(p.business_name, p.full_name), 'phone', p.phone,
      'logo_url', p.logo_url, 'address', p.address
    ),
    'client', jsonb_build_object('name', c.name),
    'items', coalesce((select jsonb_agg(jsonb_build_object(
      'description', i.description, 'quantity', i.quantity,
      'unit_price', i.unit_price, 'total', i.quantity * i.unit_price
    ) order by i.position) from public.quote_items i where i.quote_id = q.id), '[]'::jsonb)
  )
  from public.quotes q
  join public.profiles p on p.id = q.user_id
  join public.clients c on c.id = q.client_id
  where q.public_token = p_token and q.status <> 'draft';
$$;

create function public.respond_to_quote(p_token uuid, p_response text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_quote public.quotes%rowtype;
  v_total numeric(12,2);
begin
  if p_response not in ('approved','rejected') then raise exception 'Resposta inválida'; end if;
  select * into v_quote from public.quotes where public_token = p_token for update;
  if not found or v_quote.status <> 'sent' then raise exception 'Orçamento indisponível'; end if;
  if v_quote.valid_until is not null and v_quote.valid_until < current_date then
    update public.quotes set status = 'expired' where id = v_quote.id;
    raise exception 'Orçamento vencido';
  end if;
  update public.quotes set status = p_response, responded_at = now() where id = v_quote.id;
  if p_response = 'approved' and v_quote.appointment_id is not null then
    select greatest(0, coalesce(sum(quantity * unit_price), 0) - v_quote.discount)
      into v_total from public.quote_items where quote_id = v_quote.id;
    update public.appointments
      set status = 'confirmed', workflow_stage = 'approved', amount = v_total
      where id = v_quote.appointment_id and user_id = v_quote.user_id;
  end if;
  return p_response;
end;
$$;

revoke all on function public.get_public_quote(uuid) from public;
revoke all on function public.respond_to_quote(uuid, text) from public;
grant execute on function public.get_public_quote(uuid) to anon, authenticated;
grant execute on function public.respond_to_quote(uuid, text) to anon, authenticated;
