import type {
  DbDataExportPackage,
  DbDataExportPackageReceipt,
  DbDataRightsRequest,
  DataRightsRequestStatus,
  DataRightsRequestType
} from "./database";
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

export async function loadDataExportPackageReceipts(accessToken: string): Promise<DbDataExportPackageReceipt[]> {
  return supabaseRest<DbDataExportPackageReceipt[]>(
    "data_export_package_receipts?select=*&order=created_at.desc&limit=5",
    { accessToken }
  );
}

export async function recordDataExportPackageReceipt(input: {
  accessToken: string;
  dataRightsRequestId: string | null;
  status: DbDataExportPackageReceipt["status"];
  requestedScope: string;
  passportRecordCount: number;
  evidenceMetadataCount: number;
  accessGrantCount: number;
  auditEventCount: number;
  metadata: Record<string, unknown>;
}): Promise<DbDataExportPackageReceipt> {
  return supabaseRpc<DbDataExportPackageReceipt>(
    "record_data_export_package_receipt",
    {
      input_data_rights_request_id: input.dataRightsRequestId,
      input_status: input.status,
      input_requested_scope: input.requestedScope,
      input_passport_record_count: input.passportRecordCount,
      input_evidence_metadata_count: input.evidenceMetadataCount,
      input_access_grant_count: input.accessGrantCount,
      input_audit_event_count: input.auditEventCount,
      input_metadata: input.metadata
    },
    { accessToken: input.accessToken }
  );
}

export async function loadDataExportPackages(accessToken: string): Promise<DbDataExportPackage[]> {
  return supabaseRest<DbDataExportPackage[]>(
    "data_export_packages?select=*&order=created_at.desc&limit=5",
    { accessToken }
  );
}

export async function generateDataExportPackage(input: {
  accessToken: string;
  dataRightsRequestId: string;
  packageReceiptId: string | null;
  packageScope: string;
  passportRecordCount: number;
  evidenceMetadataCount: number;
  accessGrantCount: number;
  auditEventCount: number;
  manifest: Record<string, unknown>;
}): Promise<DbDataExportPackage> {
  return supabaseRpc<DbDataExportPackage>(
    "generate_data_export_package",
    {
      input_data_rights_request_id: input.dataRightsRequestId,
      input_package_receipt_id: input.packageReceiptId,
      input_package_scope: input.packageScope,
      input_passport_record_count: input.passportRecordCount,
      input_evidence_metadata_count: input.evidenceMetadataCount,
      input_access_grant_count: input.accessGrantCount,
      input_audit_event_count: input.auditEventCount,
      input_manifest: input.manifest
    },
    { accessToken: input.accessToken }
  );
}

export async function markDataExportPackageDownloaded(input: {
  accessToken: string;
  packageId: string;
}): Promise<DbDataExportPackage> {
  return supabaseRpc<DbDataExportPackage>(
    "mark_data_export_package_downloaded",
    { input_package_id: input.packageId },
    { accessToken: input.accessToken }
  );
}
