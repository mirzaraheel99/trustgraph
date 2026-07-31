create table if not exists public.billing_architecture_decision_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recorded_by_profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pilot_ledger_active' check (status in ('pricing_catalog_only', 'pilot_ledger_active', 'stripe_human_gate_required')),
  selected_seats integer not null default 1 check (selected_seats >= 1),
  active_subscription_count integer not null default 0 check (active_subscription_count >= 0),
  payment_collection_live boolean not null default false,
  checkout_enabled boolean not null default false,
  customer_portal_enabled boolean not null default false,
  invoice_email_enabled boolean not null default false,
  tax_automation_enabled boolean not null default false,
  refund_automation_enabled boolean not null default false,
  dunning_enabled boolean not null default false,
  payment_webhook_reconciliation_enabled boolean not null default false,
  human_gate_required boolean not null default true,
  accepted_when text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists billing_architecture_decision_receipts_org_created_idx
on public.billing_architecture_decision_receipts(organization_id, created_at desc);

alter table public.billing_architecture_decision_receipts enable row level security;

drop policy if exists "members read billing architecture decision receipts" on public.billing_architecture_decision_receipts;
create policy "members read billing architecture decision receipts"
on public.billing_architecture_decision_receipts
for select
using (public.has_active_membership(organization_id));

drop policy if exists "admins create billing architecture decision receipts" on public.billing_architecture_decision_receipts;
create policy "admins create billing architecture decision receipts"
on public.billing_architecture_decision_receipts
for insert
with check (
  recorded_by_profile_id = public.current_profile_id()
  and payment_collection_live = false
  and checkout_enabled = false
  and customer_portal_enabled = false
  and invoice_email_enabled = false
  and tax_automation_enabled = false
  and refund_automation_enabled = false
  and dunning_enabled = false
  and payment_webhook_reconciliation_enabled = false
  and human_gate_required = true
  and public.has_role(organization_id, array['employer_admin', 'staffing_agency_admin', 'system_admin', 'compliance_admin']::role_key[])
);

create or replace function public.record_billing_architecture_decision_receipt(
  input_selected_seats integer default 1,
  input_active_subscription_count integer default 0,
  input_status text default 'stripe_human_gate_required',
  input_metadata jsonb default '{}'::jsonb
)
returns public.billing_architecture_decision_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  membership_row public.organization_memberships;
  receipt_row public.billing_architecture_decision_receipts;
  acceptance_rule text := 'billing_architecture_decision_receipt_requires_live_pricing_or_subscription_ledger_checkout_customer_portal_invoice_tax_refund_dunning_and_payment_webhooks_disabled_until_human_gate';
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if input_selected_seats < 1 then
    raise exception 'Selected seats must be at least one';
  end if;

  if input_active_subscription_count < 0 then
    raise exception 'Active subscription count must be non-negative';
  end if;

  if input_status not in ('pricing_catalog_only', 'pilot_ledger_active', 'stripe_human_gate_required') then
    raise exception 'Unsupported billing architecture decision status';
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
    raise exception 'Organization admin role required for billing architecture decisions';
  end if;

  insert into public.billing_architecture_decision_receipts (
    organization_id,
    recorded_by_profile_id,
    status,
    selected_seats,
    active_subscription_count,
    payment_collection_live,
    checkout_enabled,
    customer_portal_enabled,
    invoice_email_enabled,
    tax_automation_enabled,
    refund_automation_enabled,
    dunning_enabled,
    payment_webhook_reconciliation_enabled,
    human_gate_required,
    accepted_when,
    metadata
  )
  values (
    membership_row.organization_id,
    current_id,
    input_status,
    input_selected_seats,
    input_active_subscription_count,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    true,
    acceptance_rule,
    coalesce(input_metadata, '{}'::jsonb) || jsonb_build_object(
      'accepted_when', acceptance_rule,
      'current_billing_system', 'supabase_subscription_ledger',
      'payment_collection_live', false,
      'checkout_enabled', false,
      'customer_portal_enabled', false,
      'invoice_email_enabled', false,
      'tax_automation_enabled', false,
      'refund_automation_enabled', false,
      'dunning_enabled', false,
      'payment_webhook_reconciliation_enabled', false,
      'human_gate_required', true
    )
  )
  returning * into receipt_row;

  perform public.write_audit_event(
    'billing.architecture_decision_recorded',
    'billing_architecture_decision_receipts',
    receipt_row.id,
    receipt_row.organization_id,
    'Billing architecture decision receipt recorded',
    jsonb_build_object(
      'status', receipt_row.status,
      'selected_seats', receipt_row.selected_seats,
      'active_subscription_count', receipt_row.active_subscription_count,
      'payment_collection_live', false,
      'checkout_enabled', false,
      'payment_webhook_reconciliation_enabled', false,
      'human_gate_required', true
    )
  );

  return receipt_row;
end;
$$;

grant execute on function public.record_billing_architecture_decision_receipt(
  integer,
  integer,
  text,
  jsonb
) to authenticated;
