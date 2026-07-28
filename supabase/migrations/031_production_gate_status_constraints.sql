alter table public.production_gate_decisions
drop constraint if exists production_gate_decisions_status_check;

alter table public.production_gate_decisions
add constraint production_gate_decisions_status_check
check (
  status in (
    'human_decision_required',
    'external_signoff_required',
    'legal_review_required',
    'pilot_roster_required',
    'approved_for_pilot',
    'approved_for_production'
  )
);

create or replace function public.record_production_gate_decision(
  input_gate_key text,
  input_status text,
  input_evidence_url text default null,
  input_notes text default null
)
returns public.production_gate_decisions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  normalized_status text := nullif(trim(coalesce(input_status, '')), '');
  gate_row public.production_gate_decisions;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if normalized_status is not null and normalized_status not in (
    'human_decision_required',
    'external_signoff_required',
    'legal_review_required',
    'pilot_roster_required',
    'approved_for_pilot',
    'approved_for_production'
  ) then
    raise exception 'Unsupported production gate status: %', normalized_status;
  end if;

  if not exists (
    select 1
    from public.organization_memberships membership
    join public.organizations organization on organization.id = membership.organization_id
    where membership.profile_id = current_id
      and membership.status = 'active'
      and organization.type = 'trustgraph'
      and membership.role in ('compliance_admin', 'system_admin')
  ) then
    raise exception 'Compliance admin role required';
  end if;

  update public.production_gate_decisions
  set
    status = coalesce(normalized_status, status),
    evidence_url = nullif(trim(coalesce(input_evidence_url, '')), ''),
    notes = nullif(trim(coalesce(input_notes, '')), ''),
    decided_by_profile_id = current_id,
    decided_at = now()
  where gate_key = input_gate_key
  returning * into gate_row;

  if not found then
    raise exception 'Production gate not found: %', input_gate_key;
  end if;

  perform public.write_audit_event(
    'production_gate.decision_recorded',
    'production_gate_decisions',
    gate_row.id,
    null,
    'Production gate decision recorded',
    jsonb_build_object(
      'gate_key', gate_row.gate_key,
      'status', gate_row.status,
      'evidence_url', gate_row.evidence_url
    )
  );

  return gate_row;
end;
$$;
