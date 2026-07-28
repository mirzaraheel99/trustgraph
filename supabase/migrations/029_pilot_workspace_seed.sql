create or replace function public.seed_pilot_workspace()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  profile_row public.profiles;
  professional_org public.organizations;
  corporate_org public.organizations;
  employer_membership public.organization_memberships;
  subscription_row public.organization_subscriptions;
  identity_record public.trust_records;
  license_record public.trust_records;
  training_record public.trust_records;
  consent_row public.consent_authorizations;
  grant_row public.access_grants;
  record_count integer;
  evidence_count integer;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  select *
    into profile_row
  from public.profiles
  where id = current_id;

  if not found then
    raise exception 'Professional profile required before pilot seed';
  end if;

  select *
    into professional_org
  from public.organizations
  where id = profile_row.primary_organization_id;

  if not found then
    select organization.*
      into professional_org
    from public.organizations organization
    join public.organization_memberships membership on membership.organization_id = organization.id
    where membership.profile_id = current_id
      and membership.role = 'professional'
      and membership.status = 'active'
    order by membership.created_at asc
    limit 1;
  end if;

  select *
    into corporate_org
  from public.organizations
  where name = 'Northstar Health Pilot'
    and type = 'employer'
  order by created_at asc
  limit 1;

  if not found then
    insert into public.organizations (name, type, status, domain)
    values ('Northstar Health Pilot', 'employer', 'active', 'northstar-pilot.example')
    returning * into corporate_org;
  end if;

  insert into public.organization_memberships (organization_id, profile_id, role, status, invited_by)
  values (corporate_org.id, current_id, 'employer_admin', 'active', current_id)
  on conflict (organization_id, profile_id, role)
  do update set status = 'active', invited_by = excluded.invited_by, updated_at = now()
  returning * into employer_membership;

  insert into public.organization_subscriptions (organization_id, plan_id, status, seats, renews_at)
  values (corporate_org.id, 'corporate-verify', 'trialing', 5, now() + interval '30 days')
  on conflict (organization_id, plan_id)
  do update set status = 'trialing', seats = 5, renews_at = excluded.renews_at, updated_at = now()
  returning * into subscription_row;

  if not exists (
    select 1 from public.trust_records where owner_profile_id = current_id and title = 'Government identity verification'
  ) then
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
      sensitivity,
      consent_required,
      metadata
    )
    values (
      current_id,
      professional_org.id,
      'identity',
      'Government identity verification',
      'verified',
      'TrustGraph ID Check',
      'Name, email, and account ownership confirmed for pilot review.',
      current_date - 30,
      null,
      'restricted',
      true,
      jsonb_build_object('seed', 'pilot_workspace', 'category', 'identity')
    );
  end if;

  if not exists (
    select 1 from public.trust_records where owner_profile_id = current_id and title = 'Registered Nurse license'
  ) then
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
      sensitivity,
      consent_required,
      metadata
    )
    values (
      current_id,
      corporate_org.id,
      'license',
      'Registered Nurse license',
      'verified',
      'State Board of Nursing',
      'RN license active and verified for pilot readiness.',
      current_date - 180,
      current_date + 270,
      'sensitive',
      true,
      jsonb_build_object('seed', 'pilot_workspace', 'category', 'credential')
    );
  end if;

  if not exists (
    select 1 from public.trust_records where owner_profile_id = current_id and title = 'BLS certification'
  ) then
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
    sensitivity,
    consent_required,
    metadata
  )
  values (
      current_id,
      corporate_org.id,
      'training',
      'BLS certification',
      'verified',
      'American Heart Association',
      'Basic Life Support certification verified with renewal window.',
      current_date - 120,
      current_date + 75,
      'standard',
      false,
      jsonb_build_object('seed', 'pilot_workspace', 'category', 'training')
    );
  end if;

  select *
    into identity_record
  from public.trust_records
  where owner_profile_id = current_id
    and title = 'Government identity verification'
  order by created_at asc
  limit 1;

  select *
    into license_record
  from public.trust_records
  where owner_profile_id = current_id
    and title = 'Registered Nurse license'
  order by created_at asc
  limit 1;

  select *
    into training_record
  from public.trust_records
  where owner_profile_id = current_id
    and title = 'BLS certification'
  order by created_at asc
  limit 1;

  if not exists (
    select 1 from public.evidence_documents where owner_profile_id = current_id and trust_record_id = identity_record.id and title = 'Identity verification packet'
  ) then
    insert into public.evidence_documents (
      owner_profile_id,
      trust_record_id,
      uploaded_by_profile_id,
      status,
      title,
      document_type,
      source_name,
      classification,
      evidence_summary,
      metadata
    )
    values (
      current_id,
      identity_record.id,
      current_id,
      'linked',
      'Identity verification packet',
      'identity',
      'TrustGraph ID Check',
      'restricted_identity',
      'Metadata-only evidence entry for pilot identity verification.',
      jsonb_build_object('seed', 'pilot_workspace')
    );
  end if;

  if not exists (
    select 1 from public.evidence_documents where owner_profile_id = current_id and trust_record_id = license_record.id and title = 'RN license evidence'
  ) then
    insert into public.evidence_documents (
    owner_profile_id,
    trust_record_id,
    uploaded_by_profile_id,
    status,
    title,
    document_type,
    source_name,
    classification,
    evidence_summary,
    metadata
  )
  values (
      current_id,
      license_record.id,
      current_id,
      'linked',
      'RN license evidence',
      'credential',
      'State Board of Nursing',
      'sensitive_credential',
      'Metadata-only evidence entry for pilot license verification.',
      jsonb_build_object('seed', 'pilot_workspace')
    );
  end if;

  select *
    into grant_row
  from public.access_grants
  where subject_profile_id = current_id
    and requester_organization_id = corporate_org.id
    and purpose = 'Pilot workforce readiness review for identity, license, and training records'
  order by created_at asc
  limit 1;

  if not found then
    insert into public.access_grants (
      subject_profile_id,
      requester_organization_id,
      requested_by_profile_id,
      status,
      purpose,
      expires_at
    )
    values (
      current_id,
      corporate_org.id,
      current_id,
      'approved',
      'Pilot workforce readiness review for identity, license, and training records',
      now() + interval '14 days'
    )
    returning * into grant_row;
  else
    update public.access_grants
    set status = 'approved',
        requested_by_profile_id = current_id,
        expires_at = now() + interval '14 days',
        updated_at = now()
    where id = grant_row.id
    returning * into grant_row;
  end if;

  insert into public.access_grant_records (access_grant_id, trust_record_id)
  select grant_row.id, seeded_record.id
  from (
    values (identity_record.id), (license_record.id), (training_record.id)
  ) as seeded_record(id)
  where seeded_record.id is not null
  on conflict do nothing;

  select *
    into consent_row
  from public.consent_authorizations
  where subject_profile_id = current_id
    and requester_organization_id = corporate_org.id
    and trust_record_id = license_record.id
    and purpose = 'Pilot readiness review consent for sensitive credential evidence'
  order by created_at asc
  limit 1;

  if not found then
    insert into public.consent_authorizations (
      subject_profile_id,
      requester_organization_id,
      trust_record_id,
      purpose,
      consent_scope,
      status,
      granted_by_profile_id,
      expires_at,
      metadata
    )
    values (
      current_id,
      corporate_org.id,
      license_record.id,
      'Pilot readiness review consent for sensitive credential evidence',
      array['identity', 'credential', 'training']::text[],
      'active',
      current_id,
      now() + interval '14 days',
      jsonb_build_object('seed', 'pilot_workspace')
    )
    returning * into consent_row;
  else
    update public.consent_authorizations
    set status = 'active',
        revoked_at = null,
        expires_at = now() + interval '14 days',
        updated_at = now()
    where id = consent_row.id
    returning * into consent_row;
  end if;

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
    current_id,
    corporate_org.id,
    'in_app',
    'queued',
    'normal',
    'pilot_workspace.seeded',
    'Pilot workspace seeded',
    'Live Passport, Corporate Verify, Access Grant, consent, evidence, and subscription rows were created.',
    'access_grants',
    grant_row.id,
    jsonb_build_object('seed', 'pilot_workspace')
  );

  perform public.write_audit_event(
    'pilot_workspace.seeded',
    'access_grants',
    grant_row.id,
    corporate_org.id,
    'Authenticated pilot workspace seed created live database records',
    jsonb_build_object(
      'professional_profile_id', current_id,
      'corporate_organization_id', corporate_org.id,
      'subscription_id', subscription_row.id,
      'consent_authorization_id', consent_row.id
    )
  );

  select count(*)
    into record_count
  from public.trust_records
  where owner_profile_id = current_id;

  select count(*)
    into evidence_count
  from public.evidence_documents
  where owner_profile_id = current_id;

  return jsonb_build_object(
    'profile_id', current_id,
    'corporate_organization_id', corporate_org.id,
    'membership_id', employer_membership.id,
    'subscription_id', subscription_row.id,
    'access_grant_id', grant_row.id,
    'consent_authorization_id', consent_row.id,
    'passport_records', record_count,
    'evidence_documents', evidence_count
  );
end;
$$;
