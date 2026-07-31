create table if not exists public.security_rls_review_receipts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  status text not null check (status in ('external_review_required', 'ready_for_external_review', 'approved_for_pilot')),
  rls_protected_table_count integer not null check (rls_protected_table_count >= 0),
  checks_ready integer not null check (checks_ready >= 0),
  checks_total integer not null check (checks_total >= 1),
  migration_ledger_rows integer not null check (migration_ledger_rows >= 0),
  audit_event_count integer not null check (audit_event_count >= 0),
  open_security_items text[] not null default '{}'::text[],
  external_signoff_recorded boolean not null default false,
  production_traffic_allowed boolean not null default false,
  accepted_when text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists security_rls_review_receipts_profile_created_idx
on public.security_rls_review_receipts(profile_id, created_at desc);

create index if not exists security_rls_review_receipts_org_created_idx
on public.security_rls_review_receipts(organization_id, created_at desc);

alter table public.security_rls_review_receipts enable row level security;

drop policy if exists "owners read security rls review receipts" on public.security_rls_review_receipts;
create policy "owners read security rls review receipts"
on public.security_rls_review_receipts
for select
to authenticated
using (
  profile_id = public.current_profile_id()
  or (
    organization_id is not null
    and public.has_active_membership(organization_id)
  )
);

drop policy if exists "owners create security rls review receipts" on public.security_rls_review_receipts;
create policy "owners create security rls review receipts"
on public.security_rls_review_receipts
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

create or replace function public.record_security_rls_review_receipt(
  input_organization_id uuid,
  input_status text,
  input_rls_protected_table_count integer,
  input_checks_ready integer,
  input_checks_total integer,
  input_migration_ledger_rows integer,
  input_audit_event_count integer,
  input_open_security_items text[],
  input_external_signoff_recorded boolean default false,
  input_metadata jsonb default '{}'::jsonb
)
returns public.security_rls_review_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  receipt_row public.security_rls_review_receipts;
  acceptance_rule text := 'security_rls_review_receipt_requires_ci_rls_guard_private_evidence_signed_url_review_rbac_audit_exports_and_external_signoff_before_production_traffic';
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if input_status not in ('external_review_required', 'ready_for_external_review', 'approved_for_pilot') then
    raise exception 'Unsupported security review receipt status';
  end if;

  if input_checks_total < 1 or input_checks_ready < 0 or input_checks_ready > input_checks_total then
    raise exception 'Invalid security review checklist counts';
  end if;

  if input_organization_id is not null
    and not public.has_role(
      input_organization_id,
      array['system_admin', 'compliance_admin', 'trustgraph_verifier', 'employer_admin', 'staffing_agency_admin']::role_key[]
    ) then
    raise exception 'Admin role required for security review receipts';
  end if;

  insert into public.security_rls_review_receipts (
    profile_id,
    organization_id,
    status,
    rls_protected_table_count,
    checks_ready,
    checks_total,
    migration_ledger_rows,
    audit_event_count,
    open_security_items,
    external_signoff_recorded,
    production_traffic_allowed,
    accepted_when,
    metadata
  )
  values (
    current_id,
    input_organization_id,
    input_status,
    input_rls_protected_table_count,
    input_checks_ready,
    input_checks_total,
    input_migration_ledger_rows,
    input_audit_event_count,
    coalesce(input_open_security_items, '{}'::text[]),
    input_external_signoff_recorded,
    false,
    acceptance_rule,
    coalesce(input_metadata, '{}'::jsonb) || jsonb_build_object(
      'security_rls_review_receipt', true,
      'production_traffic_allowed', false
    )
  )
  returning * into receipt_row;

  perform public.log_audit_event(
    current_id,
    input_organization_id,
    'security.rls_review_receipt_recorded',
    'security_rls_review_receipts',
    receipt_row.id,
    'Security RLS review receipt recorded',
    jsonb_build_object('status', receipt_row.status, 'open_security_items', receipt_row.open_security_items)
  );

  return receipt_row;
end;
$$;

grant execute on function public.record_security_rls_review_receipt(uuid, text, integer, integer, integer, integer, integer, text[], boolean, jsonb) to authenticated;
