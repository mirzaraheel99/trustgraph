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

export interface ConsentPolicyArea {
  id: string;
  label: string;
  classification: string;
  consent: "required" | "recommended" | "not required";
  visibility: string;
  review: string;
  audit: string;
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
    status: "deployed",
    detail: "Audit events, filters, exports, and material workflow history are visible in Admin.",
    tone: "success"
  },
  {
    id: "notifications",
    label: "Notifications",
    planStep: "Step 14",
    status: "deployed",
    detail: "In-app events, recipient status controls, and audit-backed inbox actions are live.",
    tone: "success"
  },
  {
    id: "documents",
    label: "Evidence Documents",
    planStep: "Steps 07, 15",
    status: "deployed",
    detail: "Private Supabase Storage upload, evidence metadata, signed preview, and download controls are live.",
    tone: "success"
  },
  {
    id: "references",
    label: "References",
    planStep: "Phase 3",
    status: "deployed",
    detail: "Structured reference requests and lifecycle states are live.",
    tone: "success"
  },
  {
    id: "credentials",
    label: "Credentials",
    planStep: "Phase 2",
    status: "deployed",
    detail: "Credential issuer role, verified issue workflow, audit, and notifications are live.",
    tone: "success"
  },
  {
    id: "connect",
    label: "Connect APIs",
    planStep: "Step 17",
    status: "deployed",
    detail: "API client registry, webhook subscriptions, status controls, and audit are live.",
    tone: "success"
  },
  {
    id: "ai",
    label: "TrustGraph AI",
    planStep: "Step 18",
    status: "deployed",
    detail: "Deterministic source-grounded advisory summaries are live in each workspace.",
    tone: "success"
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
    status: "foundation",
    evidence: "Contract assignment is a first-class Passport and Verify missing-record type.",
    tone: "info"
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
    status: "foundation",
    evidence: "Sensitive/restricted record classification and explicit consent requirements are live; final legal/provider workflow requires counsel and vendor decisions.",
    tone: "info"
  },
  {
    id: "training",
    label: "Training records",
    productArea: "Credentials",
    status: "foundation",
    evidence: "Training is a first-class Passport, Verify request, and issuer record type.",
    tone: "info"
  },
  {
    id: "skills",
    label: "Skills",
    productArea: "Passport",
    status: "foundation",
    evidence: "Skill evidence is a first-class Passport and Verify missing-record type.",
    tone: "info"
  },
  {
    id: "performance",
    label: "Performance reviews",
    productArea: "References",
    status: "foundation",
    evidence: "Performance review is a first-class scoped record type; confidentiality workflow remains next.",
    tone: "info"
  },
  {
    id: "continuing-education",
    label: "Continuing education",
    productArea: "Credentials",
    status: "foundation",
    evidence: "Continuing education is a first-class Passport, Verify request, and issuer record type.",
    tone: "info"
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

export const consentPolicyAreas: ConsentPolicyArea[] = [
  {
    id: "identity",
    label: "Identity and government ID",
    classification: "Sensitive personal data",
    consent: "required",
    visibility: "Status only for employers; raw evidence restricted",
    review: "Provider integration and biometric rules require legal review",
    audit: "Verification, view, share, and evidence access",
    tone: "danger"
  },
  {
    id: "work-record",
    label: "Employment and contracts",
    classification: "Professional-controlled data",
    consent: "required",
    visibility: "Shared through active Access Grants",
    review: "Employer confirmation wording requires policy review",
    audit: "Create, confirm, correct, share, and revoke",
    tone: "info"
  },
  {
    id: "credentials",
    label: "Licenses, certifications, training, CE",
    classification: "Credential and compliance data",
    consent: "required",
    visibility: "Issuer status visible only inside approved scope",
    review: "Issuer-source agreements required before automation",
    audit: "Issue, expire, revoke, view, and export",
    tone: "warning"
  },
  {
    id: "references",
    label: "References and performance reviews",
    classification: "Employer-restricted confidential data",
    consent: "required",
    visibility: "Restricted by provider terms and professional sharing",
    review: "Reference liability and defamation risk require counsel",
    audit: "Invite, submit, view, share, dispute, and redact",
    tone: "danger"
  },
  {
    id: "background",
    label: "Background checks",
    classification: "Background-screening data",
    consent: "required",
    visibility: "Never exposed without explicit authorization and purpose",
    review: "FCRA/adverse-action boundaries require counsel",
    audit: "Authorization, provider result, view, decision boundary, deletion",
    tone: "danger"
  },
  {
    id: "skills",
    label: "Skills and AI summaries",
    classification: "Derived professional data",
    consent: "recommended",
    visibility: "Summary must cite source records and hide unsupported claims",
    review: "AI must stay advisory and never make employment decisions",
    audit: "Source mix, generation, human review, and export",
    tone: "info"
  }
];
