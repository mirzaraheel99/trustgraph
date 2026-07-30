create or replace function public.mark_data_rights_request_status(
  target_request_id uuid,
  next_status data_rights_request_status,
  status_note text default null
)
returns public.data_rights_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  request_row public.data_rights_requests;
  ops_org public.organizations;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  select *
    into request_row
  from public.data_rights_requests
  where id = target_request_id;

  if not found then
    raise exception 'Data rights request not found';
  end if;

  if not exists (
    select 1
    from public.organization_memberships membership
    where membership.profile_id = current_id
      and membership.status = 'active'
      and membership.role in ('compliance_admin', 'system_admin')
  ) then
    raise exception 'Compliance admin role required';
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

  update public.data_rights_requests
  set
    status = next_status,
    reviewer_note = nullif(trim(coalesce(status_note, request_row.reviewer_note, '')), ''),
    completed_at = case when next_status in ('completed', 'cancelled') then now() else completed_at end,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'last_reviewed_by_profile_id', current_id,
      'last_reviewed_at', now(),
      'automatic_deletion_enabled', false
    ),
    updated_at = now()
  where id = target_request_id
  returning * into request_row;

  perform public.write_audit_event(
    'data_rights.status_changed',
    'data_rights_requests',
    request_row.id,
    ops_org.id,
    'Data rights request status changed',
    jsonb_build_object(
      'profile_id', request_row.profile_id,
      'request_type', request_row.request_type,
      'next_status', next_status,
      'reviewer_note', request_row.reviewer_note,
      'automatic_deletion_enabled', false
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
    request_row.profile_id,
    ops_org.id,
    'in_app',
    'queued',
    case when next_status = 'blocked' then 'high' else 'normal' end,
    'data_rights.status_changed',
    'Data rights request updated',
    'TrustGraph updated your data export or account closure request status to ' || replace(next_status::text, '_', ' ') || '.',
    'data_rights_requests',
    request_row.id,
    jsonb_build_object('workflow', 'account_data_rights', 'request_type', request_row.request_type, 'next_status', next_status)
  );

  return request_row;
end;
$$;
