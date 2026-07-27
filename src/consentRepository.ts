import type { DbConsentAuthorization } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

export async function loadConsentAuthorizations(accessToken: string): Promise<DbConsentAuthorization[]> {
  return supabaseRest<DbConsentAuthorization[]>(
    [
      "consent_authorizations?select=*,requester_organization:organizations(id,name,type)",
      "order=created_at.desc"
    ].join("&"),
    { accessToken }
  );
}

export async function createConsentAuthorization(input: {
  accessToken: string;
  requesterOrganizationId: string | null;
  trustRecordId: string | null;
  purpose: string;
  scope: string[];
  expiresAt?: string;
}) {
  return supabaseRpc<DbConsentAuthorization>(
    "create_consent_authorization",
    {
      requester_organization_id: input.requesterOrganizationId,
      trust_record_id: input.trustRecordId,
      consent_purpose: input.purpose,
      consent_scope: input.scope,
      expires_at: input.expiresAt || null
    },
    { accessToken: input.accessToken }
  );
}

export async function revokeConsentAuthorization(input: {
  accessToken: string;
  consentId: string;
  reason?: string;
}) {
  return supabaseRpc<DbConsentAuthorization>(
    "revoke_consent_authorization",
    {
      target_consent_id: input.consentId,
      revoke_reason: input.reason || null
    },
    { accessToken: input.accessToken }
  );
}
