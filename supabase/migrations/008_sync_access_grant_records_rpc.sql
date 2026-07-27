create or replace function public.sync_access_grant_records(target_grant_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  target_org_id uuid;
  synced_count integer := 0;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  select requester_organization_id
    into target_org_id
  from public.access_grants
  where id = target_grant_id
    and subject_profile_id = current_id;

  if target_org_id is null then
    raise exception 'Only the grant subject can sync shared records';
  end if;

  insert into public.access_grant_records (access_grant_id, trust_record_id)
  select target_grant_id, record.id
  from public.trust_records record
  where record.owner_profile_id = current_id
  on conflict do nothing;

  get diagnostics synced_count = row_count;

  perform public.write_audit_event(
    'access_grant.records_synced',
    'access_grants',
    target_grant_id,
    target_org_id,
    'Professional shared current Passport records with requester organization',
    jsonb_build_object('records_added', synced_count)
  );

  return synced_count;
end;
$$;
