import type { RecordItem, Tone, WorkspaceId } from "./data";
import type {
  DbIssuerCredential,
  DbMissingRecordRequest,
  DbNotificationEvent,
  DbReferenceRequest,
  DbVerificationCase
} from "./database";
import type { AccessGrantView, VerifyAccessGrantView } from "./grantRepository";

export interface AdvisorySignal {
  label: string;
  value: string;
  tone: Tone;
}

export interface AdvisorySummary {
  headline: string;
  detail: string;
  signals: AdvisorySignal[];
  nextActions: string[];
  sourceMix: AdvisorySignal[];
  sourceCount: number;
}

function countBy<T>(items: T[], predicate: (item: T) => boolean) {
  return items.reduce((count, item) => (predicate(item) ? count + 1 : count), 0);
}

function toneForRisk(blockers: number, warnings: number): Tone {
  if (blockers > 0) return "danger";
  if (warnings > 0) return "warning";
  return "success";
}

export function buildAdvisorySummary(input: {
  workspaceId: WorkspaceId;
  records: RecordItem[];
  accessGrants: AccessGrantView[];
  verifyRequests: VerifyAccessGrantView[];
  operationsCases: DbVerificationCase[];
  referenceRequests: DbReferenceRequest[];
  issuerCredentials: DbIssuerCredential[];
  missingRecordRequests: DbMissingRecordRequest[];
  notificationEvents: DbNotificationEvent[];
}): AdvisorySummary {
  const warningRecords = countBy(input.records, (record) => record.tone === "warning");
  const dangerRecords = countBy(input.records, (record) => record.tone === "danger");
  const pendingGrants = countBy(input.accessGrants, (grant) => grant.status === "requested");
  const submittedReferences = countBy(input.referenceRequests, (request) => request.status === "submitted");
  const missingOpen = countBy(input.missingRecordRequests, (request) =>
    ["requested", "in_progress"].includes(request.status)
  );
  const casesOpen = countBy(input.operationsCases, (item) => !["resolved", "dismissed"].includes(item.status));
  const highCases = countBy(input.operationsCases, (item) => ["high", "critical"].includes(item.priority));
  const unreadNotifications = countBy(input.notificationEvents, (event) => event.status === "queued");
  const issuedCredentials = input.issuerCredentials.length;
  const sharedProfiles = input.verifyRequests.length;
  const blockers = dangerRecords + highCases;
  const warnings = warningRecords + pendingGrants + missingOpen + casesOpen + unreadNotifications;

  if (input.workspaceId === "admin") {
    return {
      headline: highCases ? "High-priority operations work needs review" : "Operations queue is stable",
      detail: highCases
        ? "Prioritize critical and high verification cases before routine document classification."
        : "No high-priority operations signal is visible in the current authorized queue.",
      signals: [
        { label: "Open cases", value: String(casesOpen), tone: toneForRisk(highCases, casesOpen) },
        { label: "High priority", value: String(highCases), tone: highCases ? "danger" : "success" },
        { label: "Notifications", value: String(unreadNotifications), tone: unreadNotifications ? "warning" : "success" }
      ],
      nextActions: [
        highCases ? "Open the highest-priority verification case first." : "Review recent audit events for unusual activity.",
        casesOpen ? "Move stale cases into review or resolution." : "Seed sample cases only when testing operations flows.",
        unreadNotifications ? "Mark handled notifications as read." : "Keep notification queue clear."
      ],
      sourceMix: [
        { label: "Records", value: String(input.records.length), tone: "info" },
        { label: "Cases", value: String(input.operationsCases.length), tone: casesOpen ? "warning" : "success" },
        { label: "Notifications", value: String(input.notificationEvents.length), tone: unreadNotifications ? "warning" : "success" }
      ],
      sourceCount: input.records.length + input.operationsCases.length + input.notificationEvents.length
    };
  }

  if (input.workspaceId === "verify") {
    return {
      headline: missingOpen ? "Resolve missing records before placement decisions" : "Verify workspace has no missing-record blockers",
      detail: missingOpen
        ? "Request only the missing documents needed for the active role or compliance workflow."
        : "Shared profiles and issued credentials can be reviewed without new missing-record requests.",
      signals: [
        { label: "Shared profiles", value: String(sharedProfiles), tone: sharedProfiles ? "info" : "neutral" },
        { label: "Missing records", value: String(missingOpen), tone: missingOpen ? "warning" : "success" },
        { label: "Issued credentials", value: String(issuedCredentials), tone: issuedCredentials ? "success" : "neutral" }
      ],
      nextActions: [
        missingOpen ? "Follow up on open missing-record requests." : "Review the latest shared Passport records.",
        issuedCredentials ? "Audit newly issued credentials for issuer context." : "Create an issuer role when credential workflows are needed.",
        unreadNotifications ? "Clear handled Verify notifications." : "Keep Verify inbox clean."
      ],
      sourceMix: [
        { label: "Shared", value: String(input.verifyRequests.length), tone: sharedProfiles ? "info" : "neutral" },
        { label: "Credentials", value: String(input.issuerCredentials.length), tone: issuedCredentials ? "success" : "neutral" },
        { label: "Gaps", value: String(input.missingRecordRequests.length), tone: missingOpen ? "warning" : "success" }
      ],
      sourceCount:
        input.records.length +
        input.verifyRequests.length +
        input.issuerCredentials.length +
        input.missingRecordRequests.length
    };
  }

  return {
    headline: blockers ? "Passport has restricted or high-risk items" : warnings ? "Passport needs a few follow-ups" : "Passport is ready for scoped sharing",
    detail: blockers
      ? "Resolve restricted or disputed records before expanding access."
      : warnings
        ? "Handle expiring records, pending grants, or queued requests to improve readiness."
        : "Current authorized records show no obvious blocker in this workspace.",
    signals: [
      { label: "Records reviewed", value: String(input.records.length), tone: "info" },
      { label: "Warnings", value: String(warningRecords + pendingGrants + missingOpen), tone: warnings ? "warning" : "success" },
      { label: "References", value: String(submittedReferences), tone: submittedReferences ? "success" : "neutral" }
    ],
    nextActions: [
      pendingGrants ? "Review pending Access Grants." : "Keep Access Grants scoped and current.",
      warningRecords ? "Update expiring or partially verified records." : "Maintain current evidence coverage.",
      missingOpen ? "Respond to missing-record requests." : "No missing-record request is blocking the current Passport."
    ],
    sourceMix: [
      { label: "Records", value: String(input.records.length), tone: "info" },
      { label: "Grants", value: String(input.accessGrants.length), tone: pendingGrants ? "warning" : "success" },
      { label: "References", value: String(input.referenceRequests.length), tone: submittedReferences ? "success" : "neutral" }
    ],
    sourceCount:
      input.records.length +
      input.accessGrants.length +
      input.referenceRequests.length +
      input.missingRecordRequests.length +
      input.notificationEvents.length
  };
}
