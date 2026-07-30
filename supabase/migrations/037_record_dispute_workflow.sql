create or replace function public.open_record_dispute(
  target_record_id uuid,
  dispute_reason text,
  requested_correction text default null
)
returns public.verification_cases
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  record_row public.trust_records;
  ops_org public.organizations;
  case_row public.verification_cases;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if nullif(trim(coalesce(dispute_reason, '')), '') is null then
    raise exception 'Dispute reason is required';
  end if;

  select *
    into record_row
  from public.trust_records
  where id = target_record_id
    and owner_profile_id = current_id;

  if not found then
    raise exception 'Record not found or not owned by current profile';
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

  update public.trust_records
  set
    status = 'disputed',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'dispute_workflow', 'professional_record_dispute',
      'disputed_by_profile_id', current_id,
      'disputed_at', now(),
      'dispute_reason', trim(dispute_reason),
      'requested_correction', nullif(trim(coalesce(requested_correction, '')), '')
    ),
    updated_at = now()
  where id = record_row.id
  returning * into record_row;

  insert into public.verification_cases (
    organization_id,
    subject_profile_id,
    trust_record_id,
    case_type,
    status,
    priority,
    title,
    summary,
    reason_code,
    metadata,
    due_at
  )
  values (
    ops_org.id,
    current_id,
    record_row.id,
    'dispute',
    'open',
    'high',
    'Record dispute opened',
    left(trim(dispute_reason), 500),
    'professional_record_dispute',
    jsonb_build_object(
      'record_title', record_row.title,
      'record_type', record_row.type,
      'source_name', record_row.source_name,
      'requested_correction', nullif(trim(coalesce(requested_correction, '')), ''),
      'workflow', 'professional_record_dispute'
    ),
    now() + interval '2 days'
  )
  returning * into case_row;

  perform public.write_audit_event(
    'record.dispute_opened',
    'trust_records',
    record_row.id,
    ops_org.id,
    'Professional opened a record dispute',
    jsonb_build_object(
      'verification_case_id', case_row.id,
      'subject_profile_id', current_id,
      'record_status', record_row.status,
      'requested_correction', nullif(trim(coalesce(requested_correction, '')), '')
    )
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
    current_id,
    ops_org.id,
    'in_app',
    'queued',
    'high',
    'record.dispute_opened',
    'Record dispute opened',
    'TrustGraph Operations received your dispute and marked the record as disputed while it is reviewed.',
    'trust_records',
    record_row.id,
    jsonb_build_object(
      'verification_case_id', case_row.id,
      'workflow', 'professional_record_dispute'
    )
  );

  return case_row;
end;
$$;
