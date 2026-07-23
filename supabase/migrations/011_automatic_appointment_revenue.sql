-- Sincroniza pagamentos de atendimentos com o financeiro sem duplicidade.
alter table public.financial_entries
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'appointment'));

create unique index if not exists financial_entries_appointment_source_unique
  on public.financial_entries(appointment_id)
  where source = 'appointment' and appointment_id is not null;

create or replace function public.sync_appointment_revenue()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_category_id uuid; v_description text;
begin
  if new.payment_status = 'paid' and coalesce(new.amount, 0) > 0 then
    insert into public.financial_categories(user_id, name, kind)
    values (new.user_id, 'Receita de atendimentos', 'income')
    on conflict (user_id, name, kind) do update set active = true
    returning id into v_category_id;
    select coalesce(s.name, nullif(new.request_description, ''), 'Pedido personalizado')
      into v_description from public.services s where s.id = new.service_id;
    v_description := coalesce(v_description, nullif(new.request_description, ''), 'Pedido personalizado');
    insert into public.financial_entries(
      user_id, category_id, appointment_id, description, amount, entry_date,
      status, recurring, source
    ) values (
      new.user_id, v_category_id, new.id, v_description, new.amount,
      (coalesce(new.updated_at, now()) at time zone 'America/Sao_Paulo')::date,
      'paid', false, 'appointment'
    )
    on conflict (appointment_id) where source = 'appointment' and appointment_id is not null
    do update set amount = excluded.amount, description = excluded.description,
      entry_date = excluded.entry_date, status = 'paid', category_id = excluded.category_id;
  else
    delete from public.financial_entries
      where appointment_id = new.id and source = 'appointment';
  end if;
  return new;
end;
$$;

revoke all on function public.sync_appointment_revenue() from public;

drop trigger if exists appointments_sync_revenue on public.appointments;
create trigger appointments_sync_revenue
after insert or update of payment_status, amount, service_id, request_description
on public.appointments for each row execute function public.sync_appointment_revenue();

-- Sincroniza também atendimentos já existentes e pagos.
update public.appointments set amount = amount where payment_status = 'paid' and amount > 0;
