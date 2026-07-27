import type { RecordItem, Tone } from "./data";
import type { DbAccessGrant, DbTrustRecord, RecordStatus, RecordType, TrustRecordSensitivity } from "./database";
import { supabaseRest } from "./supabase";

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

export function trustRecordToRecordItem(record: DbTrustRecord): RecordItem {
  const createdDate = dateLabel(record.created_at);
  const issuedDate = record.issued_at ? dateLabel(record.issued_at) : createdDate;

  return {
    id: record.id,
    section: recordTypeLabels[record.type],
    title: record.title,
    subtitle: record.evidence_summary || `${recordTypeLabels[record.type]} record from ${record.source_name}`,
    status: statusLabel(record.status),
    trust: record.status === "verified" ? "Self-entered verified status" : "Self-entered",
    source: record.source_name,
    owner: "Professional-controlled record",
    updated: `Created ${createdDate}`,
    expires: record.expires_at ? dateLabel(record.expires_at) : "No expiration",
    access: "Private until shared through an Access Grant",
    evidence: record.evidence_summary || "Evidence details pending",
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
  const rows = await supabaseRest<
    {
      access_grant: DbAccessGrant;
      trust_record: DbTrustRecord;
    }[]
  >(
    [
      "access_grant_records?select=access_grant:access_grants!inner(*),trust_record:trust_records!inner(*)",
      "access_grant.status=eq.approved"
    ].join("&"),
    { accessToken }
  );

  return rows.map(({ access_grant: grant, trust_record: record }) => ({
    ...trustRecordToRecordItem(record),
    owner: "Shared with Verify workspace",
    access: grant.expires_at ? `Shared until ${dateLabel(grant.expires_at)}` : "Approved Access Grant",
    trust: record.status === "verified" ? "Shared verified record" : "Shared Passport record"
  }));
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
}): Promise<RecordItem> {
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
      expires_at: input.expiresAt || null
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
}): Promise<RecordItem> {
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
      consent_required: input.consentRequired
    })
  });

  return trustRecordToRecordItem(record);
}
