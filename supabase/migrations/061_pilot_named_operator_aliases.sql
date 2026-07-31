create or replace function public.prepare_pilot_user_access_request()
returns public.access_grants
language sql
security definer
set search_path = public
as $$
  select public.prepare_pilot_access_grant_request();
$$;

create or replace function public.ensure_pilot_employer_reviewer_membership()
returns public.organization_memberships
language sql
security definer
set search_path = public
as $$
  select public.ensure_employer_reviewer_membership();
$$;

create or replace function public.create_pilot_verification_cases()
returns integer
language sql
security definer
set search_path = public
as $$
  select public.create_operator_verification_cases();
$$;

create or replace function public.ensure_pilot_trustgraph_verifier_membership()
returns public.organization_memberships
language sql
security definer
set search_path = public
as $$
  select public.ensure_trustgraph_verifier_membership();
$$;

create or replace function public.ensure_pilot_credential_issuer_membership()
returns public.organization_memberships
language sql
security definer
set search_path = public
as $$
  select public.ensure_credential_issuer_membership();
$$;

create or replace function public.create_pilot_connect_api_client()
returns public.api_clients
language sql
security definer
set search_path = public
as $$
  select public.create_pilot_api_client();
$$;

grant execute on function public.prepare_pilot_user_access_request() to authenticated;
grant execute on function public.ensure_pilot_employer_reviewer_membership() to authenticated;
grant execute on function public.create_pilot_verification_cases() to authenticated;
grant execute on function public.ensure_pilot_trustgraph_verifier_membership() to authenticated;
grant execute on function public.ensure_pilot_credential_issuer_membership() to authenticated;
grant execute on function public.create_pilot_connect_api_client() to authenticated;
