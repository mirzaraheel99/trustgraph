do $$
begin
  create type subscription_status as enum ('trialing', 'active', 'past_due', 'cancelled');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.subscription_plans (
  id text primary key,
  name text not null,
  audience text not null,
  monthly_price_usd integer not null,
  annual_price_usd integer,
  included_seats integer not null default 1,
  features text[] not null default array[]::text[],
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id text not null references public.subscription_plans(id),
  status subscription_status not null default 'trialing',
  seats integer not null default 1,
  started_at timestamptz not null default now(),
  renews_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, plan_id)
);

create index if not exists organization_subscriptions_org_status_idx on public.organization_subscriptions(organization_id, status);

alter table public.subscription_plans enable row level security;
alter table public.organization_subscriptions enable row level security;

drop trigger if exists subscription_plans_set_updated_at on public.subscription_plans;
create trigger subscription_plans_set_updated_at
before update on public.subscription_plans
for each row execute function public.set_updated_at();

drop trigger if exists organization_subscriptions_set_updated_at on public.organization_subscriptions;
create trigger organization_subscriptions_set_updated_at
before update on public.organization_subscriptions
for each row execute function public.set_updated_at();

insert into public.subscription_plans (id, name, audience, monthly_price_usd, annual_price_usd, included_seats, features)
values
  ('professional-free', 'Professional', 'professional', 0, 0, 1, array['Passport records', 'Evidence uploads', 'Access Grants', 'Reference requests']),
  ('corporate-verify', 'Corporate Verify', 'corporate', 149, 1490, 5, array['Corporate RBAC', 'Shared Passport review', 'Missing-record requests', 'Audit trail']),
  ('trustgraph-scale', 'TrustGraph Scale', 'enterprise', 499, 4990, 25, array['Credential issuer workflows', 'Connect API clients', 'Webhooks', 'Compliance operations'])
on conflict (id)
do update set
  name = excluded.name,
  audience = excluded.audience,
  monthly_price_usd = excluded.monthly_price_usd,
  annual_price_usd = excluded.annual_price_usd,
  included_seats = excluded.included_seats,
  features = excluded.features,
  status = 'active',
  updated_at = now();

drop policy if exists "active plans are readable" on public.subscription_plans;
create policy "active plans are readable"
on public.subscription_plans
for select
using (status = 'active');

drop policy if exists "members read organization subscriptions" on public.organization_subscriptions;
create policy "members read organization subscriptions"
on public.organization_subscriptions
for select
using (public.has_active_membership(organization_id));

drop policy if exists "organization admins manage subscriptions" on public.organization_subscriptions;
create policy "organization admins manage subscriptions"
on public.organization_subscriptions
for all
using (
  public.has_role(organization_id, array['employer_admin', 'staffing_agency_admin', 'system_admin', 'compliance_admin']::role_key[])
)
with check (
  public.has_role(organization_id, array['employer_admin', 'staffing_agency_admin', 'system_admin', 'compliance_admin']::role_key[])
);

create or replace function public.activate_organization_subscription(
  target_plan_id text,
  seat_count integer default 1
)
returns public.organization_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  membership_row public.organization_memberships;
  subscription_row public.organization_subscriptions;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (select 1 from public.subscription_plans where id = target_plan_id and status = 'active') then
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
    raise exception 'Organization admin role required for subscriptions';
  end if;

  insert into public.organization_subscriptions (organization_id, plan_id, status, seats, renews_at)
  values (
    membership_row.organization_id,
    target_plan_id,
    'trialing',
    greatest(seat_count, 1),
    now() + interval '30 days'
  )
  on conflict (organization_id, plan_id)
  do update set status = 'trialing', seats = greatest(excluded.seats, 1), renews_at = excluded.renews_at, updated_at = now()
  returning * into subscription_row;

  perform public.write_audit_event(
    'billing.subscription_activated',
    'organization_subscriptions',
    subscription_row.id,
    subscription_row.organization_id,
    'Organization subscription activated',
    jsonb_build_object('plan_id', target_plan_id, 'seats', subscription_row.seats)
  );

  return subscription_row;
end;
$$;
