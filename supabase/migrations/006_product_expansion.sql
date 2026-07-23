-- Personalização, regras comerciais, financeiro e clientes avançados.
alter table public.profiles
  add column address text check (address is null or char_length(address) <= 300),
  add column instagram text check (instagram is null or char_length(instagram) <= 100),
  add column logo_url text check (logo_url is null or char_length(logo_url) <= 1000),
  add column booking_min_notice_minutes integer not null default 120 check (booking_min_notice_minutes between 0 and 43200),
  add column booking_window_days integer not null default 30 check (booking_window_days between 1 and 365),
  add column slot_interval_minutes integer not null default 30 check (slot_interval_minutes between 5 and 240),
  add column cancellation_policy text check (cancellation_policy is null or char_length(cancellation_policy) <= 1000),
  add column confirmation_message text check (confirmation_message is null or char_length(confirmation_message) <= 500),
  add column accepted_payments text[] not null default '{}';

alter table public.business_hours
  add column break_start time,
  add column break_end time,
  add constraint business_hours_valid_break check (
    (break_start is null and break_end is null)
    or (break_start is not null and break_end is not null and break_end > break_start and break_start >= start_time and break_end <= end_time)
  );

create type public.payment_status as enum ('pending', 'paid', 'refunded');
alter table public.appointments
  add column amount numeric(10,2) check (amount is null or amount >= 0),
  add column payment_status public.payment_status not null default 'pending',
  add column payment_method text check (payment_method is null or char_length(payment_method) <= 50);

update public.appointments a set amount = s.price from public.services s where a.service_id = s.id and a.amount is null;

alter table public.clients
  add column birth_date date,
  add column tags text[] not null default '{}',
  add column preferences text check (preferences is null or char_length(preferences) <= 2000);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-assets', 'business-assets', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "business_assets_public_read" on storage.objects for select using (bucket_id = 'business-assets');
create policy "business_assets_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'business-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "business_assets_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'business-assets' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'business-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "business_assets_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'business-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);
