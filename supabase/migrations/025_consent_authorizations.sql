create type consent_authorization_status as enum (
  'active',
  'revoked',
  'expired'
);

create table public.consent_authorizations (
  id uuid primary key default gen_random_uuid(),
  subject_profile_id uuid not null references public.profiles(id) on delete cascade,
  requester_organization_id uuid references public.organizations(id) on delete cascade,
  trust_record_id uuid references public.trust_records(id) on delete set null,
  purpose text not null,
  consent_scope text[] not null default '{}'::text[],
  status consent_authorization_status not null default 'active',
  granted_by_profile_id uuid not null references public.profiles(id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consent_authorizations_subject_granter_check check (subject_profile_id = granted_by_profile_id),
  constraint consent_authorizations_scope_not_empty check (array_length(consent_scope, 1) is not null),
  constraint consent_authorizations_expiry_check check (expires_at is null or expires_at > granted_at)
);

create index consent_authorizations_subject_status_idx
on public.consent_authorizations(subject_profile_id, status, created_at desc);

create index consent_authorizations_requester_status_idx
on public.consent_authorizations(requester_organization_id, status, created_at desc);

create index consent_authorizations_record_idx
on public.consent_authorizations(trust_record_id)
where trust_record_id is not null;

alter table public.consent_authorizations enable row level security;

create trigger consent_authorizations_set_updated_at
before update on public.consent_authorizations
for each row execute function public.set_updated_at();

create policy "subjects read own consent authorizations"
on public.consent_authorizations
for select
using (subject_profile_id = public.current_profile_id());

create policy "requester organizations read scoped consent authorizations"
on public.consent_authorizations
for select
using (
  requester_organization_id is not null
  and public.has_active_membership(requester_organization_id)
);

create policy "subjects create own consent authorizations"
on public.consent_authorizations
for insert
with check (
  subject_profile_id = public.current_profile_id()
  and granted_by_profile_id = public.current_profile_id()
);

create policy "subjects update own consent authorizations"
on public.consent_authorizations
for update
using (subject_profile_id = public.current_profile_id())
with check (subject_profile_id = public.current_profile_id());

create or replace function public.create_consent_authorization(
  requester_organization_id uuid,
  trust_record_id uuid,
  consent_purpose text,
  consent_scope text[],
  expires_at timestamptz default null,
  consent_metadata jsonb default '{}'::jsonb
)
returns public.consent_authorizations
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  record_row public.trust_records;
  consent_row public.consent_authorizations;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if nullif(trim(consent_purpose), '') is null then
    raise exception 'Consent purpose is required';
  end if;

  if array_length(consent_scope, 1) is null then
    raise exception 'Consent scope is required';
  end if;

  if trust_record_id is not null then
    select *
      into record_row
    from public.trust_records
    where id = trust_record_id;

    if not found then
      raise exception 'Trust record not found: %', trust_record_id;
    end if;

    if record_row.owner_profile_id <> current_id then
      raise exception 'Only the professional can authorize consent for this record';
    end if;
  end if;

  insert into public.consent_authorizations (
    subject_profile_id,
    requester_organization_id,
    trust_record_id,
    purpose,
    consent_scope,
    status,
    granted_by_profile_id,
    expires_at,
    metadata
  )
  values (
    current_id,
    create_consent_authorization.requester_organization_id,
    create_consent_authorization.trust_record_id,
    trim(consent_purpose),
    consent_scope,
    'active',
    current_id,
    expires_at,
    coalesce(consent_metadata, '{}'::jsonb)
  )
  returning * into consent_row;

  perform public.write_audit_event(
    'consent_authorization.created',
    'consent_authorizations',
    consent_row.id,
    consent_row.requester_organization_id,
    consent_row.purpose,
    jsonb_build_object('scope', consent_row.consent_scope, 'trust_record_id', consent_row.trust_record_id)
  );

  return consent_row;
end;
$$;

create or replace function public.revoke_consent_authorization(
  target_consent_id uuid,
  revoke_reason text default null
)
returns public.consent_authorizations
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  consent_row public.consent_authorizations;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  select *
    into consent_row
  from public.consent_authorizations
  where id = target_consent_id
  for update;

  if not found then
    raise exception 'Consent authorization not found: %', target_consent_id;
  end if;

  if consent_row.subject_profile_id <> current_id then
    raise exception 'Only the subject can revoke this consent authorization';
  end if;

  update public.consent_authorizations
  set status = 'revoked',
      revoked_at = now()
  where id = target_consent_id
  returning * into consent_row;

  perform public.write_audit_event(
    'consent_authorization.revoked',
    'consent_authorizations',
    consent_row.id,
    consent_row.requester_organization_id,
    revoke_reason,
    jsonb_build_object('scope', consent_row.consent_scope, 'trust_record_id', consent_row.trust_record_id)
  );

  return consent_row;
end;
$$;
