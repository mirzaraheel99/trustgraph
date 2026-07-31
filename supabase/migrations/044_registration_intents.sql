create table if not exists public.registration_intents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  selected_portal text not null check (selected_portal in ('professional', 'corporate')),
  selected_mode text not null check (selected_mode in ('signin', 'signup')),
  pricing_plan_id text references public.subscription_plans(id),
  organization_name text,
  organization_type text check (organization_type is null or organization_type in ('employer', 'staffing_agency')),
  organization_domain text,
  first_database_write text not null,
  next_dashboard text not null,
  status text not null default 'captured' check (status in ('captured', 'workspace_created', 'cancelled')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists registration_intents_profile_created_idx
on public.registration_intents(profile_id, created_at desc);

create index if not exists registration_intents_portal_status_idx
on public.registration_intents(selected_portal, status);

alter table public.registration_intents enable row level security;

drop trigger if exists registration_intents_set_updated_at on public.registration_intents;
create trigger registration_intents_set_updated_at
before update on public.registration_intents
for each row execute function public.set_updated_at();

drop policy if exists "owners read registration intents" on public.registration_intents;
create policy "owners read registration intents"
on public.registration_intents
for select
using (profile_id = auth.uid());

drop policy if exists "operators read registration intents" on public.registration_intents;
create policy "operators read registration intents"
on public.registration_intents
for select
using (public.is_trustgraph_operator());

create or replace function public.record_registration_intent(
  selected_portal text,
  selected_mode text,
  pricing_plan_id text,
  organization_name text,
  organization_type text,
  organization_domain text,
  first_database_write text,
  next_dashboard text,
  metadata jsonb default '{}'::jsonb
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

  if selected_portal not in ('professional', 'corporate') then
    raise exception 'Unsupported registration portal';
  end if;

  if selected_mode not in ('signin', 'signup') then
    raise exception 'Unsupported registration mode';
  end if;

  if pricing_plan_id is not null
    and not exists (select 1 from public.subscription_plans where id = pricing_plan_id and status = 'active') then
    raise exception 'Active pricing plan not found';
  end if;

  insert into public.registration_intents (
    profile_id,
    selected_portal,
    selected_mode,
    pricing_plan_id,
    organization_name,
    organization_type,
    organization_domain,
    first_database_write,
    next_dashboard,
    metadata
  )
  values (
    current_id,
    selected_portal,
    selected_mode,
    pricing_plan_id,
    nullif(trim(organization_name), ''),
    nullif(trim(organization_type), ''),
    nullif(trim(organization_domain), ''),
    first_database_write,
    next_dashboard,
    coalesce(metadata, '{}'::jsonb)
  )
  returning * into intent_row;

  perform public.write_audit_event(
    'registration.intent_recorded',
    'registration_intents',
    intent_row.id,
    null,
    'Registration intent recorded',
    jsonb_build_object(
      'selected_portal', intent_row.selected_portal,
      'selected_mode', intent_row.selected_mode,
      'pricing_plan_id', intent_row.pricing_plan_id
    )
  );

  return intent_row;
end;
$$;

grant execute on function public.record_registration_intent(text, text, text, text, text, text, text, text, jsonb) to authenticated;
