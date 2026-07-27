do $$
begin
  create type evidence_document_status as enum (
    'uploaded',
    'classified',
    'linked',
    'restricted',
    'rejected',
    'archived'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type notification_event_status as enum (
    'queued',
    'sent',
    'delivered',
    'failed',
    'suppressed'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type notification_channel as enum (
    'in_app',
    'email',
    'sms'
  );
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.evidence_documents (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  trust_record_id uuid references public.trust_records(id) on delete set null,
  uploaded_by_profile_id uuid references public.profiles(id),
  status evidence_document_status not null default 'uploaded',
  title text not null,
  document_type text not null,
  storage_path text,
  source_name text not null,
  classification text not null default 'professional_controlled',
  evidence_summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  channel notification_channel not null default 'in_app',
  status notification_event_status not null default 'queued',
  priority text not null default 'normal',
  event_type text not null,
  title text not null,
  body text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.evidence_documents enable row level security;
alter table public.notification_events enable row level security;

drop trigger if exists evidence_documents_set_updated_at on public.evidence_documents;
create trigger evidence_documents_set_updated_at
before update on public.evidence_documents
for each row execute function public.set_updated_at();

drop trigger if exists notification_events_set_updated_at on public.notification_events;
create trigger notification_events_set_updated_at
before update on public.notification_events
for each row execute function public.set_updated_at();

drop policy if exists "professionals read own evidence documents" on public.evidence_documents;
create policy "professionals read own evidence documents"
on public.evidence_documents
for select
using (owner_profile_id = public.current_profile_id());

drop policy if exists "professionals create own evidence documents" on public.evidence_documents;
create policy "professionals create own evidence documents"
on public.evidence_documents
for insert
with check (owner_profile_id = public.current_profile_id());

drop policy if exists "professionals update own evidence documents" on public.evidence_documents;
create policy "professionals update own evidence documents"
on public.evidence_documents
for update
using (owner_profile_id = public.current_profile_id())
with check (owner_profile_id = public.current_profile_id());

drop policy if exists "approved grant requesters read linked evidence metadata" on public.evidence_documents;
create policy "approved grant requesters read linked evidence metadata"
on public.evidence_documents
for select
using (
  trust_record_id is not null
  and exists (
    select 1
    from public.access_grants access_grant
    join public.access_grant_records shared_record on shared_record.access_grant_id = access_grant.id
    where shared_record.trust_record_id = evidence_documents.trust_record_id
      and access_grant.status = 'approved'
      and (access_grant.expires_at is null or access_grant.expires_at > now())
      and public.has_active_membership(access_grant.requester_organization_id)
  )
);

drop policy if exists "admin operators read evidence documents" on public.evidence_documents;
create policy "admin operators read evidence documents"
on public.evidence_documents
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

drop policy if exists "recipients read own notifications" on public.notification_events;
create policy "recipients read own notifications"
on public.notification_events
for select
using (
  recipient_profile_id = public.current_profile_id()
  or (organization_id is not null and public.has_active_membership(organization_id))
);

drop policy if exists "system and admins manage notifications" on public.notification_events;
create policy "system and admins manage notifications"
on public.notification_events
for all
using (
  exists (
    select 1
    from public.organization_memberships membership
    join public.organizations organization on organization.id = membership.organization_id
    where membership.profile_id = public.current_profile_id()
      and membership.status = 'active'
      and organization.type = 'trustgraph'
      and membership.role in ('support_agent', 'trustgraph_verifier', 'compliance_admin', 'system_admin')
  )
);

create or replace function public.create_evidence_document(
  target_record_id uuid,
  document_title text,
  document_type text,
  source_name text,
  evidence_summary text default null
)
returns public.evidence_documents
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  record_row public.trust_records;
  document_row public.evidence_documents;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  select *
    into record_row
  from public.trust_records
  where id = target_record_id
    and owner_profile_id = current_id;

  if not found then
    raise exception 'Professional-owned record required for evidence attachment';
  end if;

  insert into public.evidence_documents (
    owner_profile_id,
    trust_record_id,
    uploaded_by_profile_id,
    status,
    title,
    document_type,
    source_name,
    evidence_summary
  )
  values (
    current_id,
    target_record_id,
    current_id,
    'linked',
    trim(document_title),
    trim(document_type),
    trim(source_name),
    nullif(trim(coalesce(evidence_summary, '')), '')
  )
  returning * into document_row;

  perform public.write_audit_event(
    'evidence_document.linked',
    'evidence_documents',
    document_row.id,
    record_row.issuer_organization_id,
    'Professional linked evidence metadata to Passport record',
    jsonb_build_object('trust_record_id', target_record_id, 'document_type', document_type)
  );

  insert into public.notification_events (
    recipient_profile_id,
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
    current_id,
    'in_app',
    'queued',
    'normal',
    'evidence_document.linked',
    'Evidence linked',
    'Evidence metadata was linked to your Passport record.',
    'evidence_documents',
    document_row.id
  );

  return document_row;
end;
$$;
