import type { Tone } from "./data";

export interface FoundationTrack {
  id: string;
  label: string;
  planStep: string;
  status: "deployed" | "foundation" | "planned";
  detail: string;
  tone: Tone;
}

export interface LockedProfileArea {
  id: string;
  label: string;
  productArea: string;
  status: "deployed" | "foundation" | "planned";
  evidence: string;
  tone: Tone;
}

export const foundationTracks: FoundationTrack[] = [
  {
    id: "auth",
    label: "Account and Auth",
    planStep: "Phase 1",
    status: "deployed",
    detail: "Supabase auth, profiles, organizations, and memberships.",
    tone: "success"
  },
  {
    id: "rbac",
    label: "Corporate RBAC",
    planStep: "Steps 03, 15",
    status: "deployed",
    detail: "Employer/staffing account creation and role-scoped access.",
    tone: "success"
  },
  {
    id: "passport",
    label: "Passport Records",
    planStep: "Steps 02, 12",
    status: "deployed",
    detail: "Live professional-controlled trust records.",
    tone: "success"
  },
  {
    id: "sharing",
    label: "Access Grants",
    planStep: "Steps 04, 13",
    status: "deployed",
    detail: "Request, approve, revoke, and sync shared records.",
    tone: "success"
  },
  {
    id: "verify",
    label: "Verify Workspace",
    planStep: "Phase 4",
    status: "deployed",
    detail: "Employer/staffing review of approved shared Passport records.",
    tone: "success"
  },
  {
    id: "operations",
    label: "Admin Operations",
    planStep: "Phase 5",
    status: "deployed",
    detail: "Verification cases, fraud signals, and case decisions.",
    tone: "success"
  },
  {
    id: "audit",
    label: "Audit History",
    planStep: "Steps 07, 15",
    status: "foundation",
    detail: "Audit events are written and visible in Admin.",
    tone: "info"
  },
  {
    id: "notifications",
    label: "Notifications",
    planStep: "Step 14",
    status: "foundation",
    detail: "In-app events, recipient status controls, and audit-backed inbox actions are live.",
    tone: "info"
  },
  {
    id: "documents",
    label: "Evidence Documents",
    planStep: "Steps 07, 15",
    status: "foundation",
    detail: "Private Supabase Storage upload and evidence metadata linking are live.",
    tone: "info"
  },
  {
    id: "references",
    label: "References",
    planStep: "Phase 3",
    status: "foundation",
    detail: "Structured reference requests and lifecycle states are live.",
    tone: "info"
  },
  {
    id: "credentials",
    label: "Credentials",
    planStep: "Phase 2",
    status: "foundation",
    detail: "Credential issuer role, verified issue workflow, audit, and notifications are live.",
    tone: "info"
  },
  {
    id: "connect",
    label: "Connect APIs",
    planStep: "Step 17",
    status: "foundation",
    detail: "API client registry, webhook subscriptions, status controls, and audit are live.",
    tone: "info"
  },
  {
    id: "ai",
    label: "TrustGraph AI",
    planStep: "Step 18",
    status: "foundation",
    detail: "Deterministic source-grounded advisory summaries are live in each workspace.",
    tone: "info"
  }
];

export const lockedProfileAreas: LockedProfileArea[] = [
  {
    id: "identity",
    label: "Verified identity",
    productArea: "Passport",
    status: "foundation",
    evidence: "Identity-confirmed record labels and onboarding hooks are represented.",
    tone: "info"
  },
  {
    id: "employment",
    label: "Employment history",
    productArea: "Work Record",
    status: "deployed",
    evidence: "Live Passport records support employment history and verification status.",
    tone: "success"
  },
  {
    id: "contracts",
    label: "Short-term contracts",
    productArea: "Work Record",
    status: "planned",
    evidence: "Navigation and record model allow contract assignments; dedicated flow is pending.",
    tone: "neutral"
  },
  {
    id: "responsibilities",
    label: "Job titles and responsibilities",
    productArea: "Work Record",
    status: "foundation",
    evidence: "Record title/source/evidence summary capture role claims; structured responsibility fields remain planned.",
    tone: "info"
  },
  {
    id: "licenses",
    label: "Licenses",
    productArea: "Credentials",
    status: "foundation",
    evidence: "Credential issuer workflow can issue license records with audit and notifications.",
    tone: "info"
  },
  {
    id: "certifications",
    label: "Certifications",
    productArea: "Credentials",
    status: "foundation",
    evidence: "Credential issue workflow and expiration metadata support certifications.",
    tone: "info"
  },
  {
    id: "references",
    label: "References",
    productArea: "References",
    status: "foundation",
    evidence: "Structured reference request lifecycle is live.",
    tone: "info"
  },
  {
    id: "background-checks",
    label: "Background-check results",
    productArea: "Compliance",
    status: "planned",
    evidence: "Sensitive classification is planned; final legal/provider workflow requires counsel and vendor decisions.",
    tone: "neutral"
  },
  {
    id: "training",
    label: "Training records",
    productArea: "Credentials",
    status: "planned",
    evidence: "Record type support exists, but dedicated training ingestion is pending.",
    tone: "neutral"
  },
  {
    id: "skills",
    label: "Skills",
    productArea: "Passport",
    status: "planned",
    evidence: "Skills appear in locked scope; validation workflow is not implemented yet.",
    tone: "neutral"
  },
  {
    id: "performance",
    label: "Performance reviews",
    productArea: "References",
    status: "planned",
    evidence: "Confidentiality rules are planned; no review submission workflow yet.",
    tone: "neutral"
  },
  {
    id: "continuing-education",
    label: "Continuing education",
    productArea: "Credentials",
    status: "planned",
    evidence: "Can be modeled as credential/training records; dedicated CE workflow is pending.",
    tone: "neutral"
  },
  {
    id: "digital-credentials",
    label: "Digital credentials",
    productArea: "Credentials",
    status: "foundation",
    evidence: "Issuer role can create credential records with lifecycle state.",
    tone: "info"
  },
  {
    id: "compliance-documents",
    label: "Compliance documents",
    productArea: "Compliance",
    status: "foundation",
    evidence: "Private evidence upload and metadata linking are live.",
    tone: "info"
  },
  {
    id: "expirations",
    label: "Credential expiration dates",
    productArea: "Credentials",
    status: "foundation",
    evidence: "Record expiration and renewal visibility are present in Passport and Verify.",
    tone: "info"
  },
  {
    id: "verification-timestamps",
    label: "Verification timestamps",
    productArea: "Trust Framework",
    status: "deployed",
    evidence: "Record timelines, audit events, and verification case timestamps are visible.",
    tone: "success"
  },
  {
    id: "employer-confirmed",
    label: "Employer-confirmed work records",
    productArea: "Work Record",
    status: "foundation",
    evidence: "Verify and operations queues support employer confirmation patterns.",
    tone: "info"
  },
  {
    id: "ai-summaries",
    label: "AI-generated professional summaries",
    productArea: "TrustGraph AI",
    status: "foundation",
    evidence: "Source-grounded advisory summaries are live without automated employment decisions.",
    tone: "info"
  },
  {
    id: "audit-history",
    label: "Full audit and verification history",
    productArea: "Audit",
    status: "foundation",
    evidence: "Audit events are created for material workflows and visible in Admin.",
    tone: "info"
  }
];
