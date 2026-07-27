create or replace function public.create_sample_credential_issuer_membership()
returns public.organization_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  org_row public.organizations;
  membership_row public.organization_memberships;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (select 1 from public.profiles where id = current_id) then
    raise exception 'Profile required before creating issuer role';
  end if;

  select *
    into org_row
  from public.organizations
  where domain = 'credentials.trustgraph.local'
  limit 1;

  if not found then
    insert into public.organizations (name, type, status, domain)
    values ('TrustGraph Credential Lab', 'trustgraph', 'active', 'credentials.trustgraph.local')
    returning * into org_row;
  end if;

  insert into public.organization_memberships (organization_id, profile_id, role, status, invited_by)
  values (org_row.id, current_id, 'credential_issuer', 'active', current_id)
  on conflict (organization_id, profile_id, role)
  do update set status = 'active', invited_by = excluded.invited_by, updated_at = now()
  returning * into membership_row;

  perform public.write_audit_event(
    'membership.credential_issuer_created',
    'organization_memberships',
    membership_row.id,
    org_row.id,
    'Sample credential issuer role created from TrustGraph app',
    jsonb_build_object('role', 'credential_issuer')
  );

  return membership_row;
end;
$$;

create or replace function public.issue_credential_record(
  subject_email text,
  subject_full_name text,
  credential_type record_type,
  credential_title text,
  evidence_summary text,
  issued_at date default null,
  expires_at date default null
)
returns public.trust_records
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  issuer_membership public.organization_memberships;
  subject_profile public.profiles;
  record_row public.trust_records;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if credential_type not in ('license', 'certification', 'education', 'health_clearance', 'custom') then
    raise exception 'Credential type must be license, certification, education, health_clearance, or custom';
  end if;

  if nullif(trim(subject_email), '') is null then
    raise exception 'Subject email is required';
  end if;

  if nullif(trim(credential_title), '') is null then
    raise exception 'Credential title is required';
  end if;

  select *
    into issuer_membership
  from public.organization_memberships membership
  where membership.profile_id = current_id
    and membership.status = 'active'
    and membership.role in ('credential_issuer', 'verification_partner', 'trustgraph_verifier', 'system_admin')
  order by membership.updated_at desc
  limit 1;

  if not found then
    raise exception 'Credential issuer role required';
  end if;

  insert into public.profiles (id, full_name, email)
  values (
    gen_random_uuid(),
    coalesce(nullif(trim(subject_full_name), ''), lower(trim(subject_email))),
    lower(trim(subject_email))
  )
  on conflict (email)
  do update set full_name = coalesce(nullif(trim(subject_full_name), ''), public.profiles.full_name), updated_at = now()
  returning * into subject_profile;

  insert into public.trust_records (
    owner_profile_id,
    issuer_organization_id,
    type,
    title,
    status,
    source_name,
    evidence_summary,
    issued_at,
    expires_at,
    metadata
  )
  values (
    subject_profile.id,
    issuer_membership.organization_id,
    credential_type,
    trim(credential_title),
    'verified',
    (select name from public.organizations where id = issuer_membership.organization_id),
    nullif(trim(coalesce(evidence_summary, '')), ''),
    issued_at,
    expires_at,
    jsonb_build_object('issued_by_profile_id', current_id, 'issuer_workflow', 'credential_issuer_foundation')
  )
  returning * into record_row;

  perform public.write_audit_event(
    'credential.issued',
    'trust_records',
    record_row.id,
    issuer_membership.organization_id,
    'Credential issuer created verified Passport record',
    jsonb_build_object('subject_profile_id', subject_profile.id, 'credential_type', credential_type)
  );

  insert into public.notification_events (
    recipient_profile_id,
    organization_id,
    channel,
    status,
    priority,
    event_type,
    title,
    body,
    target_table,
    target_id,
    metadata
  )
  values (
    subject_profile.id,
    issuer_membership.organization_id,
    'in_app',
    'queued',
    'high',
    'credential.issued',
    'Credential issued',
    'A credential issuer added a verified record to your TrustGraph Passport.',
    'trust_records',
    record_row.id,
    jsonb_build_object('issuer_organization_id', issuer_membership.organization_id)
  );

  return record_row;
end;
$$;
