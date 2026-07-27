insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trustgraph-evidence',
  'trustgraph-evidence',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain'
  ]
)
on conflict (id)
do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "professionals upload own evidence files" on storage.objects;
create policy "professionals upload own evidence files"
on storage.objects
for insert
with check (
  bucket_id = 'trustgraph-evidence'
  and owner = auth.uid()
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "professionals read own evidence files" on storage.objects;
create policy "professionals read own evidence files"
on storage.objects
for select
using (
  bucket_id = 'trustgraph-evidence'
  and owner = auth.uid()
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "professionals update own evidence files" on storage.objects;
create policy "professionals update own evidence files"
on storage.objects
for update
using (
  bucket_id = 'trustgraph-evidence'
  and owner = auth.uid()
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'trustgraph-evidence'
  and owner = auth.uid()
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace function public.create_evidence_document(
  target_record_id uuid,
  document_title text,
  document_type text,
  source_name text,
  evidence_summary text default null,
  storage_path text default null
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
  normalized_storage_path text := nullif(trim(coalesce(storage_path, '')), '');
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

  if normalized_storage_path is not null and split_part(normalized_storage_path, '/', 1) <> current_id::text then
    raise exception 'Evidence storage path must live under the current profile folder';
  end if;

  insert into public.evidence_documents (
    owner_profile_id,
    trust_record_id,
    uploaded_by_profile_id,
    status,
    title,
    document_type,
    storage_path,
    source_name,
    evidence_summary,
    metadata
  )
  values (
    current_id,
    target_record_id,
    current_id,
    case when normalized_storage_path is null then 'linked' else 'uploaded' end,
    trim(document_title),
    trim(document_type),
    normalized_storage_path,
    trim(source_name),
    nullif(trim(coalesce(evidence_summary, '')), ''),
    jsonb_build_object('storage_bucket', 'trustgraph-evidence', 'storage_provider', 'supabase')
  )
  returning * into document_row;

  perform public.write_audit_event(
    'evidence_document.linked',
    'evidence_documents',
    document_row.id,
    record_row.issuer_organization_id,
    'Professional linked evidence to Passport record',
    jsonb_build_object(
      'trust_record_id',
      target_record_id,
      'document_type',
      document_type,
      'has_storage_file',
      normalized_storage_path is not null
    )
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
    case when normalized_storage_path is null then 'Evidence linked' else 'Evidence uploaded' end,
    case
      when normalized_storage_path is null then 'Evidence metadata was linked to your Passport record.'
      else 'A private evidence file was uploaded and linked to your Passport record.'
    end,
    'evidence_documents',
    document_row.id
  );

  return document_row;
end;
$$;
