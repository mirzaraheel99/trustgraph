import type { DbMissingRecordRequest, MissingRecordRequestStatus, RecordType } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

const missingRecordSelect =
  "select=*,subject_profile:profiles!missing_record_requests_subject_profile_id_fkey(id,full_name,email),requester_organization:organizations!missing_record_requests_requester_organization_id_fkey(id,name,type)";

export async function loadVerifyMissingRecordRequests(
  organizationId: string,
  accessToken: string
): Promise<DbMissingRecordRequest[]> {
  return supabaseRest<DbMissingRecordRequest[]>(
    [
      `missing_record_requests?requester_organization_id=eq.${encodeURIComponent(organizationId)}`,
      missingRecordSelect,
      "order=created_at.desc"
    ].join("&"),
    { accessToken }
  );
}

export async function loadPassportMissingRecordRequests(profileId: string, accessToken: string): Promise<DbMissingRecordRequest[]> {
  return supabaseRest<DbMissingRecordRequest[]>(
    [
      `missing_record_requests?subject_profile_id=eq.${encodeURIComponent(profileId)}`,
      missingRecordSelect,
      "order=created_at.desc"
    ].join("&"),
    { accessToken }
  );
}

export async function createMissingRecordRequest(input: {
  accessToken: string;
  subjectEmail: string;
  subjectFullName: string;
  recordType: RecordType;
  title: string;
  reason: string;
  dueAt?: string;
}): Promise<DbMissingRecordRequest> {
  return supabaseRpc<DbMissingRecordRequest>(
    "create_missing_record_request",
    {
      subject_email: input.subjectEmail,
      subject_full_name: input.subjectFullName,
      requested_record_type: input.recordType,
      request_title: input.title,
      request_reason: input.reason,
      due_at: input.dueAt || null
    },
    { accessToken: input.accessToken }
  );
}

export async function markMissingRecordRequestStatus(input: {
  accessToken: string;
  requestId: string;
  status: MissingRecordRequestStatus;
  fulfilledRecordId?: string;
}): Promise<DbMissingRecordRequest> {
  return supabaseRpc<DbMissingRecordRequest>(
    "mark_missing_record_request_status",
    {
      target_request_id: input.requestId,
      next_status: input.status,
      fulfilled_trust_record_id: input.fulfilledRecordId || null
    },
    { accessToken: input.accessToken }
  );
}
