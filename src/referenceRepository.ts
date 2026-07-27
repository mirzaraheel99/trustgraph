import type { DbReferenceRequest, ReferenceRequestStatus } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

export async function loadReferenceRequests(accessToken: string): Promise<DbReferenceRequest[]> {
  return supabaseRest<DbReferenceRequest[]>("reference_requests?select=*&order=created_at.desc&limit=12", {
    accessToken
  });
}

export async function createReferenceRequest(input: {
  accessToken: string;
  providerName: string;
  providerEmail: string;
  relationship: string;
  message: string;
}): Promise<DbReferenceRequest> {
  return supabaseRpc<DbReferenceRequest>(
    "create_reference_request",
    {
      provider_name: input.providerName,
      provider_email: input.providerEmail,
      relationship: input.relationship,
      request_message: input.message
    },
    { accessToken: input.accessToken }
  );
}

export async function markReferenceRequestStatus(input: {
  accessToken: string;
  requestId: string;
  status: ReferenceRequestStatus;
  summary?: string;
}): Promise<DbReferenceRequest> {
  return supabaseRpc<DbReferenceRequest>(
    "mark_reference_request_status",
    {
      target_request_id: input.requestId,
      next_status: input.status,
      summary: input.summary || null
    },
    { accessToken: input.accessToken }
  );
}
