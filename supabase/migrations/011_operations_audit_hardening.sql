drop trigger if exists verification_cases_set_updated_at on public.verification_cases;

create trigger verification_cases_set_updated_at
before update on public.verification_cases
for each row execute function public.set_updated_at();

create or replace function public.current_operations_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select membership.organization_id
  from public.organization_memberships membership
  join public.organizations organization on organization.id = membership.organization_id
  where membership.profile_id = public.current_profile_id()
    and membership.status = 'active'
    and organization.type = 'trustgraph'
  order by membership.created_at
  limit 1
$$;
