create table if not exists public.v1_pilot_route_run_receipts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  status text not null check (status in ('hosted_pilot_route_needs_runtime_proof', 'hosted_pilot_route_accepted')),
  ready_steps integer not null default 0 check (ready_steps >= 0),
  total_steps integer not null check (total_steps >= 1),
  missing_steps text[] not null default '{}',
  route_steps jsonb not null default '[]'::jsonb,
  preview_data_accepted boolean not null default false,
  vps_freshness_required boolean not null default true,
  accepted_when text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists v1_pilot_route_run_receipts_profile_idx
  on public.v1_pilot_route_run_receipts(profile_id, created_at desc);

create index if not exists v1_pilot_route_run_receipts_org_idx
  on public.v1_pilot_route_run_receipts(organization_id, created_at desc);

alter table public.v1_pilot_route_run_receipts enable row level security;

drop policy if exists "owners read v1 pilot route run receipts" on public.v1_pilot_route_run_receipts;
create policy "owners read v1 pilot route run receipts"
on public.v1_pilot_route_run_receipts
for select
to authenticated
using (
  profile_id = public.current_profile_id()
  or (
    organization_id is not null
    and public.has_active_membership(organization_id)
  )
);

drop policy if exists "owners create v1 pilot route run receipts" on public.v1_pilot_route_run_receipts;
create policy "owners create v1 pilot route run receipts"
on public.v1_pilot_route_run_receipts
for insert
to authenticated
with check (
  profile_id = public.current_profile_id()
  and preview_data_accepted = false
  and vps_freshness_required = true
  and (
    organization_id is null
    or public.has_role(
      organization_id,
      array['system_admin', 'compliance_admin', 'trustgraph_verifier', 'employer_admin', 'staffing_agency_admin']::role_key[]
    )
  )
);

create or replace function public.record_v1_pilot_route_run_receipt(
  input_organization_id uuid,
  input_status text,
  input_ready_steps integer,
  input_total_steps integer,
  input_missing_steps text[],
  input_route_steps jsonb,
  input_metadata jsonb default '{}'::jsonb
)
returns public.v1_pilot_route_run_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  receipt_row public.v1_pilot_route_run_receipts;
  acceptance_rule text := 'v1_pilot_route_run_receipt_requires_hosted_auth_professional_rows_corporate_workspace_pricing_ledger_scoped_database_admin_exports_vps_freshness_and_no_preview_data';
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if input_status not in ('hosted_pilot_route_needs_runtime_proof', 'hosted_pilot_route_accepted') then
    raise exception 'Unsupported V1 pilot route run receipt status';
  end if;

  if input_total_steps < 1 or input_ready_steps < 0 or input_ready_steps > input_total_steps then
    raise exception 'Invalid V1 pilot route run step counts';
  end if;

  if input_status = 'hosted_pilot_route_accepted' and input_ready_steps <> input_total_steps then
    raise exception 'Accepted V1 pilot route run requires every route step';
  end if;

  if jsonb_typeof(coalesce(input_route_steps, '[]'::jsonb)) <> 'array' then
    raise exception 'Route steps must be a JSON array';
  end if;

  if input_organization_id is not null
    and not public.has_role(
      input_organization_id,
      array['system_admin', 'compliance_admin', 'trustgraph_verifier', 'employer_admin', 'staffing_agency_admin']::role_key[]
    ) then
    raise exception 'Admin role required for V1 pilot route run receipts';
  end if;

  insert into public.v1_pilot_route_run_receipts (
    profile_id,
    organization_id,
    status,
    ready_steps,
    total_steps,
    missing_steps,
    route_steps,
    preview_data_accepted,
    vps_freshness_required,
    accepted_when,
    metadata
  )
  values (
    current_id,
    input_organization_id,
    input_status,
    input_ready_steps,
    input_total_steps,
    coalesce(input_missing_steps, '{}'::text[]),
    coalesce(input_route_steps, '[]'::jsonb),
    false,
    true,
    acceptance_rule,
    coalesce(input_metadata, '{}'::jsonb) || jsonb_build_object(
      'v1_pilot_route_run_receipt', true,
      'preview_data_accepted', false,
      'vps_freshness_required', true
    )
  )
  returning * into receipt_row;

  perform public.write_audit_event(
    'v1_pilot_route_run.receipt_recorded',
    'v1_pilot_route_run_receipts',
    receipt_row.id,
    receipt_row.organization_id,
    'V1 pilot route run receipt recorded',
    jsonb_build_object(
      'status', receipt_row.status,
      'ready_steps', receipt_row.ready_steps,
      'total_steps', receipt_row.total_steps,
      'missing_steps', receipt_row.missing_steps,
      'preview_data_accepted', receipt_row.preview_data_accepted,
      'vps_freshness_required', receipt_row.vps_freshness_required
    )
  );

  return receipt_row;
end;
$$;

grant execute on function public.record_v1_pilot_route_run_receipt(uuid, text, integer, integer, text[], jsonb, jsonb) to authenticated;
