create table if not exists public.pilot_owner_readiness_receipts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  status text not null check (status in ('owners_missing', 'ready_for_pilot_review', 'approved_for_pilot')),
  contacts_ready integer not null check (contacts_ready >= 0),
  contacts_total integer not null check (contacts_total >= 1),
  missing_contacts text[] not null default '{}'::text[],
  pilot_customer_count integer not null default 0 check (pilot_customer_count >= 0),
  onboarding_owner_recorded boolean not null default false,
  support_owner_recorded boolean not null default false,
  incident_owner_recorded boolean not null default false,
  production_traffic_allowed boolean not null default false,
  accepted_when text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pilot_owner_readiness_receipts_profile_created_idx
on public.pilot_owner_readiness_receipts(profile_id, created_at desc);

create index if not exists pilot_owner_readiness_receipts_org_created_idx
on public.pilot_owner_readiness_receipts(organization_id, created_at desc);

alter table public.pilot_owner_readiness_receipts enable row level security;

drop policy if exists "owners read pilot owner readiness receipts" on public.pilot_owner_readiness_receipts;
create policy "owners read pilot owner readiness receipts"
on public.pilot_owner_readiness_receipts
for select
to authenticated
using (
  profile_id = public.current_profile_id()
  or (
    organization_id is not null
    and public.has_active_membership(organization_id)
  )
);

drop policy if exists "owners create pilot owner readiness receipts" on public.pilot_owner_readiness_receipts;
create policy "owners create pilot owner readiness receipts"
on public.pilot_owner_readiness_receipts
for insert
to authenticated
with check (
  profile_id = public.current_profile_id()
  and production_traffic_allowed = false
  and (
    organization_id is null
    or public.has_role(
      organization_id,
      array['system_admin', 'compliance_admin', 'trustgraph_verifier', 'employer_admin', 'staffing_agency_admin']::role_key[]
    )
  )
);

create or replace function public.record_pilot_owner_readiness_receipt(
  input_organization_id uuid,
  input_status text,
  input_contacts_ready integer,
  input_contacts_total integer,
  input_missing_contacts text[],
  input_pilot_customer_count integer,
  input_onboarding_owner_recorded boolean,
  input_support_owner_recorded boolean,
  input_incident_owner_recorded boolean,
  input_metadata jsonb default '{}'::jsonb
)
returns public.pilot_owner_readiness_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  receipt_row public.pilot_owner_readiness_receipts;
  acceptance_rule text := 'pilot_owner_readiness_receipt_requires_named_pilot_customer_onboarding_support_incident_owner_live_contacts_and_no_production_traffic_without_human_signoff';
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if input_status not in ('owners_missing', 'ready_for_pilot_review', 'approved_for_pilot') then
    raise exception 'Unsupported pilot owner readiness receipt status';
  end if;

  if input_contacts_total < 1 or input_contacts_ready < 0 or input_contacts_ready > input_contacts_total then
    raise exception 'Invalid pilot owner readiness contact counts';
  end if;

  if input_organization_id is not null
    and not public.has_role(
      input_organization_id,
      array['system_admin', 'compliance_admin', 'trustgraph_verifier', 'employer_admin', 'staffing_agency_admin']::role_key[]
    ) then
    raise exception 'Admin role required for pilot owner readiness receipts';
  end if;

  insert into public.pilot_owner_readiness_receipts (
    profile_id,
    organization_id,
    status,
    contacts_ready,
    contacts_total,
    missing_contacts,
    pilot_customer_count,
    onboarding_owner_recorded,
    support_owner_recorded,
    incident_owner_recorded,
    production_traffic_allowed,
    accepted_when,
    metadata
  )
  values (
    current_id,
    input_organization_id,
    input_status,
    input_contacts_ready,
    input_contacts_total,
    coalesce(input_missing_contacts, '{}'::text[]),
    input_pilot_customer_count,
    input_onboarding_owner_recorded,
    input_support_owner_recorded,
    input_incident_owner_recorded,
    false,
    acceptance_rule,
    coalesce(input_metadata, '{}'::jsonb) || jsonb_build_object(
      'pilot_owner_readiness_receipt', true,
      'preview_data_accepted_for_v1', false,
      'production_traffic_allowed', false
    )
  )
  returning * into receipt_row;

  perform public.log_audit_event(
    current_id,
    input_organization_id,
    'pilot.owner_readiness_receipt_recorded',
    'pilot_owner_readiness_receipts',
    receipt_row.id,
    'Pilot owner readiness receipt recorded',
    jsonb_build_object('status', receipt_row.status, 'missing_contacts', receipt_row.missing_contacts)
  );

  return receipt_row;
end;
$$;

grant execute on function public.record_pilot_owner_readiness_receipt(uuid, text, integer, integer, text[], integer, boolean, boolean, boolean, jsonb) to authenticated;
