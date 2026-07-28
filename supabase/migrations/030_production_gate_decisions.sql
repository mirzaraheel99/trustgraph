create table if not exists public.production_gate_decisions (
  id uuid primary key default gen_random_uuid(),
  gate_key text not null unique,
  label text not null,
  owner text not null,
  status text not null default 'required',
  evidence_required text not null,
  evidence_url text,
  decided_by_profile_id uuid references public.profiles(id),
  decided_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.production_gate_decisions enable row level security;

drop trigger if exists production_gate_decisions_set_updated_at on public.production_gate_decisions;
create trigger production_gate_decisions_set_updated_at
before update on public.production_gate_decisions
for each row execute function public.set_updated_at();

insert into public.production_gate_decisions (gate_key, label, owner, status, evidence_required, metadata)
values
  (
    'stripe_billing_launch',
    'Stripe billing launch',
    'Business operations',
    'human_decision_required',
    'Products, taxes, invoices, refunds, dunning, and webhook reconciliation approved.',
    jsonb_build_object('production_gate', true, 'source', 'v1_readiness')
  ),
  (
    'external_rls_storage_review',
    'External RLS and storage review',
    'Security reviewer',
    'external_signoff_required',
    'RLS policies, private evidence storage, and signed URL handling reviewed.',
    jsonb_build_object('production_gate', true, 'source', 'v1_readiness')
  ),
  (
    'legal_employment_language',
    'Legal and employment language',
    'Legal counsel',
    'legal_review_required',
    'Background-check-adjacent wording, adverse-action boundaries, and regulated workflow language approved.',
    jsonb_build_object('production_gate', true, 'source', 'v1_readiness')
  ),
  (
    'pilot_operations_owner',
    'Pilot operations owner',
    'Founder/operator',
    'pilot_roster_required',
    'Named pilot customers, onboarding owner, support path, and incident response owner documented.',
    jsonb_build_object('production_gate', true, 'source', 'v1_readiness')
  )
on conflict (gate_key)
do update set
  label = excluded.label,
  owner = excluded.owner,
  evidence_required = excluded.evidence_required,
  metadata = public.production_gate_decisions.metadata || excluded.metadata,
  updated_at = now();

drop policy if exists "operators read production gate decisions" on public.production_gate_decisions;
create policy "operators read production gate decisions"
on public.production_gate_decisions
for select
using (
  exists (
    select 1
    from public.organization_memberships membership
    join public.organizations organization on organization.id = membership.organization_id
    where membership.profile_id = public.current_profile_id()
      and membership.status = 'active'
      and organization.type = 'trustgraph'
      and membership.role in ('trustgraph_verifier', 'compliance_admin', 'system_admin', 'auditor')
  )
);

drop policy if exists "compliance admins manage production gate decisions" on public.production_gate_decisions;
create policy "compliance admins manage production gate decisions"
on public.production_gate_decisions
for all
using (
  exists (
    select 1
    from public.organization_memberships membership
    join public.organizations organization on organization.id = membership.organization_id
    where membership.profile_id = public.current_profile_id()
      and membership.status = 'active'
      and organization.type = 'trustgraph'
      and membership.role in ('compliance_admin', 'system_admin')
  )
)
with check (
  exists (
    select 1
    from public.organization_memberships membership
    join public.organizations organization on organization.id = membership.organization_id
    where membership.profile_id = public.current_profile_id()
      and membership.status = 'active'
      and organization.type = 'trustgraph'
      and membership.role in ('compliance_admin', 'system_admin')
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
  gate_row public.production_gate_decisions;
begin
  if current_id is null then
    raise exception 'Authentication required';
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
    status = coalesce(nullif(trim(input_status), ''), status),
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
