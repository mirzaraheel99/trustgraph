create table if not exists public.corporate_access_reviews (
  id uuid primary key default gen_random_uuid(),
  access_grant_id uuid not null references public.access_grants(id) on delete cascade,
  requester_organization_id uuid not null references public.organizations(id) on delete cascade,
  subject_profile_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_profile_id uuid references public.profiles(id) on delete set null,
  review_status text not null check (review_status in ('reviewed', 'needs_follow_up', 'ready_for_handoff', 'closed')),
  reviewer_note text,
  shared_record_count integer not null default 0,
  open_gap_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists corporate_access_reviews_grant_idx
  on public.corporate_access_reviews(access_grant_id, created_at desc);

create index if not exists corporate_access_reviews_org_idx
  on public.corporate_access_reviews(requester_organization_id, created_at desc);

alter table public.corporate_access_reviews enable row level security;

drop policy if exists "Corporate members can read access reviews" on public.corporate_access_reviews;
create policy "Corporate members can read access reviews"
  on public.corporate_access_reviews
  for select
  using (
    exists (
      select 1
      from public.organization_memberships membership
      where membership.organization_id = corporate_access_reviews.requester_organization_id
        and membership.profile_id = public.current_profile_id()
        and membership.status = 'active'
    )
    or subject_profile_id = public.current_profile_id()
  );

drop policy if exists "Corporate reviewers can create access reviews" on public.corporate_access_reviews;
create policy "Corporate reviewers can create access reviews"
  on public.corporate_access_reviews
  for insert
  with check (
    exists (
      select 1
      from public.organization_memberships membership
      where membership.organization_id = corporate_access_reviews.requester_organization_id
        and membership.profile_id = public.current_profile_id()
        and membership.status = 'active'
        and membership.role in ('employer_admin', 'employer_reviewer', 'staffing_agency_admin', 'recruiter', 'compliance_admin')
    )
  );

create or replace function public.record_corporate_access_review(
  target_access_grant_id uuid,
  next_review_status text,
  review_note text default null
)
returns public.corporate_access_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  current_id uuid := public.current_profile_id();
  grant_row public.access_grants;
  review_row public.corporate_access_reviews;
  shared_count integer := 0;
  gap_count integer := 0;
begin
  if current_id is null then
    raise exception 'Authentication required';
  end if;

  if next_review_status not in ('reviewed', 'needs_follow_up', 'ready_for_handoff', 'closed') then
    raise exception 'Unsupported corporate access review status';
  end if;

  select *
    into grant_row
  from public.access_grants grant_item
  where grant_item.id = target_access_grant_id;

  if not found then
    raise exception 'Access Grant not found';
  end if;

  if not exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = grant_row.requester_organization_id
      and membership.profile_id = current_id
      and membership.status = 'active'
      and membership.role in ('employer_admin', 'employer_reviewer', 'staffing_agency_admin', 'recruiter', 'compliance_admin')
  ) then
    raise exception 'Corporate Verify reviewer role required';
  end if;

  select count(*)
    into shared_count
  from public.access_grant_records grant_record
  where grant_record.access_grant_id = grant_row.id;

  select count(*)
    into gap_count
  from public.missing_record_requests request
  where request.requester_organization_id = grant_row.requester_organization_id
    and request.subject_profile_id = grant_row.subject_profile_id
    and request.status in ('requested', 'in_progress');

  insert into public.corporate_access_reviews (
    access_grant_id,
    requester_organization_id,
    subject_profile_id,
    reviewer_profile_id,
    review_status,
    reviewer_note,
    shared_record_count,
    open_gap_count,
    metadata
  )
  values (
    grant_row.id,
    grant_row.requester_organization_id,
    grant_row.subject_profile_id,
    current_id,
    next_review_status,
    nullif(trim(coalesce(review_note, '')), ''),
    shared_count,
    gap_count,
    jsonb_build_object(
      'grant_status', grant_row.status,
      'purpose', grant_row.purpose,
      'source', 'corporate_verify_user_database'
    )
  )
  returning * into review_row;

  perform public.write_audit_event(
    'corporate_access.review_recorded',
    'corporate_access_reviews',
    review_row.id,
    review_row.requester_organization_id,
    'Corporate reviewer recorded scoped user-database review',
    jsonb_build_object(
      'access_grant_id', review_row.access_grant_id,
      'subject_profile_id', review_row.subject_profile_id,
      'review_status', review_row.review_status,
      'shared_record_count', review_row.shared_record_count,
      'open_gap_count', review_row.open_gap_count
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
    grant_row.subject_profile_id,
    grant_row.requester_organization_id,
    'in_app',
    'queued',
    case when next_review_status = 'needs_follow_up' then 'high' else 'normal' end,
    'corporate_access_review',
    'Corporate access review recorded',
    'A corporate reviewer updated the scoped Passport access review for your shared records.',
    'corporate_access_reviews',
    review_row.id,
    jsonb_build_object(
      'access_grant_id', review_row.access_grant_id,
      'review_status', review_row.review_status,
      'shared_record_count', review_row.shared_record_count,
      'open_gap_count', review_row.open_gap_count
    )
  );

  return review_row;
end;
$$;
