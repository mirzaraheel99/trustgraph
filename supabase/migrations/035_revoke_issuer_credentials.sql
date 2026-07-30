create or replace function public.revoke_issuer_credential(
  credential_id uuid,
  revoke_reason text default null
)
returns public.trust_records
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  credential_row public.trust_records;
  issuer_membership public.organization_memberships;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if credential_id is null then
    raise exception 'Credential id is required';
  end if;

  select *
    into credential_row
  from public.trust_records
  where id = credential_id
  for update;

  if not found then
    raise exception 'Credential record not found';
  end if;

  if credential_row.issuer_organization_id is null then
    raise exception 'Only issuer-scoped credentials can be revoked by issuer workflow';
  end if;

  select *
    into issuer_membership
  from public.organization_memberships membership
  where membership.organization_id = credential_row.issuer_organization_id
    and membership.profile_id = current_id
    and membership.status = 'active'
    and membership.role in ('credential_issuer', 'verification_partner', 'trustgraph_verifier', 'system_admin')
  order by membership.updated_at desc
  limit 1;

  if not found then
    raise exception 'Credential issuer role required for this issuing organization';
  end if;

  update public.trust_records
  set status = 'revoked',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'revoked_by_profile_id', current_id,
        'revoked_at', now(),
        'revocation_reason', nullif(trim(coalesce(revoke_reason, '')), ''),
        'issuer_workflow', 'credential_issuer_revocation'
      ),
      updated_at = now()
  where id = credential_row.id
  returning * into credential_row;

  perform public.write_audit_event(
    'credential.revoked',
    'trust_records',
    credential_row.id,
    credential_row.issuer_organization_id,
    coalesce(nullif(trim(revoke_reason), ''), 'Credential issuer revoked a previously issued Passport record'),
    jsonb_build_object(
      'subject_profile_id', credential_row.owner_profile_id,
      'credential_type', credential_row.type,
      'issuer_organization_id', credential_row.issuer_organization_id
    )
  );

  insert into public.notification_events (
    recipient_profile_id,
    organization_id,
    channel,
    status,
    priority,
    event_type,
    title,
    body,
    target_table,
    target_id,
    metadata
  )
  values (
    credential_row.owner_profile_id,
    credential_row.issuer_organization_id,
    'in_app',
    'queued',
    'high',
    'credential.revoked',
    'Credential revoked',
    'A credential issuer revoked a record in your TrustGraph Passport.',
    'trust_records',
    credential_row.id,
    jsonb_build_object(
      'issuer_organization_id', credential_row.issuer_organization_id,
      'reason', nullif(trim(coalesce(revoke_reason, '')), '')
    )
  );

  return credential_row;
end;
$$;
