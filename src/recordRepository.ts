import type { RecordItem, Tone } from "./data";
import type {
  DbCorporateVisiblePassportRow,
  DbTrustRecord,
  DbVerificationCase,
  RecordStatus,
  RecordType,
  TrustRecordSensitivity
} from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

const recordTypeLabels: Record<RecordType, string> = {
  identity: "Identity",
  employment: "Work Record",
  contract_assignment: "Contract Assignment",
  education: "Education",
  license: "Licenses",
  certification: "Certifications",
  reference: "References",
  background_check: "Background Check",
  training: "Training",
  skill: "Skills",
  performance_review: "Performance Review",
  continuing_education: "Continuing Education",
  health_clearance: "Health Clearance",
  custom: "Custom"
};

const statusTone: Record<DbTrustRecord["status"], Tone> = {
  draft: "neutral",
  pending_verification: "warning",
  verified: "success",
  expired: "warning",
  disputed: "danger",
  revoked: "danger",
  restricted: "danger"
};

function statusLabel(status: DbTrustRecord["status"]) {
  return status.replace(/_/g, " ");
}

function sensitivityLabel(sensitivity: TrustRecordSensitivity) {
  return sensitivity.replace(/_/g, " ");
}

function dateLabel(value: string | null) {
  if (!value) return "No expiration";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function metadataList(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function parseList(value?: string) {
  return (value ?? "").split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

export function trustRecordToRecordItem(record: DbTrustRecord): RecordItem {
  const createdDate = dateLabel(record.created_at);
  const issuedDate = record.issued_at ? dateLabel(record.issued_at) : createdDate;
  const responsibilities = metadataList(record.metadata, "responsibilities");
  const skills = metadataList(record.metadata, "skills");
  const structuredSummary = responsibilities.length
    ? `${record.evidence_summary || `${recordTypeLabels[record.type]} record from ${record.source_name}`} Responsibilities: ${responsibilities.slice(0, 3).join("; ")}`
    : record.evidence_summary || `${recordTypeLabels[record.type]} record from ${record.source_name}`;

  return {
    id: record.id,
    ownerProfileId: record.owner_profile_id,
    section: recordTypeLabels[record.type],
    title: record.title,
    subtitle: structuredSummary,
    status: statusLabel(record.status),
    trust: record.status === "verified" ? "Self-entered verified status" : "Self-entered",
    source: record.source_name,
    owner: "Professional-controlled record",
    updated: `Created ${createdDate}`,
    expires: record.expires_at ? dateLabel(record.expires_at) : "No expiration",
    expiresAt: record.expires_at,
    access: "Private until shared through an Access Grant",
    evidence: record.evidence_summary || "Evidence details pending",
    responsibilities,
    skills,
    metadata: record.metadata,
    sensitivity: sensitivityLabel(record.sensitivity ?? "standard"),
    consentRequired: Boolean(record.consent_required),
    tone: statusTone[record.status],
    progress: record.status === "verified" ? 84 : 38,
    timeline: [
      {
        label: "Created",
        detail: "Professional added record to live Supabase Passport",
        date: createdDate
      },
      {
        label: "Issued",
        detail: record.issued_at ? "Issue date captured" : "Issue date not provided",
        date: issuedDate
      }
    ]
  };
}

export async function loadPassportRecords(profileId: string, accessToken: string): Promise<RecordItem[]> {
  const records = await supabaseRest<DbTrustRecord[]>(
    [
      `trust_records?owner_profile_id=eq.${encodeURIComponent(profileId)}`,
      "select=*",
      "order=created_at.desc"
    ].join("&"),
    { accessToken }
  );

  return records.map(trustRecordToRecordItem);
}

export async function loadSharedVerifyRecords(accessToken: string): Promise<RecordItem[]> {
  const rows = await supabaseRpc<DbCorporateVisiblePassportRow[]>(
    "list_corporate_visible_passport_rows",
    {
      input_organization_id: null
    },
    { accessToken }
  );

  return rows.map((row) => {
    const record = trustRecordToRecordItem({
      id: row.trust_record_id,
      owner_profile_id: row.subject_profile_id,
      issuer_organization_id: null,
      type: row.record_type,
      title: row.record_title,
      status: row.record_status,
      source_name: row.source_name,
      evidence_summary: row.evidence_summary,
      issued_at: row.issued_at,
      expires_at: row.expires_at,
      metadata: {
        ...row.record_metadata,
        corporate_visible_passport_row: true,
        access_grant_id: row.access_grant_id,
        requester_organization_id: row.requester_organization_id,
        subject_email: row.subject_email,
        subject_full_name: row.subject_full_name,
        consent_status: row.consent_status,
        visibility_scope: row.visibility_scope,
        raw_private_files_included: row.raw_private_files_included,
        preview_data_accepted: row.preview_data_accepted,
        accepted_when: row.accepted_when
      },
      created_at: row.record_created_at,
      updated_at: row.record_updated_at,
      sensitivity: row.record_sensitivity,
      consent_required: row.consent_required
    });

    return {
      ...record,
      owner: row.subject_full_name || row.subject_email || "Shared professional",
      access: row.access_expires_at ? `Shared until ${dateLabel(row.access_expires_at)}` : "Approved Access Grant",
      trust: row.record_status === "verified" ? "Scoped corporate visible row" : "Scoped Passport row"
    };
  });
}

export async function createPassportRecord(input: {
  profileId: string;
  accessToken: string;
  type: RecordType;
  title: string;
  sourceName: string;
  evidenceSummary?: string;
  issuedAt?: string;
  expiresAt?: string;
  sensitivity: TrustRecordSensitivity;
  consentRequired: boolean;
  responsibilities?: string;
  skills?: string;
  metadata?: Record<string, unknown>;
}): Promise<RecordItem> {
  const metadata = {
    ...(input.metadata ?? {}),
    responsibilities: parseList(input.responsibilities),
    skills: parseList(input.skills),
    structured_scope: "job_responsibilities_and_skills"
  };
  const [record] = await supabaseRest<DbTrustRecord[]>("trust_records", {
    method: "POST",
    accessToken: input.accessToken,
    body: JSON.stringify({
      owner_profile_id: input.profileId,
      type: input.type,
      title: input.title,
      status: "draft",
      source_name: input.sourceName,
      evidence_summary: input.evidenceSummary || null,
      sensitivity: input.sensitivity,
      consent_required: input.consentRequired,
      issued_at: input.issuedAt || null,
      expires_at: input.expiresAt || null,
      metadata
    })
  });

  return trustRecordToRecordItem(record);
}

export async function updatePassportRecord(input: {
  recordId: string;
  accessToken: string;
  title: string;
  sourceName: string;
  evidenceSummary?: string;
  issuedAt?: string;
  expiresAt?: string;
  status: RecordStatus;
  sensitivity: TrustRecordSensitivity;
  consentRequired: boolean;
  responsibilities?: string;
  skills?: string;
  metadata?: Record<string, unknown>;
}): Promise<RecordItem> {
  const metadata = {
    ...(input.metadata ?? {}),
    responsibilities: parseList(input.responsibilities),
    skills: parseList(input.skills),
    structured_scope: "job_responsibilities_and_skills"
  };
  const [record] = await supabaseRest<DbTrustRecord[]>(`trust_records?id=eq.${encodeURIComponent(input.recordId)}`, {
    method: "PATCH",
    accessToken: input.accessToken,
    body: JSON.stringify({
      title: input.title,
      source_name: input.sourceName,
      evidence_summary: input.evidenceSummary || null,
      issued_at: input.issuedAt || null,
      expires_at: input.expiresAt || null,
      status: input.status,
      sensitivity: input.sensitivity,
      consent_required: input.consentRequired,
      metadata
    })
  });

  return trustRecordToRecordItem(record);
}

export async function openRecordDispute(input: {
  recordId: string;
  disputeReason: string;
  requestedCorrection: string;
  accessToken: string;
}): Promise<DbVerificationCase> {
  return supabaseRpc<DbVerificationCase>(
    "open_record_dispute",
    {
      target_record_id: input.recordId,
      dispute_reason: input.disputeReason,
      requested_correction: input.requestedCorrection
    },
    { accessToken: input.accessToken }
  );
}
