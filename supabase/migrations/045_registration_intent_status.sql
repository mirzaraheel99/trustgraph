create or replace function public.mark_registration_intent_workspace_created(
  target_intent_id uuid,
  target_organization_id uuid
)
returns public.registration_intents
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := auth.uid();
  intent_row public.registration_intents;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  select *
    into intent_row
  from public.registration_intents intent
  where intent.id = target_intent_id
    and intent.profile_id = current_id
    and intent.selected_portal = 'corporate'
  order by intent.created_at desc
  limit 1;

  if not found then
    raise exception 'Corporate registration intent not found';
  end if;

  if not public.has_role(target_organization_id, array['employer_admin', 'staffing_agency_admin', 'system_admin', 'compliance_admin']::role_key[]) then
    raise exception 'Organization admin role required to complete registration intent';
  end if;

  update public.registration_intents
  set
    status = 'workspace_created',
    metadata = metadata || jsonb_build_object(
      'workspace_created_at', now(),
      'organization_id', target_organization_id
    )
  where id = intent_row.id
  returning * into intent_row;

  perform public.write_audit_event(
    'registration.intent_workspace_created',
    'registration_intents',
    intent_row.id,
    target_organization_id,
    'Registration intent workspace created',
    jsonb_build_object('selected_portal', intent_row.selected_portal)
  );

  return intent_row;
end;
$$;

grant execute on function public.mark_registration_intent_workspace_created(uuid, uuid) to authenticated;
