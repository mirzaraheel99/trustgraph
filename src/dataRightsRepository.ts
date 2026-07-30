import type { DbDataRightsRequest, DataRightsRequestStatus, DataRightsRequestType } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

export async function loadDataRightsRequests(accessToken: string): Promise<DbDataRightsRequest[]> {
  return supabaseRest<DbDataRightsRequest[]>("data_rights_requests?select=*&order=created_at.desc&limit=8", {
    accessToken
  });
}

export async function requestDataRightsAction(input: {
  accessToken: string;
  requestType: DataRightsRequestType;
  requestedScope: string;
  reason: string;
}): Promise<DbDataRightsRequest> {
  return supabaseRpc<DbDataRightsRequest>(
    "request_data_rights_action",
    {
      action_type: input.requestType,
      requested_scope: input.requestedScope,
      request_reason: input.reason
    },
    { accessToken: input.accessToken }
  );
}

export async function markDataRightsRequestStatus(input: {
  accessToken: string;
  requestId: string;
  status: DataRightsRequestStatus;
  reviewerNote: string;
}): Promise<DbDataRightsRequest> {
  return supabaseRpc<DbDataRightsRequest>(
    "mark_data_rights_request_status",
    {
      target_request_id: input.requestId,
      next_status: input.status,
      status_note: input.reviewerNote
    },
    { accessToken: input.accessToken }
  );
}
