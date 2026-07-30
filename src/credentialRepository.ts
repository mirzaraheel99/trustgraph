import type { DbIssuerCredential, DbOrganizationMembership, RecordType } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

export type IssuerCredentialRecordType = Extract<
  RecordType,
  "license" | "certification" | "education" | "training" | "continuing_education" | "health_clearance" | "custom"
>;

export async function loadIssuerCredentials(organizationId: string, accessToken: string): Promise<DbIssuerCredential[]> {
  return supabaseRest<DbIssuerCredential[]>(
    [
      `trust_records?issuer_organization_id=eq.${encodeURIComponent(organizationId)}`,
      "select=*,owner_profile:profiles!trust_records_owner_profile_id_fkey(id,full_name,email),issuer_organization:organizations!trust_records_issuer_organization_id_fkey(id,name,type)",
      "order=created_at.desc"
    ].join("&"),
    { accessToken }
  );
}

export async function ensureCredentialIssuerMembership(accessToken: string) {
  return supabaseRpc<DbOrganizationMembership>("ensure_credential_issuer_membership", {}, { accessToken });
}

export async function issueCredentialRecord(input: {
  accessToken: string;
  subjectEmail: string;
  subjectFullName: string;
  credentialType: IssuerCredentialRecordType;
  title: string;
  evidenceSummary: string;
  issuedAt?: string;
  expiresAt?: string;
}): Promise<DbIssuerCredential> {
  return supabaseRpc<DbIssuerCredential>(
    "issue_credential_record",
    {
      subject_email: input.subjectEmail,
      subject_full_name: input.subjectFullName,
      credential_type: input.credentialType,
      credential_title: input.title,
      evidence_summary: input.evidenceSummary,
      issued_at: input.issuedAt || null,
      expires_at: input.expiresAt || null
    },
    { accessToken: input.accessToken }
  );
}

export async function revokeIssuerCredential(input: {
  accessToken: string;
  credentialId: string;
  reason?: string;
}): Promise<DbIssuerCredential> {
  return supabaseRpc<DbIssuerCredential>(
    "revoke_issuer_credential",
    {
      credential_id: input.credentialId,
      revoke_reason: input.reason || null
    },
    { accessToken: input.accessToken }
  );
}
