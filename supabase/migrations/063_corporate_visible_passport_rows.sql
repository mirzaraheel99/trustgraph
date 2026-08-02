create or replace function public.list_corporate_visible_passport_rows(
  input_organization_id uuid default null
)
returns table (
  access_grant_id uuid,
  requester_organization_id uuid,
  subject_profile_id uuid,
  subject_email text,
  subject_full_name text,
  trust_record_id uuid,
  record_type public.record_type,
  record_title text,
  record_status public.record_status,
  source_name text,
  evidence_summary text,
  issued_at date,
  expires_at date,
  record_metadata jsonb,
  record_created_at timestamptz,
  record_updated_at timestamptz,
  record_sensitivity public.trust_record_sensitivity,
  consent_required boolean,
  consent_status text,
  access_expires_at timestamptz,
  access_purpose text,
  visibility_scope text,
  raw_private_files_included boolean,
  preview_data_accepted boolean,
  accepted_when text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  selected_organization_id uuid;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if input_organization_id is not null then
    selected_organization_id := input_organization_id;
  else
    select membership.organization_id
      into selected_organization_id
    from public.organization_memberships membership
    join public.organizations organization_row on organization_row.id = membership.organization_id
    where membership.profile_id = current_id
      and membership.status = 'active'
      and membership.role in ('employer_admin', 'employer_reviewer', 'staffing_agency_admin', 'recruiter', 'compliance_admin', 'auditor')
      and organization_row.type in ('employer', 'staffing_agency', 'trustgraph')
    order by
      case membership.role
        when 'employer_admin' then 1
        when 'staffing_agency_admin' then 2
        when 'employer_reviewer' then 3
        when 'recruiter' then 4
        when 'compliance_admin' then 5
        else 6
      end,
      membership.created_at asc
    limit 1;
  end if;

  if selected_organization_id is null then
    raise exception 'Active corporate organization context required';
  end if;

  if not public.has_role(
    selected_organization_id,
    array['employer_admin', 'employer_reviewer', 'staffing_agency_admin', 'recruiter', 'compliance_admin', 'auditor']::public.role_key[]
  ) then
    raise exception 'Active corporate reviewer membership required';
  end if;

  return query
  select
    grant_row.id as access_grant_id,
    grant_row.requester_organization_id,
    profile_row.id as subject_profile_id,
    profile_row.email as subject_email,
    profile_row.full_name as subject_full_name,
    record_row.id as trust_record_id,
    record_row.type as record_type,
    record_row.title as record_title,
    record_row.status as record_status,
    record_row.source_name,
    record_row.evidence_summary,
    record_row.issued_at,
    record_row.expires_at,
    record_row.metadata as record_metadata,
    record_row.created_at as record_created_at,
    record_row.updated_at as record_updated_at,
    record_row.sensitivity as record_sensitivity,
    record_row.consent_required,
    case
      when record_row.consent_required is false then 'not_required'
      when exists (
        select 1
        from public.consent_authorizations consent_row
        where consent_row.subject_profile_id = record_row.owner_profile_id
          and consent_row.requester_organization_id = selected_organization_id
          and (consent_row.trust_record_id is null or consent_row.trust_record_id = record_row.id)
          and consent_row.status = 'active'
          and (consent_row.expires_at is null or consent_row.expires_at > now())
      ) then 'active'
      else 'required'
    end as consent_status,
    grant_row.expires_at as access_expires_at,
    grant_row.purpose as access_purpose,
    'approved_access_grant_records_for_active_corporate_membership'::text as visibility_scope,
    false as raw_private_files_included,
    false as preview_data_accepted,
    'corporate_visible_passport_rows_requires_active_corporate_rbac_approved_non_expired_access_grants_scoped_records_consent_state_no_raw_private_files_and_no_preview_data'::text as accepted_when
  from public.access_grants grant_row
  join public.access_grant_records grant_record on grant_record.access_grant_id = grant_row.id
  join public.trust_records record_row on record_row.id = grant_record.trust_record_id
  join public.profiles profile_row on profile_row.id = grant_row.subject_profile_id
  where grant_row.requester_organization_id = selected_organization_id
    and grant_row.status = 'approved'
    and (grant_row.expires_at is null or grant_row.expires_at > now())
    and record_row.owner_profile_id = grant_row.subject_profile_id
    and record_row.status <> 'revoked'
  order by profile_row.full_name asc, record_row.updated_at desc, record_row.created_at desc;
end;
$$;

grant execute on function public.list_corporate_visible_passport_rows(uuid) to authenticated;
