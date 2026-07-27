import type { DbEvidenceDocument } from "./database";
import { supabaseRest, supabaseRpc, supabaseStorageUpload } from "./supabase";

const EVIDENCE_BUCKET = "trustgraph-evidence";

export async function loadEvidenceDocuments(accessToken: string, recordId?: string): Promise<DbEvidenceDocument[]> {
  const path = recordId
    ? `evidence_documents?trust_record_id=eq.${encodeURIComponent(recordId)}&select=*&order=created_at.desc`
    : "evidence_documents?select=*&order=created_at.desc&limit=12";

  return supabaseRest<DbEvidenceDocument[]>(path, { accessToken });
}

export async function createEvidenceDocument(input: {
  accessToken: string;
  recordId: string;
  title: string;
  documentType: string;
  sourceName: string;
  evidenceSummary: string;
  storagePath?: string;
}): Promise<DbEvidenceDocument> {
  return supabaseRpc<DbEvidenceDocument>(
    "create_evidence_document",
    {
      target_record_id: input.recordId,
      document_title: input.title,
      document_type: input.documentType,
      source_name: input.sourceName,
      evidence_summary: input.evidenceSummary,
      storage_path: input.storagePath || null
    },
    { accessToken: input.accessToken }
  );
}

export async function uploadEvidenceFile(input: {
  accessToken: string;
  profileId: string;
  recordId: string;
  file: File;
}): Promise<string> {
  const safeName = input.file.name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
  const path = `${input.profileId}/${input.recordId}/${crypto.randomUUID()}-${safeName || "evidence-file"}`;

  const uploaded = await supabaseStorageUpload({
    bucket: EVIDENCE_BUCKET,
    path,
    file: input.file,
    accessToken: input.accessToken
  });

  return uploaded.path || path;
}
