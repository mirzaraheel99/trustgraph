do $$
begin
  if not exists (select 1 from pg_type where typname = 'trust_record_sensitivity') then
    create type trust_record_sensitivity as enum ('standard', 'sensitive', 'restricted');
  end if;
end $$;

alter table public.trust_records
  add column if not exists sensitivity trust_record_sensitivity not null default 'standard',
  add column if not exists consent_required boolean not null default false;

update public.trust_records
set
  sensitivity = case
    when type in ('background_check', 'performance_review', 'health_clearance', 'identity') then 'restricted'::trust_record_sensitivity
    when type in ('reference', 'license', 'certification', 'training', 'continuing_education') then 'sensitive'::trust_record_sensitivity
    else sensitivity
  end,
  consent_required = case
    when type in ('background_check', 'performance_review', 'health_clearance', 'identity', 'reference') then true
    else consent_required
  end
where
  type in ('background_check', 'performance_review', 'health_clearance', 'identity', 'reference', 'license', 'certification', 'training', 'continuing_education');

create index if not exists records_sensitivity_status_idx
on public.trust_records(sensitivity, status);

create or replace function public.classify_trust_record_sensitivity(
  target_record_id uuid,
  next_sensitivity trust_record_sensitivity,
  next_consent_required boolean
)
returns public.trust_records
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := auth.uid();
  record_row public.trust_records;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  select *
    into record_row
  from public.trust_records
  where id = target_record_id;

  if not found then
    raise exception 'Trust record not found';
  end if;

  if record_row.owner_profile_id <> current_id
    and not public.has_role(
      coalesce(record_row.issuer_organization_id, record_row.owner_profile_id),
      array['compliance_admin', 'system_admin', 'trustgraph_verifier']::role_key[]
    ) then
    raise exception 'Only the owner or compliance role can classify record sensitivity';
  end if;

  update public.trust_records
  set
    sensitivity = next_sensitivity,
    consent_required = next_consent_required,
    updated_at = now()
  where id = target_record_id
  returning * into record_row;

  perform public.write_audit_event(
    'trust_record.sensitivity_classified',
    'trust_records',
    record_row.id,
    record_row.issuer_organization_id,
    'Trust record sensitivity classification changed',
    jsonb_build_object(
      'sensitivity', next_sensitivity,
      'consent_required', next_consent_required,
      'record_type', record_row.type
    )
  );

  return record_row;
end;
$$;
