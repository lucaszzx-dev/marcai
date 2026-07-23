-- Permite pedidos personalizados sem obrigar o profissional a cadastrar um catálogo enorme.
alter table public.profiles
  add column if not exists allow_custom_requests boolean not null default true,
  add column if not exists custom_request_duration_minutes integer not null default 60
    check (custom_request_duration_minutes between 15 and 480);

alter table public.appointments
  alter column service_id drop not null,
  add column if not exists request_description text
    check (request_description is null or char_length(request_description) <= 2000);

alter table public.appointments
  drop constraint if exists appointments_service_or_request_check;
alter table public.appointments
  add constraint appointments_service_or_request_check check (
    service_id is not null
    or char_length(trim(coalesce(request_description, ''))) >= 5
  );

drop policy if exists "appointments_insert_own" on public.appointments;
create policy "appointments_insert_own" on public.appointments for insert with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.clients c where c.id = client_id and c.user_id = (select auth.uid()))
  and (
    service_id is null
    or exists (select 1 from public.services s where s.id = service_id and s.user_id = (select auth.uid()))
  )
);

drop policy if exists "appointments_update_own" on public.appointments;
create policy "appointments_update_own" on public.appointments for update
using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.clients c where c.id = client_id and c.user_id = (select auth.uid()))
  and (
    service_id is null
    or exists (select 1 from public.services s where s.id = service_id and s.user_id = (select auth.uid()))
  )
);

create or replace function public.get_public_booking_data(p_slug text)
returns jsonb language sql security definer stable set search_path = '' as $$
  select jsonb_build_object(
    'profile', jsonb_build_object(
      'business_name', p.business_name, 'full_name', p.full_name, 'bio', p.bio,
      'phone', p.phone, 'slug', p.slug, 'address', p.address, 'instagram', p.instagram,
      'logo_url', p.logo_url, 'booking_window_days', p.booking_window_days,
      'slot_interval_minutes', p.slot_interval_minutes, 'cancellation_policy', p.cancellation_policy,
      'confirmation_message', p.confirmation_message, 'accepted_payments', p.accepted_payments,
      'allow_custom_requests', p.allow_custom_requests,
      'custom_request_duration_minutes', p.custom_request_duration_minutes
    ),
    'services', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'description', s.description, 'price', s.price, 'duration_minutes', s.duration_minutes) order by s.name) from public.services s where s.user_id = p.id and s.active), '[]'::jsonb),
    'hours', coalesce((select jsonb_agg(jsonb_build_object('weekday', h.weekday, 'start_time', h.start_time, 'end_time', h.end_time, 'break_start', h.break_start, 'break_end', h.break_end) order by h.weekday) from public.business_hours h where h.user_id = p.id and h.enabled), '[]'::jsonb),
    'busy', coalesce((select jsonb_agg(jsonb_build_object('starts_at', a.starts_at, 'ends_at', a.ends_at)) from public.appointments a where a.user_id = p.id and a.status <> 'cancelled' and a.ends_at >= now() and a.starts_at < now() + make_interval(days => p.booking_window_days)), '[]'::jsonb)
      || coalesce((select jsonb_agg(jsonb_build_object('starts_at', b.starts_at, 'ends_at', b.ends_at)) from public.blocked_periods b where b.user_id = p.id and b.ends_at >= now() and b.starts_at < now() + make_interval(days => p.booking_window_days)), '[]'::jsonb)
  ) from public.profiles p where lower(p.slug) = lower(p_slug) and p.public_booking_enabled;
$$;

drop function if exists public.request_public_appointment(text, uuid, timestamptz, text, text, text, text);
create function public.request_public_appointment(
  p_slug text, p_service_id uuid, p_starts_at timestamptz, p_client_name text,
  p_phone text default null, p_email text default null, p_notes text default null,
  p_request_description text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user public.profiles%rowtype; v_service public.services%rowtype;
  v_client_id uuid; v_appointment_id uuid; v_ends_at timestamptz;
  v_local_start timestamp; v_local_end timestamp; v_duration integer; v_amount numeric(10,2);
begin
  if char_length(trim(p_client_name)) < 2 then raise exception 'Nome inválido'; end if;
  if nullif(trim(coalesce(p_phone, '')), '') is null and nullif(trim(coalesce(p_email, '')), '') is null then raise exception 'Informe telefone ou e-mail'; end if;
  select * into v_user from public.profiles where lower(slug) = lower(p_slug) and public_booking_enabled;
  if not found then raise exception 'Página de agendamento indisponível'; end if;
  if p_starts_at < now() + make_interval(mins => v_user.booking_min_notice_minutes) then raise exception 'Horário sem antecedência suficiente'; end if;
  if p_starts_at > now() + make_interval(days => v_user.booking_window_days) then raise exception 'Horário além da janela permitida'; end if;
  if p_service_id is null then
    if not v_user.allow_custom_requests then raise exception 'Pedidos personalizados indisponíveis'; end if;
    if char_length(trim(coalesce(p_request_description, ''))) < 5 then raise exception 'Descreva o que você precisa'; end if;
    v_duration := v_user.custom_request_duration_minutes; v_amount := null;
  else
    select * into v_service from public.services where id = p_service_id and user_id = v_user.id and active;
    if not found then raise exception 'Serviço indisponível'; end if;
    v_duration := v_service.duration_minutes; v_amount := v_service.price;
  end if;
  v_ends_at := p_starts_at + make_interval(mins => v_duration);
  v_local_start := p_starts_at at time zone v_user.timezone; v_local_end := v_ends_at at time zone v_user.timezone;
  if not exists (select 1 from public.business_hours h where h.user_id = v_user.id and h.enabled and h.weekday = extract(dow from v_local_start) and v_local_start::time >= h.start_time and v_local_end::time <= h.end_time and not (h.break_start is not null and tsrange(v_local_start, v_local_end, '[)') && tsrange(v_local_start::date + h.break_start, v_local_start::date + h.break_end, '[)'))) then raise exception 'Horário fora do expediente'; end if;
  if exists (select 1 from public.blocked_periods b where b.user_id = v_user.id and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_starts_at, v_ends_at, '[)')) then raise exception 'Horário indisponível'; end if;
  select c.id into v_client_id from public.clients c where c.user_id = v_user.id and ((nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '') is not null and regexp_replace(coalesce(c.phone, ''), '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g')) or (nullif(trim(coalesce(p_email, '')), '') is not null and lower(c.email) = lower(trim(p_email)))) order by c.created_at limit 1;
  if v_client_id is null then
    insert into public.clients (user_id, name, phone, email, notes) values (v_user.id, trim(p_client_name), nullif(trim(p_phone), ''), nullif(trim(p_email), ''), 'Criado pela página pública') returning id into v_client_id;
  end if;
  insert into public.appointments (user_id, client_id, service_id, starts_at, ends_at, status, notes, amount, request_description)
  values (v_user.id, v_client_id, p_service_id, p_starts_at, v_ends_at, 'pending', nullif(trim(p_notes), ''), v_amount, nullif(trim(p_request_description), '')) returning id into v_appointment_id;
  return v_appointment_id;
exception when exclusion_violation then raise exception 'Este horário acabou de ser reservado. Escolha outro.';
end;
$$;

revoke all on function public.get_public_booking_data(text) from public;
revoke all on function public.request_public_appointment(text, uuid, timestamptz, text, text, text, text, text) from public;
grant execute on function public.get_public_booking_data(text) to anon, authenticated;
grant execute on function public.request_public_appointment(text, uuid, timestamptz, text, text, text, text, text) to anon, authenticated;
