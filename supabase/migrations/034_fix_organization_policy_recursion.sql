create or replace function public.is_trustgraph_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.profile_id = public.current_profile_id()
      and membership.status = 'active'
      and membership.role in ('system_admin', 'compliance_admin')
      and exists (
        select 1
        from public.organizations operator_org
        where operator_org.id = membership.organization_id
          and operator_org.type = 'trustgraph'
      )
  )
$$;

drop policy if exists "platform admins can manage organizations" on public.organizations;

create policy "platform admins can manage organizations"
on public.organizations
for all
using (public.is_trustgraph_operator())
with check (public.is_trustgraph_operator());
