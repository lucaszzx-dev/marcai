-- Leitura segura da página pública e criação de solicitações sem expor dados privados.
create or replace function public.get_public_booking_data(p_slug text)
returns jsonb
language sql
security definer
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'profile', jsonb_build_object(
      'business_name', p.business_name,
      'full_name', p.full_name,
      'bio', p.bio,
      'phone', p.phone,
      'slug', p.slug
    ),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'description', s.description, 'price', s.price, 'duration_minutes', s.duration_minutes) order by s.name)
      from public.services s where s.user_id = p.id and s.active
    ), '[]'::jsonb),
    'hours', coalesce((
      select jsonb_agg(jsonb_build_object('weekday', h.weekday, 'start_time', h.start_time, 'end_time', h.end_time) order by h.weekday)
      from public.business_hours h where h.user_id = p.id and h.enabled
    ), '[]'::jsonb),
    'busy', coalesce((
      select jsonb_agg(jsonb_build_object('starts_at', a.starts_at, 'ends_at', a.ends_at))
      from public.appointments a where a.user_id = p.id and a.status <> 'cancelled' and a.ends_at >= now() and a.starts_at < now() + interval '60 days'
    ), '[]'::jsonb) || coalesce((
      select jsonb_agg(jsonb_build_object('starts_at', b.starts_at, 'ends_at', b.ends_at))
      from public.blocked_periods b where b.user_id = p.id and b.ends_at >= now() and b.starts_at < now() + interval '60 days'
    ), '[]'::jsonb)
  )
  from public.profiles p
  where lower(p.slug) = lower(p_slug) and p.public_booking_enabled;
$$;

create or replace function public.request_public_appointment(
  p_slug text,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_client_name text,
  p_phone text default null,
  p_email text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user public.profiles%rowtype;
  v_service public.services%rowtype;
  v_client_id uuid;
  v_appointment_id uuid;
  v_ends_at timestamptz;
  v_local_start timestamp;
  v_local_end timestamp;
begin
  if char_length(trim(p_client_name)) < 2 then raise exception 'Nome inválido'; end if;
  if nullif(trim(coalesce(p_phone, '')), '') is null and nullif(trim(coalesce(p_email, '')), '') is null then raise exception 'Informe telefone ou e-mail'; end if;
  if p_starts_at <= now() then raise exception 'Escolha um horário futuro'; end if;

  select * into v_user from public.profiles where lower(slug) = lower(p_slug) and public_booking_enabled;
  if not found then raise exception 'Página de agendamento indisponível'; end if;
  select * into v_service from public.services where id = p_service_id and user_id = v_user.id and active;
  if not found then raise exception 'Serviço indisponível'; end if;

  v_ends_at := p_starts_at + make_interval(mins => v_service.duration_minutes);
  v_local_start := p_starts_at at time zone v_user.timezone;
  v_local_end := v_ends_at at time zone v_user.timezone;
  if not exists (
    select 1 from public.business_hours h
    where h.user_id = v_user.id and h.enabled
      and h.weekday = extract(dow from v_local_start)
      and v_local_start::time >= h.start_time and v_local_end::time <= h.end_time
  ) then raise exception 'Horário fora do expediente'; end if;
  if exists (
    select 1 from public.blocked_periods b where b.user_id = v_user.id
    and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_starts_at, v_ends_at, '[)')
  ) then raise exception 'Horário indisponível'; end if;

  insert into public.clients (user_id, name, phone, email, notes)
  values (v_user.id, trim(p_client_name), nullif(trim(p_phone), ''), nullif(trim(p_email), ''), 'Criado pelo agendamento público')
  returning id into v_client_id;
  insert into public.appointments (user_id, client_id, service_id, starts_at, ends_at, status, notes)
  values (v_user.id, v_client_id, v_service.id, p_starts_at, v_ends_at, 'pending', nullif(trim(p_notes), ''))
  returning id into v_appointment_id;
  return v_appointment_id;
exception when exclusion_violation then
  raise exception 'Este horário acabou de ser reservado. Escolha outro.';
end;
$$;

revoke all on function public.get_public_booking_data(text) from public;
revoke all on function public.request_public_appointment(text, uuid, timestamptz, text, text, text, text) from public;
grant execute on function public.get_public_booking_data(text) to anon, authenticated;
grant execute on function public.request_public_appointment(text, uuid, timestamptz, text, text, text, text) to anon, authenticated;
