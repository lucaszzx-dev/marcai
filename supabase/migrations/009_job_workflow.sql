-- Acompanhamento operacional privado de cada trabalho.
alter table public.appointments
  add column if not exists workflow_stage text not null default 'request_received'
    check (workflow_stage in ('request_received', 'measuring', 'quote_sent', 'awaiting_approval', 'material_ordered', 'in_production', 'ready', 'completed')),
  add column if not exists material_status text not null default 'not_required'
    check (material_status in ('not_required', 'to_order', 'ordered', 'received')),
  add column if not exists preparation_deadline date,
  add column if not exists material_expected_at date,
  add column if not exists internal_notes text
    check (internal_notes is null or char_length(internal_notes) <= 3000);

create index if not exists appointments_user_workflow_idx
  on public.appointments(user_id, workflow_stage, preparation_deadline);
