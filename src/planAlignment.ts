import type { Tone } from "./data";

export interface FoundationTrack {
  id: string;
  label: string;
  planStep: string;
  status: "deployed" | "foundation" | "planned";
  detail: string;
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
    status: "planned",
    detail: "Private storage and malware scanning remain next.",
    tone: "warning"
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
    detail: "Missing-record request workflow connects Verify needs back to Passport owners.",
    tone: "info"
  },
  {
    id: "ai",
    label: "TrustGraph AI",
    planStep: "Step 18",
    status: "planned",
    detail: "Governance documented; source-grounded features remain planned.",
    tone: "neutral"
  }
];
