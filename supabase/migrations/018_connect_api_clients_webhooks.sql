do $$
begin
  create type api_client_status as enum ('active', 'paused', 'revoked');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type webhook_subscription_status as enum ('active', 'paused', 'failed', 'revoked');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.api_clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by_profile_id uuid references public.profiles(id),
  name text not null,
  status api_client_status not null default 'active',
  scopes text[] not null default array[]::text[],
  secret_hash text,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webhook_subscriptions (
  id uuid primary key default gen_random_uuid(),
  api_client_id uuid not null references public.api_clients(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null,
  target_url text not null,
  status webhook_subscription_status not null default 'active',
  failure_count integer not null default 0,
  last_delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists api_clients_org_status_idx on public.api_clients(organization_id, status);
create index if not exists webhook_subscriptions_org_status_idx on public.webhook_subscriptions(organization_id, status);
create index if not exists webhook_subscriptions_client_idx on public.webhook_subscriptions(api_client_id);

alter table public.api_clients enable row level security;
alter table public.webhook_subscriptions enable row level security;

drop trigger if exists api_clients_set_updated_at on public.api_clients;
create trigger api_clients_set_updated_at
before update on public.api_clients
for each row execute function public.set_updated_at();

drop trigger if exists webhook_subscriptions_set_updated_at on public.webhook_subscriptions;
create trigger webhook_subscriptions_set_updated_at
before update on public.webhook_subscriptions
for each row execute function public.set_updated_at();

drop policy if exists "organization admins read api clients" on public.api_clients;
create policy "organization admins read api clients"
on public.api_clients
for select
using (
  public.has_role(
    organization_id,
    array['employer_admin', 'staffing_agency_admin', 'system_admin', 'compliance_admin', 'trustgraph_verifier']::role_key[]
  )
);

drop policy if exists "organization admins manage api clients" on public.api_clients;
create policy "organization admins manage api clients"
on public.api_clients
for all
using (
  public.has_role(
    organization_id,
    array['employer_admin', 'staffing_agency_admin', 'system_admin', 'compliance_admin']::role_key[]
  )
)
with check (
  public.has_role(
    organization_id,
    array['employer_admin', 'staffing_agency_admin', 'system_admin', 'compliance_admin']::role_key[]
  )
);

drop policy if exists "organization admins read webhooks" on public.webhook_subscriptions;
create policy "organization admins read webhooks"
on public.webhook_subscriptions
for select
using (
  public.has_role(
    organization_id,
    array['employer_admin', 'staffing_agency_admin', 'system_admin', 'compliance_admin', 'trustgraph_verifier']::role_key[]
  )
);

drop policy if exists "organization admins manage webhooks" on public.webhook_subscriptions;
create policy "organization admins manage webhooks"
on public.webhook_subscriptions
for all
using (
  public.has_role(
    organization_id,
    array['employer_admin', 'staffing_agency_admin', 'system_admin', 'compliance_admin']::role_key[]
  )
)
with check (
  public.has_role(
    organization_id,
    array['employer_admin', 'staffing_agency_admin', 'system_admin', 'compliance_admin']::role_key[]
  )
);

create or replace function public.create_sample_api_client()
returns public.api_clients
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  membership_row public.organization_memberships;
  client_row public.api_clients;
begin
  if current_id is null then
    raise exception 'Authentication required';
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
    raise exception 'Organization admin role required for API clients';
  end if;

  insert into public.api_clients (organization_id, created_by_profile_id, name, status, scopes, secret_hash)
  values (
    membership_row.organization_id,
    current_id,
    'Pilot Connect Client',
    'active',
    array['records.read', 'access_grants.read', 'webhooks.write'],
    encode(digest(gen_random_uuid()::text, 'sha256'), 'hex')
  )
  returning * into client_row;

  perform public.write_audit_event(
    'connect.api_client_created',
    'api_clients',
    client_row.id,
    client_row.organization_id,
    'Connect API client created',
    jsonb_build_object('scopes', client_row.scopes)
  );

  return client_row;
end;
$$;

create or replace function public.create_webhook_subscription(
  target_api_client_id uuid,
  event_type text,
  target_url text
)
returns public.webhook_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  client_row public.api_clients;
  subscription_row public.webhook_subscriptions;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  select *
    into client_row
  from public.api_clients
  where id = target_api_client_id;

  if not found then
    raise exception 'API client not found';
  end if;

  if not public.has_role(client_row.organization_id, array['employer_admin', 'staffing_agency_admin', 'system_admin', 'compliance_admin']::role_key[]) then
    raise exception 'Organization admin role required for webhook subscriptions';
  end if;

  if nullif(trim(event_type), '') is null then
    raise exception 'Webhook event type is required';
  end if;

  if nullif(trim(target_url), '') is null or trim(target_url) !~ '^https://.+' then
    raise exception 'Webhook URL must start with https://';
  end if;

  insert into public.webhook_subscriptions (api_client_id, organization_id, event_type, target_url)
  values (client_row.id, client_row.organization_id, trim(event_type), trim(target_url))
  returning * into subscription_row;

  perform public.write_audit_event(
    'connect.webhook_created',
    'webhook_subscriptions',
    subscription_row.id,
    subscription_row.organization_id,
    'Connect webhook subscription created',
    jsonb_build_object('event_type', event_type)
  );

  return subscription_row;
end;
$$;

create or replace function public.mark_api_client_status(
  target_api_client_id uuid,
  next_status api_client_status
)
returns public.api_clients
language plpgsql
security definer
set search_path = public
as $$
declare
  client_row public.api_clients;
begin
  select *
    into client_row
  from public.api_clients
  where id = target_api_client_id;

  if not found then
    raise exception 'API client not found';
  end if;

  if not public.has_role(client_row.organization_id, array['employer_admin', 'staffing_agency_admin', 'system_admin', 'compliance_admin']::role_key[]) then
    raise exception 'Organization admin role required for API client status changes';
  end if;

  update public.api_clients
  set status = next_status
  where id = target_api_client_id
  returning * into client_row;

  perform public.write_audit_event(
    'connect.api_client_status_changed',
    'api_clients',
    client_row.id,
    client_row.organization_id,
    'Connect API client status changed',
    jsonb_build_object('status', next_status)
  );

  return client_row;
end;
$$;

create or replace function public.mark_webhook_subscription_status(
  target_subscription_id uuid,
  next_status webhook_subscription_status
)
returns public.webhook_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  subscription_row public.webhook_subscriptions;
begin
  select *
    into subscription_row
  from public.webhook_subscriptions
  where id = target_subscription_id;

  if not found then
    raise exception 'Webhook subscription not found';
  end if;

  if not public.has_role(subscription_row.organization_id, array['employer_admin', 'staffing_agency_admin', 'system_admin', 'compliance_admin']::role_key[]) then
    raise exception 'Organization admin role required for webhook status changes';
  end if;

  update public.webhook_subscriptions
  set status = next_status
  where id = target_subscription_id
  returning * into subscription_row;

  perform public.write_audit_event(
    'connect.webhook_status_changed',
    'webhook_subscriptions',
    subscription_row.id,
    subscription_row.organization_id,
    'Connect webhook subscription status changed',
    jsonb_build_object('status', next_status)
  );

  return subscription_row;
end;
$$;
