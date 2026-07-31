create or replace function public.seed_pilot_visibility_snapshot()
returns public.corporate_database_visibility_snapshots
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  corporate_org public.organizations;
  snapshot_row public.corporate_database_visibility_snapshots;
  filtered_count integer := 0;
  shared_count integer := 0;
  grant_count integer := 0;
  review_count integer := 0;
  open_gap_count integer := 0;
  row_inventory jsonb := '[]'::jsonb;
  readiness_buckets jsonb := '[]'::jsonb;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  select organization.*
    into corporate_org
  from public.organizations organization
  join public.organization_memberships membership on membership.organization_id = organization.id
  where membership.profile_id = current_id
    and membership.status = 'active'
    and membership.role in ('system_admin', 'compliance_admin', 'employer_admin', 'employer_reviewer', 'staffing_agency_admin', 'recruiter')
  order by
    case when organization.name = 'Northstar Health Pilot' then 0 else 1 end,
    membership.updated_at desc
  limit 1;

  if not found then
    raise exception 'Active corporate membership required before pilot visibility snapshot seed';
  end if;

  select count(distinct grant.subject_profile_id)
    into filtered_count
  from public.access_grants grant
  where grant.requester_organization_id = corporate_org.id
    and grant.status = 'approved';

  select count(*)
    into grant_count
  from public.access_grants grant
  where grant.requester_organization_id = corporate_org.id
    and grant.status = 'approved';

  select count(*)
    into shared_count
  from public.access_grant_records grant_record
  join public.access_grants grant on grant.id = grant_record.access_grant_id
  where grant.requester_organization_id = corporate_org.id
    and grant.status = 'approved';

  select count(*)
    into review_count
  from public.corporate_access_reviews review
  where review.requester_organization_id = corporate_org.id;

  select count(*)
    into open_gap_count
  from public.missing_record_requests request
  where request.requester_organization_id = corporate_org.id
    and request.status in ('requested', 'in_progress');

  select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'record_id', record.id,
          'profile_id', grant.subject_profile_id,
          'type', record.type,
          'title', record.title,
          'status', record.status,
          'sensitivity', record.sensitivity,
          'consent_required', record.consent_required,
          'raw_private_file_included', false
        )
        order by record.created_at asc
      ),
      '[]'::jsonb
    )
    into row_inventory
  from public.access_grant_records grant_record
  join public.access_grants grant on grant.id = grant_record.access_grant_id
  join public.trust_records record on record.id = grant_record.trust_record_id
  where grant.requester_organization_id = corporate_org.id
    and grant.status = 'approved';

  readiness_buckets := jsonb_build_array(
    jsonb_build_object('label', 'Approved grants', 'count', grant_count, 'ready', grant_count > 0),
    jsonb_build_object('label', 'Shared user rows', 'count', shared_count, 'ready', shared_count > 0),
    jsonb_build_object('label', 'Review attestations', 'count', review_count, 'ready', review_count > 0),
    jsonb_build_object('label', 'Open gaps', 'count', open_gap_count, 'ready', open_gap_count = 0)
  );

  insert into public.corporate_database_visibility_snapshots (
    organization_id,
    recorded_by_profile_id,
    status,
    filtered_professional_count,
    shared_record_count,
    access_grant_count,
    review_attestation_count,
    open_gap_count,
    active_filters,
    readiness_buckets,
    row_inventory,
    raw_private_files_included,
    preview_data_accepted,
    accepted_when,
    metadata
  )
  values (
    corporate_org.id,
    current_id,
    case
      when filtered_count > 0 and shared_count > 0 and review_count > 0 and open_gap_count = 0 then 'handoff_ready'
      when filtered_count > 0 and shared_count > 0 then 'review_ready'
      else 'rows_missing'
    end,
    filtered_count,
    shared_count,
    grant_count,
    review_count,
    open_gap_count,
    jsonb_build_object(
      'seed', 'pilot_workspace',
      'organization', corporate_org.name,
      'visibility_scope', 'approved_access_grants_only'
    ),
    readiness_buckets,
    row_inventory,
    false,
    false,
    'pilot_visibility_snapshot_seed_requires_authenticated_corporate_rbac_approved_access_grants_shared_rows_review_attestation_and_no_preview_data',
    jsonb_build_object(
      'seed', 'pilot_workspace',
      'pilot_visibility_snapshot_seeded', true,
      'corporate_database_visibility_snapshot', true,
      'raw_private_files_included', false,
      'preview_data_accepted', false
    )
  )
  returning * into snapshot_row;

  perform public.write_audit_event(
    'pilot_workspace.visibility_snapshot_seeded',
    'corporate_database_visibility_snapshots',
    snapshot_row.id,
    snapshot_row.organization_id,
    'Pilot workspace seed created Corporate Verify visibility snapshot from live database rows',
    jsonb_build_object(
      'filtered_professional_count', snapshot_row.filtered_professional_count,
      'shared_record_count', snapshot_row.shared_record_count,
      'review_attestation_count', snapshot_row.review_attestation_count,
      'preview_data_accepted', false
    )
  );

  return snapshot_row;
end;
$$;

grant execute on function public.seed_pilot_visibility_snapshot() to authenticated;
