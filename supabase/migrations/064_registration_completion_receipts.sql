create table if not exists public.registration_completion_receipts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  registration_intent_id uuid references public.registration_intents(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  selected_portal text not null check (selected_portal in ('professional', 'corporate')),
  selected_mode text not null check (selected_mode in ('signin', 'signup')),
  completion_status text not null check (completion_status in ('hosted_callback_pending', 'dashboard_landed', 'first_database_write_verified')),
  redirect_url text not null,
  current_dashboard text not null,
  first_database_write text not null,
  registration_intent_status text not null,
  preview_data_accepted boolean not null default false,
  localhost_redirect_detected boolean not null default false,
  accepted_when text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.registration_completion_receipts enable row level security;

drop policy if exists "registration completion owners read" on public.registration_completion_receipts;
create policy "registration completion owners read"
on public.registration_completion_receipts
for select
using (profile_id = auth.uid());

drop policy if exists "registration completion org members read" on public.registration_completion_receipts;
create policy "registration completion org members read"
on public.registration_completion_receipts
for select
using (
  organization_id is not null
  and public.has_active_membership(organization_id, auth.uid())
);

drop policy if exists "registration completion operators read" on public.registration_completion_receipts;
create policy "registration completion operators read"
on public.registration_completion_receipts
for select
using (public.has_operator_role(auth.uid()));

drop policy if exists "registration completion owners insert" on public.registration_completion_receipts;
create policy "registration completion owners insert"
on public.registration_completion_receipts
for insert
with check (
  profile_id = auth.uid()
  and preview_data_accepted = false
  and localhost_redirect_detected = false
);

create or replace function public.record_registration_completion_receipt(
  input_registration_intent_id uuid,
  input_organization_id uuid default null,
  input_completion_status text default 'dashboard_landed',
  input_redirect_url text default '',
  input_current_dashboard text default '',
  input_metadata jsonb default '{}'::jsonb
)
returns public.registration_completion_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := auth.uid();
  intent_row public.registration_intents;
  receipt_row public.registration_completion_receipts;
  normalized_redirect text := lower(coalesce(input_redirect_url, ''));
  required_status text;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if input_completion_status not in ('hosted_callback_pending', 'dashboard_landed', 'first_database_write_verified') then
    raise exception 'Unsupported registration completion status';
  end if;

  if normalized_redirect = '' or position('localhost' in normalized_redirect) > 0 or position('127.0.0.1' in normalized_redirect) > 0 then
    raise exception 'Registration completion receipt requires a hosted redirect URL';
  end if;

  if coalesce(input_current_dashboard, '') = '' then
    raise exception 'Current dashboard is required';
  end if;

  select *
    into intent_row
  from public.registration_intents intent
  where intent.id = input_registration_intent_id
    and intent.profile_id = current_id
  order by intent.created_at desc
  limit 1;

  if not found then
    raise exception 'Registration intent not found for current profile';
  end if;

  if input_organization_id is not null and not public.has_active_membership(input_organization_id, current_id) then
    raise exception 'Active organization membership required for registration completion receipt';
  end if;

  required_status := case
    when intent_row.selected_portal = 'corporate' then 'workspace_created'
    else 'passport_initialized'
  end;

  if input_completion_status = 'first_database_write_verified' and intent_row.status <> required_status then
    raise exception 'First database write is not verified for selected portal';
  end if;

  insert into public.registration_completion_receipts (
    profile_id,
    registration_intent_id,
    organization_id,
    selected_portal,
    selected_mode,
    completion_status,
    redirect_url,
    current_dashboard,
    first_database_write,
    registration_intent_status,
    preview_data_accepted,
    localhost_redirect_detected,
    accepted_when,
    metadata
  )
  values (
    current_id,
    intent_row.id,
    input_organization_id,
    intent_row.selected_portal,
    intent_row.selected_mode,
    input_completion_status,
    input_redirect_url,
    input_current_dashboard,
    intent_row.first_database_write,
    intent_row.status,
    false,
    false,
    'registration_completion_receipt_requires_hosted_redirect_verified_session_registration_intent_first_database_write_correct_dashboard_and_no_preview_data',
    coalesce(input_metadata, '{}'::jsonb) || jsonb_build_object(
      'registration_intent_status', intent_row.status,
      'next_dashboard', intent_row.next_dashboard,
      'pricing_plan_id', intent_row.pricing_plan_id,
      'receipt_recorded_at', now()
    )
  )
  returning * into receipt_row;

  perform public.write_audit_event(
    'registration.completion_receipt_recorded',
    'registration_completion_receipts',
    receipt_row.id,
    input_organization_id,
    'Registration completion receipt recorded',
    jsonb_build_object(
      'selected_portal', receipt_row.selected_portal,
      'completion_status', receipt_row.completion_status,
      'redirect_url', receipt_row.redirect_url
    )
  );

  return receipt_row;
end;
$$;

grant execute on function public.record_registration_completion_receipt(uuid, uuid, text, text, text, jsonb) to authenticated;
