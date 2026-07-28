create or replace function public.prepare_pilot_access_grant_request()
returns public.access_grants
language sql
security definer
set search_path = public
as $$
  select public.create_sample_access_grant_request();
$$;

create or replace function public.ensure_employer_reviewer_membership()
returns public.organization_memberships
language sql
security definer
set search_path = public
as $$
  select public.create_sample_employer_reviewer_membership();
$$;

create or replace function public.create_operator_verification_cases()
returns integer
language sql
security definer
set search_path = public
as $$
  select public.create_sample_verification_cases();
$$;

create or replace function public.ensure_trustgraph_verifier_membership()
returns public.organization_memberships
language sql
security definer
set search_path = public
as $$
  select public.create_sample_trustgraph_verifier_membership();
$$;

create or replace function public.ensure_credential_issuer_membership()
returns public.organization_memberships
language sql
security definer
set search_path = public
as $$
  select public.create_sample_credential_issuer_membership();
$$;

create or replace function public.create_pilot_api_client()
returns public.api_clients
language sql
security definer
set search_path = public
as $$
  select public.create_sample_api_client();
$$;
