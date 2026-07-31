create table if not exists public.onboarding_wizard_receipts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  completed_steps integer not null check (completed_steps >= 0),
  total_steps integer not null check (total_steps >= 1),
  current_step_label text not null,
  current_step_status text not null check (current_step_status in ('ready', 'needs_action')),
  live_database_rows integer not null default 0 check (live_database_rows >= 0),
  preview_data_accepted_for_v1 boolean not null default false,
  accepted_when text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists onboarding_wizard_receipts_profile_created_idx
on public.onboarding_wizard_receipts(profile_id, created_at desc);

create index if not exists onboarding_wizard_receipts_org_created_idx
on public.onboarding_wizard_receipts(organization_id, created_at desc);

alter table public.onboarding_wizard_receipts enable row level security;

drop policy if exists "owners read onboarding wizard receipts" on public.onboarding_wizard_receipts;
create policy "owners read onboarding wizard receipts"
on public.onboarding_wizard_receipts
for select
using (profile_id = public.current_profile_id());

drop policy if exists "organization members read onboarding wizard receipts" on public.onboarding_wizard_receipts;
create policy "organization members read onboarding wizard receipts"
on public.onboarding_wizard_receipts
for select
using (organization_id is not null and public.has_active_membership(organization_id));

drop policy if exists "owners create onboarding wizard receipts" on public.onboarding_wizard_receipts;
create policy "owners create onboarding wizard receipts"
on public.onboarding_wizard_receipts
for insert
with check (
  profile_id = public.current_profile_id()
  and preview_data_accepted_for_v1 = false
  and (
    organization_id is null
    or public.has_active_membership(organization_id)
  )
);

create or replace function public.record_onboarding_wizard_receipt(
  input_organization_id uuid,
  input_completed_steps integer,
  input_total_steps integer,
  input_current_step_label text,
  input_current_step_status text,
  input_live_database_rows integer,
  input_metadata jsonb default '{}'::jsonb
)
returns public.onboarding_wizard_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  receipt_row public.onboarding_wizard_receipts;
  acceptance_rule text := 'onboarding_wizard_receipt_requires_hosted_login_account_context_registration_corporate_setup_pricing_user_database_and_preview_data_rejected';
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(input_total_steps, 0) < 1 then
    raise exception 'Total steps must be at least 1';
  end if;

  if coalesce(input_completed_steps, -1) < 0 or input_completed_steps > input_total_steps then
    raise exception 'Completed steps must be between 0 and total steps';
  end if;

  if input_current_step_status not in ('ready', 'needs_action') then
    raise exception 'Unsupported onboarding current step status';
  end if;

  if input_organization_id is not null and not exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = input_organization_id
      and membership.profile_id = current_id
      and membership.status = 'active'
  ) then
    raise exception 'Active organization membership required';
  end if;

  insert into public.onboarding_wizard_receipts (
    profile_id,
    organization_id,
    completed_steps,
    total_steps,
    current_step_label,
    current_step_status,
    live_database_rows,
    preview_data_accepted_for_v1,
    accepted_when,
    metadata
  )
  values (
    current_id,
    input_organization_id,
    greatest(input_completed_steps, 0),
    greatest(input_total_steps, 1),
    coalesce(nullif(trim(input_current_step_label), ''), 'Onboarding step'),
    input_current_step_status,
    greatest(input_live_database_rows, 0),
    false,
    acceptance_rule,
    jsonb_build_object(
      'onboarding_wizard_receipt', true,
      'preview_data_accepted_for_v1', false,
      'accepted_when', acceptance_rule
    ) || coalesce(input_metadata, '{}'::jsonb)
  )
  returning * into receipt_row;

  perform public.write_audit_event(
    'onboarding.wizard_receipt_recorded',
    'onboarding_wizard_receipts',
    receipt_row.id,
    receipt_row.organization_id,
    'Onboarding wizard receipt recorded',
    jsonb_build_object(
      'completed_steps', receipt_row.completed_steps,
      'total_steps', receipt_row.total_steps,
      'current_step_status', receipt_row.current_step_status,
      'preview_data_accepted_for_v1', false
    )
  );

  return receipt_row;
end;
$$;

grant execute on function public.record_onboarding_wizard_receipt(
  uuid,
  integer,
  integer,
  text,
  text,
  integer,
  jsonb
) to authenticated;
