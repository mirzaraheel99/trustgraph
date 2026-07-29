import {
  Activity,
  Archive,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  FileCheck2,
  FileClock,
  Fingerprint,
  GraduationCap,
  KeyRound,
  LockKeyhole,
  Network,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type WorkspaceId = "passport" | "verify" | "admin";
export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

export interface Metric {
  label: string;
  value: string;
  detail: string;
  tone: Tone;
}

export interface ActionItem {
  title: string;
  detail: string;
  due: string;
  tone: Tone;
}

export interface RecordItem {
  id: string;
  section: string;
  title: string;
  subtitle: string;
  status: string;
  trust: string;
  source: string;
  owner: string;
  updated: string;
  expires: string;
  access: string;
  evidence: string;
  responsibilities?: string[];
  skills?: string[];
  metadata?: Record<string, unknown>;
  sensitivity?: string;
  consentRequired?: boolean;
  tone: Tone;
  progress: number;
  timeline: Array<{
    label: string;
    detail: string;
    date: string;
  }>;
}

export interface NavItem {
  label: string;
  icon: LucideIcon;
}

export interface Workspace {
  id: WorkspaceId;
  label: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  role: string;
  organization: string;
  readiness: number;
  heroLabel: string;
  heroValue: string;
  heroDetail: string;
  metrics: Metric[];
  actions: ActionItem[];
  nav: NavItem[];
  records: RecordItem[];
}

const passportRecords: RecordItem[] = [
  {
    id: "identity",
    section: "Identity",
    title: "Verified professional identity",
    subtitle: "Identity provider check completed with audit trail",
    status: "Identity-confirmed",
    trust: "Third-party verified",
    source: "Persona identity workflow",
    owner: "Professional",
    updated: "Verified Jul 18, 2026",
    expires: "Recheck in 11 months",
    access: "Status visible in approved shares; raw ID restricted",
    evidence: "Provider reference, verification timestamp, restricted document metadata",
    tone: "success",
    progress: 100,
    timeline: [
      { label: "Disclosure accepted", detail: "Identity verification terms accepted", date: "Jul 18" },
      { label: "Provider completed", detail: "Identity-confirmed result received", date: "Jul 18" },
      { label: "Audit sealed", detail: "Verification Event created", date: "Jul 18" }
    ]
  },
  {
    id: "rn-license",
    section: "Licenses",
    title: "Registered Nurse License",
    subtitle: "Illinois license with issuer confirmation",
    status: "Current",
    trust: "Issuer-confirmed",
    source: "Illinois Board of Nursing",
    owner: "Professional-controlled record",
    updated: "Last checked Jul 22, 2026",
    expires: "May 31, 2027",
    access: "Included in healthcare readiness shares",
    evidence: "Board lookup, license image, verification timestamp",
    tone: "success",
    progress: 94,
    timeline: [
      { label: "Added", detail: "Professional entered license record", date: "Jun 22" },
      { label: "Verified", detail: "Issuer-confirmed by board lookup", date: "Jul 22" },
      { label: "Shared", detail: "Included in Northstar Health preview", date: "Today" }
    ]
  },
  {
    id: "bls",
    section: "Certifications",
    title: "Basic Life Support Certification",
    subtitle: "Document-supported, renewal needed soon",
    status: "Expiring soon",
    trust: "Document-supported",
    source: "American Heart Association certificate",
    owner: "Professional-controlled record",
    updated: "Uploaded Jun 18, 2026",
    expires: "Aug 17, 2026",
    access: "Visible to authorized employers",
    evidence: "Certificate PDF accepted; issuer recheck pending",
    tone: "warning",
    progress: 68,
    timeline: [
      { label: "Uploaded", detail: "Certificate document accepted", date: "Jun 18" },
      { label: "Classified", detail: "Credential expiration extracted", date: "Jun 18" },
      { label: "Reminder", detail: "Renewal task created", date: "Today" }
    ]
  },
  {
    id: "work",
    section: "Work Record",
    title: "CityCare Medical Center",
    subtitle: "RN, Emergency Department, 2023-2026",
    status: "Partially verified",
    trust: "Employer-confirmed",
    source: "CityCare HR confirmation",
    owner: "Professional and employer-confirmed fields",
    updated: "Confirmed Jul 20, 2026",
    expires: "No expiration; freshness shown",
    access: "Shared only through active Access Grant",
    evidence: "Employer confirmed dates and title; responsibilities pending",
    tone: "info",
    progress: 78,
    timeline: [
      { label: "Submitted", detail: "Employment record created", date: "Jun 20" },
      { label: "Confirmed", detail: "Dates and title confirmed by employer", date: "Jul 20" },
      { label: "Pending", detail: "Responsibilities awaiting confirmation", date: "Today" }
    ]
  },
  {
    id: "reference",
    section: "References",
    title: "Dana Lee structured reference",
    subtitle: "Former nurse manager attestation",
    status: "Submitted",
    trust: "Authenticated attestation",
    source: "Reference Provider",
    owner: "Reference Provider contribution",
    updated: "Submitted Jul 23, 2026",
    expires: "Stale after 18 months",
    access: "Hidden until Professional approves sharing",
    evidence: "Provider email, relationship attestation, structured response",
    tone: "success",
    progress: 91,
    timeline: [
      { label: "Invited", detail: "Reference request delivered", date: "Jul 21" },
      { label: "Verified", detail: "Provider relationship attested", date: "Jul 22" },
      { label: "Submitted", detail: "Structured reference received", date: "Jul 23" }
    ]
  }
];

export const workspaces: Workspace[] = [
  {
    id: "passport",
    label: "Passport",
    eyebrow: "Professional workspace",
    title: "Maya Patel's TrustGraph Passport",
    subtitle: "One verified workforce record for identity, work, credentials, references, compliance, and sharing.",
    role: "Professional",
    organization: "Personal workspace",
    readiness: 84,
    heroLabel: "Passport readiness",
    heroValue: "84%",
    heroDetail: "Ready for healthcare staffing review; 2 renewal tasks need action.",
    metrics: [
      { label: "Verified records", value: "18", detail: "Across identity, work, credentials", tone: "success" },
      { label: "Expiring soon", value: "2", detail: "BLS and annual compliance", tone: "warning" },
      { label: "Access grants", value: "4", detail: "2 active, 2 pending", tone: "info" },
      { label: "Audit events", value: "126", detail: "Views, changes, verification", tone: "neutral" }
    ],
    actions: [
      { title: "Renew BLS certification", detail: "Upload renewed certificate or connect issuer.", due: "22 days", tone: "warning" },
      { title: "Approve Northstar Health access", detail: "Request includes identity, work, credentials, and compliance.", due: "Today", tone: "info" },
      { title: "Confirm ED responsibilities", detail: "CityCare confirmed title and dates; duties are pending.", due: "5 days", tone: "neutral" }
    ],
    nav: [
      { label: "Identity", icon: Fingerprint },
      { label: "Work Record", icon: BriefcaseBusiness },
      { label: "Licenses", icon: BadgeCheck },
      { label: "References", icon: UserCheck },
      { label: "Compliance", icon: FileCheck2 },
      { label: "Sharing", icon: KeyRound },
      { label: "Activity", icon: Activity }
    ],
    records: passportRecords
  },
  {
    id: "verify",
    label: "Verify",
    eyebrow: "Employer and agency workspace",
    title: "Healthcare readiness command center",
    subtitle: "Review authorized Passports, monitor credential currency, and resolve missing records without overexposing sensitive data.",
    role: "Employer Reviewer",
    organization: "Northstar Health",
    readiness: 76,
    heroLabel: "Roster readiness",
    heroValue: "76%",
    heroDetail: "14 active shared profiles; 6 records need candidate or issuer action.",
    metrics: [
      { label: "Shared profiles", value: "14", detail: "Active Access Grants", tone: "info" },
      { label: "Ready candidates", value: "9", detail: "No blocking gaps", tone: "success" },
      { label: "Missing records", value: "7", detail: "Compliance and training", tone: "warning" },
      { label: "Restricted items", value: "3", detail: "Legal-reviewed visibility", tone: "danger" }
    ],
    actions: [
      { title: "Review Maya Patel's Passport", detail: "Access approved for 14 days with Evidence limits.", due: "Now", tone: "success" },
      { title: "Complete work confirmations", detail: "5 employer confirmations are waiting for scoped field review.", due: "2 days", tone: "warning" },
      { title: "Request TB screening documents", detail: "7 candidates are missing facility-required evidence.", due: "This week", tone: "info" }
    ],
    nav: [
      { label: "Professionals", icon: Network },
      { label: "Access Requests", icon: KeyRound },
      { label: "Shared Profiles", icon: UserCheck },
      { label: "Verification Queue", icon: ClipboardCheck },
      { label: "Credential Monitoring", icon: FileClock },
      { label: "Reports", icon: Archive },
      { label: "Audit Activity", icon: Activity }
    ],
    records: [
      {
        ...passportRecords[1],
        id: "shared-maya",
        section: "Shared Profile",
        title: "Maya Patel, RN",
        subtitle: "Identity-confirmed Passport shared for ED contract review",
        status: "Review ready",
        trust: "Access Grant active",
        source: "Professional-approved share",
        access: "Expires Aug 9, 2026; downloads limited",
        progress: 88
      },
      {
        id: "missing-tb",
        section: "Missing Records",
        title: "TB screening document",
        subtitle: "Required by facility readiness policy",
        status: "Missing",
        trust: "No evidence",
        source: "Facility checklist",
        owner: "Professional-controlled upload",
        updated: "Detected today",
        expires: "Required before placement",
        access: "Request only; no sensitive document present",
        evidence: "No Evidence Document uploaded",
        tone: "warning",
        progress: 24,
        timeline: [
          { label: "Detected", detail: "Policy checklist found missing item", date: "Today" },
          { label: "Queued", detail: "Missing-record request drafted", date: "Today" }
        ]
      }
    ]
  },
  {
    id: "admin",
    label: "Admin",
    eyebrow: "TrustGraph operations",
    title: "Verification and trust operations",
    subtitle: "Resolve verification exceptions, document reviews, disputes, fraud signals, and policy-controlled admin work.",
    role: "TrustGraph Verifier",
    organization: "TrustGraph Operations",
    readiness: 68,
    heroLabel: "Operations health",
    heroValue: "68%",
    heroDetail: "Stable queue; verification exceptions and fraud signals need review.",
    metrics: [
      { label: "Verification cases", value: "18", detail: "6 high priority", tone: "warning" },
      { label: "Fraud signals", value: "2", detail: "Reason-coded access", tone: "danger" },
      { label: "Document reviews", value: "31", detail: "11 need classification", tone: "info" },
      { label: "Policy changes", value: "4", detail: "Pending review", tone: "neutral" }
    ],
    actions: [
      { title: "Resolve license mismatch", detail: "Issuer lookup conflicts with uploaded credential image.", due: "SLA 6h", tone: "warning" },
      { title: "Review suspicious employer domain", detail: "Confirmation domain differs from approved organization.", due: "Now", tone: "danger" },
      { title: "Classify compliance documents", detail: "Malware scan passed; document type review pending.", due: "Today", tone: "info" }
    ],
    nav: [
      { label: "Operations", icon: ShieldCheck },
      { label: "Verification Cases", icon: ClipboardCheck },
      { label: "Fraud Cases", icon: ShieldAlert },
      { label: "Documents", icon: FileCheck2 },
      { label: "Audit Logs", icon: Activity },
      { label: "Policies", icon: LockKeyhole },
      { label: "AI Governance", icon: Sparkles }
    ],
    records: [
      {
        id: "license-mismatch",
        section: "Verification Case",
        title: "License source mismatch",
        subtitle: "Uploaded document and board lookup disagree",
        status: "Under review",
        trust: "Conflicting evidence",
        source: "Issuer lookup and Evidence Document",
        owner: "TrustGraph Verifier",
        updated: "Opened 38 minutes ago",
        expires: "SLA 6 hours",
        access: "Admin only; reason code required for Evidence",
        evidence: "Identifier mismatch between source and uploaded document",
        tone: "warning",
        progress: 42,
        timeline: [
          { label: "Flagged", detail: "Conflict detected during verification", date: "Today" },
          { label: "Assigned", detail: "Case assigned to verifier", date: "Today" }
        ]
      },
      {
        id: "domain-signal",
        section: "Fraud Case",
        title: "Suspicious employer confirmation domain",
        subtitle: "Confirmation source differs from approved employer domain",
        status: "Restricted",
        trust: "Fraud signal",
        source: "System-generated risk signal",
        owner: "Compliance Administrator",
        updated: "Flagged today",
        expires: "No expiration",
        access: "Reason-coded admin access only",
        evidence: "Domain pattern, invitation metadata, and audit trail",
        tone: "danger",
        progress: 18,
        timeline: [
          { label: "Detected", detail: "Fraud signal created", date: "Today" },
          { label: "Restricted", detail: "Evidence locked pending review", date: "Today" }
        ]
      }
    ]
  }
];
