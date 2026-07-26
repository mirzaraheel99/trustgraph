create extension if not exists "pgcrypto";

create type organization_type as enum (
  'professional',
  'employer',
  'staffing_agency',
  'trustgraph'
);

create type organization_status as enum (
  'active',
  'pending_approval',
  'restricted'
);

create type role_key as enum (
  'professional',
  'employer_admin',
  'employer_reviewer',
  'staffing_agency_admin',
  'recruiter',
  'reference_provider',
  'credential_issuer',
  'verification_partner',
  'support_agent',
  'trustgraph_verifier',
  'compliance_admin',
  'system_admin',
  'auditor'
);

create type membership_status as enum (
  'active',
  'invited',
  'suspended'
);

create type record_type as enum (
  'identity',
  'employment',
  'education',
  'license',
  'certification',
  'reference',
  'background_check',
  'health_clearance',
  'custom'
);

create type record_status as enum (
  'draft',
  'pending_verification',
  'verified',
  'expired',
  'disputed',
  'revoked',
  'restricted'
);

create type access_grant_status as enum (
  'requested',
  'approved',
  'declined',
  'expired',
  'revoked'
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type organization_type not null,
  status organization_status not null default 'pending_approval',
  domain text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key,
  full_name text not null,
  email text not null unique,
  primary_organization_id uuid references public.organizations(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role role_key not null,
  status membership_status not null default 'invited',
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, profile_id, role)
);

create table public.trust_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  issuer_organization_id uuid references public.organizations(id),
  type record_type not null,
  title text not null,
  status record_status not null default 'draft',
  source_name text not null,
  evidence_summary text,
  issued_at date,
  expires_at date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.access_grants (
  id uuid primary key default gen_random_uuid(),
  subject_profile_id uuid not null references public.profiles(id) on delete cascade,
  requester_organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by_profile_id uuid references public.profiles(id),
  status access_grant_status not null default 'requested',
  purpose text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.access_grant_records (
  access_grant_id uuid not null references public.access_grants(id) on delete cascade,
  trust_record_id uuid not null references public.trust_records(id) on delete cascade,
  primary key (access_grant_id, trust_record_id)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id),
  organization_id uuid references public.organizations(id),
  action text not null,
  target_table text not null,
  target_id uuid,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index organizations_type_status_idx on public.organizations(type, status);
create index memberships_profile_status_idx on public.organization_memberships(profile_id, status);
create index memberships_org_role_idx on public.organization_memberships(organization_id, role);
create index records_owner_status_idx on public.trust_records(owner_profile_id, status);
create index records_issuer_type_idx on public.trust_records(issuer_organization_id, type);
create index grants_subject_status_idx on public.access_grants(subject_profile_id, status);
create index grants_requester_status_idx on public.access_grants(requester_organization_id, status);
create index audit_actor_created_idx on public.audit_events(actor_profile_id, created_at desc);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.trust_records enable row level security;
alter table public.access_grants enable row level security;
alter table public.access_grant_records enable row level security;
alter table public.audit_events enable row level security;
