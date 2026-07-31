create table if not exists public.auth_recovery_receipts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  action_type text not null check (action_type in ('signup_verification', 'password_recovery', 'localhost_link_repair', 'hosted_callback')),
  selected_portal text not null check (selected_portal in ('professional', 'corporate')),
  redirect_url text not null,
  hosted_redirect_required boolean not null default true,
  localhost_link_detected boolean not null default false,
  email_rate_limit_note text not null default 'Supabase built-in email allows 2 messages per hour project-wide; wait 60+ minutes or configure custom SMTP.',
  accepted_when text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists auth_recovery_receipts_profile_created_idx
on public.auth_recovery_receipts(profile_id, created_at desc);

alter table public.auth_recovery_receipts enable row level security;

drop policy if exists "owners read auth recovery receipts" on public.auth_recovery_receipts;
create policy "owners read auth recovery receipts"
on public.auth_recovery_receipts
for select
to authenticated
using (profile_id = public.current_profile_id());

drop policy if exists "owners create auth recovery receipts" on public.auth_recovery_receipts;
create policy "owners create auth recovery receipts"
on public.auth_recovery_receipts
for insert
to authenticated
with check (
  profile_id = public.current_profile_id()
  and hosted_redirect_required = true
);

create or replace function public.record_auth_recovery_receipt(
  input_email text,
  input_action_type text,
  input_selected_portal text,
  input_redirect_url text,
  input_localhost_link_detected boolean default false,
  input_metadata jsonb default '{}'::jsonb
)
returns public.auth_recovery_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  receipt_row public.auth_recovery_receipts;
  acceptance_rule text := 'auth_recovery_receipt_requires_hosted_redirect_email_rate_limit_guidance_localhost_link_repair_and_signed_in_owner_scope';
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if input_action_type not in ('signup_verification', 'password_recovery', 'localhost_link_repair', 'hosted_callback') then
    raise exception 'Unsupported auth recovery receipt action';
  end if;

  if input_selected_portal not in ('professional', 'corporate') then
    raise exception 'Unsupported auth recovery receipt portal';
  end if;

  if input_redirect_url !~ '^https://(mirzaraheel99\.github\.io/trustgraph/?|trustgraph\.5-75-224-110\.sslip\.io/?)' then
    raise exception 'Hosted TrustGraph redirect URL required';
  end if;

  insert into public.auth_recovery_receipts (
    profile_id,
    email,
    action_type,
    selected_portal,
    redirect_url,
    hosted_redirect_required,
    localhost_link_detected,
    accepted_when,
    metadata
  )
  values (
    current_id,
    lower(trim(input_email)),
    input_action_type,
    input_selected_portal,
    input_redirect_url,
    true,
    input_localhost_link_detected,
    acceptance_rule,
    coalesce(input_metadata, '{}'::jsonb) || jsonb_build_object(
      'auth_recovery_receipt', true,
      'preview_data_accepted_for_v1', false,
      'email_rate_limit_window_minutes', 60
    )
  )
  returning * into receipt_row;

  perform public.log_audit_event(
    current_id,
    null,
    'auth.recovery_receipt_recorded',
    'auth_recovery_receipts',
    receipt_row.id,
    'Hosted auth recovery receipt recorded',
    jsonb_build_object(
      'action_type', receipt_row.action_type,
      'selected_portal', receipt_row.selected_portal,
      'localhost_link_detected', receipt_row.localhost_link_detected
    )
  );

  return receipt_row;
end;
$$;

grant execute on function public.record_auth_recovery_receipt(text, text, text, text, boolean, jsonb) to authenticated;
