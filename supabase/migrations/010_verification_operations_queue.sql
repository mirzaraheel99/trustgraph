do $$
begin
  create type verification_case_type as enum (
    'identity_review',
    'license_mismatch',
    'employment_confirmation',
    'document_classification',
    'fraud_signal',
    'dispute'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type verification_case_status as enum (
    'open',
    'in_review',
    'resolved',
    'restricted',
    'dismissed'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type verification_case_priority as enum (
    'low',
    'medium',
    'high',
    'critical'
  );
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.verification_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  subject_profile_id uuid references public.profiles(id),
  trust_record_id uuid references public.trust_records(id),
  case_type verification_case_type not null,
  status verification_case_status not null default 'open',
  priority verification_case_priority not null default 'medium',
  title text not null,
  summary text not null,
  reason_code text not null,
  assigned_to_profile_id uuid references public.profiles(id),
  resolution_note text,
  metadata jsonb not null default '{}'::jsonb,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.verification_cases enable row level security;

drop policy if exists "admin operators read verification cases" on public.verification_cases;
create policy "admin operators read verification cases"
on public.verification_cases
for select
using (
  public.has_role(
    coalesce(organization_id, (
      select membership.organization_id
      from public.organization_memberships membership
      join public.organizations organization on organization.id = membership.organization_id
      where membership.profile_id = public.current_profile_id()
        and membership.status = 'active'
        and organization.type = 'trustgraph'
      limit 1
    )),
    array['trustgraph_verifier', 'compliance_admin', 'system_admin', 'auditor']::role_key[]
  )
);

drop policy if exists "admin operators manage verification cases" on public.verification_cases;
create policy "admin operators manage verification cases"
on public.verification_cases
for all
using (
  public.has_role(
    coalesce(organization_id, (
      select membership.organization_id
      from public.organization_memberships membership
      join public.organizations organization on organization.id = membership.organization_id
      where membership.profile_id = public.current_profile_id()
        and membership.status = 'active'
        and organization.type = 'trustgraph'
      limit 1
    )),
    array['trustgraph_verifier', 'compliance_admin', 'system_admin']::role_key[]
  )
);

create or replace function public.create_sample_verification_cases()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  ops_org_id uuid;
  inserted_count integer := 0;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  select organization.id
    into ops_org_id
  from public.organization_memberships membership
  join public.organizations organization on organization.id = membership.organization_id
  where membership.profile_id = current_id
    and membership.status = 'active'
    and organization.type = 'trustgraph'
  limit 1;

  if ops_org_id is null then
    raise exception 'TrustGraph operations membership required';
  end if;

  if not public.has_role(ops_org_id, array['trustgraph_verifier', 'compliance_admin', 'system_admin']::role_key[]) then
    raise exception 'Operations role required';
  end if;

  if exists (select 1 from public.verification_cases where organization_id = ops_org_id) then
    return 0;
  end if;

  insert into public.verification_cases (
    organization_id,
    case_type,
    status,
    priority,
    title,
    summary,
    reason_code,
    assigned_to_profile_id,
    metadata,
    due_at
  )
  values
    (
      ops_org_id,
      'license_mismatch',
      'open',
      'high',
      'License source mismatch',
      'Uploaded credential and issuer lookup disagree on license status.',
      'issuer_conflict',
      current_id,
      jsonb_build_object('source', 'issuer lookup', 'surface', 'admin_queue'),
      now() + interval '6 hours'
    ),
    (
      ops_org_id,
      'fraud_signal',
      'restricted',
      'critical',
      'Suspicious employer confirmation domain',
      'Confirmation source domain differs from approved employer domain.',
      'domain_mismatch',
      current_id,
      jsonb_build_object('source', 'risk engine', 'surface', 'admin_queue'),
      now() + interval '2 hours'
    ),
    (
      ops_org_id,
      'document_classification',
      'in_review',
      'medium',
      'Compliance document needs classification',
      'Uploaded document passed malware scan and needs policy-controlled type review.',
      'document_type_review',
      current_id,
      jsonb_build_object('source', 'document intake', 'surface', 'admin_queue'),
      now() + interval '1 day'
    )
  ;

  get diagnostics inserted_count = row_count;

  perform public.write_audit_event(
    'verification_cases.sample_created',
    'verification_cases',
    null,
    ops_org_id,
    'Sample operations queue created',
    jsonb_build_object('cases_added', inserted_count)
  );

  return inserted_count;
end;
$$;

create or replace function public.create_sample_trustgraph_verifier_membership()
returns public.organization_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  ops_org public.organizations;
  membership_row public.organization_memberships;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (select 1 from public.profiles where id = current_id) then
    raise exception 'Profile required before creating operations membership';
  end if;

  select *
    into ops_org
  from public.organizations
  where name = 'TrustGraph Operations'
    and type = 'trustgraph'
  limit 1;

  if not found then
    insert into public.organizations (name, type, status, domain)
    values ('TrustGraph Operations', 'trustgraph', 'active', 'trustgraph.local')
    returning * into ops_org;
  end if;

  insert into public.organization_memberships (organization_id, profile_id, role, status)
  values (ops_org.id, current_id, 'trustgraph_verifier', 'active')
  on conflict (organization_id, profile_id, role)
  do update set status = 'active', updated_at = now()
  returning * into membership_row;

  perform public.write_audit_event(
    'membership.sample_trustgraph_verifier_created',
    'organization_memberships',
    membership_row.id,
    ops_org.id,
    'development sample operations role',
    jsonb_build_object('profile_id', current_id)
  );

  return membership_row;
end;
$$;

create or replace function public.decide_verification_case(
  target_case_id uuid,
  next_status verification_case_status,
  resolution text default null
)
returns public.verification_cases
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  case_row public.verification_cases;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  select *
    into case_row
  from public.verification_cases
  where id = target_case_id;

  if not found then
    raise exception 'Verification case not found';
  end if;

  if not public.has_role(
    case_row.organization_id,
    array['trustgraph_verifier', 'compliance_admin', 'system_admin']::role_key[]
  ) then
    raise exception 'Operations role required';
  end if;

  update public.verification_cases
  set
    status = next_status,
    assigned_to_profile_id = coalesce(assigned_to_profile_id, current_id),
    resolution_note = nullif(trim(coalesce(resolution, resolution_note, '')), ''),
    updated_at = now()
  where id = target_case_id
  returning * into case_row;

  perform public.write_audit_event(
    'verification_case.status_changed',
    'verification_cases',
    target_case_id,
    case_row.organization_id,
    'Operations case status changed',
    jsonb_build_object('next_status', next_status, 'resolution', case_row.resolution_note)
  );

  return case_row;
end;
$$;
