-- Impede dois atendimentos não cancelados no mesmo período para um profissional.
create extension if not exists btree_gist;

alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    user_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status <> 'cancelled');
