import type { DbEvidenceDocument } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

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
}): Promise<DbEvidenceDocument> {
  return supabaseRpc<DbEvidenceDocument>(
    "create_evidence_document",
    {
      target_record_id: input.recordId,
      document_title: input.title,
      document_type: input.documentType,
      source_name: input.sourceName,
      evidence_summary: input.evidenceSummary
    },
    { accessToken: input.accessToken }
  );
}
