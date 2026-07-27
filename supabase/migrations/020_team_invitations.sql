do $$
begin
  create type organization_invitation_status as enum ('pending', 'accepted', 'cancelled', 'expired');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invited_email text not null,
  role role_key not null,
  status organization_invitation_status not null default 'pending',
  invited_by_profile_id uuid references public.profiles(id),
  accepted_by_profile_id uuid references public.profiles(id),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_invitations_org_status_idx on public.organization_invitations(organization_id, status);
create index if not exists organization_invitations_email_idx on public.organization_invitations(lower(invited_email), status);

alter table public.organization_invitations enable row level security;

drop trigger if exists organization_invitations_set_updated_at on public.organization_invitations;
create trigger organization_invitations_set_updated_at
before update on public.organization_invitations
for each row execute function public.set_updated_at();

drop policy if exists "organization admins read invitations" on public.organization_invitations;
create policy "organization admins read invitations"
on public.organization_invitations
for select
using (
  public.has_role(organization_id, array['employer_admin', 'staffing_agency_admin', 'system_admin']::role_key[])
);

drop policy if exists "organization admins manage invitations" on public.organization_invitations;
create policy "organization admins manage invitations"
on public.organization_invitations
for all
using (
  public.has_role(organization_id, array['employer_admin', 'staffing_agency_admin', 'system_admin']::role_key[])
)
with check (
  public.has_role(organization_id, array['employer_admin', 'staffing_agency_admin', 'system_admin']::role_key[])
);

create or replace function public.create_organization_invitation(
  target_email text,
  target_role role_key
)
returns public.organization_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  membership_row public.organization_memberships;
  invitation_row public.organization_invitations;
  invitee_profile public.profiles;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if nullif(trim(target_email), '') is null then
    raise exception 'Invite email is required';
  end if;

  select *
    into membership_row
  from public.organization_memberships membership
  join public.organizations organization on organization.id = membership.organization_id
  where membership.profile_id = current_id
    and membership.status = 'active'
    and membership.role in ('employer_admin', 'staffing_agency_admin', 'system_admin')
    and organization.type in ('employer', 'staffing_agency', 'trustgraph')
  order by membership.updated_at desc
  limit 1;

  if not found then
    raise exception 'Organization admin role required for invitations';
  end if;

  if target_role not in ('employer_admin', 'employer_reviewer', 'staffing_agency_admin', 'recruiter') then
    raise exception 'Role is not inviteable for corporate teams';
  end if;

  insert into public.organization_invitations (
    organization_id,
    invited_email,
    role,
    status,
    invited_by_profile_id,
    expires_at
  )
  values (
    membership_row.organization_id,
    lower(trim(target_email)),
    target_role,
    'pending',
    current_id,
    now() + interval '14 days'
  )
  returning * into invitation_row;

  select *
    into invitee_profile
  from public.profiles
  where email = lower(trim(target_email))
  limit 1;

  if found then
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
      target_id
    )
    values (
      invitee_profile.id,
      invitation_row.organization_id,
      'in_app',
      'queued',
      'normal',
      'organization.invited',
      'Team invitation',
      'You were invited to join a TrustGraph corporate workspace.',
      'organization_invitations',
      invitation_row.id
    );
  end if;

  perform public.write_audit_event(
    'organization.invitation_created',
    'organization_invitations',
    invitation_row.id,
    invitation_row.organization_id,
    'Corporate team invitation created',
    jsonb_build_object('role', target_role, 'invited_email', lower(trim(target_email)))
  );

  return invitation_row;
end;
$$;

create or replace function public.mark_organization_invitation_status(
  target_invitation_id uuid,
  next_status organization_invitation_status
)
returns public.organization_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_row public.organization_invitations;
begin
  if next_status not in ('cancelled', 'expired') then
    raise exception 'Invitation can only be cancelled or expired from this control';
  end if;

  select *
    into invitation_row
  from public.organization_invitations
  where id = target_invitation_id;

  if not found then
    raise exception 'Invitation not found';
  end if;

  if not public.has_role(invitation_row.organization_id, array['employer_admin', 'staffing_agency_admin', 'system_admin']::role_key[]) then
    raise exception 'Organization admin role required for invitation status changes';
  end if;

  update public.organization_invitations
  set status = next_status
  where id = target_invitation_id
  returning * into invitation_row;

  perform public.write_audit_event(
    'organization.invitation_status_changed',
    'organization_invitations',
    invitation_row.id,
    invitation_row.organization_id,
    'Corporate team invitation status changed',
    jsonb_build_object('status', next_status)
  );

  return invitation_row;
end;
$$;
