alter table public.registration_intents
drop constraint if exists registration_intents_status_check;

alter table public.registration_intents
add constraint registration_intents_status_check
check (status in ('captured', 'workspace_created', 'passport_initialized', 'cancelled'));

create or replace function public.mark_registration_intent_passport_initialized(
  target_intent_id uuid
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
    and intent.selected_portal = 'professional'
  order by intent.created_at desc
  limit 1;

  if not found then
    raise exception 'Professional registration intent not found';
  end if;

  update public.registration_intents
  set
    status = 'passport_initialized',
    metadata = metadata || jsonb_build_object(
      'passport_initialized_at', now(),
      'profile_id', current_id
    )
  where id = intent_row.id
  returning * into intent_row;

  perform public.write_audit_event(
    'registration.intent_passport_initialized',
    'registration_intents',
    intent_row.id,
    null,
    'Registration intent passport initialized',
    jsonb_build_object('selected_portal', intent_row.selected_portal)
  );

  return intent_row;
end;
$$;

grant execute on function public.mark_registration_intent_passport_initialized(uuid) to authenticated;
