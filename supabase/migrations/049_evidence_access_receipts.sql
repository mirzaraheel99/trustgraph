create table if not exists public.evidence_access_receipts (
  id uuid primary key default gen_random_uuid(),
  evidence_document_id uuid not null references public.evidence_documents(id) on delete cascade,
  trust_record_id uuid references public.trust_records(id) on delete set null,
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  actor_profile_id uuid not null references public.profiles(id) on delete cascade,
  access_mode text not null check (access_mode in ('preview', 'download')),
  signed_url_expires_in_seconds integer not null check (signed_url_expires_in_seconds > 0 and signed_url_expires_in_seconds <= 600),
  storage_bucket text not null default 'trustgraph-evidence',
  storage_path_prefix text not null,
  raw_url_stored boolean not null default false,
  accepted_when text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists evidence_access_receipts_document_idx
  on public.evidence_access_receipts(evidence_document_id, created_at desc);

create index if not exists evidence_access_receipts_actor_idx
  on public.evidence_access_receipts(actor_profile_id, created_at desc);

alter table public.evidence_access_receipts enable row level security;

drop policy if exists "owners and allowed reviewers read evidence access receipts" on public.evidence_access_receipts;
create policy "owners and allowed reviewers read evidence access receipts"
on public.evidence_access_receipts
for select
using (
  owner_profile_id = public.current_profile_id()
  or actor_profile_id = public.current_profile_id()
  or exists (
    select 1
    from public.access_grants access_grant
    join public.access_grant_records shared_record on shared_record.access_grant_id = access_grant.id
    where shared_record.trust_record_id = evidence_access_receipts.trust_record_id
      and access_grant.status = 'approved'
      and (access_grant.expires_at is null or access_grant.expires_at > now())
      and public.has_active_membership(access_grant.requester_organization_id)
  )
  or exists (
    select 1
    from public.organization_memberships membership
    join public.organizations organization on organization.id = membership.organization_id
    where membership.profile_id = public.current_profile_id()
      and membership.status = 'active'
      and organization.type = 'trustgraph'
      and membership.role in ('trustgraph_verifier', 'compliance_admin', 'system_admin', 'auditor')
  )
);

drop policy if exists "actors create own evidence access receipts" on public.evidence_access_receipts;
create policy "actors create own evidence access receipts"
on public.evidence_access_receipts
for insert
with check (
  actor_profile_id = public.current_profile_id()
  and raw_url_stored = false
);

create or replace function public.record_evidence_access_receipt(
  input_evidence_document_id uuid,
  input_access_mode text,
  input_signed_url_expires_in_seconds integer,
  input_metadata jsonb default '{}'::jsonb
)
returns public.evidence_access_receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  document_row public.evidence_documents;
  receipt_row public.evidence_access_receipts;
  acceptance_rule text := 'evidence_access_receipt_requires_private_storage_short_lived_signed_url_no_raw_url_storage_owner_or_approved_scope_and_audit_event';
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if input_access_mode not in ('preview', 'download') then
    raise exception 'Unsupported evidence access mode';
  end if;

  if input_signed_url_expires_in_seconds <= 0 or input_signed_url_expires_in_seconds > 600 then
    raise exception 'Evidence signed URL expiry must be between 1 and 600 seconds';
  end if;

  select *
    into document_row
  from public.evidence_documents
  where id = input_evidence_document_id
    and storage_path is not null
    and (
      owner_profile_id = current_id
      or (
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
      )
    );

  if not found then
    raise exception 'File-backed evidence document with owner or approved scope required';
  end if;

  insert into public.evidence_access_receipts (
    evidence_document_id,
    trust_record_id,
    owner_profile_id,
    actor_profile_id,
    access_mode,
    signed_url_expires_in_seconds,
    storage_bucket,
    storage_path_prefix,
    raw_url_stored,
    accepted_when,
    metadata
  )
  values (
    document_row.id,
    document_row.trust_record_id,
    document_row.owner_profile_id,
    current_id,
    input_access_mode,
    input_signed_url_expires_in_seconds,
    'trustgraph-evidence',
    split_part(document_row.storage_path, '/', 1),
    false,
    acceptance_rule,
    coalesce(input_metadata, '{}'::jsonb)
  )
  returning * into receipt_row;

  perform public.write_audit_event(
    'evidence_access.signed_url_issued',
    'evidence_access_receipts',
    receipt_row.id,
    null,
    'Evidence signed access receipt recorded',
    jsonb_build_object(
      'evidence_document_id', receipt_row.evidence_document_id,
      'trust_record_id', receipt_row.trust_record_id,
      'access_mode', receipt_row.access_mode,
      'signed_url_expires_in_seconds', receipt_row.signed_url_expires_in_seconds,
      'raw_url_stored', false
    )
  );

  return receipt_row;
end;
$$;

grant execute on function public.record_evidence_access_receipt(uuid, text, integer, jsonb) to authenticated;
