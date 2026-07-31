create table if not exists public.pricing_quote_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recorded_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  selected_plan_id text references public.subscription_plans(id),
  selected_seats integer not null check (selected_seats >= 1),
  plans_loaded integer not null default 0 check (plans_loaded >= 0),
  active_subscription_count integer not null default 0 check (active_subscription_count >= 0),
  projected_monthly_usd integer not null default 0 check (projected_monthly_usd >= 0),
  projected_annual_usd integer not null default 0 check (projected_annual_usd >= 0),
  payment_collection_live boolean not null default false,
  stripe_checkout_enabled boolean not null default false,
  accepted_when text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pricing_quote_receipts_org_created_idx
on public.pricing_quote_receipts(organization_id, created_at desc);

alter table public.pricing_quote_receipts enable row level security;

drop policy if exists "members read pricing quote receipts" on public.pricing_quote_receipts;
create policy "members read pricing quote receipts"
on public.pricing_quote_receipts
for select
using (public.has_active_membership(organization_id));

drop policy if exists "admins create pricing quote receipts" on public.pricing_quote_receipts;
create policy "admins create pricing quote receipts"
on public.pricing_quote_receipts
for insert
with check (
  recorded_by_profile_id = public.current_profile_id()
  and payment_collection_live = false
  and stripe_checkout_enabled = false
  and public.has_role(organization_id, array['employer_admin', 'staffing_agency_admin', 'system_admin', 'compliance_admin']::role_key[])
);

create or replace function public.record_pricing_quote_receipt(
  input_selected_plan_id text,
  input_selected_seats integer,
  input_plans_loaded integer,
  input_active_subscription_count integer,
  input_projected_monthly_usd integer,
  input_metadata jsonb default '{}'::jsonb
)
returns public.pricing_quote_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  membership_row public.organization_memberships;
  receipt_row public.pricing_quote_receipts;
  acceptance_rule text := 'pricing_quote_receipt_requires_live_pricing_catalog_selected_seats_projected_total_corporate_admin_rbac_and_stripe_checkout_disabled';
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(input_selected_seats, 0) < 1 then
    raise exception 'Selected seats must be at least 1';
  end if;

  if coalesce(input_plans_loaded, 0) < 1 then
    raise exception 'At least one pricing plan must be loaded';
  end if;

  if coalesce(input_active_subscription_count, 0) < 0 then
    raise exception 'Active subscription count cannot be negative';
  end if;

  if coalesce(input_projected_monthly_usd, 0) < 0 then
    raise exception 'Projected monthly total cannot be negative';
  end if;

  if input_selected_plan_id is not null
    and not exists (select 1 from public.subscription_plans where id = input_selected_plan_id and status = 'active') then
    raise exception 'Active subscription plan not found';
  end if;

  select *
    into membership_row
  from public.organization_memberships membership
  where membership.profile_id = current_id
    and membership.status = 'active'
    and membership.role in ('employer_admin', 'staffing_agency_admin', 'system_admin', 'compliance_admin')
  order by membership.updated_at desc
  limit 1;

  if not found then
    raise exception 'Organization admin role required for pricing quote receipts';
  end if;

  insert into public.pricing_quote_receipts (
    organization_id,
    recorded_by_profile_id,
    selected_plan_id,
    selected_seats,
    plans_loaded,
    active_subscription_count,
    projected_monthly_usd,
    projected_annual_usd,
    payment_collection_live,
    stripe_checkout_enabled,
    accepted_when,
    metadata
  )
  values (
    membership_row.organization_id,
    current_id,
    nullif(trim(input_selected_plan_id), ''),
    greatest(input_selected_seats, 1),
    greatest(input_plans_loaded, 0),
    greatest(input_active_subscription_count, 0),
    greatest(input_projected_monthly_usd, 0),
    greatest(input_projected_monthly_usd, 0) * 12,
    false,
    false,
    acceptance_rule,
    jsonb_build_object(
      'pricing_quote_receipt', true,
      'payment_collection_live', false,
      'stripe_checkout_enabled', false,
      'pricing_source', 'subscription_plans',
      'subscription_ledger_source', 'organization_subscriptions',
      'accepted_when', acceptance_rule
    ) || coalesce(input_metadata, '{}'::jsonb)
  )
  returning * into receipt_row;

  perform public.write_audit_event(
    'billing.pricing_quote_recorded',
    'pricing_quote_receipts',
    receipt_row.id,
    receipt_row.organization_id,
    'Pricing quote receipt recorded',
    jsonb_build_object(
      'selected_plan_id', receipt_row.selected_plan_id,
      'selected_seats', receipt_row.selected_seats,
      'projected_monthly_usd', receipt_row.projected_monthly_usd,
      'payment_collection_live', false,
      'stripe_checkout_enabled', false
    )
  );

  return receipt_row;
end;
$$;

grant execute on function public.record_pricing_quote_receipt(
  text,
  integer,
  integer,
  integer,
  integer,
  jsonb
) to authenticated;
