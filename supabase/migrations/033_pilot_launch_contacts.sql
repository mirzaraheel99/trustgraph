create table if not exists public.pilot_launch_contacts (
  id uuid primary key default gen_random_uuid(),
  contact_key text not null unique,
  label text not null,
  responsibility text not null,
  status text not null default 'missing',
  organization_name text,
  contact_name text,
  contact_email text,
  notes text,
  recorded_by_profile_id uuid references public.profiles(id),
  recorded_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pilot_launch_contacts_status_check check (status in ('missing', 'identified', 'confirmed'))
);

alter table public.pilot_launch_contacts enable row level security;

drop trigger if exists pilot_launch_contacts_set_updated_at on public.pilot_launch_contacts;
create trigger pilot_launch_contacts_set_updated_at
before update on public.pilot_launch_contacts
for each row execute function public.set_updated_at();

insert into public.pilot_launch_contacts (contact_key, label, responsibility, status, metadata)
values
  ('pilot_customer_roster', 'Pilot customer roster', 'Named pilot customer organizations and launch contacts.', 'missing', jsonb_build_object('production_gate', 'pilot_operations_owner')),
  ('onboarding_owner', 'Onboarding owner', 'Accountable operator for setup, verification, and first-week adoption.', 'missing', jsonb_build_object('production_gate', 'pilot_operations_owner')),
  ('support_owner', 'Support owner', 'Named owner for inbound support, account recovery, and pilot issue triage.', 'missing', jsonb_build_object('production_gate', 'pilot_operations_owner')),
  ('incident_owner', 'Incident response owner', 'Named owner for access, evidence, privacy, or availability incidents.', 'missing', jsonb_build_object('production_gate', 'pilot_operations_owner'))
on conflict (contact_key)
do update set
  label = excluded.label,
  responsibility = excluded.responsibility,
  metadata = public.pilot_launch_contacts.metadata || excluded.metadata,
  updated_at = now();

drop policy if exists "operators read pilot launch contacts" on public.pilot_launch_contacts;
create policy "operators read pilot launch contacts"
on public.pilot_launch_contacts
for select
using (
  exists (
    select 1
    from public.organization_memberships membership
    join public.organizations organization on organization.id = membership.organization_id
    where membership.profile_id = public.current_profile_id()
      and membership.status = 'active'
      and organization.type = 'trustgraph'
      and membership.role in ('trustgraph_verifier', 'compliance_admin', 'system_admin', 'auditor')
  )
);

drop policy if exists "compliance admins manage pilot launch contacts" on public.pilot_launch_contacts;
create policy "compliance admins manage pilot launch contacts"
on public.pilot_launch_contacts
for all
using (
  exists (
    select 1
    from public.organization_memberships membership
    join public.organizations organization on organization.id = membership.organization_id
    where membership.profile_id = public.current_profile_id()
      and membership.status = 'active'
      and organization.type = 'trustgraph'
      and membership.role in ('compliance_admin', 'system_admin')
  )
)
with check (
  exists (
    select 1
    from public.organization_memberships membership
    join public.organizations organization on organization.id = membership.organization_id
    where membership.profile_id = public.current_profile_id()
      and membership.status = 'active'
      and organization.type = 'trustgraph'
      and membership.role in ('compliance_admin', 'system_admin')
  )
);

create or replace function public.record_pilot_launch_contact(
  input_contact_key text,
  input_status text,
  input_organization_name text default null,
  input_contact_name text default null,
  input_contact_email text default null,
  input_notes text default null
)
returns public.pilot_launch_contacts
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  normalized_status text := nullif(trim(coalesce(input_status, '')), '');
  contact_row public.pilot_launch_contacts;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if normalized_status not in ('missing', 'identified', 'confirmed') then
    raise exception 'Unsupported pilot launch contact status: %', normalized_status;
  end if;

  if not exists (
    select 1
    from public.organization_memberships membership
    join public.organizations organization on organization.id = membership.organization_id
    where membership.profile_id = current_id
      and membership.status = 'active'
      and organization.type = 'trustgraph'
      and membership.role in ('compliance_admin', 'system_admin')
  ) then
    raise exception 'Compliance admin role required';
  end if;

  update public.pilot_launch_contacts
  set
    status = normalized_status,
    organization_name = nullif(trim(coalesce(input_organization_name, '')), ''),
    contact_name = nullif(trim(coalesce(input_contact_name, '')), ''),
    contact_email = nullif(trim(coalesce(input_contact_email, '')), ''),
    notes = nullif(trim(coalesce(input_notes, '')), ''),
    recorded_by_profile_id = current_id,
    recorded_at = now()
  where contact_key = input_contact_key
  returning * into contact_row;

  if not found then
    raise exception 'Pilot launch contact slot not found: %', input_contact_key;
  end if;

  perform public.write_audit_event(
    'pilot_launch.contact_recorded',
    'pilot_launch_contacts',
    contact_row.id,
    null,
    'Pilot launch contact recorded',
    jsonb_build_object('contact_key', contact_row.contact_key, 'status', contact_row.status)
  );

  return contact_row;
end;
$$;
