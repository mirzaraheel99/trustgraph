import type { RecordItem, Tone } from "./data";
import type { DbOrganizationMembership, DbVerificationCase, VerificationCaseStatus } from "./database";
import { supabaseRest, supabaseRpc } from "./supabase";

const priorityTone: Record<DbVerificationCase["priority"], Tone> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  critical: "danger"
};

function formatDate(value: string | null) {
  if (!value) return "No SLA";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(
    new Date(value)
  );
}

function label(value: string) {
  return value.replace(/_/g, " ");
}

export function verificationCaseToRecordItem(item: DbVerificationCase): RecordItem {
  return {
    id: item.id,
    section: label(item.case_type),
    title: item.title,
    subtitle: item.summary,
    status: label(item.status),
    trust: `${label(item.priority)} priority`,
    source: item.reason_code,
    owner: item.assigned_to_profile_id ? "Assigned operations case" : "Unassigned operations case",
    updated: `Updated ${formatDate(item.updated_at)}`,
    expires: item.due_at ? `SLA ${formatDate(item.due_at)}` : "No SLA",
    access: "TrustGraph operations roles only",
    evidence: item.resolution_note || item.summary,
    tone: item.status === "resolved" ? "success" : priorityTone[item.priority],
    progress: item.status === "resolved" ? 100 : item.status === "in_review" ? 58 : item.status === "restricted" ? 24 : 38,
    timeline: [
      {
        label: "Opened",
        detail: item.reason_code,
        date: formatDate(item.created_at)
      },
      {
        label: "Updated",
        detail: item.status === "resolved" ? "Resolution captured" : "Operations review active",
        date: formatDate(item.updated_at)
      }
    ]
  };
}

export async function loadVerificationCases(accessToken: string): Promise<DbVerificationCase[]> {
  return supabaseRest<DbVerificationCase[]>(
    "verification_cases?select=*&order=priority.desc,created_at.desc",
    { accessToken }
  );
}

export async function createOperatorVerificationCases(accessToken: string): Promise<number> {
  try {
    return await supabaseRpc<number>("create_pilot_verification_cases", {}, { accessToken });
  } catch (error) {
    if (!isMissingPilotAliasRpc(error, "create_pilot_verification_cases")) {
      throw error;
    }
    return supabaseRpc<number>("create_operator_verification_cases", {}, { accessToken });
  }
}

export async function ensureTrustGraphVerifierMembership(accessToken: string) {
  try {
    return await supabaseRpc<DbOrganizationMembership>("ensure_pilot_trustgraph_verifier_membership", {}, { accessToken });
  } catch (error) {
    if (!isMissingPilotAliasRpc(error, "ensure_pilot_trustgraph_verifier_membership")) {
      throw error;
    }
    return supabaseRpc<DbOrganizationMembership>("ensure_trustgraph_verifier_membership", {}, { accessToken });
  }
}

function isMissingPilotAliasRpc(error: unknown, functionName: string) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes(`Could not find the function public.${functionName}`)
    || message.includes(`function public.${functionName}`)
    || message.includes("PGRST202");
}

export async function decideVerificationCase(input: {
  caseId: string;
  status: VerificationCaseStatus;
  resolution: string;
  accessToken: string;
}): Promise<DbVerificationCase> {
  return supabaseRpc<DbVerificationCase>(
    "decide_verification_case",
    {
      target_case_id: input.caseId,
      next_status: input.status,
      resolution: input.resolution
    },
    { accessToken: input.accessToken }
  );
}
