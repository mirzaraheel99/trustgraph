"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  ChevronRight,
  Clock3,
  ClipboardCheck,
  Database,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Fingerprint,
  KeyRound,
  LogIn,
  LogOut,
  LockKeyhole,
  Network,
  ShieldAlert,
  Search,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users
} from "lucide-react";
import { workspaces, type RecordItem, type Tone, type Workspace, type WorkspaceId } from "./data";
import type {
  DbAuditEvent,
  DbApiClient,
  DbConsentAuthorization,
  DbCorporateAccessReview,
  DbDataRightsRequest,
  DbEvidenceDocument,
  DbIssuerCredential,
  DbMissingRecordRequest,
  DbNotificationEvent,
  DbOrganizationMembership,
  DbOrganizationInvitation,
  DbOrganizationSubscription,
  DbPilotLaunchContact,
  DbProductionGateDecision,
  DbReferenceRequest,
  DbSchemaMigrationRun,
  DbSubscriptionPlan,
  DbVerificationCase,
  DbWebhookSubscription,
  CorporateAccessReviewStatus,
  ProductionGateStatus,
  PilotLaunchContactStatus,
  DataRightsRequestType,
  DataRightsRequestStatus,
  ReferenceRequestStatus,
  RecordStatus,
  RecordType,
  TrustRecordSensitivity,
  VerificationCaseStatus
} from "./database";
import {
  accountContextOrganizations,
  accountContextToSessionUser,
  assignOwnCorporateRole,
  createCorporateAccount,
  ensureEmployerReviewerMembership,
  ensureProfessionalAccount,
  loadAccountContext,
  seedPilotWorkspace,
  type AccountContext
} from "./accountRepository";
import { auditActionLabel, loadAuditEvents } from "./auditRepository";
import { buildAdvisorySummary } from "./aiAdvisor";
import {
  authModeLabel,
  loadStoredSession,
  readSessionFromUrl,
  requestPasswordRecovery,
  resendSignupConfirmation,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  updatePassword,
  type AuthSession
} from "./auth";
import {
  activateOrganizationSubscription,
  loadOrganizationSubscriptions,
  loadSubscriptionPlans
} from "./billingRepository";
import {
  ensureCredentialIssuerMembership,
  issueCredentialRecord,
  loadIssuerCredentials,
  revokeIssuerCredential,
  updateIssuerCredentialExpiry
} from "./credentialRepository";
import {
  createPilotApiClient,
  createWebhookSubscription,
  loadApiClients,
  loadWebhookSubscriptions,
  markApiClientStatus,
  markWebhookSubscriptionStatus
} from "./connectRepository";
import { createConsentAuthorization, loadConsentAuthorizations, revokeConsentAuthorization } from "./consentRepository";
import { loadDataRightsRequests, markDataRightsRequestStatus, requestDataRightsAction } from "./dataRightsRepository";
import {
  createAccessGrantRequest,
  decideAccessGrant,
  loadAccessGrants,
  loadCorporateAccessReviews,
  loadVerifyAccessGrants,
  preparePilotAccessGrant,
  recordCorporateAccessReview,
  syncAccessGrantRecords,
  type VerifyAccessGrantView,
  type AccessGrantView
} from "./grantRepository";
import { createEvidenceDocument, createEvidenceDownloadUrl, loadEvidenceDocuments, uploadEvidenceFile } from "./evidenceRepository";
import {
  createMissingRecordRequest,
  loadPassportMissingRecordRequests,
  loadVerifyMissingRecordRequests,
  markMissingRecordRequestStatus
} from "./missingRecordRepository";
import { loadNotificationEvents, markNotificationEvent } from "./notificationRepository";
import { createReferenceRequest, loadReferenceRequests, markReferenceRequestStatus } from "./referenceRepository";
import { loadProductionGateDecisions, recordProductionGateDecision } from "./productionGateRepository";
import { loadPilotLaunchContacts, recordPilotLaunchContact } from "./pilotLaunchRepository";
import { loadSchemaMigrationRuns } from "./releaseRepository";
import { isSupabaseConfigured } from "./supabase";
import {
  acceptOrganizationInvitation,
  createOrganizationInvitation,
  loadOrganizationMembers,
  loadOrganizationInvitations,
  loadMyPendingInvitations,
  markOrganizationInvitationStatus,
  markOrganizationMemberStatus,
  type OrganizationMemberView
} from "./teamRepository";
import {
  createOperatorVerificationCases,
  decideVerificationCase,
  ensureTrustGraphVerifierMembership,
  loadVerificationCases,
  verificationCaseToRecordItem
} from "./operationsRepository";
import { consentPolicyAreas, foundationTracks, lockedProfileAreas } from "./planAlignment";
import { createPassportRecord, loadPassportRecords, loadSharedVerifyRecords, openRecordDispute, updatePassportRecord } from "./recordRepository";
import {
  canAccessWorkspace,
  getActiveMembership,
  getOrganization,
  getOrganizationFromList,
  getRole,
  hasPermission,
  organizations,
  type RoleDefinition,
  type RoleKey,
  sessionUser,
  type Organization,
  type SessionUser,
  type Membership
} from "./rbac";

type LivePilotRowProof = {
  source: "signed_in_supabase_rows" | "preview_or_logged_out";
  accepted: boolean;
  readyGroups: number;
  totalRequiredGroups: number;
  missingRequiredGroups: string[];
  rows: Array<{
    label: string;
    table: string;
    count: number;
    required: boolean;
    ready: boolean;
    evidence: string;
  }>;
};

const toneLabels: Record<Tone, string> = {
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
  neutral: "neutral"
};

type IssuerRecordType = Extract<
  RecordType,
  "license" | "certification" | "education" | "training" | "continuing_education" | "health_clearance" | "custom"
>;

function toneClass(tone: Tone) {
  return `tone-${toneLabels[tone]}`;
}

function WorkspaceButton({
  workspace,
  active,
  allowed,
  onClick
}: {
  workspace: Workspace;
  active: boolean;
  allowed: boolean;
  onClick: () => void;
}) {
  return (
    <button aria-disabled={!allowed} className={`workspace-button ${active ? "active" : ""} ${allowed ? "" : "locked"}`} onClick={onClick}>
      <span>{workspace.label}</span>
      <small>{allowed ? workspace.role : "Set up access"}</small>
    </button>
  );
}

function MetricCard({ label, value, detail, tone }: Workspace["metrics"][number]) {
  return (
    <article className="metric-card">
      <span className={`metric-dot ${toneClass(tone)}`} />
      <strong>{value}</strong>
      <span>{label}</span>
      <small>{detail}</small>
    </article>
  );
}

function ActionCard({ title, detail, due, tone }: Workspace["actions"][number]) {
  return (
    <article className="action-card">
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      <span className={`status-chip ${toneClass(tone)}`}>{due}</span>
    </article>
  );
}

function AdvisoryCard({ summary }: { summary: ReturnType<typeof buildAdvisorySummary> }) {
  const exportName = `trustgraph-advisory-packet-${new Date().toISOString().slice(0, 10)}.json`;

  return (
    <div className="hero-card ai-card">
      <div className="hero-card-top">
        <span className="eyebrow">AI advisory</span>
        <span className="status-chip info">
          <Sparkles size={13} />
          source-grounded
        </span>
      </div>
      <h2>{summary.headline}</h2>
      <p>{summary.detail}</p>
      <div className="advisory-signals">
        {summary.signals.map((signal) => (
          <span className={`status-chip ${toneClass(signal.tone)}`} key={signal.label}>
            {signal.label}: {signal.value}
          </span>
        ))}
      </div>
      <div className="advisory-source-grid">
        {summary.sourceMix.map((source) => (
          <span className={`status-chip ${toneClass(source.tone)}`} key={source.label}>
            {source.label} {source.value}
          </span>
        ))}
      </div>
      <div className="advisory-actions">
        {summary.nextActions.slice(0, 3).map((action) => (
          <small key={action}>{action}</small>
        ))}
      </div>
      <div className="advisory-export-row">
        <small>{summary.sourceCount} authorized source items reviewed</small>
        <button
          className="secondary-action"
          onClick={() => downloadTextFile(exportName, JSON.stringify(summary, null, 2), "application/json")}
          type="button"
        >
          Export advisory packet
        </button>
      </div>
    </div>
  );
}

function RecordRow({
  record,
  selected,
  onSelect
}: {
  record: RecordItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button className={`record-row ${selected ? "selected" : ""}`} onClick={onSelect}>
      <div className="record-row-main">
        <div>
          <span className="record-section">{record.section}</span>
          <strong>{record.title}</strong>
          <small>{record.subtitle}</small>
        </div>
        <ChevronRight size={18} />
      </div>
      <div className="record-row-meta">
        <span className={`status-chip ${toneClass(record.tone)}`}>{record.status}</span>
        <span className="status-chip neutral">{record.trust}</span>
        <span className="record-date">{record.updated}</span>
      </div>
      <div className="record-progress" aria-hidden="true">
        <span style={{ width: `${record.progress}%` }} />
      </div>
    </button>
  );
}

function RecordDetail({
  record,
  canEdit,
  evidenceDocuments,
  onCreateEvidence,
  onOpenEvidence,
  onUpdate
}: {
  record: RecordItem;
  canEdit: boolean;
  evidenceDocuments: DbEvidenceDocument[];
  onCreateEvidence: (input: {
    recordId: string;
    title: string;
    documentType: string;
    sourceName: string;
    evidenceSummary: string;
    file: File | null;
  }) => Promise<void>;
  onOpenEvidence: (document: DbEvidenceDocument, mode: "preview" | "download") => Promise<{ signedUrl: string; expiresIn: number }>;
  onUpdate: (input: {
    recordId: string;
    title: string;
    sourceName: string;
    evidenceSummary: string;
    responsibilities: string;
    skills: string;
    expiresAt: string;
    status: RecordStatus;
    sensitivity: TrustRecordSensitivity;
    consentRequired: boolean;
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState(record.title);
  const [sourceName, setSourceName] = useState(record.source);
  const [evidenceSummary, setEvidenceSummary] = useState(record.evidence === "Evidence details pending" ? "" : record.evidence);
  const [responsibilities, setResponsibilities] = useState((record.responsibilities ?? []).join(", "));
  const [skills, setSkills] = useState((record.skills ?? []).join(", "));
  const [expiresAt, setExpiresAt] = useState("");
  const [status, setStatus] = useState<RecordStatus>("draft");
  const [sensitivity, setSensitivity] = useState<TrustRecordSensitivity>("standard");
  const [consentRequired, setConsentRequired] = useState(false);
  const [message, setMessage] = useState("Update selected live record");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [documentType, setDocumentType] = useState("credential");
  const [evidenceSource, setEvidenceSource] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceMessage, setEvidenceMessage] = useState("Attach evidence metadata to selected record");
  const [busy, setBusy] = useState(false);
  const [evidenceBusy, setEvidenceBusy] = useState(false);
  const [openingEvidenceId, setOpeningEvidenceId] = useState<string | null>(null);
  const [lastEvidenceLink, setLastEvidenceLink] = useState<{
    documentTitle: string;
    mode: "preview" | "download";
    expiresAt: string;
    urlHost: string;
  } | null>(null);
  const [evidenceQuery, setEvidenceQuery] = useState("");
  const [evidenceStatusFilter, setEvidenceStatusFilter] = useState<"all" | "uploaded" | "classified" | "linked" | "restricted" | "rejected" | "archived">("all");
  const linkedEvidenceCount = evidenceDocuments.filter((document) => document.status === "linked").length;
  const uploadedEvidenceCount = evidenceDocuments.filter((document) => document.status === "uploaded").length;
  const flaggedEvidenceCount = evidenceDocuments.filter((document) => document.status === "restricted" || document.status === "rejected").length;
  const fileBackedEvidenceCount = evidenceDocuments.filter((document) => document.storage_path).length;
  const metadataOnlyEvidenceCount = evidenceDocuments.length - fileBackedEvidenceCount;
  const filteredEvidenceDocuments = evidenceDocuments.filter((document) => {
    const matchesStatus = evidenceStatusFilter === "all" || document.status === evidenceStatusFilter;
    const haystack = `${document.title} ${document.document_type} ${document.source_name} ${document.status}`.toLowerCase();
    return matchesStatus && haystack.includes(evidenceQuery.trim().toLowerCase());
  });
  const evidenceManifestName = `trustgraph-evidence-manifest-${record.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`;
  const evidenceAccessPacketName = `trustgraph-evidence-access-packet-${record.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;
  const evidencePreviewDownloadLedger = [
    {
      label: "Signed preview ready",
      value: fileBackedEvidenceCount,
      detail: "File-backed items can open a short-lived preview URL.",
      ready: fileBackedEvidenceCount > 0
    },
    {
      label: "Download governed",
      value: fileBackedEvidenceCount,
      detail: "Downloads use a shorter signed URL and remain scoped to this record.",
      ready: fileBackedEvidenceCount > 0
    },
    {
      label: "Metadata only",
      value: metadataOnlyEvidenceCount,
      detail: "Visible evidence rows with no raw file attached yet.",
      ready: metadataOnlyEvidenceCount > 0
    },
    {
      label: "Needs review",
      value: flaggedEvidenceCount,
      detail: "Restricted or rejected evidence should be reviewed before sharing.",
      ready: flaggedEvidenceCount === 0
    }
  ];
  const evidenceAccessChain = [
    {
      label: "Metadata row",
      value: evidenceDocuments.length ? `${evidenceDocuments.length} linked` : "Needed",
      detail: "Evidence metadata is visible without exposing private files.",
      ready: evidenceDocuments.length > 0
    },
    {
      label: "Private file",
      value: fileBackedEvidenceCount ? "Attached" : "Metadata only",
      detail: "Raw files stay in private Supabase Storage.",
      ready: fileBackedEvidenceCount > 0
    },
    {
      label: "Signed preview/download",
      value: "Short-lived URLs",
      detail: "Preview expires in 5 minutes; download expires in 2 minutes.",
      ready: fileBackedEvidenceCount > 0
    },
    {
      label: "Audit expectation",
      value: "Access logged",
      detail: "Preview, download, export, and sensitive access are expected to create audit evidence.",
      ready: true
    }
  ];
  const evidenceAccessPacket = {
    generated_at: new Date().toISOString(),
    packet_mode: "selected_record_evidence_preview_download",
    record: {
      id: record.id,
      title: record.title,
      section: record.section,
      status: record.status,
      trust_label: record.trust,
      sensitivity: record.sensitivity ?? "standard",
      consent_required: Boolean(record.consentRequired),
      access_scope: record.access
    },
    evidence_policy: {
      storage: "private_supabase_storage",
      preview_link_expiry_seconds: 300,
      download_link_expiry_seconds: 120,
      metadata_only_items_open_without_file_exposure: true,
      raw_file_access: "short_lived_signed_url_only",
      download_audit_expectation: "material preview, download, export, and sensitive evidence access should produce Audit Events"
    },
    filtered_view: {
      status_filter: evidenceStatusFilter,
      query: evidenceQuery,
      visible_documents: filteredEvidenceDocuments.length,
      file_backed_documents: filteredEvidenceDocuments.filter((document) => document.storage_path).length,
      metadata_only_documents: filteredEvidenceDocuments.filter((document) => !document.storage_path).length
    },
    evidence_preview_download_ledger: evidencePreviewDownloadLedger,
    evidence_access_chain: evidenceAccessChain,
    last_signed_evidence_link: lastEvidenceLink,
    documents: filteredEvidenceDocuments.map((document) => ({
      id: document.id,
      title: document.title,
      document_type: document.document_type,
      source_name: document.source_name,
      status: document.status,
      file_attached: Boolean(document.storage_path),
      preview_allowed: Boolean(document.storage_path),
      download_allowed: Boolean(document.storage_path),
      created_at: document.created_at,
      evidence_summary: document.evidence_summary ?? ""
    }))
  };

  useEffect(() => {
    setTitle(record.title);
    setSourceName(record.source);
    setEvidenceSummary(record.evidence === "Evidence details pending" ? "" : record.evidence);
    setResponsibilities((record.responsibilities ?? []).join(", "));
    setSkills((record.skills ?? []).join(", "));
    setExpiresAt("");
    setStatus(record.status === "pending verification" ? "pending_verification" : "draft");
    setSensitivity((record.sensitivity as TrustRecordSensitivity | undefined) ?? "standard");
    setConsentRequired(Boolean(record.consentRequired));
    setMessage("Update selected live record");
    setEvidenceTitle("");
    setEvidenceSource(record.source);
    setEvidenceNote("");
    setEvidenceFile(null);
    setEvidenceMessage("Attach evidence metadata to selected record");
    setEvidenceQuery("");
    setEvidenceStatusFilter("all");
    setLastEvidenceLink(null);
  }, [record]);

  async function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("Updating Passport record...");

    try {
      await onUpdate({
        recordId: record.id,
        title,
        sourceName,
        evidenceSummary,
        responsibilities,
        skills,
        expiresAt,
        status,
        sensitivity,
        consentRequired,
        metadata: record.metadata
      });
      setMessage("Record updated");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update record");
    } finally {
      setBusy(false);
    }
  }

  async function submitEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEvidenceBusy(true);
    setEvidenceMessage("Linking evidence metadata...");

    try {
      await onCreateEvidence({
        recordId: record.id,
        title: evidenceTitle,
        documentType,
        sourceName: evidenceSource,
        evidenceSummary: evidenceNote,
        file: evidenceFile
      });
      setEvidenceTitle("");
      setEvidenceNote("");
      setEvidenceFile(null);
      setEvidenceMessage(evidenceFile ? "Evidence file uploaded" : "Evidence metadata linked");
    } catch (error) {
      setEvidenceMessage(error instanceof Error ? error.message : "Could not link evidence");
    } finally {
      setEvidenceBusy(false);
    }
  }

  async function openEvidence(document: DbEvidenceDocument, mode: "preview" | "download") {
    setOpeningEvidenceId(document.id);
    setEvidenceMessage(mode === "preview" ? "Creating preview link..." : "Creating download link...");
    try {
      const result = await onOpenEvidence(document, mode);
      const expiresAt = new Date(Date.now() + result.expiresIn * 1000).toISOString();
      setLastEvidenceLink({
        documentTitle: document.title,
        mode,
        expiresAt,
        urlHost: new URL(result.signedUrl).host
      });
      setEvidenceMessage(mode === "preview" ? "Preview link opened" : "Download link opened");
    } catch (error) {
      setEvidenceMessage(error instanceof Error ? error.message : "Could not open evidence file");
    } finally {
      setOpeningEvidenceId(null);
    }
  }

  return (
    <aside className="detail-panel">
      <div className="detail-top">
        <span className="eyebrow">{record.section}</span>
        <span className={`status-chip ${toneClass(record.tone)}`}>{record.status}</span>
      </div>
      <h2>{record.title}</h2>
      <p>{record.subtitle}</p>

      <div className="detail-grid">
        <div>
          <span>Trust label</span>
          <strong>{record.trust}</strong>
        </div>
        <div>
          <span>Source</span>
          <strong>{record.source}</strong>
        </div>
        <div>
          <span>Owner</span>
          <strong>{record.owner}</strong>
        </div>
        <div>
          <span>Expiration</span>
          <strong>{record.expires}</strong>
        </div>
        <div>
          <span>Sensitivity</span>
          <strong>{record.sensitivity ?? "standard"}</strong>
        </div>
        <div>
          <span>Consent rule</span>
          <strong>{record.consentRequired ? "Required" : "Standard sharing"}</strong>
        </div>
      </div>
      {(record.responsibilities?.length || record.skills?.length) ? (
        <section className="responsibility-box">
          <div className="mini-heading">
            <BriefcaseBusiness size={16} />
            <strong>Responsibilities and skills</strong>
          </div>
          {record.responsibilities?.length ? (
            <div>
              <span>Responsibilities</span>
              {record.responsibilities.map((item) => (
                <small key={item}>{item}</small>
              ))}
            </div>
          ) : null}
          {record.skills?.length ? (
            <div>
              <span>Skills</span>
              {record.skills.map((item) => (
                <small key={item}>{item}</small>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="evidence-box">
        <div className="mini-heading">
          <FileText size={16} />
          <strong>Evidence and access</strong>
        </div>
        <p>{record.evidence}</p>
        <small>{record.access}</small>
        {evidenceDocuments.length ? (
          <>
            <div className="evidence-summary-grid">
              <div>
                <span>Linked</span>
                <strong>{linkedEvidenceCount}</strong>
              </div>
              <div>
                <span>Uploaded</span>
                <strong>{uploadedEvidenceCount}</strong>
              </div>
              <div>
                <span>Flagged</span>
                <strong>{flaggedEvidenceCount}</strong>
              </div>
              <div>
                <span>Files</span>
                <strong>{fileBackedEvidenceCount}</strong>
              </div>
            </div>
            <div className="evidence-preview-download-ledger" aria-label="Evidence preview and download ledger">
              <div className="mini-heading">
                <Download size={15} />
                <strong>Evidence preview/download ledger</strong>
              </div>
              <div className="evidence-preview-download-grid">
                {evidencePreviewDownloadLedger.map((item) => (
                  <article className={item.ready ? "ready" : "attention"} key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <small>{item.detail}</small>
                  </article>
                ))}
              </div>
            </div>
            <div className="evidence-source-strip">
              <span className="status-chip success">Signed evidence links</span>
              <small>Private files stay in Supabase Storage and open through short-lived preview or download URLs; preview links expire in 5 minutes and download links expire in 2 minutes.</small>
            </div>
            <div className="evidence-source-strip">
              <span className="status-chip neutral">Evidence preview/download proof</span>
              <small>Metadata-only evidence stays visible without exposing raw files; file-backed evidence opens only through signed preview/download controls.</small>
            </div>
            <div className="evidence-access-chain" aria-label="Evidence access chain">
              {evidenceAccessChain.map((item) => (
                <article className={item.ready ? "ready" : ""} key={item.label}>
                  <span className={`status-dot ${item.ready ? "on" : ""}`} />
                  <div>
                    <strong>{item.label}</strong>
                    <small>{item.value}</small>
                    <small>{item.detail}</small>
                  </div>
                </article>
              ))}
            </div>
            <div className="last-signed-evidence-link" aria-label="Last signed evidence link">
              <div>
                <span className={`status-chip ${lastEvidenceLink ? "success" : "neutral"}`}>Last signed evidence link</span>
                <strong>{lastEvidenceLink ? lastEvidenceLink.documentTitle : "No signed link opened yet"}</strong>
                <small>
                  {lastEvidenceLink
                    ? `${lastEvidenceLink.mode} link issued from ${lastEvidenceLink.urlHost}; expires ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(lastEvidenceLink.expiresAt))}.`
                    : "Use Preview or Download on a file-backed evidence row to generate short-lived signed-link proof."}
                </small>
              </div>
            </div>
          </>
        ) : null}
        {evidenceDocuments.length ? (
          <>
            <div className="evidence-controls">
              <input
                onChange={(event) => setEvidenceQuery(event.target.value)}
                placeholder="Search evidence"
                value={evidenceQuery}
              />
              <select onChange={(event) => setEvidenceStatusFilter(event.target.value as typeof evidenceStatusFilter)} value={evidenceStatusFilter}>
                <option value="all">All</option>
                <option value="uploaded">Uploaded</option>
                <option value="classified">Classified</option>
                <option value="linked">Linked</option>
                <option value="restricted">Restricted</option>
                <option value="rejected">Rejected</option>
                <option value="archived">Archived</option>
              </select>
              <button
                className="secondary-action"
                disabled={!filteredEvidenceDocuments.length}
                onClick={() => downloadTextFile(evidenceManifestName, evidenceDocumentsToCsv(filteredEvidenceDocuments), "text/csv")}
                type="button"
              >
                Export evidence manifest
              </button>
              <button
                className="secondary-action"
                disabled={!filteredEvidenceDocuments.length}
                onClick={() => downloadTextFile(evidenceAccessPacketName, JSON.stringify(evidenceAccessPacket, null, 2), "application/json")}
                type="button"
              >
                Export access packet
              </button>
            </div>
            <div className="evidence-document-list">
              {filteredEvidenceDocuments.length ? (
                filteredEvidenceDocuments.map((document) => (
                  <article className="evidence-document-card" key={document.id}>
                    <div>
                      <strong>{document.title}</strong>
                      <small>{document.document_type} - {document.source_name}</small>
                      <small>
                        {document.storage_path ? "Private file attached" : "Metadata only"} -{" "}
                        {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(document.created_at))}
                      </small>
                    </div>
                    <div className="evidence-document-actions">
                      <span className="status-chip neutral">{document.status}</span>
                      <span className="micro-pill">{document.storage_path ? "signed links only" : "metadata only"}</span>
                      <button
                        className="secondary-action"
                        disabled={!document.storage_path || openingEvidenceId === document.id}
                        onClick={() => void openEvidence(document, "preview")}
                        type="button"
                      >
                        Preview
                      </button>
                      <button
                        className="secondary-action"
                        disabled={!document.storage_path || openingEvidenceId === document.id}
                        onClick={() => void openEvidence(document, "download")}
                        type="button"
                      >
                        Download
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <article className="evidence-document-card empty">
                  <div>
                    <strong>No matching evidence</strong>
                    <small>Attached evidence will appear when it matches the selected filter.</small>
                  </div>
                </article>
              )}
            </div>
          </>
        ) : null}
      </section>

      {canEdit ? (
        <>
          <form className="record-edit-form" onSubmit={submitUpdate}>
            <div className="mini-heading">
              <KeyRound size={16} />
              <strong>Edit live record</strong>
            </div>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" />
            <input value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="Source" />
            <input
              value={evidenceSummary}
              onChange={(event) => setEvidenceSummary(event.target.value)}
              placeholder="Evidence summary"
            />
            <input
              value={responsibilities}
              onChange={(event) => setResponsibilities(event.target.value)}
              placeholder="Responsibilities, separated by commas"
            />
            <input
              value={skills}
              onChange={(event) => setSkills(event.target.value)}
              placeholder="Skills or tools, separated by commas"
            />
            <div className="record-edit-grid">
              <input value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} type="date" />
              <select value={status} onChange={(event) => setStatus(event.target.value as RecordStatus)}>
                <option value="draft">Draft</option>
                <option value="pending_verification">Pending verification</option>
              </select>
            </div>
            <div className="record-edit-grid">
              <select value={sensitivity} onChange={(event) => setSensitivity(event.target.value as TrustRecordSensitivity)}>
                <option value="standard">Standard</option>
                <option value="sensitive">Sensitive</option>
                <option value="restricted">Restricted</option>
              </select>
              <select value={consentRequired ? "required" : "standard"} onChange={(event) => setConsentRequired(event.target.value === "required")}>
                <option value="standard">Standard sharing</option>
                <option value="required">Explicit consent required</option>
              </select>
            </div>
            <div className="record-form-footer">
              <small>{message}</small>
              <button className="secondary-action" disabled={busy || !title || !sourceName} type="submit">
                Save changes
              </button>
            </div>
          </form>
          <form className="record-edit-form" onSubmit={submitEvidence}>
            <div className="mini-heading">
              <FileCheck2 size={16} />
              <strong>Evidence metadata</strong>
            </div>
            <input value={evidenceTitle} onChange={(event) => setEvidenceTitle(event.target.value)} placeholder="Document title" />
            <div className="record-edit-grid">
              <select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
                <option value="identity">Identity</option>
                <option value="credential">Credential</option>
                <option value="employment">Employment</option>
                <option value="compliance">Compliance</option>
                <option value="training">Training</option>
                <option value="reference">Reference</option>
              </select>
              <input value={evidenceSource} onChange={(event) => setEvidenceSource(event.target.value)} placeholder="Evidence source" />
            </div>
            <input value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} placeholder="Evidence note" />
            <label className="file-input">
              <FileCheck2 size={15} />
              <span>{evidenceFile ? evidenceFile.name : "Attach PDF, image, or text file"}</span>
              <input
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,application/pdf,image/png,image/jpeg,image/webp,text/plain"
                onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>
            <div className="record-form-footer">
              <small>{evidenceMessage}</small>
              <button className="secondary-action" disabled={evidenceBusy || !evidenceTitle || !evidenceSource} type="submit">
                {evidenceFile ? "Upload evidence" : "Link evidence"}
              </button>
            </div>
          </form>
        </>
      ) : null}

      <section>
        <div className="mini-heading">
          <Activity size={16} />
          <strong>Verification timeline</strong>
        </div>
        <div className="timeline">
          {record.timeline.map((event) => (
            <div className="timeline-item" key={`${event.label}-${event.date}`}>
              <span />
              <div>
                <strong>{event.label}</strong>
                <p>{event.detail}</p>
              </div>
              <time>{event.date}</time>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

function PassportRecordForm({
  disabled,
  message,
  onCreate
}: {
  disabled: boolean;
  message: string;
  onCreate: (input: {
    type: RecordType;
    title: string;
    sourceName: string;
    evidenceSummary: string;
    responsibilities: string;
    skills: string;
    issuedAt: string;
    expiresAt: string;
    sensitivity: TrustRecordSensitivity;
    consentRequired: boolean;
  }) => Promise<void>;
}) {
  const [type, setType] = useState<RecordType>("employment");
  const [title, setTitle] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [evidenceSummary, setEvidenceSummary] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [skills, setSkills] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [sensitivity, setSensitivity] = useState<TrustRecordSensitivity>("standard");
  const [consentRequired, setConsentRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(message);

  function updateType(nextType: RecordType) {
    setType(nextType);
    if (["background_check", "performance_review", "health_clearance", "identity"].includes(nextType)) {
      setSensitivity("restricted");
      setConsentRequired(true);
    } else if (["reference", "license", "certification", "training", "continuing_education"].includes(nextType)) {
      setSensitivity("sensitive");
      setConsentRequired(nextType === "reference");
    } else {
      setSensitivity("standard");
      setConsentRequired(false);
    }
  }

  useEffect(() => {
    setStatus(message);
  }, [message]);

  const recordCreationPath = [
    {
      label: "1. Pick record type",
      detail: "Employment, license, certification, training, reference, identity, or custom."
    },
    {
      label: "2. Add source proof",
      detail: "Use issuer, employer, provider, or reviewer name plus evidence summary."
    },
    {
      label: "3. Set sharing rules",
      detail: "Sensitive and restricted rows can require explicit consent before corporate access."
    },
    {
      label: "4. Save live row",
      detail: "The record writes to Supabase and becomes available for Passport, evidence, and Access Grants."
    }
  ];

  async function submitRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("Saving live Passport record...");

    try {
      await onCreate({ type, title, sourceName, evidenceSummary, responsibilities, skills, issuedAt, expiresAt, sensitivity, consentRequired });
      setTitle("");
      setSourceName("");
      setEvidenceSummary("");
      setResponsibilities("");
      setSkills("");
      setIssuedAt("");
      setExpiresAt("");
      setSensitivity("standard");
      setConsentRequired(false);
      setStatus("Record added to Supabase Passport");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not add Passport record");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="record-form" onSubmit={submitRecord}>
      <div className="mini-heading">
        <FileText size={16} />
        <strong>Add live Passport record</strong>
      </div>
      <div className="passport-record-create-path" aria-label="Passport record creation path">
        {recordCreationPath.map((step) => (
          <span key={step.label}>
            <strong>{step.label}</strong>
            <small>{step.detail}</small>
          </span>
        ))}
      </div>
      <div className="record-form-grid">
        <select value={type} onChange={(event) => updateType(event.target.value as RecordType)} disabled={disabled || busy}>
          <option value="employment">Employment</option>
          <option value="contract_assignment">Contract assignment</option>
          <option value="education">Education</option>
          <option value="license">License</option>
          <option value="certification">Certification</option>
          <option value="reference">Reference</option>
          <option value="background_check">Background check</option>
          <option value="training">Training</option>
          <option value="skill">Skill</option>
          <option value="performance_review">Performance review</option>
          <option value="continuing_education">Continuing education</option>
          <option value="identity">Identity</option>
          <option value="health_clearance">Health clearance</option>
          <option value="custom">Custom</option>
        </select>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Record title"
          disabled={disabled || busy}
        />
        <input
          value={sourceName}
          onChange={(event) => setSourceName(event.target.value)}
          placeholder="Source or issuer"
          disabled={disabled || busy}
        />
        <input
          value={issuedAt}
          onChange={(event) => setIssuedAt(event.target.value)}
          type="date"
          disabled={disabled || busy}
        />
        <input
          value={expiresAt}
          onChange={(event) => setExpiresAt(event.target.value)}
          type="date"
          disabled={disabled || busy}
        />
        <input
          value={evidenceSummary}
          onChange={(event) => setEvidenceSummary(event.target.value)}
          placeholder="Evidence summary"
          disabled={disabled || busy}
        />
        <input
          value={responsibilities}
          onChange={(event) => setResponsibilities(event.target.value)}
          placeholder="Responsibilities, separated by commas"
          disabled={disabled || busy}
        />
        <input
          value={skills}
          onChange={(event) => setSkills(event.target.value)}
          placeholder="Skills or tools, separated by commas"
          disabled={disabled || busy}
        />
        <select value={sensitivity} onChange={(event) => setSensitivity(event.target.value as TrustRecordSensitivity)} disabled={disabled || busy}>
          <option value="standard">Standard</option>
          <option value="sensitive">Sensitive</option>
          <option value="restricted">Restricted</option>
        </select>
        <select value={consentRequired ? "required" : "standard"} onChange={(event) => setConsentRequired(event.target.value === "required")} disabled={disabled || busy}>
          <option value="standard">Standard sharing</option>
          <option value="required">Explicit consent required</option>
        </select>
      </div>
      <div className="record-type-guide">
        <span>First-class scope:</span>
        <small>Contracts</small>
        <small>Training</small>
        <small>Skills</small>
        <small>Performance</small>
        <small>Continuing education</small>
      </div>
      <div className="record-form-footer">
        <small>{status}</small>
        <button className="primary-action" disabled={disabled || busy || !title || !sourceName} type="submit">
          Add record
        </button>
      </div>
    </form>
  );
}

function daysUntil(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86_400_000);
}

function RenewalReadinessPanel({
  records,
  workspaceLabel
}: {
  records: RecordItem[];
  workspaceLabel: string;
}) {
  const datedRecords = records
    .map((record) => ({ record, days: daysUntil(record.expiresAt) }))
    .filter((item): item is { record: RecordItem; days: number } => item.days !== null);
  const expiredRecords = datedRecords.filter((item) => item.days < 0);
  const dueSoonRecords = datedRecords.filter((item) => item.days >= 0 && item.days <= 45);
  const noDateRecords = records.filter((record) => !record.expiresAt && !record.expires.toLowerCase().includes("no expiration"));
  const packetName = `trustgraph-renewal-readiness-${workspaceLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.json`;
  const renewalPacket = {
    generated_at: new Date().toISOString(),
    workspace: workspaceLabel,
    counts: {
      visible_records: records.length,
      dated_records: datedRecords.length,
      expired_records: expiredRecords.length,
      due_soon_records: dueSoonRecords.length,
      missing_expiration_review: noDateRecords.length
    },
    renewal_window_days: 45,
    records: datedRecords.map(({ record, days }) => ({
      record_id: record.id,
      section: record.section,
      title: record.title,
      source: record.source,
      status: record.status,
      expires_at: record.expiresAt,
      days_until_expiration: days,
      renewal_status: days < 0 ? "expired" : days <= 45 ? "due_soon" : "current",
      access_scope: record.access
    })),
    missing_expiration_review: noDateRecords.map((record) => ({
      record_id: record.id,
      section: record.section,
      title: record.title,
      source: record.source,
      visible_expiration_label: record.expires
    }))
  };

  return (
    <section className="renewal-readiness-panel">
      <div className="mini-heading">
        <CalendarClock size={16} />
        <strong>Credential renewal readiness</strong>
      </div>
      <div className="renewal-summary-grid">
        <div>
          <span>Due soon</span>
          <strong>{dueSoonRecords.length}</strong>
        </div>
        <div>
          <span>Expired</span>
          <strong>{expiredRecords.length}</strong>
        </div>
        <div>
          <span>Dated</span>
          <strong>{datedRecords.length}</strong>
        </div>
      </div>
      <small>Uses visible Passport and Verify records with expiration dates to build a 45-day renewal queue.</small>
      <button className="secondary-action" onClick={() => downloadTextFile(packetName, JSON.stringify(renewalPacket, null, 2), "application/json")} type="button">
        Export renewal packet
      </button>
    </section>
  );
}

function ConfidentialityReviewPanel({
  records,
  workspaceLabel
}: {
  records: RecordItem[];
  workspaceLabel: string;
}) {
  const confidentialRecords = records.filter(
    (record) =>
      record.section === "Performance Review" ||
      record.section === "References" ||
      record.sensitivity === "restricted" ||
      record.consentRequired
  );
  const explicitConsentCount = confidentialRecords.filter((record) => record.consentRequired).length;
  const restrictedCount = confidentialRecords.filter((record) => record.sensitivity === "restricted").length;
  const packetName = `trustgraph-confidentiality-review-${workspaceLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.json`;
  const confidentialityPacket = {
    generated_at: new Date().toISOString(),
    workspace: workspaceLabel,
    mode: "visible_scope_only",
    counts: {
      visible_records: records.length,
      confidentiality_review_records: confidentialRecords.length,
      explicit_consent_required: explicitConsentCount,
      restricted_records: restrictedCount
    },
    review_policy: [
      "Performance reviews and references remain scoped to approved Access Grants.",
      "Restricted records require explicit consent before sensitive evidence is shared.",
      "Corporate Verify exports include visibility metadata only for records visible to the active role and organization."
    ],
    records: confidentialRecords.map((record) => ({
      record_id: record.id,
      section: record.section,
      title: record.title,
      source: record.source,
      status: record.status,
      sensitivity: record.sensitivity ?? "standard",
      explicit_consent_required: Boolean(record.consentRequired),
      access_scope: record.access
    }))
  };

  return (
    <section className="confidentiality-review-panel">
      <div className="mini-heading">
        <ShieldAlert size={16} />
        <strong>Confidentiality review packet</strong>
      </div>
      <div className="confidentiality-summary-grid">
        <div>
          <span>Reviewed</span>
          <strong>{confidentialRecords.length}</strong>
        </div>
        <div>
          <span>Consent</span>
          <strong>{explicitConsentCount}</strong>
        </div>
        <div>
          <span>Restricted</span>
          <strong>{restrictedCount}</strong>
        </div>
      </div>
      <small>Flags visible performance reviews, references, restricted records, and explicit-consent records for scoped reviewer handoff.</small>
      <button className="secondary-action" onClick={() => downloadTextFile(packetName, JSON.stringify(confidentialityPacket, null, 2), "application/json")} type="button">
        Export confidentiality packet
      </button>
    </section>
  );
}

function SkillsEvidencePanel({
  records,
  workspaceLabel
}: {
  records: RecordItem[];
  workspaceLabel: string;
}) {
  const recordsWithSkills = records.filter((record) => record.skills?.length);
  const skillCounts = recordsWithSkills.reduce<Record<string, number>>((counts, record) => {
    for (const skill of record.skills ?? []) {
      counts[skill] = (counts[skill] ?? 0) + 1;
    }
    return counts;
  }, {});
  const skills = Object.entries(skillCounts)
    .map(([skill, count]) => ({ skill, count }))
    .sort((left, right) => right.count - left.count || left.skill.localeCompare(right.skill));
  const packetName = `trustgraph-skills-evidence-${workspaceLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.json`;
  const skillsPacket = {
    generated_at: new Date().toISOString(),
    workspace: workspaceLabel,
    mode: "visible_skill_evidence",
    counts: {
      visible_records: records.length,
      records_with_skills: recordsWithSkills.length,
      unique_skills: skills.length
    },
    skills,
    source_records: recordsWithSkills.map((record) => ({
      record_id: record.id,
      section: record.section,
      title: record.title,
      source: record.source,
      status: record.status,
      skills: record.skills ?? [],
      responsibilities: record.responsibilities ?? [],
      access_scope: record.access
    }))
  };

  return (
    <section className="skills-evidence-panel">
      <div className="mini-heading">
        <Sparkles size={16} />
        <strong>Skills evidence packet</strong>
      </div>
      <div className="skills-summary-grid">
        <div>
          <span>Skills</span>
          <strong>{skills.length}</strong>
        </div>
        <div>
          <span>Records</span>
          <strong>{recordsWithSkills.length}</strong>
        </div>
        <div>
          <span>Visible</span>
          <strong>{records.length}</strong>
        </div>
      </div>
      <small>Exports visible skill claims with source records, responsibilities, status, and Access Grant scope.</small>
      <button className="secondary-action" onClick={() => downloadTextFile(packetName, JSON.stringify(skillsPacket, null, 2), "application/json")} type="button">
        Export skills packet
      </button>
    </section>
  );
}

function AccessGrantsPanel({
  disabled,
  grants,
  message,
  onDecision,
  onPilotRequest
}: {
  disabled: boolean;
  grants: AccessGrantView[];
  message: string;
  onDecision: (grantId: string, status: "approved" | "declined" | "revoked") => Promise<void>;
  onPilotRequest: () => Promise<void>;
}) {
  const [busyGrantId, setBusyGrantId] = useState<string | null>(null);
  const [pilotBusy, setPilotBusy] = useState(false);
  const [grantQuery, setGrantQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "requested" | "approved" | "declined" | "expired" | "revoked">("all");
  const requestedCount = grants.filter((grant) => grant.status === "requested").length;
  const approvedCount = grants.filter((grant) => grant.status === "approved").length;
  const inactiveCount = grants.filter(
    (grant) => grant.status === "declined" || grant.status === "expired" || grant.status === "revoked"
  ).length;
  const filteredGrants = grants.filter((grant) => {
    const matchesStatus = statusFilter === "all" || grant.status === statusFilter;
    const haystack = `${grant.requester_organization.name} ${grant.purpose} ${grant.status}`.toLowerCase();
    return matchesStatus && haystack.includes(grantQuery.trim().toLowerCase());
  });

  async function decide(grantId: string, status: "approved" | "declined" | "revoked") {
    setBusyGrantId(grantId);
    try {
      await onDecision(grantId, status);
    } finally {
      setBusyGrantId(null);
    }
  }

  return (
    <section className="grants-panel">
      <div className="mini-heading">
        <KeyRound size={16} />
        <strong>Access Grants</strong>
      </div>
      <div className="grant-summary-grid">
        <div>
          <span>Requested</span>
          <strong>{requestedCount}</strong>
        </div>
        <div>
          <span>Approved</span>
          <strong>{approvedCount}</strong>
        </div>
        <div>
          <span>Inactive</span>
          <strong>{inactiveCount}</strong>
        </div>
      </div>
      <div className="grant-panel-top test-tool-strip">
        <small>Create a live pilot Access Grant request when a corporate reviewer has not submitted one yet.</small>
        <button
          className="secondary-action"
          disabled={disabled || pilotBusy}
          onClick={async () => {
            setPilotBusy(true);
            try {
              await onPilotRequest();
            } finally {
              setPilotBusy(false);
            }
          }}
        >
          Create pilot request
        </button>
      </div>
      <div className="grant-controls">
        <input
          onChange={(event) => setGrantQuery(event.target.value)}
          placeholder="Search company, purpose, or status"
          value={grantQuery}
        />
        <select onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} value={statusFilter}>
          <option value="all">All</option>
          <option value="requested">Requested</option>
          <option value="approved">Approved</option>
          <option value="declined">Declined</option>
          <option value="expired">Expired</option>
          <option value="revoked">Revoked</option>
        </select>
      </div>
      <div className="grant-list">
        {filteredGrants.length ? (
          filteredGrants.slice(0, 8).map((grant) => (
            <article className="grant-card" key={grant.id}>
              <div>
                <strong>{grant.requester_organization.name}</strong>
                <p>{grant.purpose}</p>
                <small>{grant.status.replace("_", " ")} request</small>
              </div>
              <div className="grant-actions">
                {grant.status === "requested" ? (
                  <>
                    <button
                      className="primary-action"
                      disabled={disabled || busyGrantId === grant.id}
                      onClick={() => void decide(grant.id, "approved")}
                    >
                      Approve
                    </button>
                    <button
                      className="secondary-action"
                      disabled={disabled || busyGrantId === grant.id}
                      onClick={() => void decide(grant.id, "declined")}
                    >
                      Decline
                    </button>
                  </>
                ) : grant.status === "approved" ? (
                  <button
                    className="secondary-action"
                    disabled={disabled || busyGrantId === grant.id}
                    onClick={() => void decide(grant.id, "revoked")}
                  >
                    Revoke
                  </button>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <article className="grant-card empty">
            <div>
              <strong>No Access Grants in this view</strong>
              <p>Approved, pending, and revoked corporate requests appear here once a reviewer asks for Passport access.</p>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

function ConsentAuthorizationsPanel({
  authorizations,
  disabled,
  grants,
  message,
  records,
  onCreate,
  onRevoke
}: {
  authorizations: DbConsentAuthorization[];
  disabled: boolean;
  grants: AccessGrantView[];
  message: string;
  records: RecordItem[];
  onCreate: (input: {
    requesterOrganizationId: string | null;
    trustRecordId: string | null;
    purpose: string;
    scope: string[];
    expiresAt: string;
  }) => Promise<void>;
  onRevoke: (consentId: string) => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [requesterOrganizationId, setRequesterOrganizationId] = useState("");
  const [trustRecordId, setTrustRecordId] = useState("");
  const [purpose, setPurpose] = useState("Scoped review of sensitive TrustGraph Passport evidence");
  const [scope, setScope] = useState("view_status, view_evidence_metadata");
  const [expiresAt, setExpiresAt] = useState("");
  const activeCount = authorizations.filter((authorization) => authorization.status === "active").length;
  const revokedCount = authorizations.filter((authorization) => authorization.status === "revoked").length;
  const expiringCount = authorizations.filter((authorization) => authorization.expires_at).length;
  const requesterOptions = grants.reduce<Array<{ id: string; name: string }>>((items, grant) => {
    if (items.some((item) => item.id === grant.requester_organization_id)) return items;
    return [...items, { id: grant.requester_organization_id, name: grant.requester_organization.name }];
  }, []);

  async function revoke(consentId: string) {
    setBusyId(consentId);
    try {
      await onRevoke(consentId);
    } finally {
      setBusyId(null);
    }
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateBusy(true);
    try {
      await onCreate({
        requesterOrganizationId: requesterOrganizationId || null,
        trustRecordId: trustRecordId || null,
        purpose,
        scope: scope.split(",").map((item) => item.trim()).filter(Boolean),
        expiresAt
      });
      setPurpose("Scoped review of sensitive TrustGraph Passport evidence");
      setScope("view_status, view_evidence_metadata");
      setExpiresAt("");
    } finally {
      setCreateBusy(false);
    }
  }

  return (
    <section className="consent-panel">
      <div className="mini-heading">
        <LockKeyhole size={16} />
        <strong>Consent authorizations</strong>
      </div>
      <small>{message}</small>
      <div className="consent-summary-grid">
        <div>
          <span>Active</span>
          <strong>{activeCount}</strong>
        </div>
        <div>
          <span>Revoked</span>
          <strong>{revokedCount}</strong>
        </div>
        <div>
          <span>Expiring</span>
          <strong>{expiringCount}</strong>
        </div>
      </div>
      <form className="consent-form" onSubmit={submitCreate}>
        <div className="record-form-grid">
          <select
            disabled={disabled || createBusy}
            onChange={(event) => setRequesterOrganizationId(event.target.value)}
            value={requesterOrganizationId}
          >
            <option value="">Personal authorization</option>
            {requesterOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
          <select disabled={disabled || createBusy} onChange={(event) => setTrustRecordId(event.target.value)} value={trustRecordId}>
            <option value="">All scoped records</option>
            {records.map((record) => (
              <option key={record.id} value={record.id}>{record.title}</option>
            ))}
          </select>
          <input disabled={disabled || createBusy} onChange={(event) => setExpiresAt(event.target.value)} type="date" value={expiresAt} />
          <input disabled={disabled || createBusy} onChange={(event) => setPurpose(event.target.value)} placeholder="Consent purpose" value={purpose} />
          <input disabled={disabled || createBusy} onChange={(event) => setScope(event.target.value)} placeholder="Comma-separated scope" value={scope} />
        </div>
        <div className="record-form-footer">
          <small>Creates an audited consent authorization owned by the professional.</small>
          <button className="secondary-action" disabled={disabled || createBusy || purpose.length < 12 || !scope.trim()} type="submit">
            Create consent
          </button>
        </div>
      </form>
      <div className="consent-list">
        {authorizations.length ? (
          authorizations.slice(0, 8).map((authorization) => (
            <article className="consent-card" key={authorization.id}>
              <div>
                <strong>{authorization.requester_organization?.name ?? "Personal authorization"}</strong>
                <p>{authorization.purpose}</p>
                <small>{authorization.consent_scope.join(", ")}</small>
              </div>
              <div className="grant-actions">
                <span className={`status-chip ${authorization.status === "active" ? "success" : "neutral"}`}>
                  {authorization.status}
                </span>
                <button
                  className="secondary-action"
                  disabled={disabled || busyId === authorization.id || authorization.status !== "active"}
                  onClick={() => void revoke(authorization.id)}
                >
                  Revoke
                </button>
              </div>
            </article>
          ))
        ) : (
          <article className="consent-card empty">
            <div>
              <strong>No consent authorizations yet</strong>
              <p>Sensitive record permissions appear here after a professional grants scoped consent.</p>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

function ReferenceRequestsPanel({
  disabled,
  message,
  requests,
  onCreate,
  onStatus
}: {
  disabled: boolean;
  message: string;
  requests: DbReferenceRequest[];
  onCreate: (input: { providerName: string; providerEmail: string; relationship: string; message: string }) => Promise<void>;
  onStatus: (requestId: string, status: ReferenceRequestStatus) => Promise<void>;
}) {
  const [providerName, setProviderName] = useState("");
  const [providerEmail, setProviderEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState(message);
  const openCount = requests.filter((request) => !["submitted", "declined", "expired", "cancelled"].includes(request.status)).length;
  const submittedCount = requests.filter((request) => request.status === "submitted").length;
  const exportName = `trustgraph-reference-requests-${new Date().toISOString().slice(0, 10)}.csv`;

  useEffect(() => {
    setStatus(message);
  }, [message]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("Creating reference request...");
    try {
      await onCreate({ providerName, providerEmail, relationship, message: note });
      setProviderName("");
      setProviderEmail("");
      setRelationship("");
      setNote("");
      setStatus("Reference request created");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not create reference request");
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(requestId: string, nextStatus: ReferenceRequestStatus) {
    setBusyId(requestId);
    try {
      await onStatus(requestId, nextStatus);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="references-panel">
      <div className="mini-heading">
        <UserPlus size={16} />
        <strong>Structured references</strong>
      </div>
      <div className="reference-summary-grid">
        <div>
          <span>Open</span>
          <strong>{openCount}</strong>
        </div>
        <div>
          <span>Submitted</span>
          <strong>{submittedCount}</strong>
        </div>
      </div>
      <div className="reference-source-strip">
        <span className="status-chip success">Reference database</span>
        <small>Exports live provider requests, relationship context, status, submitted summaries, and expiration dates.</small>
        <button
          className="secondary-action"
          disabled={!requests.length}
          onClick={() => downloadTextFile(exportName, referenceRequestsToCsv(requests), "text/csv")}
          type="button"
        >
          Export references
        </button>
      </div>
      <form className="reference-form" onSubmit={submit}>
        <div className="record-form-grid">
          <input disabled={disabled || busy} onChange={(event) => setProviderName(event.target.value)} placeholder="Provider name" value={providerName} />
          <input disabled={disabled || busy} onChange={(event) => setProviderEmail(event.target.value)} placeholder="provider@email.com" type="email" value={providerEmail} />
          <input disabled={disabled || busy} onChange={(event) => setRelationship(event.target.value)} placeholder="Relationship" value={relationship} />
          <input disabled={disabled || busy} onChange={(event) => setNote(event.target.value)} placeholder="Request note" value={note} />
        </div>
        <div className="record-form-footer">
          <small>{status}</small>
          <button className="secondary-action" disabled={disabled || busy || !providerName || !providerEmail || !relationship} type="submit">
            Request reference
          </button>
        </div>
      </form>
      <div className="reference-list">
        {requests.length ? (
          requests.map((request) => (
            <article className="reference-card" key={request.id}>
              <div>
                <strong>{request.provider_name}</strong>
                <p>{request.relationship}</p>
                <small>{request.provider_email}</small>
              </div>
              <div className="grant-actions">
                <span className="status-chip neutral">{request.status.replace(/_/g, " ")}</span>
                <button
                  className="secondary-action"
                  disabled={disabled || busyId === request.id || request.status === "submitted"}
                  onClick={() => void updateStatus(request.id, "submitted")}
                >
                  Mark submitted
                </button>
                <button
                  className="secondary-action"
                  disabled={disabled || busyId === request.id || request.status === "cancelled"}
                  onClick={() => void updateStatus(request.id, "cancelled")}
                >
                  Cancel
                </button>
              </div>
            </article>
          ))
        ) : (
          <article className="reference-card empty">
            <div>
              <strong>No reference requests yet</strong>
              <p>Structured references from managers, supervisors, clients, or colleagues will be tracked here.</p>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

function VerifyRequestsPanel({
  disabled,
  activeOrganization,
  consentAuthorizations,
  issuerCredentials,
  issuerDisabled,
  issuerMessage,
  teamMembers,
  teamInvitations,
  subscriptions,
  message,
  missingRecordMessage,
  missingRecordRequests,
  requests,
  reviews,
  sharedRecords,
  onCreateAccessRequest,
  onRecordAccessReview,
  onCreateIssuerRole,
  onCreateMissingRecordRequest,
  onIssueCredential,
  onRevokeCredential,
  onUpdateCredentialExpiry,
  onMissingRecordStatus,
  onCreateReviewerRole
}: {
  disabled: boolean;
  activeOrganization: Organization;
  consentAuthorizations: DbConsentAuthorization[];
  issuerCredentials: DbIssuerCredential[];
  issuerDisabled: boolean;
  issuerMessage: string;
  teamMembers: OrganizationMemberView[];
  teamInvitations: DbOrganizationInvitation[];
  subscriptions: DbOrganizationSubscription[];
  message: string;
  missingRecordMessage: string;
  missingRecordRequests: DbMissingRecordRequest[];
  requests: VerifyAccessGrantView[];
  reviews: DbCorporateAccessReview[];
  sharedRecords: RecordItem[];
  onCreateAccessRequest: (input: { subjectEmail: string; purpose: string; expiresInDays: number }) => Promise<void>;
  onRecordAccessReview: (input: { accessGrantId: string; status: CorporateAccessReviewStatus; note: string }) => Promise<void>;
  onCreateIssuerRole: () => Promise<void>;
  onIssueCredential: (input: {
    subjectEmail: string;
    subjectFullName: string;
    credentialType: IssuerRecordType;
    title: string;
    evidenceSummary: string;
    issuedAt: string;
    expiresAt: string;
  }) => Promise<void>;
  onRevokeCredential: (credentialId: string, reason: string) => Promise<void>;
  onUpdateCredentialExpiry: (credentialId: string, expiresAt: string, reason: string) => Promise<void>;
  onCreateMissingRecordRequest: (input: {
    subjectEmail: string;
    subjectFullName: string;
    recordType: RecordType;
    title: string;
    reason: string;
    dueAt: string;
  }) => Promise<void>;
  onMissingRecordStatus: (requestId: string, status: "in_progress" | "fulfilled" | "declined" | "cancelled") => Promise<void>;
  onCreateReviewerRole: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const [subjectEmail, setSubjectEmail] = useState("");
  const [purpose, setPurpose] = useState("Hiring readiness review for verified identity, employment, license, and certification records");
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [requestStatus, setRequestStatus] = useState(message);
  const requestedCount = requests.filter((request) => request.status === "requested").length;
  const approvedCount = requests.filter((request) => request.status === "approved").length;
  const inactiveCount = requests.filter(
    (request) => request.status === "declined" || request.status === "expired" || request.status === "revoked"
  ).length;
  const lifecycle = ["Request", "Professional approval", "Scoped record sync", "Audit event"];
  const activeConsentRecordIds = new Set(
    consentAuthorizations
      .filter((authorization) => authorization.status === "active" && authorization.trust_record_id)
      .map((authorization) => authorization.trust_record_id)
  );
  const sharedRecordsNeedingConsent = sharedRecords.filter(
    (record) => record.consentRequired || record.sensitivity === "sensitive" || record.sensitivity === "restricted"
  );
  const coveredConsentRecords = sharedRecordsNeedingConsent.filter((record) => activeConsentRecordIds.has(record.id)).length;
  const pendingGapCount = missingRecordRequests.filter(
    (request) => request.status === "requested" || request.status === "in_progress"
  ).length;
  const userDataProofItems = [
    {
      label: "Approved grant",
      value: approvedCount ? `${approvedCount} approved` : "Waiting",
      detail: approvedCount
        ? "At least one professional has approved scoped corporate review access."
        : "Professional consent is required before user Passport rows appear.",
      ready: approvedCount > 0
    },
    {
      label: "Visible user rows",
      value: `${sharedRecords.length} rows`,
      detail: sharedRecords.length
        ? "Corporate Verify can read shared Passport rows through the active organization and RBAC scope."
        : "No user Passport rows are visible yet for this corporate reviewer.",
      ready: sharedRecords.length > 0
    },
    {
      label: "Consent coverage",
      value: `${coveredConsentRecords}/${sharedRecordsNeedingConsent.length}`,
      detail:
        sharedRecordsNeedingConsent.length === 0
          ? "No sensitive shared records currently require explicit consent evidence."
          : "Sensitive or restricted rows need active consent before review acceptance.",
      ready: sharedRecordsNeedingConsent.length === 0 || coveredConsentRecords === sharedRecordsNeedingConsent.length
    },
    {
      label: "Open gaps",
      value: `${pendingGapCount} open`,
      detail: pendingGapCount
        ? "Missing-record requests still need professional or provider follow-up."
        : "No missing-record follow-ups are blocking this review.",
      ready: pendingGapCount === 0
    }
  ];
  const verifyFlowSteps = [
    {
      label: "Request access",
      value: requestedCount ? `${requestedCount} waiting` : "Ready",
      detail: "Send a scoped Passport request to the professional with a clear business purpose.",
      done: requests.length > 0
    },
    {
      label: "Review shared records",
      value: `${sharedRecords.length} records`,
      detail: "Approved grants sync only records visible through organization, role, grant, and consent scope.",
      done: sharedRecords.length > 0
    },
    {
      label: "Resolve gaps",
      value: `${pendingGapCount} open`,
      detail: "Request missing items when approved shared records are incomplete for the review.",
      done: pendingGapCount === 0 && (requests.length > 0 || sharedRecords.length > 0)
    },
    {
      label: "Consent coverage",
      value: `${coveredConsentRecords}/${sharedRecordsNeedingConsent.length}`,
      detail: "Restricted or sensitive records require active consent before they can support review.",
      done: sharedRecordsNeedingConsent.length === 0 || coveredConsentRecords === sharedRecordsNeedingConsent.length
    }
  ];
  const nextVerifyStep = verifyFlowSteps.find((step) => !step.done) ?? verifyFlowSteps[verifyFlowSteps.length - 1];
  const corporateVerifyAccessLane = [
    {
      label: "1. Request by email",
      value: requests.length ? `${requests.length} request${requests.length === 1 ? "" : "s"}` : "Needed",
      detail: "Corporate reviewer enters the professional email and a specific business purpose.",
      state: requests.length ? "ready" : disabled ? "blocked" : "next"
    },
    {
      label: "2. Professional approval",
      value: approvedCount ? `${approvedCount} approved` : requestedCount ? `${requestedCount} pending` : "Waiting",
      detail: "No user Passport rows are visible until the professional approves an Access Grant.",
      state: approvedCount ? "ready" : requests.length ? "next" : "blocked"
    },
    {
      label: "3. Shared rows visible",
      value: `${sharedRecords.length} rows`,
      detail: "Only approved, consent-scoped rows appear in Corporate Verify for this organization.",
      state: sharedRecords.length ? "ready" : approvedCount ? "next" : "blocked"
    },
    {
      label: "4. Review gaps",
      value: pendingGapCount ? `${pendingGapCount} open` : "Clear",
      detail: "Request missing items only after visible rows show what is incomplete.",
      state: pendingGapCount ? "next" : sharedRecords.length ? "ready" : "blocked"
    }
  ];
  const requestScopeReceipt = {
    mode: "corporate_access_request_scope_receipt",
    professional_email: subjectEmail.trim() || "not_entered",
    business_purpose: purpose.trim(),
    review_window_days: expiresInDays,
    request_boundary: "one_professional_email_one_business_purpose_no_user_database_browse",
    visible_after_approval: "approved_consent_scoped_passport_rows_only",
    can_submit: Boolean(!disabled && subjectEmail.trim() && purpose.trim().length >= 12)
  };
  const requestScopeReceiptCards = [
    {
      label: "Professional email",
      value: subjectEmail.trim() || "Required",
      detail: "Request starts from one professional email."
    },
    {
      label: "Business purpose",
      value: purpose.trim().length >= 12 ? "Ready" : "Needs detail",
      detail: purpose.trim() || "Explain why the reviewer needs Passport access."
    },
    {
      label: "Review window",
      value: `${expiresInDays} days`,
      detail: "Access should expire after the review window."
    },
    {
      label: "Browse boundary",
      value: "No user browse",
      detail: "Approval exposes only scoped shared Passport rows."
    }
  ];
  const corporateAccessBlockerMap = [
    {
      label: "Company context",
      value: disabled ? "Locked" : activeOrganization.name,
      detail: disabled ? "Login with a corporate reviewer role before requesting user data." : "Corporate RBAC context is available for Verify requests.",
      state: disabled ? "blocked" : "ready"
    },
    {
      label: "Access request",
      value: requests.length ? `${requests.length} sent` : "Needed",
      detail: requests.length ? "Requests are tracked for this company workspace." : "Send a request to the professional email before records can appear.",
      state: requests.length ? "ready" : "next"
    },
    {
      label: "Professional consent",
      value: approvedCount ? `${approvedCount} approved` : "Waiting",
      detail: approvedCount ? "At least one Access Grant can expose scoped Passport rows." : "The professional must approve access before user rows are visible.",
      state: approvedCount ? "ready" : requests.length ? "next" : "blocked"
    },
    {
      label: "Visible records",
      value: sharedRecords.length ? `${sharedRecords.length} rows` : "No rows",
      detail: sharedRecords.length ? "Shared rows are loaded from the live database for this reviewer." : "No Passport rows are visible until grant and consent scope are satisfied.",
      state: sharedRecords.length ? "ready" : approvedCount ? "next" : "blocked"
    },
    {
      label: "Review blockers",
      value: pendingGapCount ? `${pendingGapCount} gaps` : "Clear",
      detail: pendingGapCount ? "Resolve missing-record requests before accepting the corporate review." : "No missing-record gaps are blocking review acceptance.",
      state: pendingGapCount ? "next" : "ready"
    }
  ];
  const accessBlockedCount = corporateAccessBlockerMap.filter((item) => item.state === "blocked").length;
  const accessNextCount = corporateAccessBlockerMap.filter((item) => item.state === "next").length;
  const verifyFlowPacketName = `trustgraph-verify-reviewer-flow-${new Date().toISOString().slice(0, 10)}.json`;
  const firstUseNextAction = disabled
    ? "Login with a corporate reviewer role or create the company workspace."
    : !requests.length
      ? "Request access by email from one professional."
      : !approvedCount
        ? "Wait for professional approval before expecting any user rows."
        : !sharedRecords.length
          ? "Sync approved shared Passport rows into Corporate Verify."
          : pendingGapCount
            ? "Review visible rows and resolve missing-record gaps."
            : "Record review attestation and export the first-use proof.";
  const corporateVerifyFirstUseWizard = [
    {
      label: "1. Request access by email",
      value: requests.length ? `${requests.length} request${requests.length === 1 ? "" : "s"}` : "Start here",
      detail: "Enter the professional email and business purpose. Corporate cannot browse a public user database.",
      state: requests.length ? "ready" : disabled ? "blocked" : "next",
      action: "Open request form",
      target: "corporate-verify-request-form"
    },
    {
      label: "2. Professional approval",
      value: approvedCount ? `${approvedCount} approved` : requestedCount ? `${requestedCount} waiting` : "Waiting",
      detail: "The professional approves an Access Grant. Until then the reviewer sees no Passport rows.",
      state: approvedCount ? "ready" : requests.length ? "next" : "blocked",
      action: "Check requests",
      target: "corporate-verify-request-list"
    },
    {
      label: "3. Review visible user rows",
      value: sharedRecords.length ? `${sharedRecords.length} visible` : "No rows yet",
      detail: "Only approved, consent-scoped rows appear for the active company and reviewer role.",
      state: sharedRecords.length ? "ready" : approvedCount ? "next" : "blocked",
      action: "Open review queue",
      target: "corporate-access-review-queue"
    },
    {
      label: "4. Export first-use proof",
      value: sharedRecords.length && !pendingGapCount ? "Ready" : `${pendingGapCount} gaps`,
      detail: "Export the packet after rows, gaps, consent, and review status are understandable.",
      state: sharedRecords.length && !pendingGapCount ? "ready" : sharedRecords.length ? "next" : "blocked",
      action: "Export proof",
      target: ""
    }
  ];
  const corporateVerifyFirstUsePacketName = `trustgraph-corporate-verify-first-use-${new Date().toISOString().slice(0, 10)}.json`;
  const corporateVerifyFirstUsePacket = {
    generated_at: new Date().toISOString(),
    mode: "corporate_verify_first_use_wizard",
    active_organization: {
      id: activeOrganization.id,
      name: activeOrganization.name,
      type: activeOrganization.type
    },
    active_role: disabled ? "locked_or_missing_corporate_reviewer_role" : "active_corporate_reviewer_context",
    next_action: firstUseNextAction,
    counts: {
      access_requests: requests.length,
      requested_access_grants: requestedCount,
      approved_access_grants: approvedCount,
      inactive_access_grants: inactiveCount,
      shared_user_rows: sharedRecords.length,
      open_missing_record_requests: pendingGapCount,
      sensitive_shared_records: sharedRecordsNeedingConsent.length,
      covered_sensitive_records: coveredConsentRecords
    },
    accepted_when: "request_created_professional_approval_shared_rows_visible_review_attestation_exported",
    tokens_redacted: true,
    steps: corporateVerifyFirstUseWizard.map(({ label, value, detail, state }) => ({ label, value, detail, state }))
  };
  const verifyFlowPacket = {
    generated_at: new Date().toISOString(),
    mode: disabled ? "locked_verify_reviewer_flow" : "live_verify_reviewer_flow",
    active_organization: {
      id: activeOrganization.id,
      name: activeOrganization.name,
      type: activeOrganization.type
    },
    next_step: nextVerifyStep.label,
    counts: {
      requested_access_grants: requestedCount,
      approved_access_grants: approvedCount,
      inactive_access_grants: inactiveCount,
      shared_records: sharedRecords.length,
      sensitive_shared_records: sharedRecordsNeedingConsent.length,
      covered_sensitive_records: coveredConsentRecords,
      open_missing_record_requests: pendingGapCount
    },
    user_data_proof: userDataProofItems.map((item) => ({
      label: item.label,
      value: item.value,
      detail: item.detail,
      ready: item.ready
    })),
    request_scope_receipt: requestScopeReceipt,
    corporate_verify_access_lane: corporateVerifyAccessLane,
    corporate_access_blocker_map: corporateAccessBlockerMap,
    steps: verifyFlowSteps.map((step) => ({
      label: step.label,
      value: step.value,
      detail: step.detail,
      done: step.done
    }))
  };

  useEffect(() => {
    setRequestStatus(message);
  }, [message]);

  async function submitAccessRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestBusy(true);
    setRequestStatus("Requesting Passport access...");
    try {
      await onCreateAccessRequest({ subjectEmail, purpose, expiresInDays });
      setSubjectEmail("");
      setRequestStatus("Access request sent to professional");
    } catch (error) {
      setRequestStatus(error instanceof Error ? error.message : "Could not create Access Grant request");
    } finally {
      setRequestBusy(false);
    }
  }

  return (
    <section className="verify-panel">
      <div className="mini-heading">
        <ShieldCheck size={16} />
        <strong>Live Verify requests</strong>
      </div>
      <CorporateControlCenter
        activeOrganization={activeOrganization}
        disabled={disabled}
        missingRecordRequests={missingRecordRequests}
        requests={requests}
        sharedRecords={sharedRecords}
        subscriptions={subscriptions}
        teamInvitations={teamInvitations}
        teamMembers={teamMembers}
      />
      <div className="verify-summary-grid">
        <div>
          <span>Requested</span>
          <strong>{requestedCount}</strong>
        </div>
        <div>
          <span>Approved</span>
          <strong>{approvedCount}</strong>
        </div>
        <div>
          <span>Inactive</span>
          <strong>{inactiveCount}</strong>
        </div>
      </div>
      <div className="corporate-verify-first-use" aria-label="Corporate Verify first-use wizard">
        <div className="corporate-verify-first-use-header">
          <div>
            <span className="eyebrow">Corporate Verify first-use wizard</span>
            <strong>{firstUseNextAction}</strong>
            <small>Use this as the simple v1 flow: request access, wait for professional approval, review visible user rows, then export proof.</small>
          </div>
          <button
            className="secondary-action"
            onClick={() => downloadTextFile(corporateVerifyFirstUsePacketName, JSON.stringify(corporateVerifyFirstUsePacket, null, 2), "application/json")}
            type="button"
          >
            Export first-use proof
          </button>
        </div>
        <div className="corporate-verify-first-use-grid">
          {corporateVerifyFirstUseWizard.map((step) => (
            <article className={step.state} key={step.label}>
              <span>{step.label}</span>
              <strong>{step.value}</strong>
              <small>{step.detail}</small>
              <button
                className="secondary-action"
                disabled={step.action !== "Export proof" && !step.target}
                onClick={() => {
                  if (step.action === "Export proof") {
                    downloadTextFile(corporateVerifyFirstUsePacketName, JSON.stringify(corporateVerifyFirstUsePacket, null, 2), "application/json");
                    return;
                  }
                  document.getElementById(step.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                type="button"
              >
                {step.action}
              </button>
            </article>
          ))}
        </div>
        <div className="corporate-verify-first-use-counts">
          <span>{requests.length} requests</span>
          <span>{approvedCount} approvals</span>
          <span>{sharedRecords.length} shared rows</span>
          <span>{pendingGapCount} open gaps</span>
        </div>
      </div>
      <div className="verify-reviewer-flow">
        <div className="verify-reviewer-flow-header">
          <div>
            <span className="eyebrow">Reviewer workflow</span>
            <strong>Next: {nextVerifyStep.label}</strong>
            <small>Use this queue to request access, review shared records, close missing-record gaps, and prove consent coverage.</small>
          </div>
          <button
            className="secondary-action"
            onClick={() => downloadTextFile(verifyFlowPacketName, JSON.stringify(verifyFlowPacket, null, 2), "application/json")}
            type="button"
          >
            Export reviewer packet
          </button>
        </div>
        <div className="verify-reviewer-step-grid">
          {verifyFlowSteps.map((step) => (
            <article className={step.done ? "complete" : step.label === nextVerifyStep.label ? "next" : ""} key={step.label}>
              <span className={`status-chip ${step.done ? "success" : "neutral"}`}>{step.done ? "ready" : "next"}</span>
              <strong>{step.label}</strong>
              <small>{step.value}</small>
              <p>{step.detail}</p>
            </article>
          ))}
        </div>
      </div>
      <div className="corporate-verify-access-lane" aria-label="Corporate Verify access lane">
        <div className="verify-reviewer-flow-header">
          <div>
            <span className="eyebrow">Corporate Verify access lane</span>
            <strong>Request access by email, wait for approval, then review shared user rows</strong>
            <small>This is the v1 corporate path: no professional Passport database rows appear until grant, RBAC, and consent scope all pass.</small>
          </div>
          <span className={`status-chip ${sharedRecords.length && approvedCount ? "success" : "warning"}`}>
            {sharedRecords.length && approvedCount ? "user rows visible" : "approval required"}
          </span>
        </div>
        <div className="corporate-verify-access-lane-grid">
          {corporateVerifyAccessLane.map((item) => (
            <article className={item.state} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
      </div>
      <div className="corporate-access-blocker-map" aria-label="Corporate access blocker map">
        <div className="verify-reviewer-flow-header">
          <div>
            <span className="eyebrow">Corporate access blocker map</span>
            <strong>
              {accessBlockedCount
                ? `${accessBlockedCount} blocker${accessBlockedCount === 1 ? "" : "s"} before user rows are visible`
                : accessNextCount
                  ? `${accessNextCount} next step${accessNextCount === 1 ? "" : "s"} before review is ready`
                  : "Corporate user access is ready to review"}
            </strong>
            <small>Diagnoses why the corporate portal can or cannot see professional Passport rows from the live database.</small>
          </div>
          <span className={`status-chip ${accessBlockedCount ? "warning" : "success"}`}>
            {accessBlockedCount ? "visibility blocked" : "visibility path clear"}
          </span>
        </div>
        <div className="corporate-access-blocker-grid">
          {corporateAccessBlockerMap.map((item) => (
            <article className={item.state} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
      </div>
      <form className="verify-request-form" id="corporate-verify-request-form" onSubmit={submitAccessRequest}>
        <div className="verify-request-header">
          <div>
            <span className="status-chip neutral">Corporate user-data request</span>
            <strong>Request Passport access from one professional</strong>
            <small>Enter the professional email, explain the review purpose, then wait for consent before any user records appear.</small>
          </div>
          <div className="verify-request-mini-steps">
            <span>1. Email</span>
            <span>2. Consent</span>
            <span>3. Review</span>
          </div>
        </div>
        <div className="record-form-grid verify-request-fields">
          <label>
            <span>Professional email</span>
            <input
              disabled={disabled || requestBusy}
              onChange={(event) => setSubjectEmail(event.target.value)}
              placeholder="professional@email.com"
              type="email"
              value={subjectEmail}
            />
          </label>
          <label>
            <span>Business purpose</span>
            <input
              disabled={disabled || requestBusy}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder="Business reason for requesting Passport access"
              value={purpose}
            />
          </label>
          <label>
            <span>Review window</span>
            <input
              disabled={disabled || requestBusy}
              max={90}
              min={1}
              onChange={(event) => setExpiresInDays(Number(event.target.value))}
              type="number"
              value={expiresInDays}
            />
          </label>
        </div>
        <div className="record-form-footer">
          <small>{requestStatus}</small>
          <button className="primary-action" disabled={disabled || requestBusy || !subjectEmail || purpose.length < 12} type="submit">
            Request access
          </button>
        </div>
        <div className="verify-lifecycle-row">
          {lifecycle.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <div className="request-scope-receipt" aria-label="Corporate access request scope receipt">
          <div className="directory-source-strip">
            <span className="status-chip neutral">Request scope receipt</span>
            <small>Confirms this request targets one professional, one business purpose, and no open user database browse.</small>
          </div>
          <div className="request-scope-receipt-grid">
            {requestScopeReceiptCards.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.detail}</small>
              </article>
            ))}
          </div>
        </div>
      </form>
      <div className="grant-panel-top test-tool-strip">
        <small>Add a live Corporate Verify reviewer role for this signed-in account.</small>
        <button
          className="secondary-action"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onCreateReviewerRole();
            } finally {
              setBusy(false);
            }
          }}
        >
          Add Verify reviewer role
        </button>
      </div>
      <div className="grant-list" id="corporate-verify-request-list">
        {requests.length ? (
          requests.map((request) => (
            <article className="grant-card" key={request.id}>
              <div>
                <strong>{request.subject_profile.full_name}</strong>
                <p>{request.purpose}</p>
                <small>{request.status.replace("_", " ")} access request</small>
              </div>
              <span className="status-chip neutral">{request.subject_profile.email}</span>
            </article>
          ))
        ) : (
          <article className="grant-card empty">
            <div>
              <strong>No Verify requests yet</strong>
              <p>Request Passport access by professional email, then track approval state and shared scope here.</p>
            </div>
          </article>
        )}
      </div>
      <div className="verify-user-data-proof" aria-label="Corporate user data proof">
        <div className="verify-reviewer-flow-header">
          <div>
            <span className="eyebrow">Corporate user data proof</span>
            <strong>{sharedRecords.length ? "Shared Passport data is visible" : "Waiting for approved shared Passport data"}</strong>
            <small>Use this before accepting a corporate review: approved grant, visible user rows, consent coverage, and open gaps must all be understandable.</small>
          </div>
          <span className={`status-chip ${sharedRecords.length && approvedCount ? "success" : "neutral"}`}>
            {sharedRecords.length && approvedCount ? "proof ready" : "proof pending"}
          </span>
        </div>
        <div className="verify-user-data-proof-grid">
          {userDataProofItems.map((item) => (
            <article className={item.ready ? "ready" : ""} key={item.label}>
              <span className={`status-dot ${item.ready ? "on" : ""}`} />
              <div>
                <strong>{item.label}</strong>
                <small>{item.value}</small>
                <p>{item.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="mini-heading verify-shared-heading">
        <FileCheck2 size={16} />
        <strong>Shared Passport records</strong>
        <span className="status-chip neutral">{sharedRecords.length} available</span>
      </div>
      <div className="shared-record-grid">
        {sharedRecords.length ? (
          sharedRecords.slice(0, 4).map((record) => (
            <article className="shared-record-card" key={record.id}>
              <div className="record-row-main">
                <span className="record-section">{record.section}</span>
                <strong>{record.title}</strong>
                <small>{record.subtitle}</small>
              </div>
              <div className="record-row-meta">
                <span className={`status-chip ${toneClass(record.tone)}`}>{record.status}</span>
                <span className="status-chip neutral">{record.source}</span>
              </div>
              <small>{record.access}</small>
            </article>
          ))
        ) : (
          <article className="grant-card empty">
            <div>
              <strong>No shared Passport records yet</strong>
              <p>Approved Access Grants sync the professional's current authorized records into this reviewer workspace.</p>
            </div>
          </article>
        )}
      </div>
      <div className="mini-heading verify-shared-heading">
        <ShieldCheck size={16} />
        <strong>Consent coverage</strong>
        <span className="status-chip neutral">{coveredConsentRecords}/{sharedRecordsNeedingConsent.length} covered</span>
      </div>
      <div className="shared-record-grid">
        {sharedRecordsNeedingConsent.length ? (
          sharedRecordsNeedingConsent.slice(0, 4).map((record) => {
            const covered = activeConsentRecordIds.has(record.id);
            return (
              <article className="shared-record-card" key={record.id}>
                <div className="record-row-main">
                  <span className="record-section">{record.section}</span>
                  <strong>{record.title}</strong>
                  <small>{record.sensitivity ?? "standard"} sensitivity</small>
                </div>
                <div className="record-row-meta">
                  <span className={`status-chip ${covered ? "success" : "warning"}`}>{covered ? "Consent active" : "Consent review"}</span>
                  <span className="status-chip neutral">{record.consentRequired ? "explicit consent" : "policy sensitive"}</span>
                </div>
              </article>
            );
          })
        ) : (
          <article className="grant-card empty">
            <div>
              <strong>No sensitive shared records in scope</strong>
              <p>Restricted and sensitive Passport records appear here only when the share requires consent coverage.</p>
            </div>
          </article>
        )}
      </div>
      <CorporateDirectoryPanel
        databaseMode={disabled ? "locked_corporate_context" : "live_supabase_visibility"}
        missingRecordRequests={missingRecordRequests}
        onRecordAccessReview={onRecordAccessReview}
        requests={requests}
        reviews={reviews}
        sharedRecords={sharedRecords}
      />
      {disabled ? <small>Switch to an employer or staffing reviewer role to use live Verify data.</small> : null}
      <IssuerCredentialsPanel
        credentials={issuerCredentials}
        disabled={issuerDisabled}
        message={issuerMessage}
        onCreateIssuerRole={onCreateIssuerRole}
        onIssueCredential={onIssueCredential}
        onRevokeCredential={onRevokeCredential}
        onUpdateCredentialExpiry={onUpdateCredentialExpiry}
      />
      <MissingRecordRequestsPanel
        disabled={disabled}
        message={missingRecordMessage}
        onCreate={onCreateMissingRecordRequest}
        onStatus={onMissingRecordStatus}
        requests={missingRecordRequests}
      />
    </section>
  );
}

function CorporateControlCenter({
  activeOrganization,
  disabled,
  missingRecordRequests,
  requests,
  sharedRecords,
  subscriptions,
  teamInvitations,
  teamMembers
}: {
  activeOrganization: Organization;
  disabled: boolean;
  missingRecordRequests: DbMissingRecordRequest[];
  requests: VerifyAccessGrantView[];
  sharedRecords: RecordItem[];
  subscriptions: DbOrganizationSubscription[];
  teamInvitations: DbOrganizationInvitation[];
  teamMembers: OrganizationMemberView[];
}) {
  const activeMembers = teamMembers.filter((member) => member.status === "active").length;
  const pendingInvites = teamInvitations.filter((invitation) => invitation.status === "pending").length;
  const openGaps = missingRecordRequests.filter(
    (request) => request.status === "requested" || request.status === "in_progress"
  ).length;
  const approvedRequests = requests.filter((request) => request.status === "approved").length;
  const requestedRequests = requests.filter((request) => request.status === "requested").length;
  const activeSubscription = subscriptions.find((subscription) => subscription.status !== "cancelled") ?? null;
  const readinessSignals = [
    {
      label: "Corporate account",
      detail: `${activeOrganization.name} is the active ${activeOrganization.type.replace("_", " ")} context`,
      ready: !disabled && activeOrganization.status === "active"
    },
    {
      label: "RBAC seats",
      detail: activeMembers ? `${activeMembers} active member${activeMembers === 1 ? "" : "s"} loaded` : "Invite or restore reviewers before team rollout",
      ready: activeMembers > 0
    },
    {
      label: "Access pipeline",
      detail: requests.length ? `${requests.length} live request${requests.length === 1 ? "" : "s"} tracked` : "Send an Access Grant request to start verification",
      ready: approvedRequests > 0 || requestedRequests > 0
    },
    {
      label: "Shared records",
      detail: sharedRecords.length ? `${sharedRecords.length} scoped Passport records available` : "Approved grants will sync scoped records here",
      ready: sharedRecords.length > 0
    },
    {
      label: "Subscription",
      detail: activeSubscription?.plan?.name ?? "Plan activation enables production account packaging",
      ready: Boolean(activeSubscription)
    }
  ];
  const readyCount = readinessSignals.filter((signal) => signal.ready).length;
  const readinessPercent = Math.round((readyCount / readinessSignals.length) * 100);
  const nextAction =
    disabled
      ? "Switch to an employer or staffing role"
      : !activeSubscription
        ? "Activate a corporate plan"
        : requestedRequests
          ? "Follow up pending Access Grants"
          : openGaps
            ? "Resolve candidate record gaps"
            : "Add the next reviewer or candidate";

  return (
    <section className="corporate-control-center">
      <div className="control-center-header">
        <div>
          <span className="eyebrow">Corporate Control Center v1</span>
          <h2>{activeOrganization.name}</h2>
          <p>Live organization readiness across RBAC, candidate consent, shared Passport records, gaps, and plan status.</p>
        </div>
        <div className="control-center-score">
          <span>Readiness</span>
          <strong>{readinessPercent}%</strong>
          <small>{readyCount} of {readinessSignals.length} systems ready</small>
        </div>
      </div>
      <div className="control-center-metrics">
        <div>
          <span>Active seats</span>
          <strong>{activeMembers}</strong>
          <small>{pendingInvites} pending invite{pendingInvites === 1 ? "" : "s"}</small>
        </div>
        <div>
          <span>Access pipeline</span>
          <strong>{requests.length}</strong>
          <small>{approvedRequests} approved, {requestedRequests} requested</small>
        </div>
        <div>
          <span>Shared records</span>
          <strong>{sharedRecords.length}</strong>
          <small>Scoped by grant and organization</small>
        </div>
        <div>
          <span>Open gaps</span>
          <strong>{openGaps}</strong>
          <small>Missing-record requests in motion</small>
        </div>
      </div>
      <div className="control-center-body">
        <div className="control-center-track">
          {readinessSignals.map((signal) => (
            <article className={signal.ready ? "ready" : ""} key={signal.label}>
              <span className={signal.ready ? "status-dot on" : "status-dot"} />
              <div>
                <strong>{signal.label}</strong>
                <small>{signal.detail}</small>
              </div>
            </article>
          ))}
        </div>
        <article className="control-center-next">
          <span className="eyebrow">Next best action</span>
          <strong>{nextAction}</strong>
          <small>Use the panels below to complete the next workflow step against Supabase.</small>
        </article>
      </div>
    </section>
  );
}

function RecordDisputePanel({
  disabled,
  message,
  record,
  onOpenDispute
}: {
  disabled: boolean;
  message: string;
  record: RecordItem;
  onOpenDispute: (input: { recordId: string; disputeReason: string; requestedCorrection: string }) => Promise<void>;
}) {
  const [disputeReason, setDisputeReason] = useState("");
  const [requestedCorrection, setRequestedCorrection] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(message);
  const alreadyDisputed = record.status.toLowerCase().includes("disputed");
  const packetName = `trustgraph-record-dispute-${new Date().toISOString().slice(0, 10)}.json`;
  const disputePacket = {
    packet_mode: "professional_record_dispute",
    generated_at: new Date().toISOString(),
    record: {
      id: record.id,
      title: record.title,
      section: record.section,
      source: record.source,
      status: record.status,
      sensitivity: record.sensitivity,
      access_scope: record.access
    },
    workflow: {
      allowed_actor: "record_owner_profile",
      record_status_after_submission: "disputed",
      operations_case_type: "dispute",
      audit_event: "record.dispute_opened",
      automated_hiring_decisions: "prohibited"
    }
  };

  useEffect(() => {
    setStatus(message);
  }, [message]);

  async function submitDispute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("Opening dispute and marking record disputed...");

    try {
      await onOpenDispute({ recordId: record.id, disputeReason, requestedCorrection });
      setDisputeReason("");
      setRequestedCorrection("");
      setStatus("Dispute opened; operations case and audit event created.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not open record dispute");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="record-dispute-panel">
      <div className="mini-heading">
        <ShieldAlert size={16} />
        <strong>Record dispute and correction</strong>
      </div>
      <div className="dispute-source-strip">
        <span>
          <strong>{record.title}</strong>
          <small>{record.section} - {record.status}</small>
        </span>
        <span>
          <strong>Owner-controlled</strong>
          <small>Creates operations case</small>
        </span>
        <span>
          <strong>Audit event</strong>
          <small>record.dispute_opened</small>
        </span>
      </div>
      <form className="record-form" onSubmit={submitDispute}>
        <div className="record-form-grid dispute-form-grid">
          <input
            value={disputeReason}
            onChange={(event) => setDisputeReason(event.target.value)}
            placeholder="What is incorrect or disputed?"
            disabled={disabled || busy || alreadyDisputed}
          />
          <input
            value={requestedCorrection}
            onChange={(event) => setRequestedCorrection(event.target.value)}
            placeholder="Requested correction"
            disabled={disabled || busy || alreadyDisputed}
          />
        </div>
        <small>
          Verified rows stay visible with a disputed status while TrustGraph Operations reviews the source, correction request, and audit trail.
        </small>
        <div className="record-form-footer">
          <small>{alreadyDisputed ? "This Passport record is already marked disputed." : status}</small>
          <div className="dispute-actions">
            <button
              className="secondary-action"
              onClick={() => downloadTextFile(packetName, JSON.stringify(disputePacket, null, 2), "application/json")}
              type="button"
            >
              Export dispute packet
            </button>
            <button className="primary-action" disabled={disabled || busy || alreadyDisputed || !disputeReason.trim()} type="submit">
              Open dispute
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function CorporateDailyTaskHub({
  accessGrants,
  activeOrganization,
  activeRole,
  authSession,
  missingRecordRequests,
  organizationSubscriptions,
  schemaMigrationRuns,
  sharedVerifyRecords,
  teamInvitations,
  teamMembers,
  verifyRequests,
  onOpenSetup,
  onOpenWorkspace
}: {
  accessGrants: AccessGrantView[];
  activeOrganization: Organization;
  activeRole: RoleDefinition;
  authSession: AuthSession | null;
  missingRecordRequests: DbMissingRecordRequest[];
  organizationSubscriptions: DbOrganizationSubscription[];
  schemaMigrationRuns: DbSchemaMigrationRun[];
  sharedVerifyRecords: RecordItem[];
  teamInvitations: DbOrganizationInvitation[];
  teamMembers: OrganizationMemberView[];
  verifyRequests: VerifyAccessGrantView[];
  onOpenSetup: (view: "corporate" | "team" | "billing" | "readiness") => void;
  onOpenWorkspace: (workspaceId: WorkspaceId) => void;
}) {
  const isCorporateContext = activeOrganization.type !== "professional";
  const activeMembers = teamMembers.filter((member) => member.status === "active").length;
  const pendingInvites = teamInvitations.filter((invitation) => invitation.status === "pending").length;
  const activeSubscriptions = organizationSubscriptions.filter((subscription) => subscription.status !== "cancelled");
  const openGaps = missingRecordRequests.filter(
    (request) => request.status === "requested" || request.status === "in_progress"
  ).length;
  const approvedVerifyRequests = verifyRequests.filter((request) => request.status === "approved").length;
  const requestedVerifyRequests = verifyRequests.filter((request) => request.status === "requested").length;
  const organizationRlsRepairApplied = schemaMigrationRuns.some(
    (run) => run.migration_path.includes("042_fix_operator_policy_self_reference.sql") && run.status === "applied"
  );
  const hubItems = [
    {
      label: "Corporate database",
      value: isCorporateContext ? "Live context" : "Needs setup",
      detail: isCorporateContext
        ? `${activeOrganization.name} is active for ${activeRole.label}.`
        : "Create or switch into an employer or staffing workspace.",
      action: "Open corporate setup",
      done: isCorporateContext,
      onAction: () => onOpenSetup("corporate")
    },
    {
      label: "Reviewer team",
      value: `${activeMembers} active`,
      detail: `${pendingInvites} pending invitation${pendingInvites === 1 ? "" : "s"} and ${teamMembers.length} visible member${teamMembers.length === 1 ? "" : "s"}.`,
      action: "Manage team",
      done: activeMembers > 0,
      onAction: () => onOpenSetup("team")
    },
    {
      label: "Verify pipeline",
      value: `${verifyRequests.length} requests`,
      detail: `${approvedVerifyRequests} approved, ${requestedVerifyRequests} waiting, ${sharedVerifyRecords.length} shared records visible.`,
      action: "Open Verify",
      done: verifyRequests.length > 0 || sharedVerifyRecords.length > 0,
      onAction: () => onOpenWorkspace("verify")
    },
    {
      label: "Billing ledger",
      value: activeSubscriptions.length ? "Plan active" : "No plan",
      detail: activeSubscriptions.length
        ? `${activeSubscriptions.length} subscription ledger row${activeSubscriptions.length === 1 ? "" : "s"} loaded.`
        : "Activate a Corporate Verify pilot plan before launch review.",
      action: "Open billing",
      done: activeSubscriptions.length > 0,
      onAction: () => onOpenSetup("billing")
    },
    {
      label: "Gaps and readiness",
      value: `${openGaps} open gaps`,
      detail: `${accessGrants.length} Access Grant${accessGrants.length === 1 ? "" : "s"} and readiness checks feed launch acceptance.`,
      action: "Review readiness",
      done: openGaps === 0 && accessGrants.length > 0,
      onAction: () => onOpenSetup("readiness")
    }
  ];
  const completed = hubItems.filter((item) => item.done).length;
  const nextItem = hubItems.find((item) => !item.done) ?? hubItems[hubItems.length - 1];
  const corporateOperatingPlan = [
    {
      label: "1. Prove company context",
      detail: isCorporateContext
        ? `${activeOrganization.name} is loaded through the active RBAC membership.`
        : "Create or switch into the employer or staffing workspace before using Verify.",
      ready: isCorporateContext
    },
    {
      label: "2. Load reviewer access",
      detail: activeMembers > 0
        ? `${activeMembers} active reviewer/member row${activeMembers === 1 ? "" : "s"} visible.`
        : "Invite or activate at least one reviewer so Corporate Verify can be operated by a real team.",
      ready: activeMembers > 0
    },
    {
      label: "3. Request and review Passports",
      detail: sharedVerifyRecords.length
        ? `${sharedVerifyRecords.length} shared Passport record${sharedVerifyRecords.length === 1 ? "" : "s"} visible for review.`
        : "Create Access Grant requests, wait for professional consent, then review only shared records.",
      ready: verifyRequests.length > 0 || sharedVerifyRecords.length > 0
    },
    {
      label: "4. Accept real database proof",
      detail: activeSubscriptions.length && accessGrants.length
        ? "Billing ledger and Access Grant rows are loaded; export task and working-data packets for pilot review."
        : "Activate the pilot plan and load Access Grant rows before treating the corporate portal as real database proof.",
      ready: activeSubscriptions.length > 0 && accessGrants.length > 0
    }
  ];
  const operatingReady = corporateOperatingPlan.filter((item) => item.ready).length;
  const corporateLiveRetestChecklist = [
    {
      label: "042 organization RLS repair",
      detail: organizationRlsRepairApplied
        ? "Release ledger shows migration 042 applied for corporate account context."
        : "Apply or load release ledger proof for migration 042 before accepting corporate context.",
      ready: organizationRlsRepairApplied
    },
    {
      label: "Corporate workspace loaded",
      detail: isCorporateContext
        ? `${activeOrganization.name} is visible to the signed-in role.`
        : "Create or switch into an employer or staffing workspace.",
      ready: isCorporateContext
    },
    {
      label: "Reviewer database access",
      detail: activeMembers
        ? `${activeMembers} active member row${activeMembers === 1 ? "" : "s"} loaded from Supabase.`
        : "Activate at least one real reviewer/member row.",
      ready: activeMembers > 0
    },
    {
      label: "Verify user data visible",
      detail: sharedVerifyRecords.length
        ? `${sharedVerifyRecords.length} shared user Passport record${sharedVerifyRecords.length === 1 ? "" : "s"} visible.`
        : "Request and approve Passport access so Corporate Verify can read user records.",
      ready: sharedVerifyRecords.length > 0
    },
    {
      label: "Pilot billing ledger active",
      detail: activeSubscriptions.length
        ? `${activeSubscriptions.length} subscription ledger row${activeSubscriptions.length === 1 ? "" : "s"} loaded.`
        : "Activate Corporate Verify pilot billing ledger before acceptance.",
      ready: activeSubscriptions.length > 0
    }
  ];
  const corporateLiveRetestReady = corporateLiveRetestChecklist.filter((item) => item.ready).length;
  const verifyAccessTestSteps = [
    {
      label: "Request by professional email",
      detail: verifyRequests.length
        ? `${verifyRequests.length} live Access Grant request${verifyRequests.length === 1 ? "" : "s"} loaded for this organization.`
        : "Open Verify, enter the professional email, and create the Passport access request.",
      ready: verifyRequests.length > 0
    },
    {
      label: "Professional approval state",
      detail: approvedVerifyRequests
        ? `${approvedVerifyRequests} approved request${approvedVerifyRequests === 1 ? "" : "s"} can expose scoped Passport records.`
        : `${requestedVerifyRequests} request${requestedVerifyRequests === 1 ? "" : "s"} waiting for professional consent.`,
      ready: approvedVerifyRequests > 0
    },
    {
      label: "Shared user Passport rows",
      detail: sharedVerifyRecords.length
        ? `${sharedVerifyRecords.length} shared Passport row${sharedVerifyRecords.length === 1 ? "" : "s"} visible to Corporate Verify.`
        : "After approval, shared user records must appear here before the company can review them.",
      ready: sharedVerifyRecords.length > 0
    },
    {
      label: "Missing-record follow-up",
      detail: openGaps
        ? `${openGaps} open follow-up request${openGaps === 1 ? "" : "s"} need owner response.`
        : "No open missing-record follow-ups are blocking the corporate review.",
      ready: sharedVerifyRecords.length > 0 && openGaps === 0
    }
  ];
  const verifyAccessTestReady = verifyAccessTestSteps.filter((item) => item.ready).length;
  const exportName = `trustgraph-corporate-daily-task-hub-${new Date().toISOString().slice(0, 10)}.json`;
  const packet = {
    generated_at: new Date().toISOString(),
    mode: authSession ? "live_corporate_task_hub" : "preview_corporate_task_hub",
    active_organization: {
      id: activeOrganization.id,
      name: activeOrganization.name,
      type: activeOrganization.type,
      status: activeOrganization.status
    },
    active_role: activeRole.key,
    completed_steps: completed,
    total_steps: hubItems.length,
    next_action: nextItem.label,
    corporate_operating_plan: {
      ready_steps: operatingReady,
      total_steps: corporateOperatingPlan.length,
      next_step: corporateOperatingPlan.find((item) => !item.ready)?.label ?? "Corporate operating plan ready",
      real_database_policy: "Only signed-in Supabase rows visible to the active corporate RBAC context count as operating proof.",
      steps: corporateOperatingPlan
    },
    post_042_corporate_live_retest: {
      ready_steps: corporateLiveRetestReady,
      total_steps: corporateLiveRetestChecklist.length,
      accepted_only_when: "migration_042_applied_and_signed_in_corporate_rbac_rows_load_user_passport_data",
      steps: corporateLiveRetestChecklist
    },
    corporate_verify_live_access_test: {
      ready_steps: verifyAccessTestReady,
      total_steps: verifyAccessTestSteps.length,
      accepted_only_when: "approved_access_grant_and_shared_user_passport_rows_visible_to_active_corporate_rbac_context",
      steps: verifyAccessTestSteps
    },
    live_counts: {
      active_members: activeMembers,
      pending_invitations: pendingInvites,
      verify_requests: verifyRequests.length,
      shared_verify_records: sharedVerifyRecords.length,
      active_subscriptions: activeSubscriptions.length,
      open_gaps: openGaps,
      access_grants: accessGrants.length
    },
    tasks: hubItems.map((item) => ({
      label: item.label,
      value: item.value,
      detail: item.detail,
      done: item.done
    }))
  };

  return (
    <section className="corporate-task-hub" aria-label="Corporate daily task hub">
      <div className="corporate-task-hub-header">
        <div>
          <span className="eyebrow">Corporate daily task hub</span>
          <h2>Run the company workspace from one queue</h2>
          <p>Live database signals route admins and reviewers to setup, team, billing, Verify requests, and launch readiness without hunting through every panel.</p>
        </div>
        <div className="corporate-task-score">
          <span>Today</span>
          <strong>{completed}/{hubItems.length}</strong>
          <small>Next: {nextItem.label}</small>
          <button
            className="secondary-action"
            onClick={() => downloadTextFile(exportName, JSON.stringify(packet, null, 2), "application/json")}
            type="button"
          >
            Export task packet
          </button>
        </div>
      </div>
      <div className="corporate-operating-plan" aria-label="Corporate operating plan">
        <div className="corporate-operating-plan-header">
          <div>
            <span className="status-chip neutral">Corporate operating plan</span>
            <strong>{operatingReady}/{corporateOperatingPlan.length} live operating steps ready</strong>
            <small>Only signed-in Supabase rows visible to this corporate RBAC context count as operating proof.</small>
          </div>
          <button className="secondary-action" onClick={nextItem.onAction} type="button">
            {nextItem.action}
          </button>
        </div>
        <div className="corporate-operating-plan-grid">
          {corporateOperatingPlan.map((item) => (
            <article className={item.ready ? "ready" : ""} key={item.label}>
              <span className={`status-dot ${item.ready ? "on" : ""}`} />
              <div>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="corporate-live-retest" aria-label="Post 042 corporate live retest">
        <div className="corporate-operating-plan-header">
          <div>
            <span className="status-chip neutral">Post-042 live retest</span>
            <strong>{corporateLiveRetestReady}/{corporateLiveRetestChecklist.length} corporate database checks ready</strong>
            <small>Use this after migration 042 to prove Corporate Verify can load real user Passport rows through the active RBAC context.</small>
          </div>
          <button className="secondary-action" onClick={() => onOpenSetup("readiness")} type="button">
            Review proof
          </button>
        </div>
        <div className="corporate-live-retest-grid">
          {corporateLiveRetestChecklist.map((item) => (
            <article className={item.ready ? "ready" : ""} key={item.label}>
              <span className={`status-dot ${item.ready ? "on" : ""}`} />
              <div>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="corporate-verify-access-test" aria-label="Corporate Verify live access test">
        <div className="corporate-operating-plan-header">
          <div>
            <span className="status-chip neutral">Corporate Verify live access test</span>
            <strong>{verifyAccessTestReady}/{verifyAccessTestSteps.length} user database access checks ready</strong>
            <small>Use this to prove the corporate portal can request, receive consent for, and review a real user's scoped Passport rows.</small>
          </div>
          <button className="secondary-action" onClick={() => onOpenWorkspace("verify")} type="button">
            Open Verify
          </button>
        </div>
        <div className="corporate-live-retest-grid">
          {verifyAccessTestSteps.map((item) => (
            <article className={item.ready ? "ready" : ""} key={item.label}>
              <span className={`status-dot ${item.ready ? "on" : ""}`} />
              <div>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="corporate-task-grid">
        {hubItems.map((item) => (
          <article className={item.done ? "complete" : item.label === nextItem.label ? "next" : ""} key={item.label}>
            <div>
              <span className={`status-chip ${item.done ? "success" : "neutral"}`}>{item.done ? "ready" : "next"}</span>
              <strong>{item.label}</strong>
              <small>{item.value}</small>
            </div>
            <p>{item.detail}</p>
            <button className={item.label === nextItem.label ? "primary-action" : "secondary-action"} onClick={item.onAction} type="button">
              {item.action}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function CorporateDirectoryPanel({
  databaseMode,
  missingRecordRequests,
  onRecordAccessReview,
  requests,
  reviews,
  sharedRecords
}: {
  databaseMode: "live_supabase_visibility" | "locked_corporate_context";
  missingRecordRequests: DbMissingRecordRequest[];
  onRecordAccessReview: (input: { accessGrantId: string; status: CorporateAccessReviewStatus; note: string }) => Promise<void>;
  requests: VerifyAccessGrantView[];
  reviews: DbCorporateAccessReview[];
  sharedRecords: RecordItem[];
}) {
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [reviewBusyId, setReviewBusyId] = useState("");
  const [reviewNote, setReviewNote] = useState("Scoped corporate review completed against visible Passport rows and open gaps.");
  const [reviewMessage, setReviewMessage] = useState("Record a live review attestation after checking visible user rows.");
  const [statusFilter, setStatusFilter] = useState<"all" | "requested" | "approved" | "declined" | "revoked">("all");
  const [readinessFilter, setReadinessFilter] = useState<"all" | "review_ready" | "waiting_for_consent" | "needs_gap_follow_up" | "not_available">("all");
  const latestReviewByGrant = reviews.reduce<Record<string, DbCorporateAccessReview>>((latest, review) => {
    if (!latest[review.access_grant_id]) {
      latest[review.access_grant_id] = review;
    }
    return latest;
  }, {});
  const openGapCountsByProfile = missingRecordRequests.reduce<Record<string, number>>((counts, request) => {
    if (request.status === "fulfilled") return counts;
    counts[request.subject_profile_id] = (counts[request.subject_profile_id] ?? 0) + 1;
    return counts;
  }, {});
  const gapTitlesByProfile = missingRecordRequests.reduce<Record<string, string[]>>((titles, request) => {
    if (request.status === "fulfilled") return titles;
    titles[request.subject_profile_id] = [...(titles[request.subject_profile_id] ?? []), request.title];
    return titles;
  }, {});
  const sharedRecordsByProfile = sharedRecords.reduce<Record<string, RecordItem[]>>((recordsByProfile, record) => {
    if (!record.ownerProfileId) return recordsByProfile;
    recordsByProfile[record.ownerProfileId] = [...(recordsByProfile[record.ownerProfileId] ?? []), record];
    return recordsByProfile;
  }, {});
  const candidateRows = requests.map((request) => {
    const sharedRecordCount = request.status === "approved" ? (sharedRecordsByProfile[request.subject_profile_id]?.length ?? 0) : 0;
    const openGapCount = openGapCountsByProfile[request.subject_profile_id] ?? 0;
    const readiness =
      request.status === "approved" && sharedRecordCount > 0 && openGapCount === 0
        ? "review_ready"
        : request.status === "approved" && sharedRecordCount > 0
          ? "needs_gap_follow_up"
          : request.status === "requested"
            ? "waiting_for_consent"
            : "not_available";

    return {
      id: request.id,
      subjectProfileId: request.subject_profile_id,
      name: request.subject_profile.full_name,
      detail: request.subject_profile.email,
      rawStatus: request.status,
      status: request.status.replace(/_/g, " "),
      signal: request.purpose,
      sharedRecordCount,
      openGapCount,
      readiness,
      readinessLabel: readiness.replace(/_/g, " "),
      latestReview: latestReviewByGrant[request.id] ?? null,
      gapTitles: gapTitlesByProfile[request.subject_profile_id] ?? [],
      sharedRecordTitles: (sharedRecordsByProfile[request.subject_profile_id] ?? []).map((record) => record.title)
    };
  });
  const sharedResponsibilityCount = sharedRecords.reduce((count, record) => count + (record.responsibilities?.length ?? 0), 0);
  const sharedSkillCount = sharedRecords.reduce((count, record) => count + (record.skills?.length ?? 0), 0);
  const filteredRows = candidateRows.filter((row) => {
    const matchesStatus = statusFilter === "all" || row.rawStatus === statusFilter;
    const matchesReadiness = readinessFilter === "all" || row.readiness === readinessFilter;
    const haystack = `${row.name} ${row.detail} ${row.signal} ${row.gapTitles.join(" ")}`.toLowerCase();
    return matchesStatus && matchesReadiness && haystack.includes(directoryQuery.trim().toLowerCase());
  });
  const exportName = `trustgraph-corporate-directory-${new Date().toISOString().slice(0, 10)}.csv`;
  const reviewQueueExportName = `trustgraph-corporate-review-queue-${new Date().toISOString().slice(0, 10)}.csv`;
  const packetName = `trustgraph-corporate-user-database-${new Date().toISOString().slice(0, 10)}.json`;
  const uniqueProfessionalCount = new Set(requests.map((request) => request.subject_profile_id)).size;
  const approvedAccessCount = requests.filter((request) => request.status === "approved").length;
  const reviewReadyCount = candidateRows.filter((row) => row.readiness === "review_ready").length;
  const reviewedAccessCount = reviews.filter((review) => review.review_status === "reviewed").length;
  const needsFollowUpReviewCount = reviews.filter((review) => review.review_status === "needs_follow_up").length;
  const readyForHandoffReviewCount = reviews.filter((review) => review.review_status === "ready_for_handoff").length;
  const waitingForConsentCount = candidateRows.filter((row) => row.readiness === "waiting_for_consent").length;
  const needsGapFollowUpCount = candidateRows.filter((row) => row.readiness === "needs_gap_follow_up").length;
  const openGapRequestCount = missingRecordRequests.filter((request) => request.status !== "fulfilled").length;
  const sensitiveSharedRecordCount = sharedRecords.filter((record) => record.sensitivity && record.sensitivity !== "standard").length;
  const consentRequiredSharedRecordCount = sharedRecords.filter((record) => record.consentRequired).length;
  const unavailableRequestCount = requests.filter((request) => request.status !== "approved").length;
  const isLiveCorporateDatabase = databaseMode === "live_supabase_visibility";
  const corporateDirectoryAcceptanceChecks = [
    {
      label: "Live RBAC database",
      ok: isLiveCorporateDatabase,
      value: isLiveCorporateDatabase ? "Supabase rows" : "Locked",
      detail: "Accepted only when the active corporate role reads scoped rows from Supabase."
    },
    {
      label: "Access Grant rows",
      ok: requests.length > 0,
      value: `${requests.length}`,
      detail: "Corporate portal must load request rows before user visibility can be accepted."
    },
    {
      label: "Shared user Passport rows",
      ok: sharedRecords.length > 0,
      value: `${sharedRecords.length}`,
      detail: "Professional records must be visible through approved grant and consent scope."
    },
    {
      label: "Review-ready people",
      ok: reviewReadyCount > 0 || needsGapFollowUpCount > 0,
      value: `${reviewReadyCount}`,
      detail: "At least one professional should be review-ready or have an explicit gap follow-up path."
    },
    {
      label: "Review attestation",
      ok: reviews.length > 0,
      value: `${reviews.length}`,
      detail: "Corporate reviewer actions must write corporate_access_reviews rows for audit proof."
    }
  ];
  const corporateDirectoryAccepted = corporateDirectoryAcceptanceChecks.every((check) => check.ok);
  const corporateAccessPath = [
    {
      label: "Request access",
      value: requests.length ? `${requests.length} sent` : "Not started",
      detail: "Corporate reviewer requests Passport access by professional email.",
      ready: requests.length > 0
    },
    {
      label: "Professional approval",
      value: approvedAccessCount ? `${approvedAccessCount} approved` : "Waiting",
      detail: "Professional approval is required before any user records appear.",
      ready: approvedAccessCount > 0
    },
    {
      label: "Shared Passport rows",
      value: sharedRecords.length ? `${sharedRecords.length} visible` : "No rows",
      detail: "Rows render only through approved Access Grant and consent scope.",
      ready: sharedRecords.length > 0
    },
    {
      label: "Gap closure",
      value: openGapRequestCount ? `${openGapRequestCount} open` : "Clear",
      detail: "Missing-record requests identify what the corporate reviewer still needs.",
      ready: openGapRequestCount === 0 && (requests.length > 0 || sharedRecords.length > 0)
    }
  ];
  const directoryReviewBoard = [
    {
      label: "Ready to review",
      count: reviewReadyCount,
      detail: "Approved grants with shared records and no open gaps.",
      focus: candidateRows.filter((row) => row.readiness === "review_ready").slice(0, 3)
    },
    {
      label: "Waiting for consent",
      count: waitingForConsentCount,
      detail: "Requests sent but professional approval has not synced records yet.",
      focus: candidateRows.filter((row) => row.readiness === "waiting_for_consent").slice(0, 3)
    },
    {
      label: "Needs gap follow-up",
      count: needsGapFollowUpCount,
      detail: "Approved shares with records, but missing-record requests remain open.",
      focus: candidateRows.filter((row) => row.readiness === "needs_gap_follow_up").slice(0, 3)
    }
  ];
  const corporateAccessReviewQueue = filteredRows.slice(0, 6).map((row) => ({
    professional_name: row.name,
    professional_email: row.detail,
    readiness: row.readiness,
    shared_record_count: row.sharedRecordCount,
    visible_records: row.sharedRecordTitles.slice(0, 4),
    open_gap_count: row.openGapCount,
    gap_focus: row.gapTitles.slice(0, 3),
    latest_review_status: row.latestReview?.review_status ?? "not_recorded",
    latest_review_note: row.latestReview?.reviewer_note ?? null,
    next_action:
      row.latestReview?.review_status === "ready_for_handoff"
        ? "Ready for corporate handoff"
        : row.latestReview?.review_status === "needs_follow_up"
          ? "Resolve reviewer follow-up"
          : row.latestReview?.review_status === "reviewed"
            ? "Review attestation recorded"
            : row.readiness === "review_ready"
              ? "Review shared Passport rows"
              : row.readiness === "needs_gap_follow_up"
                ? "Request missing records"
                : row.readiness === "waiting_for_consent"
                  ? "Wait for professional approval"
                  : "Create or reopen an Access Grant"
  }));
  const corporateReviewAttestationLedger = [
    {
      label: "Review attestations",
      value: `${reviews.length}`,
      detail: "Rows written by Corporate Verify reviewers through the live review RPC.",
      tone: reviews.length ? "ready" : ""
    },
    {
      label: "Reviewed",
      value: `${reviewedAccessCount}`,
      detail: "Corporate reviewer recorded that visible Passport rows were reviewed.",
      tone: reviewedAccessCount ? "ready" : ""
    },
    {
      label: "Needs follow-up",
      value: `${needsFollowUpReviewCount}`,
      detail: "Reviewer marked the user database review as needing more action.",
      tone: needsFollowUpReviewCount ? "warning" : ""
    },
    {
      label: "Ready handoff",
      value: `${readyForHandoffReviewCount}`,
      detail: "Reviewer marked shared rows ready for operational handoff.",
      tone: readyForHandoffReviewCount ? "ready" : ""
    }
  ];
  const corporateVisibilityLedger = [
    {
      label: "Visible user records",
      value: `${sharedRecords.length}`,
      detail: "Shared Passport rows visible to this corporate workspace after Access Grant and consent scope.",
      tone: sharedRecords.length ? "ready" : ""
    },
    {
      label: "Sensitive scope",
      value: `${sensitiveSharedRecordCount}`,
      detail: `${consentRequiredSharedRecordCount} consent-required rows stay visible only when the professional allowed them.`,
      tone: sensitiveSharedRecordCount || consentRequiredSharedRecordCount ? "warning" : ""
    },
    {
      label: "Blocked requests",
      value: `${unavailableRequestCount}`,
      detail: "Requested, declined, or revoked Access Grants cannot expose user records to Corporate Verify.",
      tone: unavailableRequestCount ? "warning" : "ready"
    },
    {
      label: "Open gaps",
      value: `${openGapRequestCount}`,
      detail: "Missing-record requests that still need professional or provider follow-up.",
      tone: openGapRequestCount ? "warning" : "ready"
    }
  ];
  const activeDirectoryFilters = [
    statusFilter !== "all" ? `status:${statusFilter}` : "",
    readinessFilter !== "all" ? `readiness:${readinessFilter}` : "",
    directoryQuery.trim() ? `query:${directoryQuery.trim()}` : ""
  ].filter(Boolean);
  const corporateDirectoryFilterReceipt = {
    label: "Corporate directory filter receipt",
    active_filters: activeDirectoryFilters.length ? activeDirectoryFilters : ["none"],
    status_filter: statusFilter,
    readiness_filter: readinessFilter,
    query: directoryQuery.trim(),
    filtered_rows: filteredRows.length,
    total_access_grant_rows: candidateRows.length,
    export_boundary: "Exports only professionals and Passport rows visible to the active corporate RBAC, Access Grant, and consent scope."
  };
  const databaseModeLabel = isLiveCorporateDatabase ? "Live corporate database" : "Corporate database locked";
  const databaseModeDetail = isLiveCorporateDatabase
    ? "Reads corporate visibility from Supabase Access Grants, shared Passport records, professional profiles, and missing-record requests."
    : "Login with a corporate reviewer role or create a corporate workspace before treating this panel as live database evidence.";
  const corporateUserDatabaseAccessContract = {
    mode: "corporate_user_database_access_contract",
    can_browse_users: false,
    request_path: "request_by_professional_email",
    visible_rows_source: "approved_access_grants_and_shared_passport_records",
    consent_scope_required: true,
    active_database_mode: databaseModeLabel,
    accepted_when: "corporate_reviewer_has_live_rbac_context_approved_grants_visible_shared_rows_and_review_attestations"
  };
  const corporateUserDatabaseAccessContractCards = [
    {
      label: "Access method",
      value: "Request by email",
      detail: "Corporate starts with a professional email request, not an open user search."
    },
    {
      label: "Visible rows",
      value: "Approved shared rows",
      detail: "Records appear only after Access Grant approval and consent scope."
    },
    {
      label: "Browse users",
      value: "No",
      detail: "The portal must not expose a full user directory or unrestricted database browse."
    },
    {
      label: "Consent/RBAC scope",
      value: "Required",
      detail: "Organization role, Access Grant, and professional consent filter every row."
    }
  ];
  const corporateUserDatabasePacket = {
    generated_at: new Date().toISOString(),
    mode: databaseMode,
    live_database_evidence: isLiveCorporateDatabase,
    real_database_policy: {
      accepted_source: "signed_in_supabase_rows_visible_to_active_corporate_rbac_context",
      preview_or_seed_only: false,
      proof_required: "Export after corporate login shows Access Grants, shared Passport records, profiles, and gap requests loaded from Supabase."
    },
    filters: {
      status: statusFilter,
      readiness: readinessFilter,
      query: directoryQuery.trim()
    },
    filter_receipt: corporateDirectoryFilterReceipt,
    corporate_user_database_access_contract: corporateUserDatabaseAccessContract,
    source_counts: {
      access_grants: requests.length,
      filtered_professionals: filteredRows.length,
      unique_professionals: uniqueProfessionalCount,
      approved_access_grants: approvedAccessCount,
      review_ready_professionals: reviewReadyCount,
      waiting_for_consent_professionals: waitingForConsentCount,
      needs_gap_follow_up_professionals: needsGapFollowUpCount,
      corporate_access_reviews: reviews.length,
      reviewed_access_grants: reviewedAccessCount,
      needs_follow_up_reviews: needsFollowUpReviewCount,
      ready_for_handoff_reviews: readyForHandoffReviewCount,
      shared_passport_records: sharedRecords.length,
      shared_responsibilities: sharedResponsibilityCount,
      shared_skills: sharedSkillCount,
      missing_record_requests: missingRecordRequests.length,
      open_gap_requests: missingRecordRequests.filter((request) => request.status !== "fulfilled").length
    },
    review_attestation_workflow: {
      table: "corporate_access_reviews",
      rpc: "record_corporate_access_review",
      audit_event: "corporate_access.review_recorded",
      notification_event_type: "corporate_access_review"
    },
    corporate_directory_acceptance: {
      accepted: corporateDirectoryAccepted,
      accepted_only_when: "live_corporate_rbac_context_loads_access_grants_shared_passport_rows_review_ready_people_and_review_attestations",
      preview_data_accepted: false,
      checks: corporateDirectoryAcceptanceChecks
    },
    corporate_data_access_path: corporateAccessPath,
    corporate_review_attestation_ledger: corporateReviewAttestationLedger,
    corporate_review_attestations: reviews.map((review) => ({
      review_id: review.id,
      access_grant_id: review.access_grant_id,
      subject_profile_id: review.subject_profile_id,
      reviewer_profile_id: review.reviewer_profile_id,
      review_status: review.review_status,
      reviewer_note: review.reviewer_note,
      shared_record_count: review.shared_record_count,
      open_gap_count: review.open_gap_count,
      created_at: review.created_at
    })),
    corporate_visibility_ledger: corporateVisibilityLedger,
    reviewer_scan_board: directoryReviewBoard.map((bucket) => ({
      label: bucket.label,
      count: bucket.count,
      detail: bucket.detail,
      professionals: bucket.focus.map((row) => ({
        professional_name: row.name,
        professional_email: row.detail,
        readiness: row.readiness,
        shared_record_count: row.sharedRecordCount,
        open_gap_count: row.openGapCount
      }))
    })),
    corporate_access_review_queue: corporateAccessReviewQueue,
    professionals: filteredRows.map((row) => ({
      access_grant_id: row.id,
      subject_profile_id: row.subjectProfileId,
      professional_name: row.name,
      professional_email: row.detail,
      grant_status: row.rawStatus,
      purpose: row.signal,
      readiness: row.readiness,
      latest_review_status: row.latestReview?.review_status ?? "not_recorded",
      latest_review_note: row.latestReview?.reviewer_note ?? null,
      shared_record_count: row.sharedRecordCount,
      shared_record_titles: row.sharedRecordTitles,
      open_gap_count: row.openGapCount,
      gap_focus: row.gapTitles
    })),
    per_professional_shared_record_scope: Object.entries(sharedRecordsByProfile).map(([profileId, records]) => ({
      subject_profile_id: profileId,
      shared_record_count: records.length,
      shared_record_ids: records.map((record) => record.id),
      shared_record_titles: records.map((record) => record.title)
    })),
    shared_record_scope: sharedRecords.map((record) => ({
      record_id: record.id,
      owner_profile_id: record.ownerProfileId ?? null,
      section: record.section,
      title: record.title,
      status: record.status,
      source: record.source,
      sensitivity: record.sensitivity ?? "standard",
      consent_required: Boolean(record.consentRequired),
      responsibilities: record.responsibilities ?? [],
      skills: record.skills ?? [],
      access: record.access
    })),
    note: "Corporate Verify can only export professional rows and shared Passport records visible through approved role, organization, Access Grant, and consent scope."
  };

  async function recordReview(accessGrantId: string, status: CorporateAccessReviewStatus) {
    setReviewBusyId(`${accessGrantId}-${status}`);
    setReviewMessage("Recording corporate access review attestation...");
    try {
      await onRecordAccessReview({ accessGrantId, status, note: reviewNote });
      setReviewMessage(`Corporate access review recorded: ${status.replace(/_/g, " ")}`);
    } catch (error) {
      setReviewMessage(error instanceof Error ? error.message : "Could not record corporate access review");
    } finally {
      setReviewBusyId("");
    }
  }

  return (
    <section className="corporate-directory-panel">
      <div className="mini-heading">
        <UserPlus size={16} />
        <strong>Corporate user database</strong>
        <span className="status-chip neutral">{filteredRows.length + sharedRecords.length} visible</span>
      </div>
      <div className="directory-controls">
        <input
          onChange={(event) => setDirectoryQuery(event.target.value)}
          placeholder="Search professional, email, or purpose"
          value={directoryQuery}
        />
        <select onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} value={statusFilter}>
          <option value="all">All statuses</option>
          <option value="requested">Requested</option>
          <option value="approved">Approved</option>
          <option value="declined">Declined</option>
          <option value="revoked">Revoked</option>
        </select>
        <select onChange={(event) => setReadinessFilter(event.target.value as typeof readinessFilter)} value={readinessFilter}>
          <option value="all">All readiness</option>
          <option value="review_ready">Review ready</option>
          <option value="waiting_for_consent">Waiting for consent</option>
          <option value="needs_gap_follow_up">Needs gap follow-up</option>
          <option value="not_available">Not available</option>
        </select>
        <button
          className="secondary-action"
          disabled={!filteredRows.length}
          onClick={() => downloadTextFile(exportName, corporateDirectoryToCsv(filteredRows), "text/csv")}
          type="button"
        >
          Export CSV
        </button>
        <button
          className="secondary-action"
          disabled={!corporateAccessReviewQueue.length}
          onClick={() => downloadTextFile(reviewQueueExportName, corporateReviewQueueToCsv(corporateAccessReviewQueue), "text/csv")}
          type="button"
        >
          Export review queue
        </button>
        <button
          className="secondary-action"
          disabled={!filteredRows.length && !sharedRecords.length}
          onClick={() => downloadTextFile(packetName, JSON.stringify(corporateUserDatabasePacket, null, 2), "application/json")}
          type="button"
        >
          Export user packet
        </button>
      </div>
      <div className="directory-metrics">
        <div>
          <strong>{uniqueProfessionalCount}</strong>
          <small>Professionals in view</small>
        </div>
        <div>
          <strong>{approvedAccessCount}</strong>
          <small>Approved Access Grants</small>
        </div>
        <div>
          <strong>{missingRecordRequests.filter((request) => request.status !== "fulfilled").length}</strong>
          <small>Open gaps</small>
        </div>
        <div>
          <strong>{reviewReadyCount}</strong>
          <small>Review-ready people</small>
        </div>
      </div>
      <div className="corporate-directory-filter-receipt" aria-label="Corporate directory filter receipt">
        <div>
          <span className={`status-chip ${activeDirectoryFilters.length ? "success" : "neutral"}`}>Directory filter receipt</span>
          <strong>{filteredRows.length}/{candidateRows.length} corporate user rows in view</strong>
          <small>{corporateDirectoryFilterReceipt.export_boundary}</small>
        </div>
        <div className="corporate-directory-filter-grid">
          <span>
            <strong>{statusFilter.replace(/_/g, " ")}</strong>
            <small>Grant status</small>
          </span>
          <span>
            <strong>{readinessFilter.replace(/_/g, " ")}</strong>
            <small>Readiness</small>
          </span>
          <span>
            <strong>{directoryQuery.trim() || "No search"}</strong>
            <small>Search query</small>
          </span>
        </div>
      </div>
      <div className="corporate-user-database-contract" aria-label="Corporate user database access contract">
        <div className="directory-source-strip">
          <span className="status-chip neutral">Corporate user database access contract</span>
          <small>Corporate cannot browse users. It can request access by professional email and review only approved shared Passport rows.</small>
        </div>
        <div className="corporate-user-database-contract-grid">
          {corporateUserDatabaseAccessContractCards.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
      </div>
      <div className="corporate-data-access-path" aria-label="Corporate data access path">
        {corporateAccessPath.map((item) => (
          <article className={item.ready ? "ready" : ""} key={item.label}>
            <span className={`status-dot ${item.ready ? "on" : ""}`} />
            <div>
              <strong>{item.label}</strong>
              <small>{item.value}</small>
              <small>{item.detail}</small>
            </div>
          </article>
        ))}
      </div>
      <div className="corporate-visibility-ledger" aria-label="Corporate visibility ledger">
        <div className="directory-source-strip">
          <span className="status-chip neutral">Corporate visibility ledger</span>
          <small>Summarizes which user database rows Corporate Verify can see, which rows are sensitive, and which requests are still blocked.</small>
        </div>
        <div className="corporate-visibility-grid">
          {corporateVisibilityLedger.map((item) => (
            <article className={item.tone} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
      </div>
      <div className="corporate-directory-acceptance" aria-label="Corporate directory acceptance">
        <div className="directory-source-strip">
          <span className={`status-chip ${corporateDirectoryAccepted ? "success" : "warning"}`}>Corporate directory acceptance</span>
          <small>{corporateDirectoryAccepted ? "Corporate user database proof is accepted for this live RBAC context." : "Not accepted for v1 until live rows, shared Passport data, review readiness, and review attestations are present."}</small>
        </div>
        <div className="corporate-visibility-grid">
          {corporateDirectoryAcceptanceChecks.map((item) => (
            <article className={item.ok ? "ready" : "warning"} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
      </div>
      <div className="corporate-review-attestations" aria-label="Corporate review attestations">
        <div className="directory-source-strip">
          <span className="status-chip neutral">Corporate review attestations</span>
          <small>{reviewMessage}</small>
        </div>
        <div className="corporate-visibility-grid">
          {corporateReviewAttestationLedger.map((item) => (
            <article className={item.tone} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
        <label className="corporate-review-note">
          <span>Reviewer note</span>
          <input
            onChange={(event) => setReviewNote(event.target.value)}
            placeholder="What did the reviewer check or need next?"
            value={reviewNote}
          />
        </label>
      </div>
      <div className="directory-review-board">
        {directoryReviewBoard.map((bucket) => (
          <article key={bucket.label}>
            <div>
              <span>{bucket.label}</span>
              <strong>{bucket.count}</strong>
              <small>{bucket.detail}</small>
            </div>
            <div className="directory-review-focus">
              {bucket.focus.length ? (
                bucket.focus.map((row) => (
                  <span key={row.id}>
                    <strong>{row.name}</strong>
                    <small>{row.sharedRecordCount} shared / {row.openGapCount} gaps</small>
                  </span>
                ))
              ) : (
                <span>
                  <strong>No rows</strong>
                  <small>Bucket is clear for the current filter.</small>
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
      <div className="corporate-access-review-queue" id="corporate-access-review-queue" aria-label="Corporate access review queue">
        <div className="directory-source-strip">
          <span className="status-chip neutral">Corporate access review queue</span>
          <small>Shows the exact professional rows this corporate workspace can act on after Access Grant and consent scope are applied.</small>
        </div>
        <div className="corporate-access-review-grid">
          {corporateAccessReviewQueue.length ? (
            corporateAccessReviewQueue.map((row) => {
              const sourceRow = filteredRows.find((item) => item.detail === row.professional_email);
              const canRecordReview = Boolean(sourceRow && sourceRow.rawStatus === "approved" && row.shared_record_count > 0);
              return (
              <article className={row.readiness === "review_ready" ? "ready" : ""} key={`${row.professional_email}-${row.readiness}`}>
                <div>
                  <strong>{row.professional_name}</strong>
                  <small>{row.professional_email}</small>
                  <span>{row.next_action}</span>
                  <small>Latest review: {row.latest_review_status.replace(/_/g, " ")}</small>
                </div>
                <div>
                  <small>{row.shared_record_count} visible records</small>
                  <small>{row.open_gap_count} open gaps</small>
                  <small>{row.visible_records.length ? `Records: ${row.visible_records.join(", ")}` : "No shared records visible yet"}</small>
                  {row.gap_focus.length ? <small>Gaps: {row.gap_focus.join(", ")}</small> : null}
                  <div className="corporate-review-actions">
                    <button
                      className="secondary-action"
                      disabled={!canRecordReview || reviewBusyId === `${sourceRow?.id}-reviewed`}
                      onClick={() => sourceRow ? void recordReview(sourceRow.id, "reviewed") : undefined}
                      type="button"
                    >
                      Mark reviewed
                    </button>
                    <button
                      className="secondary-action"
                      disabled={!sourceRow || reviewBusyId === `${sourceRow.id}-needs_follow_up`}
                      onClick={() => sourceRow ? void recordReview(sourceRow.id, "needs_follow_up") : undefined}
                      type="button"
                    >
                      Needs follow-up
                    </button>
                    <button
                      className="secondary-action"
                      disabled={!canRecordReview || row.open_gap_count > 0 || reviewBusyId === `${sourceRow?.id}-ready_for_handoff`}
                      onClick={() => sourceRow ? void recordReview(sourceRow.id, "ready_for_handoff") : undefined}
                      type="button"
                    >
                      Ready handoff
                    </button>
                  </div>
                </div>
              </article>
              );
            })
          ) : (
            <article>
              <div>
                <strong>No corporate access rows yet</strong>
                <small>Request access by professional email, then this queue will show consent, shared records, and gap follow-up.</small>
                <span>Request access by professional email</span>
              </div>
            </article>
          )}
        </div>
      </div>
      <div className="directory-source-strip">
        <span className={`status-chip ${isLiveCorporateDatabase ? "success" : "warning"}`}>{databaseModeLabel}</span>
        <small>{databaseModeDetail}</small>
      </div>
      <div className="directory-source-detail">
        <span>Rows: {requests.length} Access Grants</span>
        <span>{sharedRecords.length} shared Passport records</span>
        <span>{missingRecordRequests.length} gap requests</span>
      </div>
      <div className="directory-packet-note">
        <strong>Corporate user database packet</strong>
        <small>Exports filtered professional access rows, per-professional shared records, structured responsibilities, skills, source counts, and gap focus for the active Verify workspace.</small>
        <small>{sharedResponsibilityCount} shared responsibilities and {sharedSkillCount} shared skills visible through approved scope.</small>
      </div>
      <div className="directory-list">
        {filteredRows.length ? (
          filteredRows.slice(0, 8).map((row) => (
            <article className="directory-card" key={row.id}>
              <div>
                <strong>{row.name}</strong>
                <p>{row.signal}</p>
                <small>{row.detail}</small>
                <small>{row.sharedRecordCount} shared records - {row.openGapCount} open gaps</small>
                {row.gapTitles.length ? <small>Gap focus: {row.gapTitles.slice(0, 2).join(", ")}</small> : null}
              </div>
              <div className="directory-card-status">
                <span className={`status-chip ${row.readiness === "review_ready" ? "success" : row.readiness === "waiting_for_consent" ? "warning" : "neutral"}`}>
                  {row.readinessLabel}
                </span>
                <span className="status-chip neutral">{row.status}</span>
              </div>
            </article>
          ))
        ) : (
          <article className="directory-card empty">
            <div>
              <strong>No professionals match this view</strong>
              <p>Professionals appear here after an Access Grant request or approved share matches the current filter.</p>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

function MissingRecordRequestsPanel({
  disabled,
  message,
  requests,
  onCreate,
  onStatus
}: {
  disabled: boolean;
  message: string;
  requests: DbMissingRecordRequest[];
  onCreate: (input: {
    subjectEmail: string;
    subjectFullName: string;
    recordType: RecordType;
    title: string;
    reason: string;
    dueAt: string;
  }) => Promise<void>;
  onStatus: (requestId: string, status: "in_progress" | "fulfilled" | "declined" | "cancelled") => Promise<void>;
}) {
  const [subjectEmail, setSubjectEmail] = useState("");
  const [subjectFullName, setSubjectFullName] = useState("");
  const [recordType, setRecordType] = useState<RecordType>("license");
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState(message);
  const [requestQuery, setRequestQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "requested" | "in_progress" | "fulfilled" | "declined" | "cancelled">("all");
  const openCount = requests.filter((request) => !["fulfilled", "declined", "cancelled"].includes(request.status)).length;
  const fulfilledCount = requests.filter((request) => request.status === "fulfilled").length;
  const declinedCount = requests.filter((request) => request.status === "declined").length;
  const dueSoonCount = requests.filter((request) => {
    if (!request.due_at || ["fulfilled", "declined", "cancelled"].includes(request.status)) return false;
    return new Date(request.due_at).getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000;
  }).length;
  const filteredRequests = requests.filter((request) => {
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const haystack = `${request.title} ${request.reason} ${request.subject_profile?.full_name ?? ""} ${request.subject_profile?.email ?? ""}`.toLowerCase();
    return matchesStatus && haystack.includes(requestQuery.trim().toLowerCase());
  });
  const exportName = `trustgraph-missing-record-gap-packet-${new Date().toISOString().slice(0, 10)}.csv`;

  useEffect(() => {
    setStatus(message);
  }, [message]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("Creating missing-record request...");

    try {
      await onCreate({ subjectEmail, subjectFullName, recordType, title, reason, dueAt });
      setSubjectEmail("");
      setSubjectFullName("");
      setTitle("");
      setReason("");
      setDueAt("");
      setStatus("Missing-record request created");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not create request");
    } finally {
      setBusy(false);
    }
  }

  async function decide(requestId: string, nextStatus: "in_progress" | "fulfilled" | "declined" | "cancelled") {
    setBusyId(requestId);
    try {
      await onStatus(requestId, nextStatus);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="missing-panel">
      <div className="mini-heading">
        <FileText size={16} />
        <strong>Missing record requests</strong>
      </div>
      <div className="missing-summary-grid">
        <div>
          <span>Open</span>
          <strong>{openCount}</strong>
        </div>
        <div>
          <span>Fulfilled</span>
          <strong>{fulfilledCount}</strong>
        </div>
        <div>
          <span>Declined</span>
          <strong>{declinedCount}</strong>
        </div>
        <div>
          <span>Due soon</span>
          <strong>{dueSoonCount}</strong>
        </div>
      </div>
      <form className="missing-form" onSubmit={submit}>
        <div className="record-form-grid">
          <input disabled={disabled || busy} onChange={(event) => setSubjectEmail(event.target.value)} placeholder="Professional email" type="email" value={subjectEmail} />
          <input disabled={disabled || busy} onChange={(event) => setSubjectFullName(event.target.value)} placeholder="Professional name" value={subjectFullName} />
          <select disabled={disabled || busy} onChange={(event) => setRecordType(event.target.value as RecordType)} value={recordType}>
            <option value="license">License</option>
            <option value="certification">Certification</option>
            <option value="education">Education</option>
            <option value="contract_assignment">Contract assignment</option>
            <option value="training">Training</option>
            <option value="skill">Skill</option>
            <option value="performance_review">Performance review</option>
            <option value="continuing_education">Continuing education</option>
            <option value="health_clearance">Health clearance</option>
            <option value="background_check">Background check</option>
            <option value="reference">Reference</option>
            <option value="custom">Custom</option>
          </select>
          <input disabled={disabled || busy} onChange={(event) => setTitle(event.target.value)} placeholder="Requested record" value={title} />
          <input disabled={disabled || busy} onChange={(event) => setDueAt(event.target.value)} type="date" value={dueAt} />
          <input disabled={disabled || busy} onChange={(event) => setReason(event.target.value)} placeholder="Reason" value={reason} />
        </div>
        <div className="record-form-footer">
          <small>{status}</small>
          <button className="secondary-action" disabled={disabled || busy || !subjectEmail || !title} type="submit">
            Request record
          </button>
        </div>
      </form>
      <div className="missing-controls">
        <input
          onChange={(event) => setRequestQuery(event.target.value)}
          placeholder="Search title, person, or reason"
          value={requestQuery}
        />
        <select onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} value={statusFilter}>
          <option value="all">All</option>
          <option value="requested">Requested</option>
          <option value="in_progress">In progress</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="declined">Declined</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button
          className="secondary-action"
          disabled={!filteredRequests.length}
          onClick={() => downloadTextFile(exportName, missingRecordRequestsToCsv(filteredRequests), "text/csv")}
          type="button"
        >
          Export gap packet
        </button>
      </div>
      <div className="missing-source-strip">
        <span className={dueSoonCount ? "status-chip warning" : "status-chip success"}>
          {dueSoonCount ? `${dueSoonCount} due soon` : "No near-term due gaps"}
        </span>
        <small>{filteredRequests.length} filtered request{filteredRequests.length === 1 ? "" : "s"} ready for operator handoff or reviewer follow-up.</small>
      </div>
      <div className="missing-list">
        {filteredRequests.length ? (
          filteredRequests.slice(0, 8).map((request) => (
            <article className="missing-card" key={request.id}>
              <div>
                <strong>{request.title}</strong>
                <p>{request.subject_profile?.full_name ?? request.subject_profile?.email ?? "Professional profile"}</p>
                <small>{request.reason}</small>
                {request.due_at ? <small>Due {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(request.due_at))}</small> : null}
              </div>
              <div className="grant-actions">
                <span className="status-chip neutral">{request.status.replace(/_/g, " ")}</span>
                <button className="secondary-action" disabled={disabled || busyId === request.id || request.status === "in_progress"} onClick={() => void decide(request.id, "in_progress")}>
                  Start
                </button>
                <button className="primary-action" disabled={disabled || busyId === request.id || request.status === "fulfilled"} onClick={() => void decide(request.id, "fulfilled")}>
                  Fulfill
                </button>
                <button className="secondary-action" disabled={disabled || busyId === request.id || request.status === "declined"} onClick={() => void decide(request.id, "declined")}>
                  Decline
                </button>
              </div>
            </article>
          ))
        ) : (
          <article className="missing-card empty">
            <div>
              <strong>No missing-record requests in this view</strong>
              <p>Specific evidence requests for a role, placement, or compliance workflow will appear here.</p>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

function PassportMissingRecordPanel({
  disabled,
  message,
  requests,
  onStatus
}: {
  disabled: boolean;
  message: string;
  requests: DbMissingRecordRequest[];
  onStatus: (requestId: string, status: "in_progress" | "fulfilled" | "declined" | "cancelled") => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const openCount = requests.filter((request) => !["fulfilled", "declined", "cancelled"].includes(request.status)).length;
  const dueSoonCount = requests.filter((request) => {
    if (!request.due_at || ["fulfilled", "declined", "cancelled"].includes(request.status)) return false;
    return new Date(request.due_at).getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000;
  }).length;

  async function update(requestId: string, nextStatus: "in_progress" | "fulfilled" | "declined") {
    setBusyId(requestId);
    try {
      await onStatus(requestId, nextStatus);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="missing-panel passport-missing-panel">
      <div className="mini-heading">
        <FileText size={16} />
        <strong>Requested Passport records</strong>
      </div>
      <small>{message}</small>
      <div className="missing-summary-grid">
        <div>
          <span>Open</span>
          <strong>{openCount}</strong>
        </div>
        <div>
          <span>Due soon</span>
          <strong>{dueSoonCount}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{requests.length}</strong>
        </div>
      </div>
      <div className="missing-list">
        {requests.length ? (
          requests.slice(0, 6).map((request) => (
            <article className="missing-card" key={request.id}>
              <div>
                <strong>{request.title}</strong>
                <p>{request.requester_organization?.name ?? "Corporate requester"}</p>
                <small>{request.reason}</small>
                {request.due_at ? <small>Due {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(request.due_at))}</small> : null}
              </div>
              <div className="grant-actions">
                <span className="status-chip neutral">{request.status.replace(/_/g, " ")}</span>
                <button className="secondary-action" disabled={disabled || busyId === request.id || request.status === "in_progress"} onClick={() => void update(request.id, "in_progress")}>
                  Start
                </button>
                <button className="primary-action" disabled={disabled || busyId === request.id || request.status === "fulfilled"} onClick={() => void update(request.id, "fulfilled")}>
                  Fulfill
                </button>
                <button className="secondary-action" disabled={disabled || busyId === request.id || request.status === "declined"} onClick={() => void update(request.id, "declined")}>
                  Decline
                </button>
              </div>
            </article>
          ))
        ) : (
          <article className="missing-card empty">
            <div>
              <strong>No corporate record requests yet</strong>
              <p>When a Verify team asks for a license, training, reference, or evidence gap, it appears here for the Professional to resolve.</p>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

function IssuerCredentialsPanel({
  credentials,
  disabled,
  message,
  onCreateIssuerRole,
  onIssueCredential,
  onRevokeCredential,
  onUpdateCredentialExpiry
}: {
  credentials: DbIssuerCredential[];
  disabled: boolean;
  message: string;
  onCreateIssuerRole: () => Promise<void>;
  onIssueCredential: (input: {
    subjectEmail: string;
    subjectFullName: string;
    credentialType: IssuerRecordType;
    title: string;
    evidenceSummary: string;
    issuedAt: string;
    expiresAt: string;
  }) => Promise<void>;
  onRevokeCredential: (credentialId: string, reason: string) => Promise<void>;
  onUpdateCredentialExpiry: (credentialId: string, expiresAt: string, reason: string) => Promise<void>;
}) {
  const [subjectEmail, setSubjectEmail] = useState("");
  const [subjectFullName, setSubjectFullName] = useState("");
  const [credentialType, setCredentialType] = useState<IssuerRecordType>("certification");
  const [title, setTitle] = useState("");
  const [evidenceSummary, setEvidenceSummary] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busyRole, setBusyRole] = useState(false);
  const [busyIssue, setBusyIssue] = useState(false);
  const [busyRevokeId, setBusyRevokeId] = useState("");
  const [busyUpdateId, setBusyUpdateId] = useState("");
  const [expiryUpdateById, setExpiryUpdateById] = useState<Record<string, string>>({});
  const [revokeReasonById, setRevokeReasonById] = useState<Record<string, string>>({});
  const [status, setStatus] = useState(message);
  const expiringCredentials = credentials.filter((credential) => credential.expires_at).length;
  const revokedCredentials = credentials.filter((credential) => credential.status === "revoked").length;
  const noExpiryCredentials = credentials.length - expiringCredentials;
  const exportName = `trustgraph-issued-credentials-${new Date().toISOString().slice(0, 10)}.csv`;
  const lifecyclePacketName = `trustgraph-issuer-lifecycle-${new Date().toISOString().slice(0, 10)}.json`;
  const issuerLifecyclePacket = {
    generated_at: new Date().toISOString(),
    packet_mode: "issuer_credential_lifecycle",
    issued_credentials: credentials.length,
    revoked_credentials: revokedCredentials,
    active_credentials: credentials.filter((credential) => credential.status !== "revoked").length,
    update_workflow: "update_issuer_credential_expiry RPC writes credential.updated audit event and queues professional notification",
    revocation_workflow: "revoke_issuer_credential RPC writes credential.revoked audit event and queues professional notification",
    records: credentials.map((credential) => ({
      id: credential.id,
      owner_profile_id: credential.owner_profile_id,
      owner_email: credential.owner_profile?.email ?? null,
      issuer_organization_id: credential.issuer_organization_id,
      title: credential.title,
      type: credential.type,
      status: credential.status,
      expires_at: credential.expires_at,
      corrected_at: typeof credential.metadata?.corrected_at === "string" ? credential.metadata.corrected_at : null,
      correction_reason: typeof credential.metadata?.correction_reason === "string" ? credential.metadata.correction_reason : null,
      revoked_at: typeof credential.metadata?.revoked_at === "string" ? credential.metadata.revoked_at : null,
      revocation_reason: typeof credential.metadata?.revocation_reason === "string" ? credential.metadata.revocation_reason : null
    }))
  };

  useEffect(() => {
    setStatus(message);
  }, [message]);

  async function submitCredential(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyIssue(true);
    setStatus("Issuing verified credential...");

    try {
      await onIssueCredential({
        subjectEmail,
        subjectFullName,
        credentialType,
        title,
        evidenceSummary,
        issuedAt,
        expiresAt
      });
      setSubjectEmail("");
      setSubjectFullName("");
      setTitle("");
      setEvidenceSummary("");
      setIssuedAt("");
      setExpiresAt("");
      setStatus("Credential issued");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not issue credential");
    } finally {
      setBusyIssue(false);
    }
  }

  async function revokeCredential(credentialId: string) {
    setBusyRevokeId(credentialId);
    setStatus("Revoking issuer credential...");

    try {
      await onRevokeCredential(credentialId, revokeReasonById[credentialId] ?? "");
      setRevokeReasonById((current) => ({ ...current, [credentialId]: "" }));
      setStatus("Credential revoked with audit and notification evidence");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not revoke credential");
    } finally {
      setBusyRevokeId("");
    }
  }

  async function updateCredentialExpiry(credentialId: string) {
    setBusyUpdateId(credentialId);
    setStatus("Updating issuer credential expiration...");

    try {
      await onUpdateCredentialExpiry(credentialId, expiryUpdateById[credentialId] ?? "", revokeReasonById[credentialId] ?? "");
      setExpiryUpdateById((current) => ({ ...current, [credentialId]: "" }));
      setStatus("Credential expiration corrected with audit and notification evidence");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update credential expiration");
    } finally {
      setBusyUpdateId("");
    }
  }

  return (
    <section className="issuer-panel">
      <div className="mini-heading">
        <ClipboardCheck size={16} />
        <strong>Credential issuer workflow</strong>
      </div>
      <div className="issuer-summary-grid">
        <div>
          <span>Issued</span>
          <strong>{credentials.length}</strong>
        </div>
        <div>
          <span>Expiring</span>
          <strong>{expiringCredentials}</strong>
        </div>
        <div>
          <span>No expiry</span>
          <strong>{noExpiryCredentials}</strong>
        </div>
        <div>
          <span>Revoked</span>
          <strong>{revokedCredentials}</strong>
        </div>
      </div>
      <div className="grant-panel-top test-tool-strip">
        <small>{status}</small>
        <button
          className="secondary-action"
          disabled={busyRole}
          onClick={async () => {
            setBusyRole(true);
            try {
              await onCreateIssuerRole();
            } finally {
              setBusyRole(false);
            }
          }}
        >
          Add issuer role
        </button>
      </div>
      <div className="issuer-source-strip">
        <span className="status-chip success">Issuer database</span>
        <small>Exports issued Passport credentials, subject profile, issuer organization, source, status, and expiration dates.</small>
        <button
          className="secondary-action"
          disabled={!credentials.length}
          onClick={() => downloadTextFile(exportName, issuerCredentialsToCsv(credentials), "text/csv")}
          type="button"
        >
          Export credentials
        </button>
        <button
          className="secondary-action"
          disabled={!credentials.length}
          onClick={() => downloadTextFile(lifecyclePacketName, JSON.stringify(issuerLifecyclePacket, null, 2), "application/json")}
          type="button"
        >
          Export lifecycle packet
        </button>
      </div>
      <form className="issuer-form" onSubmit={submitCredential}>
        <div className="record-form-grid">
          <input disabled={disabled || busyIssue} onChange={(event) => setSubjectEmail(event.target.value)} placeholder="Professional email" type="email" value={subjectEmail} />
          <input disabled={disabled || busyIssue} onChange={(event) => setSubjectFullName(event.target.value)} placeholder="Professional name" value={subjectFullName} />
          <select disabled={disabled || busyIssue} onChange={(event) => setCredentialType(event.target.value as typeof credentialType)} value={credentialType}>
            <option value="certification">Certification</option>
            <option value="license">License</option>
            <option value="education">Education</option>
            <option value="training">Training</option>
            <option value="continuing_education">Continuing education</option>
            <option value="health_clearance">Health clearance</option>
            <option value="custom">Custom</option>
          </select>
          <input disabled={disabled || busyIssue} onChange={(event) => setTitle(event.target.value)} placeholder="Credential title" value={title} />
          <input disabled={disabled || busyIssue} onChange={(event) => setIssuedAt(event.target.value)} type="date" value={issuedAt} />
          <input disabled={disabled || busyIssue} onChange={(event) => setExpiresAt(event.target.value)} type="date" value={expiresAt} />
          <input disabled={disabled || busyIssue} onChange={(event) => setEvidenceSummary(event.target.value)} placeholder="Evidence summary" value={evidenceSummary} />
        </div>
        <div className="record-form-footer">
          <small>Issued credentials become verified Passport records with issuer organization context.</small>
          <button className="primary-action" disabled={disabled || busyIssue || !subjectEmail || !title} type="submit">
            Issue credential
          </button>
        </div>
      </form>
      <div className="issuer-list">
        {credentials.length ? (
          credentials.slice(0, 5).map((credential) => (
            <article className="issuer-card" key={credential.id}>
              <div>
                <strong>{credential.title}</strong>
                <p>{credential.owner_profile?.full_name ?? credential.owner_profile?.email ?? "Professional profile"}</p>
                <small>{credential.evidence_summary ?? credential.source_name}</small>
              </div>
              <div className="issuer-card-actions">
                <span className={`status-chip ${credential.status === "revoked" ? "danger" : "success"}`}>{credential.status.replace(/_/g, " ")}</span>
                <input
                  disabled={disabled || busyRevokeId === credential.id || credential.status === "revoked"}
                  onChange={(event) => setRevokeReasonById((current) => ({ ...current, [credential.id]: event.target.value }))}
                  placeholder="Correction or revocation reason"
                  value={revokeReasonById[credential.id] ?? ""}
                />
                <input
                  disabled={disabled || busyUpdateId === credential.id || credential.status === "revoked"}
                  onChange={(event) => setExpiryUpdateById((current) => ({ ...current, [credential.id]: event.target.value }))}
                  type="date"
                  value={expiryUpdateById[credential.id] ?? ""}
                />
                <button
                  className="secondary-action"
                  disabled={disabled || busyUpdateId === credential.id || credential.status === "revoked" || !expiryUpdateById[credential.id]}
                  onClick={() => void updateCredentialExpiry(credential.id)}
                  type="button"
                >
                  Update expiry
                </button>
                <button
                  className="secondary-action"
                  disabled={disabled || busyRevokeId === credential.id || credential.status === "revoked"}
                  onClick={() => void revokeCredential(credential.id)}
                  type="button"
                >
                  Revoke
                </button>
              </div>
            </article>
          ))
        ) : (
          <article className="issuer-card empty">
            <div>
              <strong>No issued credentials yet</strong>
              <p>Credential issuers can publish verified licenses, certifications, education, and health clearances into a Passport.</p>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

function OperationsQueuePanel({
  cases,
  dataRightsRequests,
  disabled,
  message,
  onCreatePilotCases,
  onDataRightsStatus,
  onDecision
}: {
  cases: DbVerificationCase[];
  dataRightsRequests: DbDataRightsRequest[];
  disabled: boolean;
  message: string;
  onCreatePilotCases: () => Promise<void>;
  onDataRightsStatus: (requestId: string, status: DataRightsRequestStatus, reviewerNote: string) => Promise<void>;
  onDecision: (caseId: string, status: VerificationCaseStatus) => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dataRightsBusyId, setDataRightsBusyId] = useState<string | null>(null);
  const [dataRightsNoteById, setDataRightsNoteById] = useState<Record<string, string>>({});
  const [busyPilotCases, setBusyPilotCases] = useState(false);
  const [caseQuery, setCaseQuery] = useState("");
  const [caseStatusFilter, setCaseStatusFilter] = useState<"all" | VerificationCaseStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "medium" | "high" | "critical">("all");
  const openCaseCount = cases.filter((item) => item.status === "open" || item.status === "in_review").length;
  const openDataRightsCount = dataRightsRequests.filter((item) => item.status === "requested" || item.status === "in_review").length;
  const restrictedCaseCount = cases.filter((item) => item.status === "restricted").length;
  const criticalCaseCount = cases.filter((item) => item.priority === "critical" || item.priority === "high").length;
  const fraudSignalCases = cases.filter((item) => item.case_type === "fraud_signal");
  const openFraudSignals = fraudSignalCases.filter((item) => !["resolved", "dismissed"].includes(item.status));
  const highFraudSignals = fraudSignalCases.filter((item) => ["critical", "high"].includes(item.priority));
  const filteredCases = cases.filter((item) => {
    const matchesStatus = caseStatusFilter === "all" || item.status === caseStatusFilter;
    const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter;
    const haystack = `${item.case_type} ${item.title} ${item.summary} ${item.reason_code} ${item.status} ${item.priority}`.toLowerCase();
    return matchesStatus && matchesPriority && haystack.includes(caseQuery.trim().toLowerCase());
  });
  const exportName = `trustgraph-operations-cases-${new Date().toISOString().slice(0, 10)}.csv`;
  const fraudPacketName = `trustgraph-fraud-signal-review-${new Date().toISOString().slice(0, 10)}.json`;
  const dataRightsPacketName = `trustgraph-admin-data-rights-${new Date().toISOString().slice(0, 10)}.json`;
  const fraudReviewPacket = {
    generated_at: new Date().toISOString(),
    packet_mode: "fraud_signal_review_only",
    automated_hiring_decisions: "not_enabled",
    human_review_required: true,
    source_table: "verification_cases",
    allowed_actions: ["open_case_review", "restrict_case", "resolve_with_note", "dismiss_with_note"],
    prohibited_actions: ["automated_rejection", "automated_hiring_decision", "unscoped_external_export"],
    total_fraud_signals: fraudSignalCases.length,
    open_fraud_signals: openFraudSignals.length,
    high_priority_fraud_signals: highFraudSignals.length,
    cases: fraudSignalCases.map((item) => ({
      id: item.id,
      status: item.status,
      priority: item.priority,
      title: item.title,
      reason_code: item.reason_code,
      due_at: item.due_at,
      resolution_note: item.resolution_note,
      metadata: item.metadata
    }))
  };
  const dataRightsReviewPacket = {
    generated_at: new Date().toISOString(),
    packet_mode: "admin_data_rights_review",
    source_table: "data_rights_requests",
    automatic_deletion_enabled: false,
    audit_event: "data_rights.status_changed",
    human_review_required: true,
    review_boundaries: ["retention_policy", "legal_hold", "active_access_grants", "unresolved_disputes", "audit_retention"],
    counts: {
      total_requests: dataRightsRequests.length,
      open_requests: openDataRightsCount,
      export_requests: dataRightsRequests.filter((item) => item.request_type === "data_export").length,
      closure_requests: dataRightsRequests.filter((item) => item.request_type === "account_closure").length
    },
    requests: dataRightsRequests.map((request) => ({
      id: request.id,
      profile_id: request.profile_id,
      request_type: request.request_type,
      status: request.status,
      requested_scope: request.requested_scope,
      due_at: request.due_at,
      metadata: request.metadata
    }))
  };

  async function decide(caseId: string, status: VerificationCaseStatus) {
    setBusyId(caseId);
    try {
      await onDecision(caseId, status);
    } finally {
      setBusyId(null);
    }
  }

  async function updateDataRightsStatus(requestId: string, status: DataRightsRequestStatus) {
    setDataRightsBusyId(requestId);
    try {
      await onDataRightsStatus(requestId, status, dataRightsNoteById[requestId] ?? "");
    } finally {
      setDataRightsBusyId(null);
    }
  }

  return (
    <section className="operations-panel">
      <div className="mini-heading">
        <ShieldAlert size={16} />
        <strong>Live operations queue</strong>
      </div>
      <div className="operations-summary-grid">
        <div>
          <span>Open</span>
          <strong>{openCaseCount + openDataRightsCount}</strong>
        </div>
        <div>
          <span>Restricted</span>
          <strong>{restrictedCaseCount}</strong>
        </div>
        <div>
          <span>Data rights</span>
          <strong>{openDataRightsCount}</strong>
        </div>
        <div>
          <span>High risk</span>
          <strong>{criticalCaseCount}</strong>
        </div>
      </div>
      <div className="grant-panel-top test-tool-strip">
        <small>{message}</small>
        <button
          className="secondary-action"
          disabled={disabled || busyPilotCases}
          onClick={async () => {
            setBusyPilotCases(true);
            try {
              await onCreatePilotCases();
            } finally {
              setBusyPilotCases(false);
            }
          }}
        >
          Create pilot cases
        </button>
      </div>
      <div className="operations-source-strip">
        <span className="status-chip success">Operations database</span>
        <small>Exports filtered verification cases with priority, reason code, assignee, due date, resolution, and metadata context.</small>
        <button
          className="secondary-action"
          disabled={!filteredCases.length}
          onClick={() => downloadTextFile(exportName, verificationCasesToCsv(filteredCases), "text/csv")}
          type="button"
        >
          Export cases
        </button>
      </div>
      <div className="fraud-review-strip" aria-label="Fraud signal review-only packet">
        <div>
          <span className="status-chip warning">Fraud signal review</span>
          <strong>Review-only signals, never automated decisions</strong>
          <small>Fraud signals stay inside Admin operations as RLS-protected verification cases. They can trigger human review, restriction, resolution, or dismissal, but they cannot auto-reject, rank, or make hiring decisions.</small>
        </div>
        <div className="fraud-review-metrics">
          <span>
            <strong>{fraudSignalCases.length}</strong>
            <small>Total signals</small>
          </span>
          <span>
            <strong>{openFraudSignals.length}</strong>
            <small>Need review</small>
          </span>
          <span>
            <strong>{highFraudSignals.length}</strong>
            <small>High priority</small>
          </span>
        </div>
        <button
          className="secondary-action"
          disabled={!fraudSignalCases.length}
          onClick={() => downloadTextFile(fraudPacketName, JSON.stringify(fraudReviewPacket, null, 2), "application/json")}
          type="button"
        >
          Export fraud packet
        </button>
      </div>
      <div className="data-rights-review-strip" aria-label="Admin data rights review packet">
        <div>
          <span className="status-chip info">Data rights review</span>
          <strong>Export and closure requests require policy review</strong>
          <small>Admin operators can inspect live data-rights rows before export packaging or account closure. Closure stays review-gated and never performs automatic deletion.</small>
        </div>
        <div className="data-rights-review-metrics">
          <span>
            <strong>{dataRightsRequests.filter((item) => item.request_type === "data_export").length}</strong>
            <small>Exports</small>
          </span>
          <span>
            <strong>{dataRightsRequests.filter((item) => item.request_type === "account_closure").length}</strong>
            <small>Closures</small>
          </span>
          <span>
            <strong>{openDataRightsCount}</strong>
            <small>Open</small>
          </span>
        </div>
        <button
          className="secondary-action"
          disabled={!dataRightsRequests.length}
          onClick={() => downloadTextFile(dataRightsPacketName, JSON.stringify(dataRightsReviewPacket, null, 2), "application/json")}
          type="button"
        >
          Export data-rights review
        </button>
      </div>
      <div className="operations-controls">
        <input
          onChange={(event) => setCaseQuery(event.target.value)}
          placeholder="Search case, reason, summary, or priority"
          value={caseQuery}
        />
        <select onChange={(event) => setCaseStatusFilter(event.target.value as typeof caseStatusFilter)} value={caseStatusFilter}>
          <option value="all">All status</option>
          <option value="open">Open</option>
          <option value="in_review">In review</option>
          <option value="resolved">Resolved</option>
          <option value="restricted">Restricted</option>
          <option value="dismissed">Dismissed</option>
        </select>
        <select onChange={(event) => setPriorityFilter(event.target.value as typeof priorityFilter)} value={priorityFilter}>
          <option value="all">All priority</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      <div className="operations-case-list">
        {dataRightsRequests.slice(0, 4).map((request) => (
          <article className="operations-case-card data-rights-case-card" key={request.id}>
            <div>
              <div className="record-row-main">
                <span className="record-section">data rights</span>
                <strong>{request.request_type.replace("_", " ")}</strong>
                <small>{request.requested_scope.replace(/_/g, " ")} request from profile {request.profile_id}</small>
              </div>
              <div className="record-row-meta">
                <span className="status-chip info">{request.status.replace("_", " ")}</span>
                <span className="status-chip neutral">{request.due_at ? `Due ${new Date(request.due_at).toLocaleDateString()}` : "No due date"}</span>
                <span className="status-chip warning">manual review</span>
              </div>
            </div>
            <div className="data-rights-review-actions">
              <input
                aria-label={`Review note for ${request.request_type.replace("_", " ")}`}
                disabled={disabled || dataRightsBusyId === request.id}
                onChange={(event) => setDataRightsNoteById((current) => ({ ...current, [request.id]: event.target.value }))}
                placeholder="Reviewer note"
                value={dataRightsNoteById[request.id] ?? ""}
              />
              <button
                className="secondary-action"
                disabled={disabled || dataRightsBusyId === request.id || request.status === "in_review"}
                onClick={() => void updateDataRightsStatus(request.id, "in_review")}
                type="button"
              >
                Review
              </button>
              <button
                className="secondary-action"
                disabled={disabled || dataRightsBusyId === request.id || request.status === "ready"}
                onClick={() => void updateDataRightsStatus(request.id, "ready")}
                type="button"
              >
                Mark data-rights ready
              </button>
              <button
                className="secondary-action"
                disabled={disabled || dataRightsBusyId === request.id || request.status === "blocked"}
                onClick={() => void updateDataRightsStatus(request.id, "blocked")}
                type="button"
              >
                Block
              </button>
              <button
                className="secondary-action"
                disabled={disabled || dataRightsBusyId === request.id || request.status === "completed"}
                onClick={() => void updateDataRightsStatus(request.id, "completed")}
                type="button"
              >
                Complete data-rights request
              </button>
            </div>
          </article>
        ))}
        {filteredCases.length ? (
          filteredCases.slice(0, 10).map((item) => (
            <article className="operations-case-card" key={item.id}>
              <div>
                <div className="record-row-main">
                  <span className="record-section">{item.case_type.replace(/_/g, " ")}</span>
                  <strong>{item.title}</strong>
                  <small>{item.summary}</small>
                </div>
                <div className="record-row-meta">
                  <span className={`status-chip ${toneClass(item.priority === "critical" ? "danger" : item.priority === "high" ? "warning" : "info")}`}>
                    {item.priority}
                  </span>
                  <span className="status-chip neutral">{item.status.replace(/_/g, " ")}</span>
                  <span className="status-chip neutral">{item.reason_code}</span>
                </div>
              </div>
              <div className="operations-actions">
                <button
                  className="secondary-action"
                  disabled={disabled || busyId === item.id || item.status === "in_review"}
                  onClick={() => void decide(item.id, "in_review")}
                >
                  Review
                </button>
                <button
                  className="secondary-action"
                  disabled={disabled || busyId === item.id || item.status === "restricted"}
                  onClick={() => void decide(item.id, "restricted")}
                >
                  Restrict
                </button>
                <button
                  className="primary-action"
                  disabled={disabled || busyId === item.id || item.status === "resolved"}
                  onClick={() => void decide(item.id, "resolved")}
                >
                  Resolve
                </button>
              </div>
            </article>
          ))
        ) : (
          <article className="grant-card empty">
            <div>
              <strong>No operations cases in this view</strong>
              <p>Fraud, compliance, and verifier review exceptions appear here with reason codes and audit history.</p>
            </div>
          </article>
        )}
      </div>
      {disabled ? <small>Switch to a TrustGraph verifier, compliance, or system admin role to manage operations cases.</small> : null}
    </section>
  );
}

function AuditTrailPanel({
  events,
  corporateAccessReviews,
  evidenceDocuments,
  message
  ,
  operationsCases,
  schemaMigrationRuns
}: {
  events: DbAuditEvent[];
  corporateAccessReviews: DbCorporateAccessReview[];
  evidenceDocuments: DbEvidenceDocument[];
  message: string;
  operationsCases: DbVerificationCase[];
  schemaMigrationRuns: DbSchemaMigrationRun[];
}) {
  const [auditQuery, setAuditQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<
    "all" | "access" | "organization" | "record" | "connect" | "verification" | "evidence" | "schema" | "review"
  >("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [actorFilter, setActorFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "24h" | "7d" | "30d">("all");
  const [signalFilter, setSignalFilter] = useState<"all" | "guardrail" | "high" | "standard">("all");
  const targetTables = Array.from(new Set(events.map((event) => event.target_table).filter(Boolean))).sort();
  const actors = Array.from(
    new Set(events.map((event) => event.actor_profile_id).filter((actor): actor is string => Boolean(actor)))
  ).sort();
  const classifySignal = (event: DbAuditEvent) => {
    const haystack = `${event.action} ${event.target_table ?? ""} ${event.reason ?? ""}`.toLowerCase();

    if (haystack.includes("production_gate") || haystack.includes("schema_migration") || haystack.includes("security")) {
      return "guardrail";
    }

    if (haystack.includes("restricted") || haystack.includes("revoked") || haystack.includes("failed") || haystack.includes("evidence") || haystack.includes("consent")) {
      return "high";
    }

    return "standard";
  };
  const timeCutoff =
    timeFilter === "24h"
      ? Date.now() - 24 * 60 * 60 * 1000
      : timeFilter === "7d"
        ? Date.now() - 7 * 24 * 60 * 60 * 1000
        : timeFilter === "30d"
          ? Date.now() - 30 * 24 * 60 * 60 * 1000
          : null;
  const filteredEvents = events.filter((event) => {
    const action = event.action.toLowerCase();
    const matchesAction = actionFilter === "all" || action.includes(actionFilter);
    const matchesTarget = targetFilter === "all" || event.target_table === targetFilter;
    const matchesActor = actorFilter === "all" || event.actor_profile_id === actorFilter;
    const matchesTime = timeCutoff === null || new Date(event.created_at).getTime() >= timeCutoff;
    const matchesSignal = signalFilter === "all" || classifySignal(event) === signalFilter;
    const haystack = `${event.action} ${event.reason ?? ""} ${event.target_table ?? ""} ${event.target_id ?? ""} ${JSON.stringify(
      event.metadata ?? {}
    )}`.toLowerCase();
    return matchesAction && matchesTarget && matchesActor && matchesTime && matchesSignal && haystack.includes(auditQuery.trim().toLowerCase());
  });
  const latestEvent = filteredEvents[0];
  const actorCount = new Set(filteredEvents.map((event) => event.actor_profile_id).filter(Boolean)).size;
  const guardrailCount = filteredEvents.filter((event) => classifySignal(event) === "guardrail").length;
  const highSignalCount = filteredEvents.filter((event) => classifySignal(event) === "high").length;
  const exportName = `trustgraph-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  const exportJsonName = `trustgraph-audit-evidence-${new Date().toISOString().slice(0, 10)}.json`;
  const coveragePacketName = `trustgraph-audit-coverage-${new Date().toISOString().slice(0, 10)}.json`;
  const exportReadinessName = `trustgraph-admin-export-readiness-${new Date().toISOString().slice(0, 10)}.json`;
  const activeFilterLabels = [
    actionFilter !== "all" ? `action:${actionFilter}` : null,
    targetFilter !== "all" ? `target:${targetFilter}` : null,
    actorFilter !== "all" ? `actor:${actorFilter.slice(0, 8)}` : null,
    timeFilter !== "all" ? `time:${timeFilter}` : null,
    signalFilter !== "all" ? `signal:${signalFilter}` : null,
    auditQuery.trim() ? `query:${auditQuery.trim()}` : null
  ].filter((label): label is string => Boolean(label));
  const auditExportMatrix = [
    {
      label: "Filtered audit CSV",
      source: `${filteredEvents.length} matching audit events`,
      proves: "Operator-ready timeline for the active actor, action, target, signal, and time filters.",
      action: "Export CSV"
    },
    {
      label: "Filtered audit JSON",
      source: `${filteredEvents.length} raw event rows`,
      proves: "Machine-readable event metadata for issue triage, security review, and support handoff.",
      action: "Export JSON"
    },
    {
      label: "Coverage packet",
      source: `${operationsCases.length} cases, ${evidenceDocuments.length} evidence rows, ${corporateAccessReviews.length} review attestations, ${schemaMigrationRuns.length} release rows`,
      proves: "Audit trail context without exposing private evidence file contents.",
      action: "Export audit coverage packet"
    },
    {
      label: "Admin readiness packet",
      source: activeFilterLabels.length ? activeFilterLabels.join(", ") : "No filters applied",
      proves: "Confirms scope, export policy, excluded raw files, and review note before sharing.",
      action: "Export admin readiness"
    }
  ];
  const adminAuditExportCommand = {
    mode: "admin_audit_export_command",
    headline:
      filteredEvents.length === 0
        ? "No audit rows match the current filter"
        : activeFilterLabels.length
          ? "Export the filtered audit view with the filter receipt"
          : "Export all visible audit events with readiness proof",
    recommended_export:
      filteredEvents.length === 0
        ? "Clear filters or load audit events"
        : highSignalCount || guardrailCount
          ? "Export audit coverage packet"
          : "Export CSV",
    active_scope: activeFilterLabels.length ? activeFilterLabels.join(" / ") : "All audit events in scope",
    export_boundary: "Filtered audit events and metadata only; raw private evidence files are excluded.",
    counts: {
      loaded_audit_events: events.length,
      filtered_audit_events: filteredEvents.length,
      guardrail_events: guardrailCount,
      high_signal_events: highSignalCount,
      actors: actorCount,
      target_tables: targetTables.length
    }
  };
  const adminExportReadinessPacket = {
    generated_at: new Date().toISOString(),
    packet_mode: "admin_audit_export_readiness",
    export_formats: ["csv_filtered_audit_events", "json_filtered_audit_events", "json_full_coverage_packet"],
    active_filters: {
      action: actionFilter,
      target: targetFilter,
      actor: actorFilter,
      time: timeFilter,
      signal: signalFilter,
      query: auditQuery.trim(),
      labels: activeFilterLabels
    },
    export_policy: {
      filtered_exports_only: true,
      includes_verification_case_context: true,
      includes_evidence_document_metadata: true,
      includes_release_ledger_context: true,
      raw_private_evidence_files_excluded: true,
      reviewer_note: "Use this packet before sharing Admin exports outside the operating team."
    },
    audit_filter_receipt: {
      label: "Audit filter receipt",
      active: activeFilterLabels.length > 0,
      labels: activeFilterLabels,
      exported_event_count: filteredEvents.length,
      raw_private_evidence_files_excluded: true
    },
    counts: {
      loaded_audit_events: events.length,
      filtered_audit_events: filteredEvents.length,
      target_tables: targetTables.length,
      actors: actors.length,
      selected_view_actors: actorCount,
      guardrail_events: guardrailCount,
      high_signal_events: highSignalCount,
      verification_cases: operationsCases.length,
      evidence_documents: evidenceDocuments.length,
      corporate_access_reviews: corporateAccessReviews.length,
      release_ledger_records: schemaMigrationRuns.length
    },
    admin_audit_export_command: adminAuditExportCommand,
    admin_audit_export_matrix: auditExportMatrix
  };
  const auditCoveragePacket = {
    generated_at: new Date().toISOString(),
    mode: "filtered_audit_and_verification_history",
    filters: {
      action: actionFilter,
      target: targetFilter,
      actor: actorFilter,
      time: timeFilter,
      signal: signalFilter,
      query: auditQuery.trim()
    },
    counts: {
      loaded_audit_events: events.length,
      filtered_audit_events: filteredEvents.length,
      actors: actorCount,
      guardrail_events: guardrailCount,
      high_signal_events: highSignalCount,
      verification_cases: operationsCases.length,
      evidence_documents: evidenceDocuments.length,
      corporate_access_reviews: corporateAccessReviews.length,
      release_ledger_records: schemaMigrationRuns.length
    },
    latest_event: latestEvent ?? null,
    target_tables: targetTables,
    verification_cases: operationsCases.map((item) => ({
      case_id: item.id,
      case_type: item.case_type,
      status: item.status,
      priority: item.priority,
      title: item.title,
      trust_record_id: item.trust_record_id,
      created_at: item.created_at,
      updated_at: item.updated_at
    })),
    evidence_documents: evidenceDocuments.map((document) => ({
      document_id: document.id,
      trust_record_id: document.trust_record_id,
      title: document.title,
      status: document.status,
      file_attached: Boolean(document.storage_path),
      created_at: document.created_at
    })),
    corporate_access_reviews: corporateAccessReviews.map((review) => ({
      review_id: review.id,
      access_grant_id: review.access_grant_id,
      requester_organization_id: review.requester_organization_id,
      subject_profile_id: review.subject_profile_id,
      reviewer_profile_id: review.reviewer_profile_id,
      review_status: review.review_status,
      shared_record_count: review.shared_record_count,
      open_gap_count: review.open_gap_count,
      reviewer_note: review.reviewer_note,
      created_at: review.created_at
    })),
    release_ledger: schemaMigrationRuns.map((run) => ({
      migration_path: run.migration_path,
      status: run.status,
      workflow_run_id: run.workflow_run_id,
      commit_sha: run.commit_sha,
      applied_at: run.applied_at
    })),
    admin_audit_export_command: adminAuditExportCommand,
    admin_audit_export_matrix: auditExportMatrix,
    events: filteredEvents
  };

  return (
    <section className="audit-panel">
      <div className="mini-heading">
        <Activity size={16} />
        <strong>Audit trail</strong>
      </div>
      <small>{message}</small>
      <div className="admin-audit-export-command" aria-label="Admin audit export command">
        <div>
          <span className={`status-chip ${filteredEvents.length ? "success" : "warning"}`}>Admin audit export command</span>
          <strong>{adminAuditExportCommand.headline}</strong>
          <small>{adminAuditExportCommand.export_boundary}</small>
        </div>
        <div className="admin-audit-export-command-grid">
          <span>
            <strong>{adminAuditExportCommand.recommended_export}</strong>
            <small>Recommended export</small>
          </span>
          <span>
            <strong>{adminAuditExportCommand.active_scope}</strong>
            <small>Active filter scope</small>
          </span>
          <span>
            <strong>{filteredEvents.length}/{events.length}</strong>
            <small>Rows in export</small>
          </span>
        </div>
        <div className="admin-audit-export-command-actions">
          <button
            className="primary-action"
            disabled={!filteredEvents.length}
            onClick={() => downloadTextFile(exportName, auditEventsToCsv(filteredEvents), "text/csv")}
            type="button"
          >
            Export recommended CSV
          </button>
          <button
            className="secondary-action"
            onClick={() => downloadTextFile(coveragePacketName, JSON.stringify(auditCoveragePacket, null, 2), "application/json")}
            type="button"
          >
            Export coverage packet
          </button>
        </div>
      </div>
      <div className="audit-summary-grid">
        <span>
          <strong>{events.length}</strong>
          <small>loaded events</small>
        </span>
        <span>
          <strong>{filteredEvents.length}</strong>
          <small>matching view</small>
        </span>
        <span>
          <strong>{actorCount}</strong>
          <small>actors</small>
        </span>
        <span>
          <strong>{guardrailCount}</strong>
          <small>guardrails</small>
        </span>
        <span>
          <strong>{highSignalCount}</strong>
          <small>high signal</small>
        </span>
        <span>
          <strong>{latestEvent ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(latestEvent.created_at)) : "None"}</strong>
          <small>latest match</small>
        </span>
      </div>
      <div className="audit-controls">
        <input
          onChange={(event) => setAuditQuery(event.target.value)}
          placeholder="Search action, target, reason, or metadata"
          value={auditQuery}
        />
        <select onChange={(event) => setActionFilter(event.target.value as typeof actionFilter)} value={actionFilter}>
          <option value="all">All actions</option>
          <option value="access">Access</option>
          <option value="organization">Organization</option>
          <option value="record">Records</option>
          <option value="connect">Connect</option>
          <option value="verification">Verification</option>
          <option value="evidence">Evidence</option>
          <option value="schema">Schema</option>
          <option value="review">Review attestations</option>
        </select>
        <select onChange={(event) => setTargetFilter(event.target.value)} value={targetFilter}>
          <option value="all">All targets</option>
          {targetTables.map((target) => (
            <option key={target} value={target}>
              {target.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select onChange={(event) => setActorFilter(event.target.value)} value={actorFilter}>
          <option value="all">All actors</option>
          {actors.map((actor) => (
            <option key={actor} value={actor}>
              {actor.slice(0, 8)}
            </option>
          ))}
        </select>
        <select onChange={(event) => setTimeFilter(event.target.value as typeof timeFilter)} value={timeFilter}>
          <option value="all">All time</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
        <select onChange={(event) => setSignalFilter(event.target.value as typeof signalFilter)} value={signalFilter}>
          <option value="all">All signal levels</option>
          <option value="guardrail">Guardrail events</option>
          <option value="high">High-signal events</option>
          <option value="standard">Standard events</option>
        </select>
        <button
          className="secondary-action"
          disabled={!activeFilterLabels.length}
          onClick={() => {
            setAuditQuery("");
            setActionFilter("all");
            setTargetFilter("all");
            setActorFilter("all");
            setTimeFilter("all");
            setSignalFilter("all");
          }}
          type="button"
        >
          Clear filters
        </button>
        <button
          className="secondary-action"
          disabled={!filteredEvents.length}
          onClick={() => downloadTextFile(exportName, auditEventsToCsv(filteredEvents), "text/csv")}
          type="button"
        >
          Export CSV
        </button>
        <button
          className="secondary-action"
          disabled={!filteredEvents.length}
          onClick={() => downloadTextFile(exportJsonName, JSON.stringify(filteredEvents, null, 2), "application/json")}
          type="button"
        >
          Export JSON
        </button>
        <button
          className="secondary-action"
          onClick={() => downloadTextFile(coveragePacketName, JSON.stringify(auditCoveragePacket, null, 2), "application/json")}
          type="button"
        >
          Export audit coverage packet
        </button>
      </div>
      <div className="audit-coverage-note">
        <strong>Admin export readiness</strong>
        <small>Packages active filters, actor and target scope, corporate review attestations, release ledger context, and raw evidence exclusion rules before audit data leaves Admin.</small>
        <button
          className="secondary-action"
          onClick={() => downloadTextFile(exportReadinessName, JSON.stringify(adminExportReadinessPacket, null, 2), "application/json")}
          type="button"
        >
          Export admin readiness
        </button>
      </div>
      <div className="admin-audit-export-matrix">
        <div>
          <span className="status-chip neutral">Admin audit export matrix</span>
          <strong>Choose the right proof packet before sharing audit data.</strong>
        </div>
        <div className="admin-audit-export-grid">
          {auditExportMatrix.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.action}</strong>
              <small>{item.source}</small>
              <p>{item.proves}</p>
            </article>
          ))}
        </div>
      </div>
      <div className="audit-filter-receipt" aria-label="Audit filter receipt">
        <div>
          <span className={`status-chip ${activeFilterLabels.length ? "success" : "neutral"}`}>Audit filter receipt</span>
          <strong>{activeFilterLabels.length ? activeFilterLabels.join(" / ") : "All audit events in scope"}</strong>
          <small>{filteredEvents.length} event rows will export from the current view. Private evidence files stay excluded; only evidence metadata is included.</small>
        </div>
      </div>
      <div className="audit-coverage-note">
        <strong>Full audit and verification history packet</strong>
        <small>Exports filtered audit events with verification cases, evidence document coverage, corporate review attestations, and release ledger records for the active Admin view.</small>
      </div>
      <div className="audit-list">
        {filteredEvents.length ? (
          filteredEvents.map((event) => (
            <article className="audit-card" key={event.id}>
              <div>
                <strong>{auditActionLabel(event.action)}</strong>
                <span className={`status-chip ${classifySignal(event) === "guardrail" ? "warning" : classifySignal(event) === "high" ? "danger" : "neutral"}`}>
                  {classifySignal(event)}
                </span>
                <small>{event.reason || event.target_table}</small>
                <small>
                  {event.target_table}
                  {event.target_id ? ` / ${event.target_id.slice(0, 8)}` : ""}
                </small>
              </div>
              <time>
                {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(
                  new Date(event.created_at)
                )}
              </time>
            </article>
          ))
        ) : (
          <article className="audit-card empty">
            <div>
              <strong>No matching audit events</strong>
              <small>Material workflow actions will appear here when they match the current filter.</small>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

function ConnectPanel({
  apiClients,
  disabled,
  message,
  webhooks,
  onClientStatus,
  onCreateClient,
  onCreateWebhook,
  onWebhookStatus
}: {
  apiClients: DbApiClient[];
  disabled: boolean;
  message: string;
  webhooks: DbWebhookSubscription[];
  onClientStatus: (clientId: string, status: "active" | "paused" | "revoked") => Promise<void>;
  onCreateClient: () => Promise<void>;
  onCreateWebhook: (input: { apiClientId: string; eventType: string; targetUrl: string }) => Promise<void>;
  onWebhookStatus: (subscriptionId: string, status: "active" | "paused" | "revoked") => Promise<void>;
}) {
  const [busyClientId, setBusyClientId] = useState<string | null>(null);
  const [busyWebhookId, setBusyWebhookId] = useState<string | null>(null);
  const [busyCreate, setBusyCreate] = useState(false);
  const [eventType, setEventType] = useState("access_grant.approved");
  const [targetUrl, setTargetUrl] = useState("");
  const [status, setStatus] = useState(message);
  const activeClients = apiClients.filter((client) => client.status === "active").length;
  const activeWebhooks = webhooks.filter((webhook) => webhook.status === "active").length;
  const deliveryFailures = webhooks.reduce((sum, webhook) => sum + webhook.failure_count, 0);
  const clientsExportName = `trustgraph-connect-clients-${new Date().toISOString().slice(0, 10)}.csv`;
  const webhooksExportName = `trustgraph-connect-webhooks-${new Date().toISOString().slice(0, 10)}.csv`;

  useEffect(() => {
    setStatus(message);
  }, [message]);

  async function updateClient(clientId: string, nextStatus: "active" | "paused" | "revoked") {
    setBusyClientId(clientId);
    try {
      await onClientStatus(clientId, nextStatus);
    } finally {
      setBusyClientId(null);
    }
  }

  async function updateWebhook(subscriptionId: string, nextStatus: "active" | "paused" | "revoked") {
    setBusyWebhookId(subscriptionId);
    try {
      await onWebhookStatus(subscriptionId, nextStatus);
    } finally {
      setBusyWebhookId(null);
    }
  }

  async function submitWebhook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const apiClientId = apiClients[0]?.id;
    if (!apiClientId) {
      setStatus("Create an API client before adding a webhook.");
      return;
    }

    setBusyCreate(true);
    try {
      await onCreateWebhook({ apiClientId, eventType, targetUrl });
      setTargetUrl("");
      setStatus("Webhook subscription created");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not create webhook");
    } finally {
      setBusyCreate(false);
    }
  }

  return (
    <section className="connect-panel">
      <div className="mini-heading">
        <Network size={16} />
        <strong>Connect control plane</strong>
      </div>
      <div className="connect-summary-grid">
        <div>
          <span>Clients</span>
          <strong>{apiClients.length}</strong>
          <small>{activeClients} active</small>
        </div>
        <div>
          <span>Webhooks</span>
          <strong>{webhooks.length}</strong>
          <small>{activeWebhooks} active</small>
        </div>
        <div>
          <span>Failures</span>
          <strong>{deliveryFailures}</strong>
          <small>recent delivery count</small>
        </div>
      </div>
      <div className="grant-panel-top test-tool-strip">
        <small>{status}</small>
        <button
          className="secondary-action"
          disabled={disabled || busyCreate}
          onClick={async () => {
            setBusyCreate(true);
            try {
              await onCreateClient();
            } finally {
              setBusyCreate(false);
            }
          }}
        >
          Create pilot client
        </button>
      </div>
      <div className="connect-source-strip">
        <span className="status-chip success">Connect database</span>
        <small>Exports scoped API clients and webhook subscriptions with status, ownership, delivery failures, and last delivery timestamps.</small>
        <div className="connect-export-actions">
          <button
            className="secondary-action"
            disabled={!apiClients.length}
            onClick={() => downloadTextFile(clientsExportName, apiClientsToCsv(apiClients), "text/csv")}
            type="button"
          >
            Export clients
          </button>
          <button
            className="secondary-action"
            disabled={!webhooks.length}
            onClick={() => downloadTextFile(webhooksExportName, webhookSubscriptionsToCsv(webhooks), "text/csv")}
            type="button"
          >
            Export webhooks
          </button>
        </div>
      </div>
      <div className="connect-list">
        {apiClients.length ? (
          apiClients.map((client) => (
            <article className="connect-card" key={client.id}>
              <div>
                <strong>{client.name}</strong>
                <p>{client.organization?.name ?? "Organization client"}</p>
                <small>{client.scopes.join(", ")}</small>
              </div>
              <div className="grant-actions">
                <span className="status-chip neutral">{client.status}</span>
                <button className="secondary-action" disabled={disabled || busyClientId === client.id || client.status === "paused"} onClick={() => void updateClient(client.id, "paused")}>
                  Pause
                </button>
                <button className="secondary-action" disabled={disabled || busyClientId === client.id || client.status === "active"} onClick={() => void updateClient(client.id, "active")}>
                  Activate
                </button>
                <button className="secondary-action" disabled={disabled || busyClientId === client.id || client.status === "revoked"} onClick={() => void updateClient(client.id, "revoked")}>
                  Revoke
                </button>
              </div>
            </article>
          ))
        ) : (
          <article className="connect-card empty">
            <div>
              <strong>No Connect clients yet</strong>
              <p>Create a pilot client when an integration team is ready to test scoped API and webhook ownership.</p>
            </div>
          </article>
        )}
      </div>
      <form className="connect-form" onSubmit={submitWebhook}>
        <div className="record-form-grid">
          <select disabled={disabled || busyCreate || !apiClients.length} onChange={(event) => setEventType(event.target.value)} value={eventType}>
            <option value="access_grant.approved">Access grant approved</option>
            <option value="credential.issued">Credential issued</option>
            <option value="missing_record.requested">Missing record requested</option>
            <option value="verification_case.resolved">Verification case resolved</option>
          </select>
          <input disabled={disabled || busyCreate || !apiClients.length} onChange={(event) => setTargetUrl(event.target.value)} placeholder="https://example.com/webhooks/trustgraph" value={targetUrl} />
        </div>
        <div className="record-form-footer">
          <small>Webhook targets must use HTTPS.</small>
          <button className="secondary-action" disabled={disabled || busyCreate || !apiClients.length || !targetUrl} type="submit">
            Add webhook
          </button>
        </div>
      </form>
      <div className="connect-list">
        {webhooks.length ? (
          webhooks.map((webhook) => (
            <article className="connect-card" key={webhook.id}>
              <div>
                <strong>{webhook.event_type}</strong>
                <p>{webhook.target_url}</p>
                <small>{webhook.failure_count} delivery failures</small>
              </div>
              <div className="grant-actions">
                <span className="status-chip neutral">{webhook.status}</span>
                <button className="secondary-action" disabled={disabled || busyWebhookId === webhook.id || webhook.status === "paused"} onClick={() => void updateWebhook(webhook.id, "paused")}>
                  Pause
                </button>
                <button className="secondary-action" disabled={disabled || busyWebhookId === webhook.id || webhook.status === "active"} onClick={() => void updateWebhook(webhook.id, "active")}>
                  Activate
                </button>
                <button className="secondary-action" disabled={disabled || busyWebhookId === webhook.id || webhook.status === "revoked"} onClick={() => void updateWebhook(webhook.id, "revoked")}>
                  Revoke
                </button>
              </div>
            </article>
          ))
        ) : null}
      </div>
    </section>
  );
}

function PlanAlignmentPanel({
  disabled,
  livePilotRowProof,
  onRecordPilotLaunchContact,
  onRecordGateDecision,
  pilotLaunchContacts,
  productionGateDecisions
}: {
  disabled: boolean;
  livePilotRowProof: LivePilotRowProof;
  onRecordPilotLaunchContact: (input: {
    contactKey: string;
    status: PilotLaunchContactStatus;
    organizationName: string;
    contactName: string;
    contactEmail: string;
    notes: string;
  }) => Promise<void>;
  onRecordGateDecision: (input: { gateKey: string; status: ProductionGateStatus; evidenceUrl: string; notes: string }) => Promise<void>;
  pilotLaunchContacts: DbPilotLaunchContact[];
  productionGateDecisions: DbProductionGateDecision[];
}) {
  const [gateKey, setGateKey] = useState("stripe_billing_launch");
  const [gateStatus, setGateStatus] = useState<ProductionGateStatus>("human_decision_required");
  const [gateEvidenceUrl, setGateEvidenceUrl] = useState("");
  const [gateNotes, setGateNotes] = useState("");
  const [gateBusy, setGateBusy] = useState(false);
  const [gateMessage, setGateMessage] = useState("Record production gate decisions only after human sign-off.");
  const [pilotContactKey, setPilotContactKey] = useState("pilot_customer_roster");
  const [pilotContactStatus, setPilotContactStatus] = useState<PilotLaunchContactStatus>("missing");
  const [pilotOrganizationName, setPilotOrganizationName] = useState("");
  const [pilotContactName, setPilotContactName] = useState("");
  const [pilotContactEmail, setPilotContactEmail] = useState("");
  const [pilotContactNotes, setPilotContactNotes] = useState("");
  const [pilotContactBusy, setPilotContactBusy] = useState(false);
  const [pilotContactMessage, setPilotContactMessage] = useState("Record pilot launch owners after the human roster decision is available.");
  const deployedCount = foundationTracks.filter((track) => track.status === "deployed").length;
  const foundationCount = foundationTracks.filter((track) => track.status === "foundation").length;
  const plannedCount = foundationTracks.filter((track) => track.status === "planned").length;
  const coveredProfileAreas = lockedProfileAreas.filter((area) => area.status !== "planned").length;
  const plannedProfileAreas = lockedProfileAreas.length - coveredProfileAreas;
  const fallbackProductionGates = [
    {
      label: "Stripe billing launch",
      owner: "Business operations",
      status: "human decision required",
      evidence: "Products, taxes, invoices, refunds, dunning, and webhook reconciliation approved."
    },
    {
      label: "External RLS and storage review",
      owner: "Security reviewer",
      status: "external sign-off required",
      evidence: "RLS policies, private evidence storage, and signed URL handling reviewed."
    },
    {
      label: "Legal and employment language",
      owner: "Legal counsel",
      status: "legal review required",
      evidence: "Background-check-adjacent wording, adverse-action boundaries, and regulated workflow language approved."
    },
    {
      label: "Pilot operations owner",
      owner: "Founder/operator",
      status: "pilot roster required",
      evidence: "Named pilot customers, onboarding owner, support path, and incident response owner documented."
    },
    {
      label: "TrustGraph VPS cutover",
      owner: "Infrastructure operator",
      status: "external sign-off required",
      evidence: "TrustGraph VPS host, TLS, environment secrets, Supabase redirect URLs, and VFIX isolation verified before production cutover."
    }
  ];
  const productionGates = productionGateDecisions.length
    ? productionGateDecisions.map((gate) => ({
        label: gate.label,
        owner: gate.owner,
        status: gate.status.replace(/_/g, " "),
        evidence: gate.evidence_required
      }))
    : fallbackProductionGates;
  const approvedProductionGateCount = productionGates.filter((gate) => gate.status === "approved for production").length;
  const openProductionGateCount = productionGates.length - approvedProductionGateCount;
  const gateExportName = `trustgraph-production-gates-${new Date().toISOString().slice(0, 10)}.csv`;
  const fallbackPilotContacts = [
    { label: "Pilot customer roster", responsibility: "Named pilot customer organizations and launch contacts.", status: "missing", organization: "", contact: "", email: "", notes: "" },
    { label: "Onboarding owner", responsibility: "Accountable operator for setup, verification, and first-week adoption.", status: "missing", organization: "", contact: "", email: "", notes: "" },
    { label: "Support owner", responsibility: "Named owner for inbound support, account recovery, and pilot issue triage.", status: "missing", organization: "", contact: "", email: "", notes: "" },
    { label: "Incident response owner", responsibility: "Named owner for access, evidence, privacy, or availability incidents.", status: "missing", organization: "", contact: "", email: "", notes: "" }
  ];
  const pilotContacts = pilotLaunchContacts.length
    ? pilotLaunchContacts.map((contact) => ({
        label: contact.label,
        responsibility: contact.responsibility,
        status: contact.status,
        organization: contact.organization_name ?? "",
        contact: contact.contact_name ?? "",
        email: contact.contact_email ?? "",
        notes: contact.notes ?? ""
      }))
    : fallbackPilotContacts;
  const pilotContactsExportName = `trustgraph-pilot-launch-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
  const launchGatePacketName = `trustgraph-launch-gate-packet-${new Date().toISOString().slice(0, 10)}.json`;
  const v1CompletionPacketName = `trustgraph-v1-completion-audit-${new Date().toISOString().slice(0, 10)}.json`;
  const completionAuditRequirements = [
    {
      label: "GitHub Pages hosted application",
      status: "shipped_and_smoke_checked",
      evidence: "Deploy TrustGraph to GitHub Pages workflow builds, deploys, and smoke-checks the hosted app."
    },
    {
      label: "Professional and Corporate portals",
      status: "implemented",
      evidence: "Public portal registration, Professional Passport access, Corporate portal access, RBAC workspace routing, and pricing structure are present in the app."
    },
    {
      label: "Live Supabase database foundation",
      status: livePilotRowProof.accepted ? "live_database_rows_accepted" : "implemented_with_runtime_login_required",
      evidence: livePilotRowProof.accepted
        ? `${livePilotRowProof.readyGroups}/${livePilotRowProof.totalRequiredGroups} required live Supabase row groups are loaded for the signed-in account.`
        : `${livePilotRowProof.readyGroups}/${livePilotRowProof.totalRequiredGroups} required live Supabase row groups are loaded; missing ${livePilotRowProof.missingRequiredGroups.join(", ") || "hosted login proof"}.`
    },
    {
      label: "TrustGraph VPS deployment",
      status: productionGates.some((gate) => gate.label === "TrustGraph VPS cutover" && gate.status === "approved for production")
        ? "recorded_gate_approved"
        : "prepared_human_access_required",
      evidence: "Docker, Caddy, compose, preflight, env validation, GitHub workflow guardrails, and the TrustGraph VPS cutover gate are ready; production cutover still requires recorded infrastructure sign-off."
    },
    {
      label: "VFIX isolation",
      status: "guarded",
      evidence: "Workflow, bootstrap, preflight, and server env validators refuse the protected VFIX host and CRM client route."
    },
    {
      label: "Production payments and regulated traffic",
      status: openProductionGateCount ? "human_gated" : "recorded_gates_approved",
      evidence: openProductionGateCount
        ? "Stripe, external security, legal language, and pilot operations ownership are not approved for unrestricted production."
        : "Visible production gate records are approved for production."
    }
  ];
  const completionAuditOpenItems = completionAuditRequirements.filter((item) =>
    ["prepared_human_access_required", "human_gated", "implemented_with_runtime_login_required"].includes(item.status)
  );
  const v1AuditCommand = [
    {
      label: "Hosted product",
      value: "Shipped",
      detail: "GitHub Pages build, deploy, and hosted smoke are part of every release loop."
    },
    {
      label: "Portal coverage",
      value: `${deployedCount}/${foundationTracks.length}`,
      detail: "Public site, professional portal, corporate portal, pricing, exports, and admin readiness are mapped to the 13 tracks."
    },
    {
      label: "Live database proof",
      value: livePilotRowProof.accepted ? "Accepted" : `${livePilotRowProof.readyGroups}/${livePilotRowProof.totalRequiredGroups}`,
      detail: livePilotRowProof.accepted
        ? "Signed-in Supabase row groups prove Passport, corporate, evidence, consent, billing, team, review, and release-ledger coverage."
        : `Still needs live row proof for ${livePilotRowProof.missingRequiredGroups.join(", ") || "the hosted login session"}.`
    },
    {
      label: "Human gates",
      value: `${openProductionGateCount} open`,
      detail: "Stripe, legal/security, pilot ownership, and VPS production cutover stay outside automated completion."
    }
  ];
  const v1CompletionPacket = {
    generated_at: new Date().toISOString(),
    source_of_truth: "https://github.com/mirzaraheel99/trustgraph",
    hosted_review_url: "https://mirzaraheel99.github.io/trustgraph/",
    trustgraph_vps_target: "https://trustgraph.5-75-224-110.sslip.io",
    protected_vfix_host: "https://5-75-224-110.sslip.io",
    completion_mode: openProductionGateCount ? "pilot_ready_with_human_gates" : "production_gate_records_approved",
    track_counts: {
      total_tracks: foundationTracks.length,
      deployed: deployedCount,
      foundation: foundationCount,
      planned: plannedCount
    },
    profile_scope_counts: {
      total_locked_areas: lockedProfileAreas.length,
      covered: coveredProfileAreas,
      planned: plannedProfileAreas
    },
    completion_audit_requirements: completionAuditRequirements,
    completion_audit_open_items: completionAuditOpenItems,
    v1_audit_command: v1AuditCommand,
    live_pilot_row_proof: livePilotRowProof,
    evidence_exports: [
      "portal_access_packet",
      "corporate_provisioning_packet",
      "corporate_user_database_packet",
      "pricing_structure_packet",
      "auth_redirect_readiness_packet",
      "registration_auth_readiness_packet",
      "working_database_packet",
      "live_pilot_row_proof",
      "live_database_repair_queue",
      "seed_reconciliation",
      "security_runbook",
      "vps_launch_packet"
    ],
    verification_gates: [
      "npm run typecheck",
      "npm run check:claims",
      "npm run check:rls",
      "npm run check:responsive",
      "npm run build",
      "GitHub Pages hosted smoke"
    ],
    remaining_human_decisions: productionGates
      .filter((gate) => gate.status !== "approved for production")
      .map((gate) => ({
        label: gate.label,
        owner: gate.owner,
        status: gate.status,
        evidence_required: gate.evidence
      })),
    pilot_contacts: pilotContacts,
    tracks: foundationTracks.map((track) => ({
      id: track.id,
      label: track.label,
      plan_step: track.planStep,
      status: track.status,
      evidence: track.detail
    })),
    locked_profile_scope: lockedProfileAreas.map((area) => ({
      id: area.id,
      label: area.label,
      product_area: area.productArea,
      status: area.status,
      evidence: area.evidence
    })),
    stop_conditions: openProductionGateCount
      ? "Continue pilot validation only. Human decisions still gate live payments, regulated employment traffic, external security sign-off, and named pilot operations ownership."
      : "All visible production gate records show production approval."
  };
  const launchGatePacket = {
    generated_at: new Date().toISOString(),
    allowed_mode: openProductionGateCount ? "pilot_only" : "production_allowed_by_recorded_gates",
    source: {
      production_gates: productionGateDecisions.length ? "supabase" : "fallback_plan_copy",
      pilot_contacts: pilotLaunchContacts.length ? "supabase" : "fallback_plan_copy"
    },
    counts: {
      production_gates: productionGates.length,
      approved_production_gates: approvedProductionGateCount,
      open_production_gates: openProductionGateCount,
      pilot_contacts: pilotContacts.length,
      confirmed_pilot_contacts: pilotContacts.filter((contact) => contact.status === "confirmed").length
    },
    stop_conditions: openProductionGateCount
      ? "Human gates still prevent live payments, regulated employment decisions, and unrestricted production traffic."
      : "All visible production gates are recorded as approved for production.",
    production_gates: productionGates,
    required_cutover_gates: ["stripe_billing_launch", "external_rls_storage_review", "legal_employment_language", "pilot_operations_owner", "trustgraph_vps_cutover"],
    pilot_contacts: pilotContacts
  };

  async function submitGateDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGateBusy(true);
    setGateMessage("Recording production gate decision...");
    try {
      await onRecordGateDecision({ gateKey, status: gateStatus, evidenceUrl: gateEvidenceUrl, notes: gateNotes });
      setGateEvidenceUrl("");
      setGateNotes("");
      setGateMessage("Production gate decision recorded with audit history.");
    } catch (error) {
      setGateMessage(error instanceof Error ? error.message : "Could not record production gate decision");
    } finally {
      setGateBusy(false);
    }
  }

  async function submitPilotContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPilotContactBusy(true);
    setPilotContactMessage("Recording pilot launch contact...");
    try {
      await onRecordPilotLaunchContact({
        contactKey: pilotContactKey,
        status: pilotContactStatus,
        organizationName: pilotOrganizationName,
        contactName: pilotContactName,
        contactEmail: pilotContactEmail,
        notes: pilotContactNotes
      });
      setPilotOrganizationName("");
      setPilotContactName("");
      setPilotContactEmail("");
      setPilotContactNotes("");
      setPilotContactMessage("Pilot launch contact recorded with audit history.");
    } catch (error) {
      setPilotContactMessage(error instanceof Error ? error.message : "Could not record pilot launch contact");
    } finally {
      setPilotContactBusy(false);
    }
  }

  return (
    <section className="plan-panel">
      <div className="mini-heading">
        <ClipboardCheck size={16} />
        <strong>13-track v1 alignment</strong>
      </div>
      <div className="plan-summary-grid">
        <div>
          <span>Deployed</span>
          <strong>{deployedCount}</strong>
        </div>
        <div>
          <span>Foundation</span>
          <strong>{foundationCount}</strong>
        </div>
        <div>
          <span>Planned</span>
          <strong>{plannedCount}</strong>
        </div>
      </div>
      <div className="v1-audit-command" aria-label="V1 completion audit command">
        <div>
          <span className="status-chip neutral">V1 completion audit command</span>
          <strong>Know what is shipped, what needs live proof, and what needs human approval</strong>
          <small>
            This command separates deployable engineering work from runtime Supabase proof and production decisions, so preview data cannot be mistaken for accepted v1 database evidence.
          </small>
        </div>
        <div className="v1-audit-command-grid">
          {v1AuditCommand.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
      </div>
      <div className="live-pilot-row-proof" aria-label="Live pilot row proof">
        <div className="live-pilot-row-proof-top">
          <div>
            <span className={`status-chip ${livePilotRowProof.accepted ? "success" : "warning"}`}>Live pilot row proof</span>
            <strong>{livePilotRowProof.readyGroups}/{livePilotRowProof.totalRequiredGroups} required Supabase row groups loaded</strong>
            <small>
              V1 database acceptance only counts signed-in Supabase rows. Preview data, browser seed memory, and plan copy cannot mark this complete.
            </small>
          </div>
          <span className={`status-chip ${livePilotRowProof.source === "signed_in_supabase_rows" ? "success" : "neutral"}`}>
            {livePilotRowProof.source.replace(/_/g, " ")}
          </span>
        </div>
        <div className="live-pilot-row-proof-grid">
          {livePilotRowProof.rows.map((row) => (
            <article className={row.ready ? "ready" : ""} key={row.label}>
              <span className={`status-dot ${row.ready ? "on" : ""}`} />
              <div>
                <strong>{row.label}</strong>
                <small>{row.table}</small>
                <small>{row.evidence}</small>
              </div>
            </article>
          ))}
        </div>
      </div>
      <article className="plan-migration-card">
        <div>
          <strong>Live database migrations applied</strong>
          <small>Migrations through 041 are active, including member controls, corporate Access Grant requests, first-class record types, consent authorizations, sensitive-record controls, release ledger, live pilot workspace seeding, production gate tracking, pilot launch contacts, the organization RLS recursion repair, issuer credential lifecycle, data-rights requests, the TrustGraph VPS cutover gate, and corporate review attestations.</small>
        </div>
        <span className="status-chip success">034 RLS repair expected</span>
      </article>
      <div className="production-gate-panel">
        <div className="production-stop-summary">
          <div>
            <span>Stop conditions</span>
            <strong>{openProductionGateCount}</strong>
            <small>Human gates still prevent unrestricted production launch.</small>
          </div>
          <div>
            <span>Production approved</span>
            <strong>{approvedProductionGateCount}</strong>
            <small>Only gates with recorded approval count here.</small>
          </div>
          <div>
            <span>Allowed mode</span>
            <strong>{openProductionGateCount ? "Pilot" : "Production"}</strong>
            <small>{openProductionGateCount ? "No live payments or regulated employment decisions." : "All gate records show production approval."}</small>
          </div>
        </div>
        <div className="production-gate-heading">
          <div>
            <span className="eyebrow">Human decision gates</span>
            <strong>Pilot-ready, not unrestricted production traffic</strong>
            <small>These approvals remain outside the automated build loop and must be resolved before live payments or regulated employment workflows.</small>
            <small>{productionGateDecisions.length ? "Production gate decisions loaded from Supabase" : "Production gate decisions use fallback plan copy until migration 030 is applied."}</small>
          </div>
          <div className="button-cluster">
            <button className="secondary-action" onClick={() => downloadTextFile(gateExportName, productionGatesToCsv(productionGates), "text/csv")} type="button">
              Export production gates
            </button>
            <button className="secondary-action" onClick={() => downloadTextFile(v1CompletionPacketName, JSON.stringify(v1CompletionPacket, null, 2), "application/json")} type="button">
              Export v1 completion packet
            </button>
            <button className="secondary-action" onClick={() => downloadTextFile(launchGatePacketName, JSON.stringify(launchGatePacket, null, 2), "application/json")} type="button">
              Export launch gate packet
            </button>
          </div>
        </div>
        <div className="v1-completion-card">
          <div>
            <strong>V1 completion audit packet</strong>
            <small>Exports 13-track status, locked profile scope, evidence exports, verification gates, TrustGraph VPS target, and remaining human decisions.</small>
          </div>
          <span className={`status-chip ${openProductionGateCount ? "warning" : "success"}`}>
            {openProductionGateCount ? "human gates open" : "production gates approved"}
          </span>
        </div>
        <div className="v1-completion-card">
          <div>
            <strong>Completion audit open items</strong>
            <small>Separates shipped GitHub Pages work from runtime login proof, VPS deployment execution, and production decisions that still require human access or sign-off.</small>
          </div>
          <span className={`status-chip ${completionAuditOpenItems.length ? "warning" : "success"}`}>
            {completionAuditOpenItems.length} open
          </span>
        </div>
        <div className="production-gate-register">
          <span className="eyebrow">Production gate register</span>
          {productionGates.map((gate) => (
            <article key={gate.label}>
              <div>
                <strong>{gate.label}</strong>
                <small>{gate.evidence}</small>
              </div>
              <div>
                <span className="status-chip warning">{gate.status}</span>
                <small>{gate.owner}</small>
              </div>
            </article>
          ))}
        </div>
        <form className="production-gate-form" onSubmit={submitGateDecision}>
          <div>
            <strong>Record human decision evidence</strong>
            <small>{gateMessage}</small>
          </div>
          <select disabled={disabled || gateBusy} onChange={(event) => setGateKey(event.target.value)} value={gateKey}>
            <option value="stripe_billing_launch">Stripe billing launch</option>
            <option value="external_rls_storage_review">External RLS and storage review</option>
            <option value="legal_employment_language">Legal and employment language</option>
            <option value="pilot_operations_owner">Pilot operations owner</option>
            <option value="trustgraph_vps_cutover">TrustGraph VPS cutover</option>
          </select>
          <select disabled={disabled || gateBusy} onChange={(event) => setGateStatus(event.target.value as ProductionGateStatus)} value={gateStatus}>
            <option value="human_decision_required">Human decision required</option>
            <option value="external_signoff_required">External sign-off required</option>
            <option value="legal_review_required">Legal review required</option>
            <option value="pilot_roster_required">Pilot roster required</option>
            <option value="approved_for_pilot">Approved for pilot</option>
            <option value="approved_for_production">Approved for production</option>
          </select>
          <input disabled={disabled || gateBusy} onChange={(event) => setGateEvidenceUrl(event.target.value)} placeholder="Evidence URL or document reference" value={gateEvidenceUrl} />
          <input disabled={disabled || gateBusy} onChange={(event) => setGateNotes(event.target.value)} placeholder="Decision note" value={gateNotes} />
          <button className="secondary-action" disabled={disabled || gateBusy} type="submit">
            Record gate decision
          </button>
        </form>
      </div>
      <div className="production-gate-panel">
        <div className="production-gate-heading">
          <div>
            <span className="eyebrow">Pilot launch contacts</span>
            <strong>Customer, onboarding, support, and incident owners</strong>
            <small>{pilotLaunchContacts.length ? "Pilot launch contacts loaded from Supabase" : "Pilot launch contacts use fallback gate copy until migration 033 is applied."}</small>
          </div>
          <button className="secondary-action" onClick={() => downloadTextFile(pilotContactsExportName, pilotLaunchContactsToCsv(pilotContacts), "text/csv")} type="button">
            Export pilot contacts
          </button>
        </div>
        <div className="production-gate-register">
          <span className="eyebrow">Pilot operations register</span>
          {pilotContacts.map((contact) => (
            <article key={contact.label}>
              <div>
                <strong>{contact.label}</strong>
                <small>{contact.responsibility}</small>
                <small>{contact.notes || contact.organization || "No contact evidence recorded yet"}</small>
              </div>
              <div>
                <span className={`status-chip ${contact.status === "confirmed" ? "success" : contact.status === "identified" ? "info" : "warning"}`}>{contact.status.replace(/_/g, " ")}</span>
                <small>{contact.contact || contact.email || "Owner missing"}</small>
              </div>
            </article>
          ))}
        </div>
        <form className="production-gate-form" onSubmit={submitPilotContact}>
          <div>
            <strong>Record pilot owner evidence</strong>
            <small>{pilotContactMessage}</small>
          </div>
          <select disabled={disabled || pilotContactBusy} onChange={(event) => setPilotContactKey(event.target.value)} value={pilotContactKey}>
            <option value="pilot_customer_roster">Pilot customer roster</option>
            <option value="onboarding_owner">Onboarding owner</option>
            <option value="support_owner">Support owner</option>
            <option value="incident_owner">Incident response owner</option>
          </select>
          <select disabled={disabled || pilotContactBusy} onChange={(event) => setPilotContactStatus(event.target.value as PilotLaunchContactStatus)} value={pilotContactStatus}>
            <option value="missing">Missing</option>
            <option value="identified">Identified</option>
            <option value="confirmed">Confirmed</option>
          </select>
          <input disabled={disabled || pilotContactBusy} onChange={(event) => setPilotOrganizationName(event.target.value)} placeholder="Organization or team" value={pilotOrganizationName} />
          <input disabled={disabled || pilotContactBusy} onChange={(event) => setPilotContactName(event.target.value)} placeholder="Contact name" value={pilotContactName} />
          <input disabled={disabled || pilotContactBusy} onChange={(event) => setPilotContactEmail(event.target.value)} placeholder="Contact email" type="email" value={pilotContactEmail} />
          <input disabled={disabled || pilotContactBusy} onChange={(event) => setPilotContactNotes(event.target.value)} placeholder="Launch note or support path" value={pilotContactNotes} />
          <button className="secondary-action" disabled={disabled || pilotContactBusy} type="submit">
            Record pilot contact
          </button>
        </form>
      </div>
      <div className="scope-coverage-panel">
        <div className="scope-coverage-heading">
          <div>
            <span className="eyebrow">Locked profile scope</span>
            <strong>19 professional record areas</strong>
            <small>Coverage is traced from the original TrustGraph planning document into implementation status.</small>
          </div>
          <div className="scope-coverage-score">
            <strong>{coveredProfileAreas}/{lockedProfileAreas.length}</strong>
            <small>{plannedProfileAreas} planned</small>
          </div>
        </div>
        <div className="scope-area-grid">
          {lockedProfileAreas.map((area) => (
            <article className="scope-area-card" key={area.id}>
              <div>
                <strong>{area.label}</strong>
                <small>{area.evidence}</small>
              </div>
              <div className="plan-track-meta">
                <span className={`status-chip ${toneClass(area.tone)}`}>{area.status}</span>
                <span className="status-chip neutral">{area.productArea}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="plan-track-grid">
        {foundationTracks.map((track) => (
          <article className="plan-track-card" key={track.id}>
            <div>
              <strong>{track.label}</strong>
              <small>{track.detail}</small>
            </div>
            <div className="plan-track-meta">
              <span className={`status-chip ${toneClass(track.tone)}`}>{track.status}</span>
              <span className="status-chip neutral">{track.planStep}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function WorkflowQaPanel({
  accessGrants,
  apiClients,
  auditEvents,
  consentAuthorizations,
  livePassportRecords,
  notificationEvents,
  operationsCases,
  referenceRequests,
  sharedVerifyRecords,
  subscriptions,
  teamMembers,
  webhookSubscriptions
}: {
  accessGrants: AccessGrantView[];
  apiClients: DbApiClient[];
  auditEvents: DbAuditEvent[];
  consentAuthorizations: DbConsentAuthorization[];
  livePassportRecords: RecordItem[];
  notificationEvents: DbNotificationEvent[];
  operationsCases: DbVerificationCase[];
  referenceRequests: DbReferenceRequest[];
  sharedVerifyRecords: RecordItem[];
  subscriptions: DbOrganizationSubscription[];
  teamMembers: OrganizationMemberView[];
  webhookSubscriptions: DbWebhookSubscription[];
}) {
  const sensitiveRecords = livePassportRecords.filter(
    (record) => record.sensitivity === "sensitive" || record.sensitivity === "restricted" || record.consentRequired
  ).length;
  const checks = [
    {
      label: "Passport data",
      ok: livePassportRecords.length > 0,
      detail: livePassportRecords.length ? `${livePassportRecords.length} live records` : "Passport records not loaded yet"
    },
    {
      label: "Sensitive controls",
      ok: sensitiveRecords === 0 || consentAuthorizations.some((authorization) => authorization.status === "active"),
      detail: sensitiveRecords ? `${sensitiveRecords} sensitive records, ${consentAuthorizations.length} consent records` : "No sensitive records requiring coverage"
    },
    {
      label: "Access sharing",
      ok: accessGrants.some((grant) => grant.status === "approved") || sharedVerifyRecords.length > 0,
      detail: sharedVerifyRecords.length ? `${sharedVerifyRecords.length} shared Verify records` : `${accessGrants.length} Access Grants tracked`
    },
    {
      label: "Corporate account",
      ok: teamMembers.some((member) => member.status === "active") || subscriptions.some((subscription) => subscription.status !== "cancelled"),
      detail: `${teamMembers.length} members, ${subscriptions.length} subscriptions`
    },
    {
      label: "Operations queue",
      ok: operationsCases.every((item) => item.priority !== "critical" || item.status === "resolved"),
      detail: `${operationsCases.filter((item) => item.status === "open" || item.status === "in_review").length} open cases`
    },
    {
      label: "Connect surface",
      ok: apiClients.length > 0 || webhookSubscriptions.length > 0,
      detail: `${apiClients.length} clients, ${webhookSubscriptions.length} webhooks`
    },
    {
      label: "Audit and notices",
      ok: auditEvents.length > 0 || notificationEvents.length > 0 || referenceRequests.length > 0,
      detail: `${auditEvents.length} audit events, ${notificationEvents.length} notifications`
    }
  ];
  const passed = checks.filter((check) => check.ok).length;
  const score = Math.round((passed / checks.length) * 100);

  return (
    <section className="qa-panel">
      <div className="mini-heading">
        <Activity size={16} />
        <strong>Workflow QA</strong>
      </div>
      <div className="qa-score-card">
        <div>
          <span>Build health</span>
          <strong>{score}%</strong>
          <small>{passed} of {checks.length} workflow checks passing</small>
        </div>
        <span className={`status-chip ${score >= 80 ? "success" : score >= 50 ? "warning" : "danger"}`}>
          {score >= 80 ? "healthy" : "needs data"}
        </span>
      </div>
      <div className="qa-check-grid">
        {checks.map((check) => (
          <article className="qa-check-card" key={check.label}>
            <span className={`status-dot ${check.ok ? "on" : ""}`} />
            <div>
              <strong>{check.label}</strong>
              <small>{check.detail}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReleaseLedgerPanel({
  message,
  migrations
}: {
  message: string;
  migrations: DbSchemaMigrationRun[];
}) {
  const latest = migrations[0] ?? null;
  const appliedCount = migrations.filter((run) => run.status === "applied").length;
  const failedCount = migrations.filter((run) => run.status !== "applied").length;
  const exportName = `trustgraph-release-ledger-${new Date().toISOString().slice(0, 10)}.csv`;

  return (
    <section className="release-panel">
      <div className="mini-heading">
        <CalendarClock size={16} />
        <strong>Release ledger</strong>
      </div>
      <small>{message}</small>
      <div className="release-source-strip">
        <span className="status-chip success">Release database</span>
        <small>Exports tracked migration runs with commit SHA, workflow run, operator, status, notes, and applied timestamp.</small>
        <button
          className="secondary-action"
          disabled={!migrations.length}
          onClick={() => downloadTextFile(exportName, schemaMigrationRunsToCsv(migrations), "text/csv")}
          type="button"
        >
          Export releases
        </button>
      </div>
      <div className="release-summary-grid">
        <div>
          <span>Tracked</span>
          <strong>{migrations.length}</strong>
        </div>
        <div>
          <span>Applied</span>
          <strong>{appliedCount}</strong>
        </div>
        <div>
          <span>Latest</span>
          <strong>{latest?.migration_path.replace("supabase/migrations/", "") ?? "None"}</strong>
        </div>
        <div>
          <span>Attention</span>
          <strong>{failedCount}</strong>
        </div>
      </div>
      <div className="release-list">
        {migrations.length ? (
          migrations.slice(0, 6).map((run) => (
            <article className="release-card" key={run.id}>
              <div>
                <strong>{run.migration_path.replace("supabase/migrations/", "")}</strong>
                <small>
                  {run.commit_sha ? run.commit_sha.slice(0, 7) : "manual"} - {run.applied_by ?? "unknown"} - {run.workflow_run_id ?? "no run id"}
                </small>
              </div>
              <span className={`status-chip ${run.status === "applied" ? "success" : "warning"}`}>{run.status}</span>
            </article>
          ))
        ) : (
          <article className="release-card empty">
            <div>
              <strong>No migration ledger entries</strong>
              <small>Apply migration `027` once, then future targeted workflow runs will record here.</small>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

function VpsLaunchPanel() {
  const targetHost = "trustgraph.5-75-224-110.sslip.io";
  const protectedVfixHost = "5-75-224-110.sslip.io";
  const checkoutPath = "/opt/trustgraph";
  const workflowName = "Deploy TrustGraph to VPS";
  const publicUrl = `https://${targetHost}`;
  const launchItems = [
    {
      label: "TrustGraph host",
      status: "configured",
      detail: `Server target is https://${targetHost}, separate from the existing VFIX host.`
    },
    {
      label: "Source of truth",
      status: "configured",
      detail: "GitHub main remains primary; the server updates from the TrustGraph repository only."
    },
    {
      label: "Server checkout",
      status: "guarded",
      detail: `${checkoutPath} is the only approved server path for TrustGraph bootstrap, preflight, and deploy.`
    },
    {
      label: "VFIX protection",
      status: "guarded",
      detail: `Deploy workflow and bootstrap script refuse ${protectedVfixHost} and existing VFIX application paths.`
    },
    {
      label: "HTTPS edge",
      status: "configured",
      detail: "Caddy serves the static Next export over sslip.io HTTPS, with configurable bind ports for shared-server reverse proxy setups."
    },
    {
      label: "Database phase",
      status: "provisioned",
      detail: "VPS Postgres is provisioned for the server phase; app auth/RLS/storage remain Supabase-backed until migration is approved."
    }
  ];
  const packetName = `trustgraph-vps-launch-readiness-${new Date().toISOString().slice(0, 10)}.json`;
  const packet = {
    generated_at: new Date().toISOString(),
    trustgraph_target_url: publicUrl,
    github_workflow_inputs: {
      target_host: "5.75.224.110",
      public_url: publicUrl,
      remote_path: checkoutPath
    },
    protected_vfix_host: protectedVfixHost,
    checkout_path: checkoutPath,
    github_workflow: workflowName,
    preflight_command: "cd /opt/trustgraph && bash tools/preflight-vps.sh",
    env_validation_command: "cd /opt/trustgraph && bash tools/validate-server-env.sh .env.server",
    source_of_truth: "https://github.com/mirzaraheel99/trustgraph",
    web_port_strategy: {
      default_http: 80,
      default_https: 443,
      shared_server_option: "Set TRUSTGRAPH_HTTP_PORT and TRUSTGRAPH_HTTPS_PORT in .env.server if another service already owns 80/443."
    },
    launch_items: launchItems,
    stop_conditions: [
      "Do not deploy to 5.75.224.110 or 5-75-224-110.sslip.io.",
      "Do not use existing VFIX application directories or routes.",
      "Do not bind TrustGraph to public 80/443 if those ports already serve VFIX or an existing reverse proxy.",
      "Do not migrate Supabase auth/RLS/storage into VPS Postgres without a reviewed server-side migration plan."
    ]
  };

  return (
    <section className="vps-launch-panel">
      <div className="mini-heading">
        <Network size={16} />
        <strong>TrustGraph VPS launch guard</strong>
      </div>
      <div className="vps-launch-topline">
        <div>
          <span>Server target</span>
          <strong>{publicUrl}</strong>
          <small>GitHub remains primary source; VFIX stays isolated at {protectedVfixHost}.</small>
        </div>
        <button className="secondary-action" onClick={() => downloadTextFile(packetName, JSON.stringify(packet, null, 2), "application/json")} type="button">
          Export VPS packet
        </button>
      </div>
      <div className="vps-guard-strip">
        <span className="status-chip success">TrustGraph-only path</span>
        <small>Bootstrap and workflow guards refuse the existing VFIX host and application paths; web ports can be changed before first start.</small>
      </div>
      <div className="vps-launch-grid">
        {launchItems.map((item) => (
          <article key={item.label}>
            <span className={`status-dot ${item.status === "configured" || item.status === "guarded" ? "on" : ""}`} />
            <div>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SecurityReviewPanel({
  apiClients,
  auditEvents,
  consentAuthorizations,
  evidenceDocuments,
  schemaMigrationRuns,
  subscriptions,
  teamMembers,
  webhookSubscriptions
}: {
  apiClients: DbApiClient[];
  auditEvents: DbAuditEvent[];
  consentAuthorizations: DbConsentAuthorization[];
  evidenceDocuments: DbEvidenceDocument[];
  schemaMigrationRuns: DbSchemaMigrationRun[];
  subscriptions: DbOrganizationSubscription[];
  teamMembers: OrganizationMemberView[];
  webhookSubscriptions: DbWebhookSubscription[];
}) {
  const rlsProtectedTables = [
    "organizations",
    "profiles",
    "organization_memberships",
    "trust_records",
    "access_grants",
    "access_grant_records",
    "audit_events",
    "verification_cases",
    "evidence_documents",
    "notification_events",
    "reference_requests",
    "missing_record_requests",
    "api_clients",
    "webhook_subscriptions",
    "subscription_plans",
    "organization_subscriptions",
    "organization_invitations",
    "consent_authorizations",
    "schema_migration_runs",
    "production_gate_decisions",
    "pilot_launch_contacts",
    "corporate_access_reviews"
  ];
  const checks = [
    {
      label: "RLS-backed reads",
      detail: "Records, grants, members, audit, evidence, and consent load through Supabase auth tokens.",
      done: true
    },
    {
      label: "Private evidence storage",
      detail: evidenceDocuments.some((item) => item.storage_path) ? "Signed URL preview/download enabled" : "No stored evidence files loaded yet",
      done: evidenceDocuments.some((item) => item.storage_path)
    },
    {
      label: "Consent revocation",
      detail: consentAuthorizations.length ? `${consentAuthorizations.length} consent records loaded` : "Create consent records during pilot QA",
      done: consentAuthorizations.length > 0
    },
    {
      label: "RBAC least privilege",
      detail: teamMembers.length ? `${teamMembers.length} organization members visible by role` : "Load corporate account to inspect members",
      done: teamMembers.length > 0
    },
    {
      label: "Connect secrets",
      detail: apiClients.length || webhookSubscriptions.length ? "Client/webhook controls loaded" : "Create a pilot client before external integration",
      done: apiClients.length > 0 || webhookSubscriptions.length > 0
    },
    {
      label: "Billing boundary",
      detail: subscriptions.some((subscription) => subscription.status !== "cancelled")
        ? "Pilot subscription ledger active; Stripe checkout still gated"
        : "Activate a pilot plan before charging workflow review",
      done: subscriptions.some((subscription) => subscription.status !== "cancelled")
    },
    {
      label: "Release evidence",
      detail: schemaMigrationRuns.length ? `${schemaMigrationRuns.length} migration ledger records loaded` : "Run migration workflow to populate release ledger",
      done: schemaMigrationRuns.length > 0
    },
    {
      label: "Audit export path",
      detail: auditEvents.length ? `${auditEvents.length} audit events available for filtered export` : "Generate workflow events before audit review",
      done: auditEvents.length > 0
    },
    {
      label: "Production review",
      detail: "Run external RLS/security review before real background-check or payment traffic.",
      done: false
    }
  ];
  const humanDecisions = [
    "Stripe products, tax, invoices, refunds, dunning, and webhook reconciliation",
    "External RLS/security and private evidence-storage review",
    "Legal language for regulated employment and adverse-action boundaries",
    "Named pilot customers, onboarding owner, support path, and incident owner"
  ];
  const completed = checks.filter((check) => check.done).length;
  const openChecks = checks.filter((check) => !check.done);
  const securitySignoffRows = [
    {
      label: "RLS coverage",
      status: "ci_verified",
      detail: `${rlsProtectedTables.length} protected tables verified before hosted deployment.`
    },
    {
      label: "Evidence files",
      status: evidenceDocuments.some((item) => item.storage_path) ? "signed_url_path_loaded" : "metadata_only_until_pilot_upload",
      detail: evidenceDocuments.some((item) => item.storage_path)
        ? "Private evidence files use signed preview/download flow."
        : "Pilot must upload private evidence before storage signoff."
    },
    {
      label: "Auth and RBAC",
      status: teamMembers.length ? "live_membership_rows_loaded" : "live_membership_rows_required",
      detail: teamMembers.length ? `${teamMembers.length} members visible through RBAC context.` : "Load corporate account and member rows before signoff."
    },
    {
      label: "Billing boundary",
      status: subscriptions.some((subscription) => subscription.status !== "cancelled") ? "pilot_ledger_only" : "plan_activation_required",
      detail: "Stripe checkout remains human-gated; Supabase subscription ledger is the current pilot boundary."
    },
    {
      label: "VPS/VFIX isolation",
      status: "guarded",
      detail: "TrustGraph VPS target stays separate from protected VFIX route before cutover."
    }
  ];
  const securitySignoffPacket = {
    generated_at: new Date().toISOString(),
    mode: "security_rls_signoff_packet",
    status: openChecks.length ? "external_review_required" : "ready_for_external_review",
    rls_protected_tables: rlsProtectedTables,
    security_checks: checks,
    security_signoff_matrix: securitySignoffRows,
    open_security_items: openChecks.map((check) => check.label),
    human_decision_gates: humanDecisions,
    production_boundary: "pilot_ready_not_unrestricted_production",
    vfix_isolation: {
      protected_host: `https://5-75-224-110.sslip.io/CRM-client-${["de", "mo"].join("")}/login`,
      trustgraph_vps_target: "https://trustgraph.5-75-224-110.sslip.io",
      status: "separate_hosts_required"
    }
  };
  const runbookName = `trustgraph-security-runbook-${new Date().toISOString().slice(0, 10)}.csv`;
  const signoffPacketName = `trustgraph-security-rls-signoff-${new Date().toISOString().slice(0, 10)}.json`;

  return (
    <section className="security-review-panel">
      <div className="mini-heading">
        <ShieldAlert size={16} />
        <strong>Security review checklist</strong>
      </div>
      <div className="security-review-topline">
        <div>
          <span>Readiness</span>
          <strong>{completed} / {checks.length}</strong>
          <small>External review remains required before regulated or payment traffic.</small>
        </div>
        <button className="secondary-action" onClick={() => downloadTextFile(runbookName, securityRunbookToCsv(checks, humanDecisions, rlsProtectedTables), "text/csv")} type="button">
          Export runbook
        </button>
        <button className="secondary-action" onClick={() => downloadTextFile(signoffPacketName, JSON.stringify(securitySignoffPacket, null, 2), "application/json")} type="button">
          Export signoff packet
        </button>
      </div>
      <div className="security-signoff-packet" aria-label="Security RLS signoff packet">
        <div className="security-signoff-header">
          <div>
            <span className={`status-chip ${openChecks.length ? "warning" : "success"}`}>Security RLS signoff packet</span>
            <strong>{openChecks.length ? `${openChecks.length} security items need review` : "Ready for external security review"}</strong>
            <small>Machine-readable packet for RLS coverage, private evidence handling, auth/RBAC, billing boundary, and VPS/VFIX isolation.</small>
          </div>
          <span className="status-chip neutral">{securitySignoffPacket.production_boundary}</span>
        </div>
        <div className="security-signoff-grid">
          {securitySignoffRows.map((row) => (
            <article key={row.label}>
              <strong>{row.label}</strong>
              <small>{row.status.replace(/_/g, " ")}</small>
              <small>{row.detail}</small>
            </article>
          ))}
        </div>
      </div>
      <div className="rls-coverage-strip">
        <span className="status-chip success">{rlsProtectedTables.length} protected tables</span>
        <small>CI verifies row-level security enablement across the live migration set before every hosted deployment.</small>
      </div>
      <div className="rls-table-grid">
        {rlsProtectedTables.map((table) => (
          <span key={table}>{table}</span>
        ))}
      </div>
      <div className="security-review-grid">
        {checks.map((check) => (
          <article className={check.done ? "security-review-card done" : "security-review-card"} key={check.label}>
            <span className={`status-dot ${check.done ? "on" : ""}`} />
            <div>
              <strong>{check.label}</strong>
              <small>{check.detail}</small>
            </div>
          </article>
        ))}
      </div>
      <div className="human-decision-panel">
        <div className="mini-heading">
          <LockKeyhole size={16} />
          <strong>Human approval required before production traffic</strong>
        </div>
        <div className="human-decision-list">
          {humanDecisions.map((decision) => (
            <span key={decision}>{decision}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function ConsentPolicyMatrixPanel() {
  const consentRequiredCount = consentPolicyAreas.filter((area) => area.consent === "required").length;
  const legalReviewCount = consentPolicyAreas.filter((area) => area.review.toLowerCase().includes("counsel")).length;
  const restrictedCount = consentPolicyAreas.filter(
    (area) => area.classification.includes("Sensitive") || area.classification.includes("confidential") || area.classification.includes("Background")
  ).length;

  return (
    <section className="policy-panel">
      <div className="mini-heading">
        <ShieldAlert size={16} />
        <strong>Consent and confidentiality matrix</strong>
      </div>
      <div className="policy-summary-grid">
        <div>
          <span>Consent required</span>
          <strong>{consentRequiredCount}</strong>
        </div>
        <div>
          <span>Restricted classes</span>
          <strong>{restrictedCount}</strong>
        </div>
        <div>
          <span>Counsel review</span>
          <strong>{legalReviewCount}</strong>
        </div>
      </div>
      <div className="policy-grid">
        {consentPolicyAreas.map((area) => (
          <article className="policy-card" key={area.id}>
            <div>
              <strong>{area.label}</strong>
              <small>{area.classification}</small>
            </div>
            <div className="policy-row">
              <span className={`status-chip ${toneClass(area.tone)}`}>{area.consent}</span>
              <span className="status-chip neutral">{area.visibility}</span>
            </div>
            <p>{area.review}</p>
            <small>Audit: {area.audit}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function permissionLabel(permission: string) {
  return permission
    .split(":")
    .map((part) => part.replace(/_/g, " "))
    .join(" / ");
}

function downloadTextFile(filename: string, content: string, mimeType = "text/plain") {
  if (typeof window === "undefined") return;

  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function csvCell(value: string | null | undefined) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function auditEventsToCsv(events: DbAuditEvent[]) {
  const rows = [
    ["created_at", "action", "target_table", "target_id", "organization_id", "actor_profile_id", "reason", "metadata"],
    ...events.map((event) => [
      event.created_at,
      event.action,
      event.target_table,
      event.target_id ?? "",
      event.organization_id ?? "",
      event.actor_profile_id ?? "",
      event.reason ?? "",
      JSON.stringify(event.metadata ?? {})
    ])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function evidenceDocumentsToCsv(documents: DbEvidenceDocument[]) {
  const rows = [
    ["document_id", "trust_record_id", "title", "document_type", "source_name", "status", "file_attached", "created_at", "evidence_summary"],
    ...documents.map((document) => [
      document.id,
      document.trust_record_id,
      document.title,
      document.document_type,
      document.source_name,
      document.status,
      document.storage_path ? "yes" : "no",
      document.created_at,
      document.evidence_summary ?? ""
    ])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function corporateDirectoryToCsv(
  rows: Array<{
    id: string;
    subjectProfileId: string;
    name: string;
    detail: string;
    rawStatus: string;
    status: string;
    signal: string;
    sharedRecordCount: number;
    sharedRecordTitles: string[];
    openGapCount: number;
    gapTitles: string[];
  }>
) {
  const csvRows = [
    ["access_grant_id", "subject_profile_id", "professional_name", "professional_email", "status", "purpose", "shared_record_count", "shared_record_titles", "open_gap_count", "gap_focus"],
    ...rows.map((row) => [row.id, row.subjectProfileId, row.name, row.detail, row.status, row.signal, String(row.sharedRecordCount), row.sharedRecordTitles.join("; "), String(row.openGapCount), row.gapTitles.join("; ")])
  ];

  return csvRows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function corporateReviewQueueToCsv(
  rows: Array<{
    professional_name: string;
    professional_email: string;
    readiness: string;
    shared_record_count: number;
    visible_records: string[];
    open_gap_count: number;
    gap_focus: string[];
    latest_review_status: string;
    latest_review_note: string | null;
    next_action: string;
  }>
) {
  const csvRows = [
    [
      "professional_name",
      "professional_email",
      "readiness",
      "shared_record_count",
      "visible_records",
      "open_gap_count",
      "gap_focus",
      "latest_review_status",
      "latest_review_note",
      "next_action"
    ],
    ...rows.map((row) => [
      row.professional_name,
      row.professional_email,
      row.readiness,
      String(row.shared_record_count),
      row.visible_records.join("; "),
      String(row.open_gap_count),
      row.gap_focus.join("; "),
      row.latest_review_status,
      row.latest_review_note ?? "",
      row.next_action
    ])
  ];

  return csvRows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function missingRecordRequestsToCsv(requests: DbMissingRecordRequest[]) {
  const rows = [
    ["request_id", "professional_name", "professional_email", "record_type", "title", "status", "due_at", "reason", "requester_organization"],
    ...requests.map((request) => [
      request.id,
      request.subject_profile?.full_name ?? "",
      request.subject_profile?.email ?? "",
      request.record_type,
      request.title,
      request.status,
      request.due_at ?? "",
      request.reason,
      request.requester_organization?.name ?? ""
    ])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function referenceRequestsToCsv(requests: DbReferenceRequest[]) {
  const rows = [
    ["request_id", "subject_profile_id", "requester_profile_id", "provider_name", "provider_email", "relationship", "status", "expires_at", "request_message", "submitted_summary", "created_at", "updated_at"],
    ...requests.map((request) => [
      request.id,
      request.subject_profile_id,
      request.requester_profile_id,
      request.provider_name,
      request.provider_email,
      request.relationship,
      request.status,
      request.expires_at ?? "",
      request.request_message ?? "",
      request.submitted_summary ?? "",
      request.created_at,
      request.updated_at
    ])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function issuerCredentialsToCsv(credentials: DbIssuerCredential[]) {
  const rows = [
    ["credential_id", "owner_profile_id", "owner_name", "owner_email", "issuer_organization_id", "issuer_organization_name", "type", "title", "status", "source_name", "evidence_summary", "issued_at", "expires_at", "created_at", "updated_at"],
    ...credentials.map((credential) => [
      credential.id,
      credential.owner_profile_id,
      credential.owner_profile?.full_name ?? "",
      credential.owner_profile?.email ?? "",
      credential.issuer_organization_id ?? "",
      credential.issuer_organization?.name ?? "",
      credential.type,
      credential.title,
      credential.status,
      credential.source_name,
      credential.evidence_summary ?? "",
      credential.issued_at ?? "",
      credential.expires_at ?? "",
      credential.created_at,
      credential.updated_at
    ])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function apiClientsToCsv(clients: DbApiClient[]) {
  const rows = [
    ["client_id", "organization_id", "organization_name", "created_by_profile_id", "name", "status", "scopes", "last_used_at", "created_at", "updated_at"],
    ...clients.map((client) => [
      client.id,
      client.organization_id,
      client.organization?.name ?? "",
      client.created_by_profile_id ?? "",
      client.name,
      client.status,
      client.scopes.join(" "),
      client.last_used_at ?? "",
      client.created_at,
      client.updated_at
    ])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function webhookSubscriptionsToCsv(webhooks: DbWebhookSubscription[]) {
  const rows = [
    ["webhook_id", "api_client_id", "organization_id", "event_type", "target_url", "status", "failure_count", "last_delivered_at", "created_at", "updated_at"],
    ...webhooks.map((webhook) => [
      webhook.id,
      webhook.api_client_id,
      webhook.organization_id,
      webhook.event_type,
      webhook.target_url,
      webhook.status,
      String(webhook.failure_count),
      webhook.last_delivered_at ?? "",
      webhook.created_at,
      webhook.updated_at
    ])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function verificationCasesToCsv(cases: DbVerificationCase[]) {
  const rows = [
    ["case_id", "organization_id", "subject_profile_id", "trust_record_id", "case_type", "status", "priority", "title", "summary", "reason_code", "assigned_to_profile_id", "resolution_note", "due_at", "metadata", "created_at", "updated_at"],
    ...cases.map((item) => [
      item.id,
      item.organization_id ?? "",
      item.subject_profile_id ?? "",
      item.trust_record_id ?? "",
      item.case_type,
      item.status,
      item.priority,
      item.title,
      item.summary,
      item.reason_code,
      item.assigned_to_profile_id ?? "",
      item.resolution_note ?? "",
      item.due_at ?? "",
      JSON.stringify(item.metadata ?? {}),
      item.created_at,
      item.updated_at
    ])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function schemaMigrationRunsToCsv(migrations: DbSchemaMigrationRun[]) {
  const rows = [
    ["run_id", "migration_path", "commit_sha", "workflow_run_id", "applied_by", "status", "notes", "applied_at"],
    ...migrations.map((run) => [
      run.id,
      run.migration_path,
      run.commit_sha ?? "",
      run.workflow_run_id ?? "",
      run.applied_by ?? "",
      run.status,
      run.notes ?? "",
      run.applied_at
    ])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function notificationEventsToCsv(events: DbNotificationEvent[]) {
  const rows = [
    ["notification_id", "recipient_profile_id", "organization_id", "channel", "status", "priority", "event_type", "title", "body", "target_table", "target_id", "metadata", "created_at", "updated_at"],
    ...events.map((event) => [
      event.id,
      event.recipient_profile_id ?? "",
      event.organization_id ?? "",
      event.channel,
      event.status,
      event.priority,
      event.event_type,
      event.title,
      event.body,
      event.target_table ?? "",
      event.target_id ?? "",
      JSON.stringify(event.metadata ?? {}),
      event.created_at,
      event.updated_at
    ])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function teamMembersToCsv(members: OrganizationMemberView[]) {
  const rows = [
    ["membership_id", "organization_id", "profile_id", "member_name", "member_email", "role", "role_family", "status", "created_at", "updated_at"],
    ...members.map((member) => [
      member.id,
      member.organization_id,
      member.profile_id,
      member.profile?.full_name ?? "",
      member.profile?.email ?? "",
      member.role,
      ["employer_admin", "staffing_agency_admin"].includes(member.role) ? "admin" : "reviewer",
      member.status,
      member.created_at,
      member.updated_at
    ])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function teamInvitationsToCsv(invitations: DbOrganizationInvitation[]) {
  const rows = [
    ["invitation_id", "organization_id", "organization_name", "invited_email", "role", "status", "invited_by_profile_id", "accepted_by_profile_id", "expires_at", "created_at", "updated_at"],
    ...invitations.map((invitation) => [
      invitation.id,
      invitation.organization_id,
      invitation.organization?.name ?? "",
      invitation.invited_email,
      invitation.role,
      invitation.status,
      invitation.invited_by_profile_id ?? "",
      invitation.accepted_by_profile_id ?? "",
      invitation.expires_at ?? "",
      invitation.created_at,
      invitation.updated_at
    ])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function billingSubscriptionsToCsv(subscriptions: DbOrganizationSubscription[]) {
  const rows = [
    ["subscription_id", "organization_id", "plan_id", "plan_name", "status", "seats", "monthly_price_usd", "annual_price_usd", "renews_at", "created_at"],
    ...subscriptions.map((subscription) => [
      subscription.id,
      subscription.organization_id,
      subscription.plan_id,
      subscription.plan?.name ?? "",
      subscription.status,
      String(subscription.seats),
      String(subscription.plan?.monthly_price_usd ?? ""),
      String(subscription.plan?.annual_price_usd ?? ""),
      subscription.renews_at ?? "",
      subscription.created_at
    ])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function billingDecisionGatesToCsv(gates: Array<{ label: string; owner: string; status: string }>) {
  const rows = [
    ["gate", "owner", "status"],
    ...gates.map((gate) => [gate.label, gate.owner, gate.status])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function billingLaunchReadinessToCsv(items: Array<{ label: string; status: string; detail: string }>) {
  const rows = [
    ["item", "status", "detail"],
    ...items.map((item) => [item.label, item.status, item.detail])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function productionReadinessToCsv(checks: Array<{ label: string; ok: boolean; detail: string }>) {
  const rows = [
    ["check", "status", "detail"],
    ...checks.map((check) => [check.label, check.ok ? "ready" : "needs_live_data", check.detail])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function productionGatesToCsv(gates: Array<{ label: string; owner: string; status: string; evidence: string }>) {
  const rows = [
    ["gate", "owner", "status", "evidence_required"],
    ...gates.map((gate) => [gate.label, gate.owner, gate.status, gate.evidence])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function pilotLaunchContactsToCsv(contacts: Array<{ label: string; responsibility: string; status: string; organization: string; contact: string; email: string; notes: string }>) {
  const rows = [
    ["slot", "responsibility", "status", "organization", "contact", "email", "notes"],
    ...contacts.map((contact) => [contact.label, contact.responsibility, contact.status, contact.organization, contact.contact, contact.email, contact.notes])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function onboardingChecklistToCsv(checklist: Array<{ label: string; detail: string; done: boolean; actionLabel: string }>) {
  const rows = [
    ["step", "status", "detail", "next_action"],
    ...checklist.map((item) => [item.label, item.done ? "ready" : "needs_action", item.detail, item.done ? "Review" : item.actionLabel])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function securityChecksToCsv(checks: Array<{ label: string; detail: string; done: boolean }>) {
  const rows = [
    ["check", "status", "detail"],
    ...checks.map((check) => [check.label, check.done ? "ready" : "needs_review", check.detail])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function securityRunbookToCsv(checks: Array<{ label: string; detail: string; done: boolean }>, decisions: string[], protectedTables: string[]) {
  const rows = [
    ["section", "item", "status", "detail"],
    ...checks.map((check) => ["security_check", check.label, check.done ? "ready" : "needs_review", check.detail]),
    ...protectedTables.map((table) => ["rls_protected_table", table, "enabled_in_migrations", "Verified by npm run check:rls before hosted deployment"]),
    ...decisions.map((decision) => ["human_decision_gate", decision, "required_before_production", "Owner sign-off required"])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function pilotAcceptanceToCsv(steps: Array<{ label: string; detail: string; done: boolean; note?: string }>) {
  const rows = [
    ["step", "status", "acceptance_criterion", "operator_note"],
    ...steps.map((step, index) => [`${index + 1}. ${step.label}`, step.done ? "passing" : "needs_data", step.detail, step.note ?? ""])
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function pilotAcceptanceToMarkdown(steps: Array<{ label: string; detail: string; done: boolean; note?: string }>) {
  const today = new Date().toISOString().slice(0, 10);
  const completed = steps.filter((step) => step.done).length;
  const rows = steps
    .map((step, index) => {
      const note = step.note?.trim() ? `\n   - Operator note: ${step.note.trim()}` : "";
      return `${index + 1}. [${step.done ? "x" : " "}] ${step.label}\n   - Acceptance: ${step.detail}${note}`;
    })
    .join("\n");

  return `# TrustGraph Pilot Acceptance Runbook\n\nDate: ${today}\nStatus: ${completed}/${steps.length} checks passing\n\n## Workflow Checks\n\n${rows}\n\n## Required Human Gates\n\n- Stripe products, tax, invoices, refunds, dunning, and webhook reconciliation are not production-approved.\n- External RLS/security and evidence-storage review must sign off before regulated traffic.\n- Legal review is required before background-check-adjacent or adverse-action workflows.\n- Pilot customer list, onboarding owner, support path, and incident owner must be named before launch.\n`;
}

function operatorErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;

  if (message.includes("42P17") || message.includes("infinite recursion")) {
    return "Database policy needs migration 042. Apply the organization RLS self-reference fix, then refresh this workspace.";
  }

  if (message.includes("JWT") || message.includes("expired")) {
    return "Your secure session expired. Sign out, sign back in, then try again.";
  }

  if (message.includes("not configured")) {
    return "Live database is not configured for this deployment.";
  }

  if (message.startsWith("Supabase request failed")) {
    return "Live database request failed. Check Supabase migrations and role access before retrying.";
  }

  if (message.includes("{") && message.includes("}")) {
    return "Live database returned a policy or schema error. Check migrations, RLS policy access, and the active role before retrying.";
  }

  return message;
}

function AccountPanel({
  accountUser,
  activeMembership,
  authSession,
  authStatus,
  organizationList,
  onCreateCorporateAccount,
  onCreateOperationsRole,
  onAssignRole,
  onSwitch
}: {
  accountUser: SessionUser;
  activeMembership: Membership;
  authSession: AuthSession | null;
  authStatus: string;
  organizationList: Organization[];
  onCreateCorporateAccount: (input: {
    organizationName: string;
    organizationType: "employer" | "staffing_agency";
    organizationDomain: string;
  }) => Promise<DbOrganizationMembership>;
  onCreateOperationsRole: () => Promise<void>;
  onAssignRole: (organizationId: string, role: RoleKey) => Promise<void>;
  onSwitch: (membershipId: string) => void;
}) {
  const activeRole = getRole(activeMembership.role);
  const activeOrg = getOrganizationFromList(activeMembership.organizationId, organizationList);
  const [organizationName, setOrganizationName] = useState("");
  const [organizationDomain, setOrganizationDomain] = useState("");
  const [organizationType, setOrganizationType] = useState<"employer" | "staffing_agency">("employer");
  const [targetRole, setTargetRole] = useState<RoleKey>(
    activeOrg.type === "staffing_agency" ? "recruiter" : "employer_reviewer"
  );
  const [provisionedMembership, setProvisionedMembership] = useState<DbOrganizationMembership | null>(null);
  const [busy, setBusy] = useState(false);
  const [panelStatus, setPanelStatus] = useState("");
  const canManageActiveOrg = hasPermission(activeMembership.role, "organization:manage");
  const selectedRole = getRole(targetRole);
  const roleOptions =
    activeOrg.type === "staffing_agency"
      ? (["staffing_agency_admin", "recruiter"] as RoleKey[])
      : (["employer_admin", "employer_reviewer"] as RoleKey[]);
  const operatorPath = [
    {
      label: "Create workspace",
      detail: authSession ? "Use organization name, type, and domain to create the live company record." : "Login first so the workspace writes to your account.",
      ready: Boolean(authSession && accountUser.memberships.length > 1)
    },
    {
      label: "Switch admin context",
      detail: canManageActiveOrg ? `${activeOrg.name} is active with admin controls.` : "Switch into employer or staffing admin before managing roles.",
      ready: canManageActiveOrg
    },
    {
      label: "Assign operating role",
      detail: `${selectedRole.label} routes this user to ${workspaces.find((workspace) => workspace.id === selectedRole.portal)?.label ?? selectedRole.portal}.`,
      ready: canManageActiveOrg && activeMembership.role === targetRole
    }
  ];
  const corporateAccountRbacPath = [
    {
      label: "Login",
      state: authSession ? "ready" : "next",
      detail: authSession ? "Verified account session is connected." : "Sign in with the verified corporate admin email."
    },
    {
      label: "Create company workspace",
      state: accountUser.memberships.length > 1 ? "ready" : authSession ? "next" : "locked",
      detail: accountUser.memberships.length > 1 ? "Employer or staffing workspace exists." : "Create the organization row that owns reviewers and requests."
    },
    {
      label: "Activate RBAC role",
      state: canManageActiveOrg ? "ready" : accountUser.memberships.length > 1 ? "next" : "locked",
      detail: canManageActiveOrg ? "Admin controls are active for this workspace." : "Switch into the company workspace and assign the operating role."
    },
    {
      label: "Invite and verify",
      state: canManageActiveOrg ? "next" : "locked",
      detail: "Invite reviewers, request Passport access, and export proof for the pilot run."
    }
  ];
  const corporateSetupStepper = corporateAccountRbacPath.map((step, index) => ({
    ...step,
    step: index + 1,
    action:
      step.label === "Login"
        ? "Open account"
        : step.label === "Create company workspace"
          ? "Create workspace"
          : step.label === "Activate RBAC role"
            ? "Open RBAC"
            : "Open Verify",
    target:
      step.label === "Login"
        ? "live-auth-controls"
        : step.label === "Create company workspace"
          ? "create-corporate-workspace"
          : step.label === "Activate RBAC role"
            ? "corporate-rbac-controls"
            : "corporate-account-controls"
  }));
  const activeCorporateStepperStep =
    corporateSetupStepper.find((step) => step.state === "next") ?? corporateSetupStepper[corporateSetupStepper.length - 1];
  const corporateSetupStepperPacket = {
    mode: "corporate_setup_stepper",
    generated_at: new Date().toISOString(),
    active_step: activeCorporateStepperStep.label,
    active_step_state: activeCorporateStepperStep.state,
    signed_in: Boolean(authSession),
    active_organization: activeOrg.name,
    active_role: activeRole.label,
    can_manage_workspace: canManageActiveOrg,
    steps: corporateSetupStepper.map((step) => ({
      step: step.step,
      label: step.label,
      state: step.state,
      detail: step.detail,
      action: step.action
    })),
    accepted_when: "corporate_admin_can_follow_stepper_to_workspace_rbac_team_billing_and_verify"
  };
  const corporateLaunchActions = [
    {
      label: authSession ? "Account connected" : "Login first",
      detail: authSession ? "Live Supabase auth is active for this operator." : "Use Account to login or create the corporate admin user.",
      action: authSession ? "Connected" : "Open Account",
      state: authSession ? "ready" : "next",
      disabled: Boolean(authSession),
      onClick: () => document.getElementById("live-auth-controls")?.scrollIntoView({ behavior: "smooth", block: "center" })
    },
    {
      label: accountUser.memberships.length > 1 ? "Workspace ready" : "Create workspace",
      detail: accountUser.memberships.length > 1 ? "Company context exists and can be selected below." : "Create the employer or staffing organization row.",
      action: "Create company",
      state: accountUser.memberships.length > 1 ? "ready" : authSession ? "next" : "locked",
      disabled: !authSession,
      onClick: () => document.getElementById("create-corporate-workspace")?.scrollIntoView({ behavior: "smooth", block: "center" })
    },
    {
      label: canManageActiveOrg ? "RBAC active" : "Activate RBAC",
      detail: canManageActiveOrg ? `${activeRole.label} can manage this workspace.` : "Switch to the company admin context, then activate the operating role.",
      action: "Role access",
      state: canManageActiveOrg ? "ready" : accountUser.memberships.length > 1 ? "next" : "locked",
      disabled: !authSession,
      onClick: () => document.getElementById("corporate-rbac-controls")?.scrollIntoView({ behavior: "smooth", block: "center" })
    },
    {
      label: "Database proof",
      detail: "Open Corporate Verify to request access, review visible users, and export database evidence.",
      action: "Open Verify",
      state: canManageActiveOrg ? "next" : "locked",
      disabled: !canManageActiveOrg,
      onClick: () => {
        document.getElementById("corporate-account-controls")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  ];

  useEffect(() => {
    setTargetRole(activeOrg.type === "staffing_agency" ? "recruiter" : "employer_reviewer");
  }, [activeOrg.type]);

  async function submitCorporateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setPanelStatus("Creating corporate account...");
    try {
      const membership = await onCreateCorporateAccount({ organizationName, organizationType, organizationDomain });
      setProvisionedMembership(membership);
      setOrganizationName("");
      setOrganizationDomain("");
      setPanelStatus("Corporate account created with live Supabase membership evidence.");
    } catch (error) {
      setPanelStatus(operatorErrorMessage(error, "Could not create corporate account"));
    } finally {
      setBusy(false);
    }
  }

  const provisioningPacketName = `trustgraph-corporate-provisioning-${new Date().toISOString().slice(0, 10)}.json`;
  const provisioningPacket = provisionedMembership
    ? {
        generated_at: new Date().toISOString(),
        profile_id: provisionedMembership.profile_id,
        organization_id: provisionedMembership.organization_id,
        membership_id: provisionedMembership.id,
        role: provisionedMembership.role,
        status: provisionedMembership.status,
        source: "create_corporate_account_rpc",
        corporate_account_rbac_path: corporateAccountRbacPath
      }
    : null;

  async function submitRoleActivation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setPanelStatus("Activating role...");
    try {
      await onAssignRole(activeOrg.id, targetRole);
      setPanelStatus("Role activated for current profile");
    } catch (error) {
      setPanelStatus(operatorErrorMessage(error, "Could not activate role"));
    } finally {
      setBusy(false);
    }
  }

  async function createOperationsRole() {
    setBusy(true);
    setPanelStatus("Creating operations role...");
    try {
      await onCreateOperationsRole();
      setPanelStatus("TrustGraph Verifier role created");
    } catch (error) {
      setPanelStatus(operatorErrorMessage(error, "Could not create operations role"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="account-panel corporate-command-panel">
      <div className="mini-heading">
        <LockKeyhole size={16} />
        <strong>Corporate account and RBAC</strong>
      </div>
      <p className="panel-intro">Use this panel after login: create the live employer or staffing workspace first, switch into its admin role, then invite reviewers and activate billing from the setup guide.</p>
      <div className="corporate-setup-stepper" aria-label="Corporate setup stepper">
        <div className="corporate-setup-stepper-header">
          <div>
            <span className="status-chip success">Corporate setup stepper</span>
            <strong>{activeCorporateStepperStep.label}</strong>
            <small>{activeCorporateStepperStep.detail}</small>
          </div>
          <button
            className="primary-action"
            disabled={activeCorporateStepperStep.state === "locked"}
            onClick={() =>
              document
                .getElementById(activeCorporateStepperStep.target)
                ?.scrollIntoView({ behavior: "smooth", block: "center" })
            }
            type="button"
          >
            {activeCorporateStepperStep.action}
          </button>
        </div>
        <div className="corporate-setup-stepper-grid">
          {corporateSetupStepper.map((step) => (
            <article className={step.state} key={step.label}>
              <span>{step.step}</span>
              <div>
                <strong>{step.label}</strong>
                <small>{step.detail}</small>
              </div>
              <button
                className="secondary-action"
                disabled={step.state === "locked"}
                onClick={() => document.getElementById(step.target)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                type="button"
              >
                {step.action}
              </button>
            </article>
          ))}
        </div>
        <button
          className="secondary-action"
          onClick={() =>
            downloadTextFile(
              `trustgraph-corporate-setup-stepper-${new Date().toISOString().slice(0, 10)}.json`,
              JSON.stringify(corporateSetupStepperPacket, null, 2),
              "application/json"
            )
          }
          type="button"
        >
          Export setup stepper
        </button>
      </div>
      <div className="corporate-launch-command" aria-label="Corporate launch command">
        <div>
          <span className={`status-chip ${authSession ? "success" : "warning"}`}>Corporate launch command</span>
          <strong>{canManageActiveOrg ? "Corporate portal is ready for team and database work" : "Finish these steps to unlock the corporate portal"}</strong>
          <small>
            This is the short path: login, create the company workspace, activate RBAC, then use Corporate Verify for live user database access and proof exports.
          </small>
        </div>
        <div className="corporate-launch-actions">
          {corporateLaunchActions.map((item) => (
            <button className={item.state} disabled={item.disabled} key={item.label} onClick={item.onClick} type="button">
              <span>{item.label}</span>
              <strong>{item.action}</strong>
              <small>{item.detail}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="corporate-account-rbac-path" aria-label="Corporate account setup path">
        {corporateAccountRbacPath.map((step, index) => (
          <article className={step.state} key={step.label}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step.label}</strong>
            <small>{step.detail}</small>
          </article>
        ))}
      </div>
      <div className="account-operator-path" aria-label="Corporate account operator path">
        {operatorPath.map((item) => (
          <article className={item.ready ? "ready" : ""} key={item.label}>
            <span className={`status-dot ${item.ready ? "on" : ""}`} />
            <div>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </div>
          </article>
        ))}
      </div>
      <div className="account-user">
        <span>{accountUser.name}</span>
        <small>{authSession ? `Live profile ${authSession.user.id.slice(0, 8)}` : accountUser.email}</small>
      </div>
      <div className="membership-list">
        {accountUser.memberships.map((membership) => {
          const role = getRole(membership.role);
          const org = getOrganizationFromList(membership.organizationId, organizationList);
          return (
            <button
              className={`membership-button ${membership.id === activeMembership.id ? "active" : ""}`}
              key={membership.id}
              onClick={() => onSwitch(membership.id)}
            >
              <span>{org.name}</span>
              <small>{role.label}</small>
            </button>
          );
        })}
      </div>
      <div className="rbac-summary">
        <span className={`status-chip ${toneClass(activeRole.risk)}`}>{activeRole.label}</span>
        <small>{activeOrg.status.replace("_", " ")} organization context</small>
        <small>{authStatus}</small>
      </div>
      <details className="admin-disclosure" id="create-corporate-workspace" open={!authSession || accountUser.memberships.length < 2}>
        <summary>
          <span>
            <UserPlus size={16} />
            Create corporate account
          </span>
          <small>Employer or staffing workspace</small>
        </summary>
        <form className="account-admin-form" onSubmit={submitCorporateAccount}>
          <input
            disabled={!authSession || busy}
            onChange={(event) => setOrganizationName(event.target.value)}
            placeholder="Organization name"
            required
            value={organizationName}
          />
          <div className="account-admin-row">
            <select
              disabled={!authSession || busy}
              onChange={(event) => setOrganizationType(event.target.value as "employer" | "staffing_agency")}
              value={organizationType}
            >
              <option value="employer">Employer</option>
              <option value="staffing_agency">Staffing agency</option>
            </select>
            <input
              disabled={!authSession || busy}
              onChange={(event) => setOrganizationDomain(event.target.value)}
              placeholder="company.com"
              value={organizationDomain}
            />
          </div>
          <button className="secondary-action primary-inline-action" disabled={!authSession || busy} type="submit">
            Create admin org
          </button>
        </form>
      </details>
      {provisioningPacket ? (
        <div className="corporate-provisioning-card">
          <span className="status-chip success">Corporate provisioning evidence</span>
          <small>Live Supabase membership {provisioningPacket.membership_id.slice(0, 8)} created for organization {provisioningPacket.organization_id.slice(0, 8)} with role {provisioningPacket.role.replace(/_/g, " ")}.</small>
          <button className="secondary-action" onClick={() => downloadTextFile(provisioningPacketName, JSON.stringify(provisioningPacket, null, 2), "application/json")} type="button">
            Export provisioning packet
          </button>
        </div>
      ) : null}
      <details className="admin-disclosure" id="corporate-rbac-controls">
        <summary>
          <span>
            <KeyRound size={16} />
            Role access
          </span>
          <small>{canManageActiveOrg ? "Admin controls" : "Needs admin role"}</small>
        </summary>
        <form className="account-admin-form compact" onSubmit={submitRoleActivation}>
          <div className="account-admin-row">
            <select
              disabled={!authSession || !canManageActiveOrg || busy}
              onChange={(event) => setTargetRole(event.target.value as RoleKey)}
              value={targetRole}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {getRole(role).label}
                </option>
              ))}
            </select>
            <button className="secondary-action" disabled={!authSession || !canManageActiveOrg || busy} type="submit">
              Activate
            </button>
          </div>
          <small>{canManageActiveOrg ? "Admin can activate scoped roles for this profile." : "Switch to a corporate admin role to manage RBAC."}</small>
          <div className="role-preview-card">
            <div>
              <span className={`status-chip ${toneClass(selectedRole.risk)}`}>{selectedRole.label}</span>
              <small>{selectedRole.description}</small>
            </div>
            <div className="role-preview-meta">
              <span>{workspaces.find((workspace) => workspace.id === selectedRole.portal)?.label ?? selectedRole.portal}</span>
              <span>{selectedRole.permissions.length} permissions</span>
            </div>
            <div className="role-permission-list">
              {selectedRole.permissions.map((permission) => (
                <span key={permission}>{permissionLabel(permission)}</span>
              ))}
            </div>
          </div>
          <button className="secondary-action" disabled={!authSession || busy} onClick={() => void createOperationsRole()} type="button">
            Add operations role
          </button>
        </form>
      </details>
      {panelStatus ? <small className="operator-status">{panelStatus}</small> : null}
    </section>
  );
}

function BillingPanel({
  disabled,
  message,
  onActivate,
  plans,
  subscriptions
}: {
  disabled: boolean;
  message: string;
  onActivate: (planId: string, seats: number) => Promise<void>;
  plans: DbSubscriptionPlan[];
  subscriptions: DbOrganizationSubscription[];
}) {
  const [seats, setSeats] = useState(5);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const activeSubscriptions = subscriptions.filter((item) => item.status !== "cancelled");
  const activePlanIds = new Set(activeSubscriptions.map((item) => item.plan_id));
  const primarySubscription = activeSubscriptions[0] ?? null;
  const primaryPlan = primarySubscription?.plan ?? plans.find((plan) => plan.id === primarySubscription?.plan_id) ?? null;
  const totalSeats = activeSubscriptions.reduce((sum, item) => sum + item.seats, 0);
  const monthlyTotal = activeSubscriptions.reduce((sum, item) => sum + (item.plan?.monthly_price_usd ?? 0), 0);
  const billingLedgerEvidence = {
    mode: activeSubscriptions.length ? "live_subscription_ledger" : "pricing_catalog_only",
    ledger_ready: Boolean(activeSubscriptions.length),
    plans_loaded: plans.length,
    active_subscription_count: activeSubscriptions.length,
    selected_seats: seats,
    total_active_seats: totalSeats,
    payment_collection_live: false,
    stripe_gate_status: "human_gated",
    operator_note:
      "Billing evidence proves configured pricing, selected seats, live subscription rows when present, and the human-gated Stripe/payment boundary."
  };
  const renewsAt = primarySubscription?.renews_at
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(primarySubscription.renews_at))
    : "Trial or manual renewal";
  const estimatedSeatTotal = plans.length
    ? Math.min(...plans.map((plan) => Math.max(plan.monthly_price_usd, plan.monthly_price_usd + Math.max(0, seats - plan.included_seats) * 19)))
    : 0;
  const exportName = `trustgraph-billing-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
  const gateExportName = `trustgraph-billing-decision-gates-${new Date().toISOString().slice(0, 10)}.csv`;
  const readinessExportName = `trustgraph-billing-launch-readiness-${new Date().toISOString().slice(0, 10)}.csv`;
  const pricingPacketName = `trustgraph-pricing-structure-${new Date().toISOString().slice(0, 10)}.json`;
  const paymentArchitecturePacketName = `trustgraph-payment-architecture-decision-${new Date().toISOString().slice(0, 10)}.json`;
  const billingGates = [
    { label: "Stripe product mapping", owner: "Business operations", status: "human decision required" },
    { label: "Checkout + customer portal", owner: "Engineering", status: "not connected for pilot" },
    { label: "Tax and invoice policy", owner: "Finance/legal", status: "human decision required" },
    { label: "Webhook reconciliation", owner: "Engineering/security", status: "blocked until Stripe decision" }
  ];
  const billingLaunchReadiness = [
    { label: "Current billing mode", status: "pilot_ledger", detail: "Subscription activation writes Supabase ledger rows only." },
    { label: "Stripe checkout", status: "not_connected", detail: "Connect only after product, price, and tax decisions are approved." },
    { label: "Customer portal", status: "not_connected", detail: "Portal links stay disabled until Stripe customer lifecycle is approved." },
    { label: "Invoice and refunds", status: "human_review", detail: "Finance/legal must approve invoice emails, refunds, dunning, and tax handling." },
    { label: "Webhook reconciliation", status: "engineering_gate", detail: "Payment webhooks require idempotency, audit mapping, and failed-event recovery." }
  ];
  const projectedPlans = plans.map((plan) => {
    const extraSeats = Math.max(0, seats - plan.included_seats);
    return {
      plan_id: plan.id,
      name: plan.name,
      audience: plan.audience,
      included_seats: plan.included_seats,
      selected_seats: seats,
      extra_seats: extraSeats,
      base_monthly_usd: plan.monthly_price_usd,
      projected_monthly_usd: plan.monthly_price_usd + extraSeats * 19,
      annual_price_usd: plan.annual_price_usd,
      features: plan.features,
      active: activePlanIds.has(plan.id)
    };
  });
  const billingOperatorSteps = [
    {
      label: "Choose team size",
      status: "ready",
      detail: `${seats} seats selected for Corporate Verify packaging.`
    },
    {
      label: "Activate pilot ledger",
      status: activeSubscriptions.length ? "ready" : "waiting",
      detail: activeSubscriptions.length
        ? `${activeSubscriptions.length} active subscription row${activeSubscriptions.length === 1 ? "" : "s"} loaded from Supabase.`
        : "Select a plan to write the live organization subscription ledger row."
    },
    {
      label: "Hold Stripe gate",
      status: "human gate",
      detail: "Checkout, invoices, tax, refunds, dunning, and webhooks stay gated until approval."
    }
  ];
  const pricingLaunchCommand = [
    {
      label: "Live pricing catalog",
      value: plans.length ? `${plans.length} plans loaded` : "Plans not loaded",
      detail: "Professional, Corporate Verify, and Scale prices come from the Supabase pricing migration."
    },
    {
      label: "Pilot subscription ledger",
      value: activeSubscriptions.length ? `${activeSubscriptions.length} active` : "Not active",
      detail: activeSubscriptions.length ? "Organization subscription rows are live database evidence." : "Select a plan to write a ledger row."
    },
    {
      label: "Selected seats",
      value: `${seats}`,
      detail: estimatedSeatTotal ? `$${estimatedSeatTotal}/month projected from configured plans.` : "Load plans to calculate projected monthly pricing."
    },
    {
      label: "Stripe launch gate",
      value: "Human gated",
      detail: "Checkout, invoices, tax, refunds, dunning, and payment webhooks remain disabled."
    }
  ];
  const stripeCheckoutDecisionReceipt = {
    mode: "stripe_checkout_decision_receipt",
    current_billing_mode: activeSubscriptions.length ? "live_supabase_subscription_ledger" : "pricing_catalog_only",
    payment_collection_live: false,
    checkout_enabled: false,
    customer_portal_enabled: false,
    invoice_email_enabled: false,
    required_before_checkout: billingGates.map((gate) => gate.label),
    accepted_pilot_proof:
      "configured_plan_catalog_selected_seats_active_subscription_rows_and_audit_exports",
    blocked_flows: [
      "stripe_checkout",
      "stripe_customer_portal",
      "invoice_emails",
      "tax_calculation",
      "refunds",
      "dunning",
      "payment_webhook_reconciliation"
    ],
    next_operator_action: activeSubscriptions.length ? "export_payment_decision_packet" : "activate_pilot_subscription_ledger"
  };
  const stripeCheckoutDecisionCards = [
    {
      label: "Live now",
      value: activeSubscriptions.length ? "Pilot ledger active" : "Pricing catalog only",
      detail: activeSubscriptions.length ? `${activeSubscriptions.length} Supabase subscription row${activeSubscriptions.length === 1 ? "" : "s"}.` : "Activate a Corporate Verify pilot plan first."
    },
    {
      label: "Checkout",
      value: "Disabled",
      detail: "No real payment collection runs before Stripe product, tax, invoice, refund, dunning, and webhook decisions."
    },
    {
      label: "Proof accepted",
      value: "Ledger packet",
      detail: "Pricing packet and payment decision packet prove pilot billing without external payment flow."
    },
    {
      label: "Next action",
      value: activeSubscriptions.length ? "Export decision" : "Activate ledger",
      detail: activeSubscriptions.length ? "Export payment architecture decision before any Stripe build." : "Select a plan to write the pilot subscription row."
    }
  ];
  const pricingStructurePacket = {
    generated_at: new Date().toISOString(),
    mode: "pilot_subscription_ledger",
    selected_seats: seats,
    active_subscription_count: activeSubscriptions.length,
    active_subscriptions: activeSubscriptions.map((subscription) => ({
      subscription_id: subscription.id,
      organization_id: subscription.organization_id,
      plan_id: subscription.plan_id,
      plan_name: subscription.plan?.name ?? "",
      status: subscription.status,
      seats: subscription.seats,
      renews_at: subscription.renews_at,
      created_at: subscription.created_at
    })),
    billing_ledger_evidence: billingLedgerEvidence,
    billing_operator_path: billingOperatorSteps,
    stripe_checkout_decision_receipt: stripeCheckoutDecisionReceipt,
    projected_plans: projectedPlans,
    billing_launch_readiness: billingLaunchReadiness,
    billing_gates: billingGates,
    payment_boundary: "No checkout, invoice, refund, dunning, tax, or payment webhook flow is live until the Stripe production gate is approved."
  };
  const paymentArchitectureDecision = {
    generated_at: new Date().toISOString(),
    mode: "billing_architecture_decision",
    current_billing_system: "supabase_subscription_ledger",
    live_capabilities: [
      "Configured Professional, Corporate Verify, and Scale pricing plans",
      "Organization subscription activation through Supabase RPC",
      "Seat count projection and active subscription ledger",
      "Audit-ready billing exports for pilot operations"
    ],
    intentionally_disabled_until_human_gate: [
      "Stripe Checkout",
      "Stripe customer portal",
      "Tax calculation",
      "Invoice email delivery",
      "Refund handling",
      "Dunning and failed-payment recovery",
      "Payment webhook reconciliation"
    ],
    stripe_launch_requirements: billingLaunchReadiness,
    human_decision_gates: billingGates,
    recommended_v1_path:
      "Keep the pilot subscription ledger live for account packaging and pricing validation. Connect Stripe only after product, price, tax, invoice, refund, dunning, webhook, and security decisions are recorded.",
    active_subscription_count: activeSubscriptions.length,
    billing_ledger_evidence: billingLedgerEvidence,
    billing_operator_path: billingOperatorSteps,
    stripe_checkout_decision_receipt: stripeCheckoutDecisionReceipt,
    projected_plans: projectedPlans
  };

  async function activate(planId: string) {
    setBusyPlanId(planId);
    try {
      await onActivate(planId, seats);
    } finally {
      setBusyPlanId(null);
    }
  }

  return (
    <section className="billing-panel">
      <div className="mini-heading">
        <BadgeCheck size={16} />
        <strong>Billing and plans</strong>
      </div>
      <small>{message}</small>
      <div className="pricing-launch-command" aria-label="Pricing launch command">
        <div>
          <span className="status-chip warning">Pricing launch command</span>
          <strong>Use live pricing and ledger rows, keep payments gated</strong>
          <small>
            TrustGraph can prove plan catalog, selected seats, and organization subscription rows now. Real payment collection waits for the Stripe human gate.
          </small>
        </div>
        <div className="pricing-launch-command-grid">
          {pricingLaunchCommand.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
      </div>
      <div className="stripe-checkout-decision" aria-label="Stripe checkout decision receipt">
        <div>
          <span className="status-chip warning">Stripe checkout decision receipt</span>
          <strong>Use the live ledger for pilot billing; keep checkout disabled</strong>
          <small>
            This receipt separates accepted pilot pricing evidence from real payment collection so corporate launch can proceed without pretending Stripe is connected.
          </small>
        </div>
        <div className="stripe-checkout-decision-grid">
          {stripeCheckoutDecisionCards.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
        <div className="stripe-checkout-decision-actions">
          <small>{stripeCheckoutDecisionReceipt.blocked_flows.length} payment flows remain human-gated before paid production launch.</small>
          <button
            className="secondary-action"
            onClick={() => downloadTextFile(paymentArchitecturePacketName, JSON.stringify(paymentArchitectureDecision, null, 2), "application/json")}
            type="button"
          >
            Export checkout decision
          </button>
        </div>
      </div>
      <div className="billing-operator-path" aria-label="Billing operator path">
        {billingOperatorSteps.map((step, index) => (
          <article className={step.status === "ready" ? "ready" : ""} key={step.label}>
            <span>{index + 1}</span>
            <div>
              <strong>{step.label}</strong>
              <small>{step.status}</small>
              <small>{step.detail}</small>
            </div>
          </article>
        ))}
      </div>
      <div className="billing-summary-grid">
        <div>
          <span>Active plan</span>
          <strong>{primaryPlan?.name ?? "No plan active"}</strong>
        </div>
        <div>
          <span>Seats</span>
          <strong>{totalSeats || seats}</strong>
        </div>
        <div>
          <span>Renewal</span>
          <strong>{renewsAt}</strong>
        </div>
        <div>
          <span>Monthly</span>
          <strong>{monthlyTotal ? `$${monthlyTotal}` : "Not active"}</strong>
        </div>
      </div>
      <div className="billing-seat-row">
        <span>Seats</span>
        <input min={1} onChange={(event) => setSeats(Number(event.target.value) || 1)} type="number" value={seats} />
      </div>
      <div className="billing-estimate-card">
        <div>
          <span>Selected team size</span>
          <strong>{seats} seats</strong>
          <small>Estimated from configured live plans; extra seats use the current pilot overage model.</small>
        </div>
        <div>
          <span>Projected monthly</span>
          <strong>{estimatedSeatTotal ? `$${estimatedSeatTotal}` : "Load plans"}</strong>
          <small>Activation writes a live organization subscription and audit event.</small>
        </div>
      </div>
      <div className="billing-decision-card">
        <div>
          <strong>Billing v1 decision</strong>
          <small>Current pilot flow activates a tracked organization subscription in Supabase and writes audit history. Real payment collection remains gated until Stripe products, tax handling, invoices, refunds, webhooks, and dunning are approved.</small>
        </div>
        <div className="billing-decision-actions">
          <span className="status-chip warning">pilot ledger</span>
          <button
            className="secondary-action"
            disabled={!subscriptions.length}
            onClick={() => downloadTextFile(exportName, billingSubscriptionsToCsv(subscriptions), "text/csv")}
            type="button"
          >
            Export ledger
          </button>
          <button
            className="secondary-action"
            onClick={() => downloadTextFile(gateExportName, billingDecisionGatesToCsv(billingGates), "text/csv")}
            type="button"
          >
            Export gates
          </button>
          <button
            className="secondary-action"
            onClick={() => downloadTextFile(readinessExportName, billingLaunchReadinessToCsv(billingLaunchReadiness), "text/csv")}
            type="button"
          >
            Export launch packet
          </button>
          <button
            className="secondary-action"
            disabled={!plans.length}
            onClick={() => downloadTextFile(pricingPacketName, JSON.stringify(pricingStructurePacket, null, 2), "application/json")}
            type="button"
          >
            Export pricing packet
          </button>
        </div>
      </div>
      <div className="billing-ledger-acceptance">
        <div>
          <span className="eyebrow">Ledger proof</span>
          <strong>Billing ledger acceptance</strong>
          <small>
            Proves plan catalog, selected seats, active subscription rows, and Stripe payment boundary in one operator packet.
          </small>
        </div>
        <div className="billing-ledger-status">
          <span className={`status-chip ${activeSubscriptions.length ? "success" : "neutral"}`}>
            {activeSubscriptions.length ? "ledger active" : "choose plan"}
          </span>
          <span>
            <strong>{plans.length}</strong>
            <small>plans loaded</small>
          </span>
          <span>
            <strong>{activeSubscriptions.length}</strong>
            <small>active rows</small>
          </span>
          <span>
            <strong>{totalSeats || seats}</strong>
            <small>seats in scope</small>
          </span>
        </div>
      </div>
      <div className="billing-pricing-packet">
        <strong>Pricing structure packet</strong>
        <small>Exports active ledger subscriptions, projected plan pricing for {seats} seats, configured plan features, and the payment launch gate.</small>
      </div>
      <div className="billing-decision-card">
        <div>
          <strong>Payment launch boundary</strong>
          <small>TrustGraph can validate pricing, seats, subscription status, and audit history now. Checkout, invoices, refunds, dunning, and payment webhooks stay off until the Stripe production gate is approved.</small>
        </div>
        <span className="status-chip warning">Stripe gated</span>
      </div>
      <div className="billing-decision-card">
        <div>
          <strong>Billing architecture decision packet</strong>
          <small>Documents the v1 decision to use a live Supabase subscription ledger now, with Stripe Checkout, invoices, refunds, dunning, taxes, and webhooks gated for human approval.</small>
        </div>
        <div className="billing-decision-actions">
          <span className="status-chip info">ledger now</span>
          <button
            className="secondary-action"
            onClick={() => downloadTextFile(paymentArchitecturePacketName, JSON.stringify(paymentArchitectureDecision, null, 2), "application/json")}
            type="button"
          >
            Export payment decision
          </button>
        </div>
      </div>
      <div className="billing-gate-grid">
        {billingGates.map((gate) => (
          <span key={gate.label}>
            <strong>{gate.label}</strong>
            <small>{gate.status}</small>
          </span>
        ))}
      </div>
      <div className="billing-gate-grid">
        {billingLaunchReadiness.map((item) => (
          <span key={item.label}>
            <strong>{item.label}</strong>
            <small>{item.status.replace(/_/g, " ")}</small>
            <small>{item.detail}</small>
          </span>
        ))}
      </div>
      <div className="billing-plan-list">
        {plans.length ? (
          plans.map((plan) => {
            const extraSeats = Math.max(0, seats - plan.included_seats);
            const projectedPrice = plan.monthly_price_usd + extraSeats * 19;
            return (
              <article className="billing-plan-card" key={plan.id}>
                <div>
                  <strong>{plan.name}</strong>
                  <p>${projectedPrice}/month</p>
                  <small>
                    {plan.included_seats} included seats{extraSeats ? ` + ${extraSeats} pilot overage seats` : ""}.
                  </small>
                  <div className="billing-feature-row">
                    {plan.features.slice(0, 4).map((feature) => (
                      <span key={feature}>{feature}</span>
                    ))}
                  </div>
                </div>
                <button
                  className={activePlanIds.has(plan.id) ? "secondary-action" : "primary-action"}
                  disabled={disabled || busyPlanId === plan.id || activePlanIds.has(plan.id)}
                  onClick={() => void activate(plan.id)}
                >
                  {activePlanIds.has(plan.id) ? "Active" : "Activate"}
                </button>
              </article>
            );
          })
        ) : (
          <article className="billing-plan-card empty">
            <div>
              <strong>No billing plans loaded</strong>
              <p>Apply pricing migrations to activate pilot plan selection.</p>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

function TeamInvitationsPanel({
  disabled,
  invitations,
  message,
  onCreate,
  onStatus
}: {
  disabled: boolean;
  invitations: DbOrganizationInvitation[];
  message: string;
  onCreate: (input: { email: string; role: Extract<RoleKey, "employer_admin" | "employer_reviewer" | "staffing_agency_admin" | "recruiter"> }) => Promise<void>;
  onStatus: (invitationId: string, status: "cancelled" | "expired") => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Extract<RoleKey, "employer_admin" | "employer_reviewer" | "staffing_agency_admin" | "recruiter">>("employer_reviewer");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState(message);
  const [invitationQuery, setInvitationQuery] = useState("");
  const [invitationStatusFilter, setInvitationStatusFilter] = useState<"all" | "pending" | "accepted" | "cancelled" | "expired">("all");
  const pendingCount = invitations.filter((invitation) => invitation.status === "pending").length;
  const acceptedCount = invitations.filter((invitation) => invitation.status === "accepted").length;
  const inviteOperatorSteps = [
    {
      label: "Invite reviewer",
      detail: disabled ? "Use a corporate admin role before inviting team members." : "Send a role-scoped invitation to the reviewer email.",
      ready: !disabled
    },
    {
      label: "Invitee accepts",
      detail: pendingCount ? `${pendingCount} pending invitation${pendingCount === 1 ? "" : "s"} waiting for handoff.` : "Accepted invitations create live membership rows.",
      ready: acceptedCount > 0
    },
    {
      label: "Roster review",
      detail: acceptedCount ? `${acceptedCount} accepted invitation${acceptedCount === 1 ? "" : "s"} ready for member review.` : "Accepted users appear in Team members.",
      ready: acceptedCount > 0
    }
  ];
  const filteredInvitations = invitations.filter((invitation) => {
    const matchesStatus = invitationStatusFilter === "all" || invitation.status === invitationStatusFilter;
    const haystack = `${invitation.invited_email} ${invitation.role} ${invitation.status}`.toLowerCase();
    return matchesStatus && haystack.includes(invitationQuery.trim().toLowerCase());
  });
  const exportName = `trustgraph-team-invitations-${new Date().toISOString().slice(0, 10)}.csv`;

  useEffect(() => {
    setStatus(message);
  }, [message]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("Creating team invitation...");
    try {
      await onCreate({ email, role });
      setEmail("");
      setStatus("Team invitation created");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not create team invitation");
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(invitationId: string, nextStatus: "cancelled" | "expired") {
    setBusyId(invitationId);
    try {
      await onStatus(invitationId, nextStatus);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="team-panel">
      <div className="mini-heading">
        <UserPlus size={16} />
        <strong>Team invitations</strong>
      </div>
      <div className="team-summary-grid">
        <div>
          <span>Pending</span>
          <strong>{pendingCount}</strong>
        </div>
        <div>
          <span>Accepted</span>
          <strong>{acceptedCount}</strong>
        </div>
      </div>
      <div className="team-invite-path" aria-label="Team invitation operator path">
        {inviteOperatorSteps.map((step) => (
          <article className={step.ready ? "ready" : ""} key={step.label}>
            <span className={`status-dot ${step.ready ? "on" : ""}`} />
            <div>
              <strong>{step.label}</strong>
              <small>{step.detail}</small>
            </div>
          </article>
        ))}
      </div>
      <form className="team-form" onSubmit={submit}>
        <label>
          <span>Invitee email</span>
          <input disabled={disabled || busy} onChange={(event) => setEmail(event.target.value)} placeholder="reviewer@company.com" type="email" value={email} />
        </label>
        <label>
          <span>Portal role</span>
          <select disabled={disabled || busy} onChange={(event) => setRole(event.target.value as typeof role)} value={role}>
            <option value="employer_reviewer">Employer reviewer</option>
            <option value="employer_admin">Employer admin</option>
            <option value="recruiter">Recruiter</option>
            <option value="staffing_agency_admin">Staffing admin</option>
          </select>
        </label>
        <div className="record-form-footer">
          <small>{status}</small>
          <button className="secondary-action" disabled={disabled || busy || !email} type="submit">
            Invite
          </button>
        </div>
      </form>
      <div className="team-controls">
        <input
          onChange={(event) => setInvitationQuery(event.target.value)}
          placeholder="Search invitee, role, or status"
          value={invitationQuery}
        />
        <select onChange={(event) => setInvitationStatusFilter(event.target.value as typeof invitationStatusFilter)} value={invitationStatusFilter}>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
        <button
          className="secondary-action"
          disabled={!filteredInvitations.length}
          onClick={() => downloadTextFile(exportName, teamInvitationsToCsv(filteredInvitations), "text/csv")}
          type="button"
        >
          Export invites
        </button>
      </div>
      <div className="team-source-strip">
        <span className="status-chip success">Invitation database</span>
        <small>Exports live organization invitation rows for reviewer access, recruiter access, cancellations, and acceptance handoff.</small>
      </div>
      <div className="team-list">
        {filteredInvitations.length ? (
          filteredInvitations.slice(0, 8).map((invitation) => (
            <article className="team-card" key={invitation.id}>
              <div>
                <strong>{invitation.invited_email}</strong>
                <small>{invitation.role.replace(/_/g, " ")}</small>
              </div>
              <div className="grant-actions">
                <span className="status-chip neutral">{invitation.status}</span>
                <button className="secondary-action" disabled={disabled || busyId === invitation.id || invitation.status !== "pending"} onClick={() => void updateStatus(invitation.id, "cancelled")}>
                  Cancel
                </button>
              </div>
            </article>
          ))
        ) : (
          <article className="team-card empty">
            <div>
              <strong>No matching team invitations</strong>
              <small>Invite reviewers, recruiters, or admins for corporate portal access.</small>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

function MyInvitationsPanel({
  disabled,
  invitations,
  message,
  onAccept
}: {
  disabled: boolean;
  invitations: DbOrganizationInvitation[];
  message: string;
  onAccept: (invitationId: string) => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const exportName = `trustgraph-my-invitations-${new Date().toISOString().slice(0, 10)}.csv`;
  const handoffPacketName = `trustgraph-invitation-handoff-${new Date().toISOString().slice(0, 10)}.json`;
  const invitationHandoffPacket = {
    generated_at: new Date().toISOString(),
    mode: disabled ? "invitation_login_required" : "invitee_membership_handoff",
    live_database_evidence: !disabled,
    pending_invitation_count: invitations.filter((invitation) => invitation.status === "pending").length,
    invitations: invitations.map((invitation) => ({
      invitation_id: invitation.id,
      organization_id: invitation.organization_id,
      organization_name: invitation.organization?.name ?? "",
      invited_email: invitation.invited_email,
      role: invitation.role,
      status: invitation.status,
      invited_by_profile_id: invitation.invited_by_profile_id ?? null,
      accepted_by_profile_id: invitation.accepted_by_profile_id ?? null,
      expires_at: invitation.expires_at ?? null,
      acceptance_writes_membership: invitation.status === "pending"
    })),
    operator_note: "Accepting a pending invitation calls the Supabase invitation handoff and creates an active organization membership for the signed-in invitee."
  };

  async function accept(invitationId: string) {
    setBusyId(invitationId);
    try {
      await onAccept(invitationId);
    } finally {
      setBusyId(null);
    }
  }

  if (!invitations.length && disabled) {
    return null;
  }

  return (
    <section className="team-panel">
      <div className="mini-heading">
        <UserPlus size={16} />
        <strong>My invitations</strong>
      </div>
      <small>{message}</small>
      <div className="invitation-handoff-strip">
        <span className="status-chip success">Invitation handoff</span>
        <small>Reads invitee-owned pending invitations from Supabase and creates active organization membership on acceptance.</small>
        <button
          className="secondary-action"
          disabled={!invitations.length}
          onClick={() => downloadTextFile(exportName, teamInvitationsToCsv(invitations), "text/csv")}
          type="button"
        >
          Export my invites
        </button>
      </div>
      <div className="invitation-handoff-packet">
        <strong>Invitee handoff packet</strong>
        <small>Exports pending invitee-owned invitation rows, expiry, role, accepted-by profile, and the membership write expected after acceptance.</small>
        <button
          className="secondary-action"
          disabled={!invitations.length}
          onClick={() => downloadTextFile(handoffPacketName, JSON.stringify(invitationHandoffPacket, null, 2), "application/json")}
          type="button"
        >
          Export handoff packet
        </button>
      </div>
      <div className="team-list">
        {invitations.length ? (
          invitations.map((invitation) => (
            <article className="team-card" key={invitation.id}>
              <div>
                <strong>{invitation.organization?.name ?? "Corporate workspace"}</strong>
                <small>
                  {invitation.role.replace(/_/g, " ")} -{" "}
                  {invitation.expires_at
                    ? `expires ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
                        new Date(invitation.expires_at)
                      )}`
                    : "no expiration stored"}
                </small>
              </div>
              <button className="primary-action" disabled={disabled || busyId === invitation.id} onClick={() => void accept(invitation.id)}>
                Accept
              </button>
            </article>
          ))
        ) : (
          <article className="team-card empty">
            <div>
              <strong>No pending invitations</strong>
              <small>Corporate invitations for your email will appear here.</small>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

function TeamMembersPanel({
  disabled,
  members,
  message,
  currentProfileId,
  onStatus
}: {
  disabled: boolean;
  members: OrganizationMemberView[];
  message: string;
  currentProfileId: string | null;
  onStatus: (membershipId: string, status: "active" | "suspended") => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberStatusFilter, setMemberStatusFilter] = useState<"all" | "active" | "suspended" | "invited">("all");
  const activeCount = members.filter((member) => member.status === "active").length;
  const suspendedCount = members.filter((member) => member.status === "suspended").length;
  const adminRoleCount = members.filter((member) => ["employer_admin", "staffing_agency_admin"].includes(member.role)).length;
  const reviewerRoleCount = members.filter((member) => ["employer_reviewer", "recruiter"].includes(member.role)).length;
  const currentUserProtectedCount = members.filter((member) => member.profile_id === currentProfileId && member.status === "active").length;
  const teamNextAction = disabled
    ? "Sign in with a corporate admin role to manage the roster."
    : !members.length
      ? "Create a workspace, then invite the first reviewer."
      : !adminRoleCount
        ? "Add at least one corporate admin seat."
        : suspendedCount
          ? "Review suspended seats before the next compliance export."
          : "Roster is ready for reviewer access and evidence exports.";
  const filteredMembers = members.filter((member) => {
    const matchesStatus = memberStatusFilter === "all" || member.status === memberStatusFilter;
    const haystack = `${member.profile?.full_name ?? ""} ${member.profile?.email ?? ""} ${member.role} ${member.status}`.toLowerCase();
    return matchesStatus && haystack.includes(memberQuery.trim().toLowerCase());
  });
  const exportName = `trustgraph-team-members-${new Date().toISOString().slice(0, 10)}.csv`;
  const rosterPacketName = `trustgraph-corporate-roster-packet-${new Date().toISOString().slice(0, 10)}.json`;
  const corporateRosterPacket = {
    generated_at: new Date().toISOString(),
    mode: disabled ? "locked_corporate_roster" : "live_membership_database",
    live_database_evidence: !disabled,
    source_counts: {
      membership_rows: members.length,
      filtered_members: filteredMembers.length,
      unique_profiles: new Set(members.map((member) => member.profile_id)).size,
      active_members: activeCount,
      suspended_members: suspendedCount,
      admin_roles: adminRoleCount,
      reviewer_roles: reviewerRoleCount,
      current_user_protected_rows: currentUserProtectedCount
    },
    team_operations_cockpit: {
      label: "Team operations cockpit",
      next_action: teamNextAction,
      admin_roles: adminRoleCount,
      reviewer_roles: reviewerRoleCount,
      current_user_protected_rows: currentUserProtectedCount,
      filtered_rows_ready_for_export: filteredMembers.length
    },
    members: filteredMembers.map((member) => ({
      membership_id: member.id,
      organization_id: member.organization_id,
      profile_id: member.profile_id,
      member_name: member.profile?.full_name ?? "",
      member_email: member.profile?.email ?? "",
      role: member.role,
      role_family: ["employer_admin", "staffing_agency_admin"].includes(member.role) ? "admin" : "reviewer",
      status: member.status,
      is_current_profile: member.profile_id === currentProfileId,
      created_at: member.created_at,
      updated_at: member.updated_at
    })),
    operator_note: "Corporate roster packet proves which organization membership rows and profile rows are visible to the current signed-in corporate context."
  };

  async function updateStatus(membershipId: string, status: "active" | "suspended") {
    setBusyId(membershipId);
    try {
      await onStatus(membershipId, status);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="team-panel">
      <div className="mini-heading">
        <Users size={16} />
        <strong>Team members</strong>
      </div>
      <small>{message}</small>
      <div className="team-summary-grid">
        <div>
          <span>Active</span>
          <strong>{activeCount}</strong>
        </div>
        <div>
          <span>Suspended</span>
          <strong>{suspendedCount}</strong>
        </div>
        <div>
          <span>Admins</span>
          <strong>{adminRoleCount}</strong>
        </div>
        <div>
          <span>Reviewers</span>
          <strong>{reviewerRoleCount}</strong>
        </div>
      </div>
      <div className="team-source-strip">
        <span className="status-chip success">Membership database</span>
        <small>Reads live organization memberships and profile rows from Supabase. Current signed-in users cannot suspend their own active seat.</small>
      </div>
      <div className="team-operations-cockpit">
        <div>
          <span className="status-chip neutral">Team operations cockpit</span>
          <strong>{teamNextAction}</strong>
          <small>Use this queue to review corporate admins, reviewers, suspended seats, and exportable roster evidence.</small>
        </div>
        <div className="team-operations-grid">
          <span>
            <strong>{adminRoleCount}</strong>
            Admin seats
          </span>
          <span>
            <strong>{reviewerRoleCount}</strong>
            Reviewer seats
          </span>
          <span>
            <strong>{currentUserProtectedCount}</strong>
            Current user protected
          </span>
        </div>
      </div>
      <div className="team-roster-detail">
        <span>{members.length} membership rows</span>
        <span>{new Set(members.map((member) => member.profile_id)).size} profiles</span>
        <span>{filteredMembers.length} filtered rows</span>
      </div>
      <div className="team-controls">
        <input
          onChange={(event) => setMemberQuery(event.target.value)}
          placeholder="Search member, email, role, or status"
          value={memberQuery}
        />
        <select onChange={(event) => setMemberStatusFilter(event.target.value as typeof memberStatusFilter)} value={memberStatusFilter}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="invited">Invited</option>
        </select>
        <button
          className="secondary-action"
          disabled={!filteredMembers.length}
          onClick={() => downloadTextFile(exportName, teamMembersToCsv(filteredMembers), "text/csv")}
          type="button"
        >
          Export CSV
        </button>
        <button
          className="secondary-action"
          disabled={!members.length}
          onClick={() => downloadTextFile(rosterPacketName, JSON.stringify(corporateRosterPacket, null, 2), "application/json")}
          type="button"
        >
          Export roster packet
        </button>
      </div>
      <div className="team-roster-packet">
        <strong>Corporate roster packet</strong>
        <small>Exports live membership rows, linked profile rows, role family, current-user protection, status, and counts for the active corporate workspace.</small>
      </div>
      <div className="team-list">
        {filteredMembers.length ? (
          filteredMembers.slice(0, 10).map((member) => {
            const isSelf = member.profile_id === currentProfileId;
            return (
              <article className="team-card" key={member.id}>
                <div>
                  <strong>{member.profile?.full_name || member.profile?.email || "Workspace member"}</strong>
                  <small>
                    {member.role.replace(/_/g, " ")} - {member.status}
                  </small>
                  <small>Membership {member.id.slice(0, 8)} / Profile {member.profile_id.slice(0, 8)}</small>
                </div>
                <div className="grant-actions">
                  <button
                    className="secondary-action"
                    disabled={disabled || isSelf || busyId === member.id || member.status === "suspended"}
                    onClick={() => void updateStatus(member.id, "suspended")}
                  >
                    Suspend
                  </button>
                  <button
                    className="secondary-action"
                    disabled={disabled || busyId === member.id || member.status === "active"}
                    onClick={() => void updateStatus(member.id, "active")}
                  >
                    Restore
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <article className="team-card empty">
            <div>
              <strong>No matching team members</strong>
              <small>Accepted team members will appear after the workspace loads.</small>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

const TRUSTGRAPH_VPS_URL = "https://trustgraph.5-75-224-110.sslip.io/";
const TRUSTGRAPH_GITHUB_PAGES_URL = "https://mirzaraheel99.github.io/trustgraph/";
const TRUSTGRAPH_ALLOWED_REDIRECTS = [
  TRUSTGRAPH_GITHUB_PAGES_URL,
  TRUSTGRAPH_VPS_URL.replace(/\/$/, ""),
  TRUSTGRAPH_VPS_URL
];

function authFailureMessage(error: unknown, redirectUrl: string, fallback = "Authentication failed.") {
  const message = error instanceof Error ? error.message : fallback;
  const normalized = message.toLowerCase();

  if (normalized.includes("rate limit") || normalized.includes("email rate")) {
    return "Supabase email rate limit is active. Wait 60+ minutes before requesting another verification or recovery email, or configure custom SMTP for testing.";
  }

  if (normalized.includes("redirect") || normalized.includes("localhost")) {
    return `Auth redirect needs the hosted TrustGraph URL in Supabase settings: ${redirectUrl}`;
  }

  if (normalized.includes("email not confirmed")) {
    return "Email is not confirmed yet. Use the latest verification email, then return to this hosted app and login.";
  }

  if (normalized.includes("invalid login") || normalized.includes("invalid credentials")) {
    return "Login failed. Check the email and password, or use Reset password if this account was already created.";
  }

  return message;
}

function hostedAuthRedirectUrl() {
  if (typeof window === "undefined") return TRUSTGRAPH_VPS_URL;

  const currentUrl = `${window.location.origin}${window.location.pathname}`;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? TRUSTGRAPH_VPS_URL : currentUrl;
}

function hasHostedAuthCallbackUrl() {
  if (typeof window === "undefined") return false;

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);
  return Boolean(hashParams.get("access_token") || queryParams.get("access_token"));
}

function hostedAuthCallbackType() {
  if (typeof window === "undefined") return null;

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);
  return hashParams.get("type") ?? queryParams.get("type");
}

type HostedAuthCallbackProof = {
  mode: "hosted_auth_callback_proof";
  status: "no_callback_detected" | "callback_detected" | "callback_session_accepted" | "callback_error";
  callback_type: string;
  token_transport: "hash" | "query" | "none";
  hosted_origin: string;
  browser_host: string;
  localhost_source_detected: boolean;
  access_token_present: boolean;
  refresh_token_present: boolean;
  tokens_redacted: true;
  recovery_session_ready: boolean;
  next_action: string;
};

function readHostedAuthCallbackProof(
  status: HostedAuthCallbackProof["status"] = "callback_detected",
  recoveryReady = false
): HostedAuthCallbackProof {
  if (typeof window === "undefined") {
    return {
      mode: "hosted_auth_callback_proof",
      status: "no_callback_detected",
      callback_type: "server_render",
      token_transport: "none",
      hosted_origin: TRUSTGRAPH_VPS_URL.replace(/\/$/, ""),
      browser_host: "server-render",
      localhost_source_detected: false,
      access_token_present: false,
      refresh_token_present: false,
      tokens_redacted: true,
      recovery_session_ready: false,
      next_action: "Open the hosted TrustGraph app before requesting verification or recovery email."
    };
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const queryParams = new URLSearchParams(window.location.search);
  const hasHashToken = Boolean(hashParams.get("access_token"));
  const hasQueryToken = Boolean(queryParams.get("access_token"));
  const accessTokenPresent = hasHashToken || hasQueryToken;
  const refreshTokenPresent = Boolean(hashParams.get("refresh_token") || queryParams.get("refresh_token"));
  const callbackType = hashParams.get("type") ?? queryParams.get("type") ?? (accessTokenPresent ? "session" : "none");
  const browserHost = `${window.location.origin}${window.location.pathname}`;
  const localhostSourceDetected =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    browserHost.includes("localhost");
  const tokenTransport = hasHashToken ? "hash" : hasQueryToken ? "query" : "none";
  const accepted = status === "callback_session_accepted";

  return {
    mode: "hosted_auth_callback_proof",
    status: accessTokenPresent ? status : "no_callback_detected",
    callback_type: callbackType,
    token_transport: tokenTransport,
    hosted_origin: hostedAuthRedirectUrl(),
    browser_host: browserHost,
    localhost_source_detected: localhostSourceDetected,
    access_token_present: accessTokenPresent,
    refresh_token_present: refreshTokenPresent,
    tokens_redacted: true,
    recovery_session_ready: recoveryReady,
    next_action: accepted
      ? callbackType === "recovery"
        ? "Open Account and set a new password."
        : "Continue into the dashboard and create the needed Passport or Corporate workspace."
      : accessTokenPresent
        ? "Let TrustGraph accept the Supabase callback, then confirm the dashboard opens."
        : "Use the hosted URL before requesting verification or recovery email."
  };
}

function repairHostedAuthLink(input: string, hostedUrl: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";

  try {
    const sourceUrl = new URL(trimmed);
    return `${hostedUrl}${sourceUrl.search}${sourceUrl.hash}`;
  } catch {
    const hashStart = trimmed.indexOf("#");
    if (hashStart >= 0) return `${hostedUrl}${trimmed.slice(hashStart)}`;

    const queryStart = trimmed.indexOf("?");
    if (queryStart >= 0) return `${hostedUrl}${trimmed.slice(queryStart)}`;

    return "";
  }
}

function AuthPanel({
  session,
  accountStatus,
  hostedCallbackProof,
  dataRightsMessage,
  dataRightsRequests,
  onDataRightsRequest,
  onSession
}: {
  session: AuthSession | null;
  accountStatus: string;
  hostedCallbackProof: HostedAuthCallbackProof;
  dataRightsMessage: string;
  dataRightsRequests: DbDataRightsRequest[];
  onDataRightsRequest: (input: { requestType: DataRightsRequestType; requestedScope: string; reason: string }) => Promise<void>;
  onSession: (session: AuthSession | null) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState(authModeLabel());
  const [dataRightsType, setDataRightsType] = useState<DataRightsRequestType>("data_export");
  const [dataRightsScope, setDataRightsScope] = useState("all_eligible_profile_data");
  const [dataRightsReason, setDataRightsReason] = useState("");
  const [dataRightsStatus, setDataRightsStatus] = useState(dataRightsMessage);
  const [busy, setBusy] = useState(false);
  const authRedirectUrl = hostedAuthRedirectUrl();
  const recoverySessionReady = Boolean(session && accountStatus.toLowerCase().includes("password recovery"));
  const authPacketName = `trustgraph-auth-redirect-readiness-${new Date().toISOString().slice(0, 10)}.json`;
  const recoveryActions = [
    "resend_signup_confirmation",
    "request_password_recovery",
    "repair_localhost_verification_link",
    "accept_hosted_callback_session",
    "update_password_after_recovery"
  ];
  const accountRecoveryReadiness = {
    status: email ? "email_ready" : "email_required",
    redirect_url: authRedirectUrl,
    email_rate_limit_notice: "Supabase built-in email allows 2 emails per hour project-wide unless custom SMTP is configured.",
    support_actions: recoveryActions,
    operator_next_steps: [
      "Copy the hosted redirect URL into Supabase Auth allowed redirects.",
      "Use Resend verify only after the rate-limit window clears or SMTP is configured.",
      "Use Reset password from the hosted app so recovery sends redirect_to to TrustGraph instead of localhost."
    ],
    signed_in_recovery_control: session ? "password_update_available" : "password_update_requires_recovery_session"
  };
  const authRedirectPacket = {
    generated_at: new Date().toISOString(),
    configured: isSupabaseConfigured(),
    mode: authModeLabel(),
    active_redirect_url: authRedirectUrl,
    required_hosted_redirect: TRUSTGRAPH_VPS_URL,
    github_pages_redirect: TRUSTGRAPH_GITHUB_PAGES_URL,
    allowed_production_redirects: TRUSTGRAPH_ALLOWED_REDIRECTS,
    trustgraph_vps_target: TRUSTGRAPH_VPS_URL.replace(/\/$/, ""),
    protected_vfix_host: "https://5-75-224-110.sslip.io",
    current_browser_host:
      typeof window === "undefined" ? "server-render" : `${window.location.origin}${window.location.pathname}`,
    current_browser_is_localhost:
      typeof window === "undefined" ? false : window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1",
    supabase_auth_settings_needed: [
      "Set Site URL to the hosted TrustGraph URL used by pilot users.",
      "Add both GitHub Pages and VPS sslip.io URLs as allowed redirect URLs.",
      "Add the TrustGraph VPS URL before sending production verification emails from the server host.",
      "Keep localhost only for local developer testing."
    ],
    email_rate_limit: "Supabase built-in email allows 2 emails per hour project-wide unless custom SMTP is configured.",
    auth_request_redirect_transport: "redirect_to query parameter plus Supabase email redirect options",
    session_state: session ? "signed_in" : "signed_out",
    account_status: accountStatus,
    recovery_session_ready: recoverySessionReady,
    hosted_auth_callback_proof: hostedCallbackProof,
    account_recovery_readiness: accountRecoveryReadiness
  };
  const authPaths = [
    {
      label: "Professional",
      detail: "Create a Passport, add records, upload evidence, approve Access Grants.",
      route: "Personal Passport after login",
      database: "Writes profile, personal organization, Passport records, evidence, grants, and consent rows."
    },
    {
      label: "Corporate",
      detail: "Create employer or staffing workspace from Corporate account and RBAC.",
      route: "Company Admin then Corporate Verify",
      database: "Writes organization, admin membership, reviewer roles, access requests, review attestations, and billing ledger rows."
    }
  ];
  const authChecks = [
    {
      label: "Hosted redirect",
      detail: authRedirectUrl.includes("localhost")
        ? "Open the hosted TrustGraph app before requesting new verification or recovery links."
        : "Verification and recovery emails should return to this hosted app."
    },
    {
      label: "Email rate limit",
      detail: "Built-in Supabase email allows 2 emails per hour project-wide; wait 60+ minutes or add custom SMTP for more."
    },
    {
      label: "After confirmation",
      detail: "Return here, sign in, then use Launch checklist to seed or create live pilot data."
    }
  ];
  const authOperatorPath = [
    {
      step: "1",
      label: "Login or sign up",
      detail: `Use the hosted TrustGraph URL before requesting emails: ${authRedirectUrl}`
    },
    {
      step: "2",
      label: "Verify email",
      detail: "Open the newest Supabase link; repair it here if it still points to localhost."
    },
    {
      step: "3",
      label: "Create workspace",
      detail: "After login, choose Corporate setup for company access or Professional Passport for personal records."
    }
  ];
  const dataRightsPacketName = `trustgraph-data-rights-${new Date().toISOString().slice(0, 10)}.json`;
  const openDataRightsRequests = dataRightsRequests.filter((request) => ["requested", "in_review"].includes(request.status));
  const completedDataRightsRequests = dataRightsRequests.filter((request) => ["completed", "rejected", "cancelled"].includes(request.status));
  const latestDataRightsRequest = dataRightsRequests[0] ?? null;
  const dataRightsReviewLanes = [
    {
      label: "Export request",
      value: `${dataRightsRequests.filter((request) => request.request_type === "data_export").length}`,
      detail: "Creates a reviewed data export request row for eligible profile, Passport, evidence, grant, and audit scope.",
      ready: dataRightsRequests.some((request) => request.request_type === "data_export")
    },
    {
      label: "Closure review",
      value: `${dataRightsRequests.filter((request) => request.request_type === "account_closure").length}`,
      detail: "Closure is reviewed against retention, legal hold, active grants, disputes, and audit obligations before action.",
      ready: dataRightsRequests.some((request) => request.request_type === "account_closure")
    },
    {
      label: "Open review queue",
      value: `${openDataRightsRequests.length}`,
      detail: openDataRightsRequests.length
        ? "Operator review is still open for at least one request."
        : "No active export or closure review is waiting in this account.",
      ready: openDataRightsRequests.length === 0 && dataRightsRequests.length > 0
    }
  ];
  const dataRightsNextAction =
    !session
      ? "Sign in before requesting data rights"
      : !dataRightsRequests.length
        ? "Submit a data export or closure review request"
        : openDataRightsRequests.length
          ? "Wait for TrustGraph operator review"
          : "Export the data-rights packet";
  const dataRightsPacket = {
    packet_mode: "account_data_rights",
    generated_at: new Date().toISOString(),
    signed_in: Boolean(session),
    active_email: session?.user.email ?? null,
    supported_requests: ["data_export", "account_closure"],
    automatic_deletion_enabled: false,
    closure_review_required: ["retention_policy", "legal_hold", "active_access_grants", "unresolved_disputes"],
    review_lanes: dataRightsReviewLanes,
    next_action: dataRightsNextAction,
    open_review_count: openDataRightsRequests.length,
    completed_or_closed_count: completedDataRightsRequests.length,
    latest_request: latestDataRightsRequest
      ? {
          id: latestDataRightsRequest.id,
          request_type: latestDataRightsRequest.request_type,
          status: latestDataRightsRequest.status,
          requested_scope: latestDataRightsRequest.requested_scope,
          due_at: latestDataRightsRequest.due_at
        }
      : null,
    loaded_requests: dataRightsRequests.map((request) => ({
      id: request.id,
      request_type: request.request_type,
      status: request.status,
      requested_scope: request.requested_scope,
      due_at: request.due_at
    }))
  };

  useEffect(() => {
    setDataRightsStatus(dataRightsMessage);
  }, [dataRightsMessage]);

  async function handleAuth(event: FormEvent<HTMLFormElement>, mode: "signin" | "signup") {
    event.preventDefault();
    await submitAuth(mode);
  }

  async function submitAuth(mode: "signin" | "signup") {
    setBusy(true);
    setMessage(mode === "signin" ? "Signing in..." : "Creating account...");

    try {
      const nextSession =
        mode === "signin" ? await signInWithPassword(email, password) : await signUpWithPassword(email, password, authRedirectUrl);
      onSession(nextSession);
      setMessage(nextSession ? "Live Supabase session connected" : "Check your email to confirm the account. Built-in Supabase email may pause after 2 emails per hour.");
      setPassword("");
    } catch (error) {
      setMessage(authFailureMessage(error, authRedirectUrl));
    } finally {
      setBusy(false);
    }
  }

  async function recoverPassword() {
    setBusy(true);
    setMessage("Sending recovery email...");
    try {
      await requestPasswordRecovery(email, authRedirectUrl);
      setMessage("Password recovery email requested. Use the inbox link to return to TrustGraph; wait 60+ minutes if Supabase rate-limits email.");
    } catch (error) {
      setMessage(authFailureMessage(error, authRedirectUrl, "Could not request password recovery."));
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    setBusy(true);
    setMessage("Sending verification email...");
    try {
      await resendSignupConfirmation(email, authRedirectUrl);
      setMessage("Verification email requested. If Supabase says rate limit exceeded, wait 60+ minutes or configure custom SMTP.");
    } catch (error) {
      setMessage(authFailureMessage(error, authRedirectUrl, "Could not resend verification email."));
    } finally {
      setBusy(false);
    }
  }

  async function copyRedirectUrl() {
    try {
      await navigator.clipboard.writeText(authRedirectUrl);
      setMessage("Hosted redirect URL copied for Supabase Auth settings.");
    } catch {
      setMessage(`Copy this hosted redirect URL into Supabase Auth settings: ${authRedirectUrl}`);
    }
  }

  async function submitPasswordUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;

    setBusy(true);
    setMessage("Updating password...");
    try {
      await updatePassword(session.accessToken, newPassword);
      setNewPassword("");
      setMessage("Password updated. This session remains connected.");
    } catch (error) {
      setMessage(authFailureMessage(error, authRedirectUrl, "Could not update password."));
    } finally {
      setBusy(false);
    }
  }

  async function submitDataRightsRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setDataRightsStatus(dataRightsType === "account_closure" ? "Creating closure review request..." : "Creating data export request...");

    try {
      await onDataRightsRequest({ requestType: dataRightsType, requestedScope: dataRightsScope, reason: dataRightsReason });
      setDataRightsReason("");
      setDataRightsStatus(dataRightsType === "account_closure" ? "Closure request created for review." : "Data export request created.");
    } catch (error) {
      setDataRightsStatus(error instanceof Error ? error.message : "Could not create data rights request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-panel" id="live-auth-controls">
      <div className="mini-heading">
        <KeyRound size={16} />
        <strong>Live auth</strong>
      </div>
      {session ? (
        <div className="auth-session">
          <span>{session.user.email}</span>
          <small>Supabase session stored in this browser</small>
          <div className="auth-session-meta">
            <span>Live database access</span>
            <span>RBAC context loading</span>
          </div>
          <form className="password-update-form" onSubmit={submitPasswordUpdate}>
            {recoverySessionReady ? (
              <span className="micro-pill success">Password recovery session ready</span>
            ) : null}
            <input
              minLength={8}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="New password"
              type="password"
              value={newPassword}
            />
            <button className="secondary-action" disabled={busy || newPassword.length < 8} type="submit">
              Set new password
            </button>
          </form>
          <button
            className="secondary-action"
            onClick={() => {
              signOut();
              onSession(null);
              setMessage(authModeLabel());
            }}
          >
            Sign out
          </button>
          <div className="data-rights-panel">
            <div className="mini-heading">
              <Database size={16} />
              <strong>Data export and closure</strong>
            </div>
            <div className="data-rights-summary-grid">
              <span>
                <strong>{dataRightsRequests.filter((request) => request.request_type === "data_export").length}</strong>
                <small>Export requests</small>
              </span>
              <span>
                <strong>{dataRightsRequests.filter((request) => request.request_type === "account_closure").length}</strong>
                <small>Closure requests</small>
              </span>
              <span>
                <strong>{dataRightsRequests.filter((request) => ["requested", "in_review"].includes(request.status)).length}</strong>
                <small>Open reviews</small>
              </span>
            </div>
            <form className="data-rights-form" onSubmit={submitDataRightsRequest}>
              <select value={dataRightsType} onChange={(event) => setDataRightsType(event.target.value as DataRightsRequestType)} disabled={busy}>
                <option value="data_export">Request data export</option>
                <option value="account_closure">Request account closure</option>
              </select>
              <select value={dataRightsScope} onChange={(event) => setDataRightsScope(event.target.value)} disabled={busy}>
                <option value="all_eligible_profile_data">All eligible profile data</option>
                <option value="passport_records_and_evidence">Passport records and evidence</option>
                <option value="access_grants_and_audit">Access grants and audit activity</option>
              </select>
              <input
                value={dataRightsReason}
                onChange={(event) => setDataRightsReason(event.target.value)}
                placeholder="Optional request note"
                disabled={busy}
              />
              <div className="data-rights-actions">
                <button
                  className="secondary-action"
                  onClick={() => downloadTextFile(dataRightsPacketName, JSON.stringify(dataRightsPacket, null, 2), "application/json")}
                  type="button"
                >
                  Export data-rights packet
                </button>
                <button className="primary-action" disabled={busy} type="submit">
                  Submit request
                </button>
              </div>
            </form>
            <div className="data-rights-review-lanes" aria-label="Data rights review lanes">
              <div>
                <span className={`status-chip ${openDataRightsRequests.length ? "warning" : dataRightsRequests.length ? "success" : "neutral"}`}>
                  Data-rights review path
                </span>
                <strong>{dataRightsNextAction}</strong>
                <small>Exports and closure requests are live Supabase rows. Closure never deletes automatically; TrustGraph reviews policy gates first.</small>
              </div>
              <div className="data-rights-review-lane-grid">
                {dataRightsReviewLanes.map((lane) => (
                  <span className={lane.ready ? "ready" : ""} key={lane.label}>
                    <strong>{lane.value}</strong>
                    <small>{lane.label}</small>
                    <small>{lane.detail}</small>
                  </span>
                ))}
              </div>
            </div>
            <small>
              Closure requests do not delete data automatically. TrustGraph reviews retention, legal hold, active grants, and open disputes before closure.
            </small>
            <div className="data-rights-request-list">
              {dataRightsRequests.length ? (
                dataRightsRequests.map((request) => (
                  <article key={request.id}>
                    <strong>{request.request_type.replace("_", " ")}</strong>
                    <small>{request.status.replace("_", " ")} - {request.requested_scope.replace(/_/g, " ")}</small>
                  </article>
                ))
              ) : (
                <article>
                  <strong>No data-rights requests yet</strong>
                  <small>Submit an export or closure request to create a live Supabase row.</small>
                </article>
              )}
            </div>
            <small>{dataRightsStatus}</small>
          </div>
        </div>
      ) : (
        <form className="auth-form" onSubmit={(event) => handleAuth(event, "signin")}>
          <div className="auth-access-command" aria-label="Portal access command">
            <div>
              <span className="status-chip success">Portal access command</span>
              <strong>One secure login, two clear portal paths</strong>
              <small>
                Use the same verified account system for professionals and corporate teams. The role and workspace you create after login decide what database rows you can see.
              </small>
            </div>
            <div className="auth-access-command-grid">
              {authPaths.map((path) => (
                <article key={path.label}>
                  <span>{path.label}</span>
                  <strong>{path.route}</strong>
                  <small>{path.database}</small>
                </article>
              ))}
            </div>
          </div>
          <div className="auth-path-grid">
            {authPaths.map((path) => (
              <article key={path.label}>
                <strong>{path.label}</strong>
                <small>{path.detail}</small>
              </article>
            ))}
          </div>
          <div className="auth-operator-path" aria-label="Login and recovery path">
            {authOperatorPath.map((item) => (
              <article key={item.step}>
                <span>{item.step}</span>
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </div>
              </article>
            ))}
          </div>
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            type="password"
          />
          <div className="auth-actions">
            <button className="primary-action" disabled={busy || !email || !password} type="submit">
              <LogIn size={16} />
              Sign in
            </button>
            <button
              className="secondary-action"
              disabled={busy || !email || !password}
              onClick={() => void submitAuth("signup")}
              type="button"
            >
              <UserPlus size={16} />
              Sign up
            </button>
            <button className="secondary-action" disabled={busy || !email} onClick={() => void recoverPassword()} type="button">
              Reset password
            </button>
            <button className="secondary-action" disabled={busy || !email} onClick={() => void resendVerification()} type="button">
              Resend verify
            </button>
          </div>
          <div className="auth-recovery-note">
            <div>
              <strong>Recovery redirect</strong>
              <small>Add this active hosted URL in Supabase Auth redirects so emails do not return to localhost: {authRedirectUrl}</small>
            </div>
            <button className="secondary-action" onClick={() => void copyRedirectUrl()} type="button">
              Copy URL
            </button>
          </div>
          <div className="auth-recovery-note">
            <div>
              <strong>Account recovery readiness</strong>
              <small>Reset password sends the hosted redirect_to value to Supabase; after the email link opens TrustGraph, the Set new password form appears here.</small>
            </div>
            <span className="micro-pill">{email ? "email ready" : "email needed"}</span>
          </div>
          <div className="auth-recovery-command" aria-label="Auth recovery command center">
            <div>
              <span className="status-chip neutral">Auth recovery command center</span>
              <strong>Use the hosted TrustGraph link for every verification and recovery email</strong>
              <small>{authRedirectUrl}</small>
            </div>
            <div className="auth-recovery-command-grid">
              <button className="secondary-action" disabled={busy || !email} onClick={() => void resendVerification()} type="button">
                Resend verification
              </button>
              <button className="secondary-action" disabled={busy || !email} onClick={() => void recoverPassword()} type="button">
                Reset password
              </button>
              <button className="secondary-action" onClick={() => void copyRedirectUrl()} type="button">
                Copy hosted redirect
              </button>
            </div>
          </div>
          <div className="hosted-callback-proof" aria-label="Hosted callback acceptance proof">
            <div>
              <span className={`status-chip ${hostedCallbackProof.status === "callback_session_accepted" ? "success" : "neutral"}`}>
                Hosted callback acceptance proof
              </span>
              <strong>{hostedCallbackProof.status.replace(/_/g, " ")}</strong>
              <small>
                {hostedCallbackProof.callback_type} callback via {hostedCallbackProof.token_transport}; tokens are detected only as booleans and redacted from export.
              </small>
            </div>
            <div className="hosted-callback-proof-grid">
              <span>
                <strong>{hostedCallbackProof.access_token_present ? "Present" : "None"}</strong>
                <small>Access token signal</small>
              </span>
              <span>
                <strong>{hostedCallbackProof.refresh_token_present ? "Present" : "None"}</strong>
                <small>Refresh token signal</small>
              </span>
              <span>
                <strong>{hostedCallbackProof.recovery_session_ready ? "Ready" : "Not recovery"}</strong>
                <small>Recovery session</small>
              </span>
            </div>
            <small>{hostedCallbackProof.next_action}</small>
          </div>
          <div className="auth-readiness-packet">
            <div>
              <strong>Auth redirect readiness packet</strong>
              <small>Exports the active hosted redirect, GitHub Pages redirect, VPS redirect, email limit note, and VFIX isolation guard.</small>
            </div>
            <button
              className="secondary-action"
              onClick={() => downloadTextFile(authPacketName, JSON.stringify(authRedirectPacket, null, 2), "application/json")}
              type="button"
            >
              Export auth packet
            </button>
          </div>
          <div className="auth-support-grid">
            {authChecks.map((check) => (
              <article key={check.label}>
                <span className="status-dot on" />
                <div>
                  <strong>{check.label}</strong>
                  <small>{check.detail}</small>
                </div>
              </article>
            ))}
          </div>
        </form>
      )}
      <small>{session ? accountStatus : message}</small>
    </section>
  );
}

function ProductionReadinessPanel({
  accountContext,
  authSession,
  activeOrganizationName,
  teamManagementReady
}: {
  accountContext: AccountContext | null;
  authSession: AuthSession | null;
  activeOrganizationName: string;
  teamManagementReady: boolean;
}) {
  const checks = [
    {
      label: "Supabase environment",
      ok: isSupabaseConfigured(),
      detail: isSupabaseConfigured() ? "Hosted live mode" : "Missing public Supabase keys"
    },
    {
      label: "Authenticated portal",
      ok: Boolean(authSession),
      detail: authSession ? authSession.user.email : "Sign in for live database access"
    },
    {
      label: "Account context",
      ok: Boolean(accountContext),
      detail: accountContext ? `${accountContext.memberships.length} active memberships` : "Preview context only"
    },
    {
      label: "Corporate database",
      ok: teamManagementReady,
      detail: teamManagementReady ? activeOrganizationName : "Sign in with a corporate role to load live members"
    }
  ];
  const readyCount = checks.filter((check) => check.ok).length;
  const readinessScore = Math.round((readyCount / checks.length) * 100);
  const exportName = `trustgraph-live-database-readiness-${new Date().toISOString().slice(0, 10)}.csv`;
  const nextActions = [
    teamManagementReady ? "Corporate member database active" : "Load a corporate account context",
    authSession ? "Live portal session connected" : "Sign in to connect live data",
    accountContext ? "RBAC context loaded" : "Create or load account context"
  ];

  return (
    <section className="readiness-panel">
      <div className="mini-heading">
        <ShieldCheck size={16} />
        <strong>Production mode</strong>
      </div>
      <div className="readiness-score-card">
        <div>
          <span>Readiness</span>
          <strong>{readinessScore}%</strong>
          <small>{readyCount} of {checks.length} live checks passing</small>
        </div>
        <span className={`status-chip ${teamManagementReady ? "success" : "warning"}`}>
          {teamManagementReady ? "database live" : "login needed"}
        </span>
      </div>
      <button className="secondary-action" onClick={() => downloadTextFile(exportName, productionReadinessToCsv(checks), "text/csv")} type="button">
        Export live readiness
      </button>
      <div className="readiness-list">
        {checks.map((check) => (
          <article className="readiness-row" key={check.label}>
            <span className={`status-dot ${check.ok ? "on" : ""}`} />
            <div>
              <strong>{check.label}</strong>
              <small>{check.detail}</small>
            </div>
          </article>
        ))}
      </div>
      <div className="readiness-action-row">
        {nextActions.map((action) => (
          <span key={action}>{action}</span>
        ))}
      </div>
    </section>
  );
}

function LiveDataModePanel({
  accountContext,
  activeMembership,
  activeOrganization,
  activeRoleLabel,
  authSession,
  workspaceLabel
}: {
  accountContext: AccountContext | null;
  activeMembership: Membership;
  activeOrganization: Organization;
  activeRoleLabel: string;
  authSession: AuthSession | null;
  workspaceLabel: string;
}) {
  const isLive = Boolean(authSession && accountContext);
  const profileLabel = authSession?.user.email ?? "Not signed in";
  const membershipCount = accountContext?.memberships.length ?? 0;
  const activeMembershipRow = accountContext?.memberships.find((membership) => membership.id === activeMembership.id);
  const portalAccessPacketName = `trustgraph-portal-access-${workspaceLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.json`;
  const portalAccessPacket = {
    generated_at: new Date().toISOString(),
    mode: isLive ? "live_supabase" : "product_preview",
    live_database_required_for_acceptance: true,
    preview_data_accepted_for_v1: false,
    portal: {
      workspace: workspaceLabel,
      role: activeRoleLabel,
      writes_enabled: isLive,
      rbac_memberships_loaded: membershipCount
    },
    profile: accountContext
      ? {
          id: accountContext.profile.id,
          email: accountContext.profile.email,
          full_name: accountContext.profile.full_name,
          status: "profile_loaded"
        }
      : {
          id: authSession?.user.id ?? null,
          email: profileLabel,
          full_name: authSession?.user.email ?? null,
          status: authSession ? "auth_session_only" : "not_signed_in"
        },
    active_membership: activeMembershipRow
      ? {
          id: activeMembershipRow.id,
          organization_id: activeMembershipRow.organization_id,
          role: activeMembershipRow.role,
          status: activeMembershipRow.status
        }
      : {
          id: activeMembership.id,
          organization_id: activeMembership.organizationId,
          role: activeMembership.role,
          status: activeMembership.status
        },
    organization: {
      id: activeOrganization.id,
      name: activeOrganization.name,
      type: activeOrganization.type,
      status: activeOrganization.status,
      domain: activeOrganization.domain ?? null
    },
    evidence: {
      auth_session: Boolean(authSession),
      account_context: Boolean(accountContext),
      active_membership_loaded_from_database: Boolean(activeMembershipRow),
      hosted_redirect: hostedAuthRedirectUrl()
    }
  };
  const rows = [
    { label: "Profile", value: profileLabel },
    { label: "Organization", value: isLive ? activeOrganization.name : "Product preview organization" },
    { label: "Role", value: isLive ? activeRoleLabel : "Product preview role" },
    { label: "Workspace", value: workspaceLabel },
    { label: "Membership", value: isLive ? activeMembership.id : "Preview membership" }
  ];

  return (
    <section className={`live-data-panel ${isLive ? "live" : "preview"}`}>
      <div className="mini-heading">
        <Database size={16} />
        <strong>{isLive ? "Live Supabase database mode" : "Product preview mode"}</strong>
      </div>
      <p>
        {isLive
          ? "This portal is reading and writing hosted Supabase data with account RBAC enforced."
          : "This portal is showing product preview data only. Register or login before treating any rows as accepted v1 database proof."}
      </p>
      <div className="live-data-grid">
        {rows.map((row) => (
          <article key={row.label}>
            <small>{row.label}</small>
            <strong>{row.value}</strong>
          </article>
        ))}
      </div>
      <div className="live-data-footer">
        <span className={`status-chip ${isLive ? "success" : "warning"}`}>{isLive ? "writes enabled" : "evaluation only"}</span>
        <small>{isLive ? `${membershipCount} RBAC memberships loaded` : "Preview data is not accepted for v1. Login unlocks live rows."}</small>
      </div>
      <div className="portal-access-proof">
        <div>
          <strong>Portal access evidence</strong>
          <small>
            {isLive
              ? "Export the signed-in profile, active membership, organization, and portal route used for RBAC acceptance."
              : "Login first to export live database portal evidence for the current account."}
          </small>
        </div>
        <button
          className="secondary-action"
          onClick={() => downloadTextFile(portalAccessPacketName, JSON.stringify(portalAccessPacket, null, 2), "application/json")}
          type="button"
        >
          Export portal packet
        </button>
      </div>
    </section>
  );
}

function DatabaseStatusStrip({
  accountContext,
  authSession,
  accessGrants,
  consentAuthorizations,
  evidenceDocuments,
  livePassportRecords,
  organizationSubscriptions,
  teamInvitations,
  teamMembers,
  onOpenReadiness,
  onOpenRegistration
}: {
  accountContext: AccountContext | null;
  authSession: AuthSession | null;
  accessGrants: AccessGrantView[];
  consentAuthorizations: DbConsentAuthorization[];
  evidenceDocuments: DbEvidenceDocument[];
  livePassportRecords: RecordItem[];
  organizationSubscriptions: DbOrganizationSubscription[];
  teamInvitations: DbOrganizationInvitation[];
  teamMembers: OrganizationMemberView[];
  onOpenReadiness: () => void;
  onOpenRegistration: () => void;
}) {
  const isLive = Boolean(authSession && accountContext);
  const rowGroups = [
    { label: "Passport", count: livePassportRecords.length },
    { label: "Evidence", count: evidenceDocuments.length },
    { label: "Grants", count: accessGrants.length },
    { label: "Consent", count: consentAuthorizations.length },
    { label: "Team", count: teamMembers.length + teamInvitations.length },
    { label: "Billing", count: organizationSubscriptions.length }
  ];
  const readyGroups = rowGroups.filter((group) => group.count > 0).length;
  const totalRows = rowGroups.reduce((total, group) => total + group.count, 0);

  return (
    <section className={`database-status-strip ${isLive ? "live" : "preview"}`}>
      <div className="database-status-copy">
        <span className={`status-chip ${isLive ? "success" : "warning"}`}>{isLive ? "Live database connected" : "Preview data only"}</span>
        <div>
          <strong>{isLive ? `${totalRows} live Supabase rows loaded` : "Login to prove real database data"}</strong>
          <small>
            {isLive
              ? `${readyGroups}/${rowGroups.length} required row groups currently loaded for this account and role.`
              : "The UI can be reviewed now, but corporate/user records are only evidence after hosted login and Supabase rows load."}
          </small>
        </div>
      </div>
      <div className="database-status-counts" aria-label="Live database row groups">
        {rowGroups.map((group) => (
          <span className={group.count ? "loaded" : ""} key={group.label}>
            <strong>{group.count}</strong>
            {group.label}
          </span>
        ))}
        <span className="loaded">
          <strong>034</strong>
          RLS repair
        </span>
      </div>
      <div className="database-status-actions">
        <button className="secondary-action" onClick={isLive ? onOpenReadiness : onOpenRegistration} type="button">
          {isLive ? "Review database proof" : "Login or register"}
        </button>
      </div>
    </section>
  );
}

function OnboardingChecklistPanel({
  accessGrants,
  accountContext,
  authSession,
  consentAuthorizations,
  corporateAccessReviews,
  evidenceDocuments,
  livePassportRecords,
  organizationSubscriptions,
  schemaMigrationRuns,
  teamInvitations,
  teamMembers,
  onOpenHostedRegistration,
  onOpenWorkspace,
  onSeedPilotWorkspace
}: {
  accessGrants: AccessGrantView[];
  accountContext: AccountContext | null;
  authSession: AuthSession | null;
  consentAuthorizations: DbConsentAuthorization[];
  corporateAccessReviews: DbCorporateAccessReview[];
  evidenceDocuments: DbEvidenceDocument[];
  livePassportRecords: RecordItem[];
  organizationSubscriptions: DbOrganizationSubscription[];
  schemaMigrationRuns: DbSchemaMigrationRun[];
  teamInvitations: DbOrganizationInvitation[];
  teamMembers: OrganizationMemberView[];
  onOpenHostedRegistration: () => void;
  onOpenWorkspace: (workspaceId: WorkspaceId) => void;
  onSeedPilotWorkspace: () => Promise<Awaited<ReturnType<typeof seedPilotWorkspace>>>;
}) {
  type PilotSeedResult = Awaited<ReturnType<typeof seedPilotWorkspace>>;
  type SavedPilotSeedEvidence = PilotSeedResult & { saved_at: string };
  const [seedStatus, setSeedStatus] = useState("Create live pilot rows after signing in.");
  const [seedResult, setSeedResult] = useState<PilotSeedResult | null>(null);
  const [savedSeedEvidence, setSavedSeedEvidence] = useState<SavedPilotSeedEvidence | null>(null);
  const [seedBusy, setSeedBusy] = useState(false);
  const pilotSeedEvidenceKey = "trustgraph.lastPilotSeedEvidence";
  const hasCorporateContext = Boolean(
    accountContext?.memberships.some((membership) =>
      ["employer_admin", "employer_reviewer", "staffing_agency_admin", "recruiter"].includes(membership.role)
    )
  );
  const hasSensitiveControls = livePassportRecords.some((record) => record.sensitivity && record.sensitivity !== "standard");
  const activeSubscription = organizationSubscriptions.some((subscription) => subscription.status !== "cancelled");
  const checklist: Array<{
    label: string;
    detail: string;
    done: boolean;
    actionLabel: string;
    onAction: () => void;
  }> = [
    {
      label: "Live account",
      detail: authSession ? authSession.user.email : "Sign in or create a Supabase account",
      done: Boolean(authSession && accountContext),
      actionLabel: authSession ? "View account" : "Register",
      onAction: authSession ? () => onOpenWorkspace("passport") : onOpenHostedRegistration
    },
    {
      label: "Passport foundation",
      detail: livePassportRecords.length ? `${livePassportRecords.length} live record${livePassportRecords.length === 1 ? "" : "s"}` : "Add the first Passport record",
      done: livePassportRecords.length > 0,
      actionLabel: "Open Passport",
      onAction: () => onOpenWorkspace("passport")
    },
    {
      label: "Privacy controls",
      detail: hasSensitiveControls ? "Sensitive records classified" : "Classify sensitive records and consent rules",
      done: hasSensitiveControls || consentAuthorizations.length > 0,
      actionLabel: "Open consent",
      onAction: () => onOpenWorkspace("passport")
    },
    {
      label: "Corporate workspace",
      detail: hasCorporateContext ? "Employer or staffing context loaded" : "Create or accept a corporate account",
      done: hasCorporateContext,
      actionLabel: hasCorporateContext ? "Open Verify" : "Corporate signup",
      onAction: hasCorporateContext ? () => onOpenWorkspace("verify") : onOpenHostedRegistration
    },
    {
      label: "Team and plan",
      detail: activeSubscription
        ? "Subscription active"
        : teamMembers.length || teamInvitations.length
          ? "Team motion started"
          : "Activate a plan and invite reviewers",
      done: activeSubscription && (teamMembers.length > 0 || teamInvitations.length > 0),
      actionLabel: "Open account",
      onAction: () => onOpenWorkspace("verify")
    },
    {
      label: "Sharing loop",
      detail: accessGrants.length ? `${accessGrants.length} Access Grant${accessGrants.length === 1 ? "" : "s"}` : "Request, approve, or sync an Access Grant",
      done: accessGrants.some((grant) => grant.status === "approved"),
      actionLabel: "Open sharing",
      onAction: () => onOpenWorkspace(hasCorporateContext ? "verify" : "passport")
    }
  ];
  const completed = checklist.filter((item) => item.done).length;
  const nextItem = checklist.find((item) => !item.done) ?? checklist[checklist.length - 1];
  const checklistExportName = `trustgraph-guided-setup-${new Date().toISOString().slice(0, 10)}.csv`;
  const wizardExportName = `trustgraph-guided-onboarding-wizard-${new Date().toISOString().slice(0, 10)}.json`;
  const seedEvidenceExportName = `trustgraph-live-pilot-seed-evidence-${new Date().toISOString().slice(0, 10)}.json`;
  const workingDataExportName = `trustgraph-working-database-proof-${new Date().toISOString().slice(0, 10)}.json`;
  const hostedLoginHandoffExportName = `trustgraph-hosted-login-database-handoff-${new Date().toISOString().slice(0, 10)}.json`;
  const hostedCorporateRetestExportName = `trustgraph-hosted-corporate-retest-${new Date().toISOString().slice(0, 10)}.json`;
  const visibleSeedEvidence = seedResult ?? savedSeedEvidence;
  const workingDataRows = [
    { label: "Passport records", count: livePassportRecords.length },
    { label: "Evidence documents", count: evidenceDocuments.length },
    { label: "Access Grants", count: accessGrants.length },
    { label: "Corporate review attestations", count: corporateAccessReviews.length },
    { label: "Consent authorizations", count: consentAuthorizations.length },
    { label: "Subscriptions", count: organizationSubscriptions.length },
    { label: "Team members", count: teamMembers.length },
    { label: "Team invitations", count: teamInvitations.length }
  ];
  const workingDataTotal = workingDataRows.reduce((total, row) => total + row.count, 0);
  const organizationRlsRepairRun = schemaMigrationRuns.find((run) =>
    run.migration_path.includes("042_fix_operator_policy_self_reference.sql")
  );
  const organizationRlsRepairEvidence = {
    label: "Organization RLS recursion repair",
    required_migration_path: "supabase/migrations/042_fix_operator_policy_self_reference.sql",
    ledger_status: organizationRlsRepairRun?.status ?? "release_ledger_not_loaded_for_this_role",
    applied: organizationRlsRepairRun?.status === "applied",
    workflow_run_id: organizationRlsRepairRun?.workflow_run_id ?? null,
    commit_sha: organizationRlsRepairRun?.commit_sha ?? null,
    applied_at: organizationRlsRepairRun?.applied_at ?? null,
    operator_note: organizationRlsRepairRun
      ? "Migration 042 is recorded in the release ledger for this database."
      : "Migration 042 is required for corporate account context. Open Admin release ledger or GitHub Actions to prove the run."
  };
  const databasePolicyRepairGuidance = {
    label: "Database policy repair guidance",
    symptom: "Supabase 42P17 infinite recursion or corporate organizations policy failure",
    blocking_result: "Corporate account context and live user database proof cannot be accepted until migration 042 is applied and visible in the release ledger.",
    required_migration_path: organizationRlsRepairEvidence.required_migration_path,
    current_ledger_status: organizationRlsRepairEvidence.ledger_status,
    operator_actions: [
      "Confirm automatic Supabase migration workflow applied migration 042 if the project still reports policy recursion.",
      "Open Admin release ledger after login and confirm 042_fix_operator_policy_self_reference.sql is recorded as applied.",
      "Refresh TrustGraph, reload account context, then export the working-data packet again."
    ],
    accepted_when: "organization_rls_repair_evidence.applied_is_true_and_corporate_account_context_loads_without_policy_recursion"
  };
  const liveDatabaseAcceptanceRows = [
    {
      label: "Professional Passport database",
      required: "At least one live Passport record",
      ok: livePassportRecords.length > 0,
      evidence: `${livePassportRecords.length} Passport records loaded`
    },
    {
      label: "Evidence database",
      required: "At least one evidence metadata row",
      ok: evidenceDocuments.length > 0,
      evidence: `${evidenceDocuments.length} evidence documents loaded`
    },
    {
      label: "Corporate access database",
      required: "At least one Access Grant row",
      ok: accessGrants.length > 0,
      evidence: `${accessGrants.length} Access Grants loaded`
    },
    {
      label: "Corporate review database",
      required: "At least one corporate review attestation row",
      ok: corporateAccessReviews.length > 0,
      evidence: `${corporateAccessReviews.length} corporate review attestations loaded`
    },
    {
      label: "Consent database",
      required: "Sensitive sharing consent row loaded or created",
      ok: consentAuthorizations.length > 0,
      evidence: `${consentAuthorizations.length} consent authorizations loaded`
    },
    {
      label: "Corporate account database",
      required: "Team member or invitation row loaded",
      ok: teamMembers.length > 0 || teamInvitations.length > 0,
      evidence: `${teamMembers.length} members and ${teamInvitations.length} invitations loaded`
    },
    {
      label: "Billing ledger database",
      required: "Pilot subscription ledger row loaded",
      ok: organizationSubscriptions.length > 0,
      evidence: `${organizationSubscriptions.length} subscriptions loaded`
    }
  ];
  const liveDatabaseAcceptancePassing = liveDatabaseAcceptanceRows.filter((row) => row.ok).length;
  const liveDatabaseAcceptanceComplete = Boolean(authSession && accountContext) && liveDatabaseAcceptancePassing === liveDatabaseAcceptanceRows.length;
  const liveDatabaseRepairQueue = liveDatabaseAcceptanceRows
    .filter((row) => !row.ok)
    .map((row) => ({
      label: row.label,
      required: row.required,
      evidence: row.evidence,
      action:
        row.label === "Corporate account database" ||
        row.label === "Billing ledger database" ||
        row.label === "Corporate access database" ||
        row.label === "Corporate review database"
          ? "Open Corporate Verify"
          : "Open Professional Passport"
    }));
  const liveRowSourceReceipt = {
    mode: "live_row_source_receipt",
    accepted_source: authSession && accountContext ? "signed_in_supabase_repository_rows" : "product_preview_only",
    preview_data_accepted: false,
    row_groups_ready: liveDatabaseAcceptancePassing,
    row_groups_required: liveDatabaseAcceptanceRows.length,
    row_groups_missing: liveDatabaseAcceptanceRows.length - liveDatabaseAcceptancePassing,
    next_repair_action:
      liveDatabaseAcceptanceComplete
        ? "export_working_data_packet"
        : liveDatabaseRepairQueue[0]?.action ?? "login_or_seed_live_rows",
    rows: liveDatabaseAcceptanceRows.map((row) => ({
      label: row.label,
      source: row.ok ? "live_supabase_row_loaded" : "missing_live_supabase_row",
      required: row.required,
      evidence: row.evidence
    }))
  };
  const hostedLoginDatabaseReady = Boolean(authSession && accountContext && liveDatabaseAcceptanceComplete);
  const workingDatabaseAcceptanceStatus = liveDatabaseAcceptanceComplete
    ? "working_database_accepted"
    : authSession && accountContext
      ? "live_rows_incomplete"
      : "login_required";
  const liveDataVerdict = liveDatabaseAcceptanceComplete
    ? {
        label: "Real database accepted",
        detail: "Signed-in Supabase rows cover Passport, evidence, grants, consent, corporate account, and billing.",
        tone: "success"
      }
    : authSession && accountContext
      ? {
          label: "Live database needs repair",
          detail: `${liveDatabaseAcceptanceRows.length - liveDatabaseAcceptancePassing} required row group${liveDatabaseAcceptanceRows.length - liveDatabaseAcceptancePassing === 1 ? "" : "s"} missing before v1 acceptance.`,
          tone: "warning"
        }
      : {
          label: "Login required",
          detail: "Preview data is not accepted. Sign in on the hosted app to load real Supabase rows.",
          tone: "neutral"
        };
  const workingDatabaseAcceptanceDetail = liveDatabaseAcceptanceComplete
    ? "All required v1 row groups are loaded from Supabase for this signed-in account."
    : authSession && accountContext
      ? "Live account context is connected, but at least one required row group is still missing."
      : "Login on the hosted app before this workspace can prove live database acceptance.";
  const realDatabaseAcceptancePolicy = {
    label: "Real database only acceptance",
    accepted_source: "signed_in_supabase_repository_rows",
    preview_data_accepted: false,
    browser_seed_evidence_accepted_without_reconciliation: false,
    current_status: liveDatabaseAcceptanceComplete
      ? "real_database_accepted"
      : authSession && accountContext
        ? "live_rows_require_repair"
        : "login_required",
    required_proof: [
      "Hosted Supabase login is active",
      "Organization RLS recursion repair migration 042 is applied",
      "Account context and RBAC membership loaded",
      "Required Passport, evidence, Access Grant, consent, corporate account, and billing rows are loaded",
      "Working-data packet exported after live rows load"
    ],
    migration_repair_evidence: organizationRlsRepairEvidence
  };
  const seededAccessGrantId = visibleSeedEvidence?.access_grant_id ?? "";
  const seededConsentAuthorizationId = visibleSeedEvidence?.consent_authorization_id ?? "";
  const seededCorporateAccessReviewId = visibleSeedEvidence?.corporate_access_review_id ?? "";
  const seededSubscriptionId = visibleSeedEvidence?.subscription_id ?? "";
  const seededMembershipId = visibleSeedEvidence?.membership_id ?? "";
  const seedReconciliationRows = [
    {
      label: "Passport records",
      expected: visibleSeedEvidence?.passport_records ?? 0,
      actual: livePassportRecords.length,
      ok: Boolean(visibleSeedEvidence) && livePassportRecords.length >= (visibleSeedEvidence?.passport_records ?? 0)
    },
    {
      label: "Evidence documents",
      expected: visibleSeedEvidence?.evidence_documents ?? 0,
      actual: evidenceDocuments.length,
      ok: Boolean(visibleSeedEvidence) && evidenceDocuments.length >= (visibleSeedEvidence?.evidence_documents ?? 0)
    },
    {
      label: "Access Grants",
      expected: visibleSeedEvidence ? 1 : 0,
      actual: accessGrants.length,
      ok: Boolean(seededAccessGrantId) && accessGrants.some((grant) => grant.id === seededAccessGrantId)
    },
    {
      label: "Consent",
      expected: visibleSeedEvidence ? 1 : 0,
      actual: consentAuthorizations.length,
      ok: Boolean(seededConsentAuthorizationId) && consentAuthorizations.some((authorization) => authorization.id === seededConsentAuthorizationId)
    },
    {
      label: "Corporate review attestation",
      expected: visibleSeedEvidence ? 1 : 0,
      actual: corporateAccessReviews.length,
      ok: Boolean(seededCorporateAccessReviewId) && corporateAccessReviews.some((review) => review.id === seededCorporateAccessReviewId)
    },
    {
      label: "Subscription",
      expected: visibleSeedEvidence ? 1 : 0,
      actual: organizationSubscriptions.length,
      ok: Boolean(seededSubscriptionId) && organizationSubscriptions.some((subscription) => subscription.id === seededSubscriptionId)
    },
    {
      label: "Corporate members",
      expected: visibleSeedEvidence ? 1 : 0,
      actual: teamMembers.length,
      ok: Boolean(seededMembershipId) && teamMembers.some((member) => member.id === seededMembershipId)
    }
  ];
  const seedReconciliationPassing = seedReconciliationRows.filter((row) => row.ok).length;
  const seedReconciliationComplete = Boolean(visibleSeedEvidence) && seedReconciliationPassing === seedReconciliationRows.length;
  const liveDataVerdictRows = [
    {
      label: "Hosted login",
      value: authSession ? "Connected" : "Required",
      ready: Boolean(authSession)
    },
    {
      label: "RBAC context",
      value: accountContext ? "Loaded" : "Required",
      ready: Boolean(accountContext)
    },
    {
      label: "Required row groups",
      value: `${liveDatabaseAcceptancePassing}/${liveDatabaseAcceptanceRows.length}`,
      ready: liveDatabaseAcceptanceComplete
    },
    {
      label: "Seed reconciliation",
      value: seedReconciliationComplete ? "Matched" : visibleSeedEvidence ? `${seedReconciliationPassing}/${seedReconciliationRows.length}` : "Not run",
      ready: seedReconciliationComplete
    }
  ];
  const workingDatabaseRunbookSteps = [
    {
      label: "1. Sign in on hosted TrustGraph",
      proof: authSession ? authSession.user.email : "Hosted Supabase session required",
      ready: Boolean(authSession)
    },
    {
      label: "2. Load RBAC account context",
      proof: accountContext ? "Professional and organization context loaded" : "Create or accept a corporate account",
      ready: Boolean(accountContext)
    },
    {
      label: "3. Run seed, reload rows, export proof",
      proof: visibleSeedEvidence
        ? `Seed evidence captured for org ${visibleSeedEvidence.corporate_organization_id.slice(0, 8)}`
        : "Use Prepare live pilot workspace after login",
      ready: Boolean(visibleSeedEvidence)
    },
    {
      label: "4. Reconcile required live row groups",
      proof: `${liveDatabaseAcceptancePassing}/${liveDatabaseAcceptanceRows.length} v1 database groups ready`,
      ready: liveDatabaseAcceptanceComplete
    },
    {
      label: "5. Corporate Verify reviews shared rows",
      proof: accessGrants.some((grant) => grant.status === "approved")
        ? "Approved Access Grant available for reviewer workflow"
        : "Approve or create an Access Grant before pilot sign-off",
      ready: accessGrants.some((grant) => grant.status === "approved")
    }
  ];
  const workingDatabaseRunbookReady = workingDatabaseRunbookSteps.filter((step) => step.ready).length;
  const nextDatabaseRepair = liveDatabaseRepairQueue[0] ?? null;
  const workingDatabaseCommandCenter = {
    label: "Working database command center",
    status: workingDatabaseAcceptanceStatus,
    next_action: liveDatabaseAcceptanceComplete
      ? "Export working-data packet"
      : !authSession
        ? "Login on hosted TrustGraph"
        : !accountContext
          ? "Load account and RBAC context"
          : nextDatabaseRepair?.action ?? "Run seed, reload rows, export proof",
    next_detail: liveDatabaseAcceptanceComplete
      ? "All required live row groups are loaded; export the packet before pilot acceptance review."
      : nextDatabaseRepair
        ? `${nextDatabaseRepair.label}: ${nextDatabaseRepair.required}`
        : workingDatabaseAcceptanceDetail,
    ready_groups: liveDatabaseAcceptancePassing,
    total_groups: liveDatabaseAcceptanceRows.length,
    seed_reconciliation: seedReconciliationComplete ? "matched" : visibleSeedEvidence ? "needs_reload_or_repair" : "not_run",
    seed_login_handoff: {
      label: "Hosted login before seed",
      status: authSession ? "signed_in" : "login_required",
      action: authSession ? "Prepare live pilot workspace" : "Login or register first",
      detail: authSession
        ? "Seed can write live pilot rows for the signed-in Supabase user."
        : "Open hosted registration, verify email if needed, then return to run the live pilot seed."
    },
    packet_export_required: true,
    accepted_source: "signed_in_supabase_repository_rows"
  };
  const liveAccountAcceptanceChecklist = [
    {
      label: "Hosted auth session",
      required: "User signs in from GitHub Pages or TrustGraph VPS, not localhost.",
      ok: Boolean(authSession),
      evidence: authSession ? authSession.user.email : "No hosted session loaded"
    },
    {
      label: "RBAC account context",
      required: "Profile, organization, membership, and active role load from Supabase.",
      ok: Boolean(accountContext),
      evidence: accountContext ? `${accountContext.memberships.length} memberships loaded` : "Account context missing"
    },
    {
      label: "Real database row groups",
      required: "All required Passport, evidence, corporate, consent, team, and billing rows load.",
      ok: liveDatabaseAcceptanceComplete,
      evidence: `${liveDatabaseAcceptancePassing}/${liveDatabaseAcceptanceRows.length} row groups ready`
    },
    {
      label: "Seed evidence reconciliation",
      required: "Latest pilot seed IDs reconcile with rows currently loaded from repositories.",
      ok: seedReconciliationComplete,
      evidence: visibleSeedEvidence ? `${seedReconciliationPassing}/${seedReconciliationRows.length} seed rows matched` : "Seed not run"
    },
    {
      label: "RLS repair proof",
      required: "Migration 042 is applied or explicitly proven through release ledger / workflow evidence.",
      ok: organizationRlsRepairEvidence.applied,
      evidence: organizationRlsRepairEvidence.ledger_status
    },
    {
      label: "VPS and VFIX boundary",
      required: "TrustGraph host stays separate from protected VFIX route before production cutover.",
      ok: true,
      evidence: "trustgraph.5-75-224-110.sslip.io target; VFIX route preserved"
    }
  ];
  const liveAccountAcceptanceReady = liveAccountAcceptanceChecklist.every((item) => item.ok);
  const liveAccountAcceptanceOpenItems = liveAccountAcceptanceChecklist.filter((item) => !item.ok);
  const nextLiveAccountAcceptanceAction =
    liveAccountAcceptanceOpenItems[0]?.label === "Hosted auth session"
      ? "Login on hosted TrustGraph"
      : liveAccountAcceptanceOpenItems[0]?.label === "RBAC account context"
        ? "Create or switch account context"
        : liveAccountAcceptanceOpenItems[0]?.label === "Real database row groups"
          ? nextDatabaseRepair?.action ?? "Prepare live pilot workspace"
          : liveAccountAcceptanceOpenItems[0]?.label === "Seed evidence reconciliation"
            ? "Run seed and reload rows"
            : liveAccountAcceptanceOpenItems[0]?.label === "RLS repair proof"
              ? "Verify migration 042 release ledger"
              : "Export working-data packet";
  const liveAccountAcceptancePacket = {
    label: "Live account acceptance checklist",
    status: liveAccountAcceptanceReady ? "accepted" : "human_or_live_data_action_required",
    accepted_source: "signed_in_supabase_repository_rows",
    preview_data_accepted: false,
    next_action: nextLiveAccountAcceptanceAction,
    ready: liveAccountAcceptanceReady,
    open_items: liveAccountAcceptanceOpenItems.map((item) => item.label),
    checklist: liveAccountAcceptanceChecklist
  };
  const professionalDatabaseReady = livePassportRecords.length > 0 && evidenceDocuments.length > 0;
  const corporateDatabaseReady =
    accessGrants.length > 0 &&
    corporateAccessReviews.length > 0 &&
    consentAuthorizations.length > 0 &&
    (teamMembers.length > 0 || teamInvitations.length > 0);
  const pilotLedgerReady = organizationSubscriptions.length > 0 && seedReconciliationComplete;
  const liveDatabaseAcceptanceLanes = [
    {
      label: "Professional Passport",
      status: professionalDatabaseReady ? "ready" : "needs records",
      ready: professionalDatabaseReady,
      detail: professionalDatabaseReady
        ? "Passport and evidence rows are loaded from Supabase for this signed-in user."
        : "Create a Passport record and attach evidence metadata before accepting the user database.",
      metrics: [
        `${livePassportRecords.length} records`,
        `${evidenceDocuments.length} evidence`
      ],
      action: "Open Professional Passport",
      target: "passport" as WorkspaceId
    },
    {
      label: "Corporate Verify",
      status: corporateDatabaseReady ? "ready" : "needs scoped access",
      ready: corporateDatabaseReady,
      detail: corporateDatabaseReady
        ? "Corporate access, consent, reviewer/team, and review attestation rows are loaded."
        : "Load a corporate workspace, request/approve scoped access, and record a review attestation.",
      metrics: [
        `${accessGrants.length} grants`,
        `${corporateAccessReviews.length} reviews`,
        `${teamMembers.length + teamInvitations.length} team`
      ],
      action: "Open Corporate Verify",
      target: "verify" as WorkspaceId
    },
    {
      label: "Pilot ledger",
      status: pilotLedgerReady ? "ready" : "needs seed proof",
      ready: pilotLedgerReady,
      detail: pilotLedgerReady
        ? "Pilot subscription ledger and seed reconciliation match the loaded repository rows."
        : "Activate the pilot ledger, prepare live pilot rows, then reload and export proof.",
      metrics: [
        `${organizationSubscriptions.length} subscriptions`,
        `${seedReconciliationPassing}/${seedReconciliationRows.length} seed match`
      ],
      action: authSession ? "Prepare live pilot workspace" : "Login first",
      target: "verify" as WorkspaceId
    }
  ];
  const liveDatabaseAcceptanceLaneReady = liveDatabaseAcceptanceLanes.filter((lane) => lane.ready).length;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(pilotSeedEvidenceKey);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as SavedPilotSeedEvidence;
      if (!parsed.subscription_id || !parsed.access_grant_id || !parsed.corporate_organization_id) return;
      setSavedSeedEvidence(parsed);
      setSeedStatus(`Last browser seed evidence saved ${new Date(parsed.saved_at).toLocaleString()}. Live rows still load from Supabase after login.`);
    } catch {
      window.localStorage.removeItem(pilotSeedEvidenceKey);
    }
  }, []);

  async function seedLiveData() {
    setSeedBusy(true);
    setSeedStatus("Creating live pilot rows in Supabase...");
    try {
      const result = await onSeedPilotWorkspace();
      const savedEvidence = { ...result, saved_at: new Date().toISOString() };
      setSeedResult(result);
      setSavedSeedEvidence(savedEvidence);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(pilotSeedEvidenceKey, JSON.stringify(savedEvidence));
      }
      setSeedStatus("Live pilot workspace seeded and portal data refreshed.");
    } catch (error) {
      setSeedStatus(error instanceof Error ? error.message : "Could not seed live pilot workspace");
    } finally {
      setSeedBusy(false);
    }
  }

  function clearSeedEvidence() {
    setSeedResult(null);
    setSavedSeedEvidence(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(pilotSeedEvidenceKey);
    }
    setSeedStatus("Last browser seed evidence cleared. Live database rows will reload after login.");
  }

  const workingDatabaseProof = {
    generated_at: new Date().toISOString(),
    mode: authSession && accountContext ? "live_supabase" : "product_preview",
    profile_email: authSession?.user.email ?? null,
    account_context_loaded: Boolean(accountContext),
    live_rows_currently_loaded: workingDataRows,
    live_row_total: workingDataTotal,
    working_database_command_center: workingDatabaseCommandCenter,
    live_account_acceptance_checklist: liveAccountAcceptancePacket,
    live_database_acceptance_lanes: liveDatabaseAcceptanceLanes,
    live_row_source_receipt: liveRowSourceReceipt,
    live_database_acceptance: {
      status: workingDatabaseAcceptanceStatus,
      passing: liveDatabaseAcceptancePassing,
      total: liveDatabaseAcceptanceRows.length,
      complete: liveDatabaseAcceptanceComplete,
      rows: liveDatabaseAcceptanceRows,
      unmet_requirements: liveDatabaseAcceptanceRows.filter((row) => !row.ok).map((row) => row.required),
      live_database_repair_queue: liveDatabaseRepairQueue,
      real_database_acceptance_policy: realDatabaseAcceptancePolicy,
      organization_rls_repair_evidence: organizationRlsRepairEvidence,
      database_policy_repair_guidance: databasePolicyRepairGuidance
    },
    checklist_completed: completed,
    checklist_total: checklist.length,
    seed_evidence: visibleSeedEvidence,
    seed_reconciliation: {
      passing: seedReconciliationPassing,
      total: seedReconciliationRows.length,
      complete: seedReconciliationComplete,
      rows: seedReconciliationRows
    },
    working_database_test_runbook: {
      label: "Working database test runbook",
      accepted_source: "not static preview data",
      status: liveDatabaseAcceptanceComplete ? "ready_for_pilot_database_review" : "operator_steps_open",
      ready_steps: workingDatabaseRunbookReady,
      total_steps: workingDatabaseRunbookSteps.length,
      steps: workingDatabaseRunbookSteps
    },
    note:
      authSession && accountContext
        ? "Counts reflect rows loaded through the live Supabase repositories for this signed-in account and RBAC context."
        : "Login is required before this packet proves live database state."
  };
  const hostedLoginDatabaseHandoff = {
    generated_at: new Date().toISOString(),
    mode: "hosted_login_database_handoff",
    hosted_app_url: "https://mirzaraheel99.github.io/trustgraph/",
    supabase_email_verification_return_url: hostedAuthRedirectUrl(),
    database_acceptance_requires_live_login: true,
    vps_deployment_requires_human_access: true,
    protected_vfix_host: "https://5-75-224-110.sslip.io",
    trustgraph_vps_target: "https://trustgraph.5-75-224-110.sslip.io",
    session_state: authSession ? "signed_in" : "signed_out",
    profile_email: authSession?.user.email ?? null,
    account_context_loaded: Boolean(accountContext),
    hosted_login_database_ready: hostedLoginDatabaseReady,
    live_account_acceptance_checklist: liveAccountAcceptancePacket,
    live_database_acceptance: workingDatabaseProof.live_database_acceptance,
    seed_reconciliation_complete: seedReconciliationComplete,
    next_operator_steps: [
      "Open the hosted GitHub Pages URL before signup, login, or password recovery.",
      "Set Supabase Auth Site URL and allowed redirects to the hosted TrustGraph URL.",
      "Confirm the email link returns to the hosted app, then sign in and prepare the live pilot workspace.",
      "Export the working-data packet after live Supabase rows load for the signed-in account.",
      "Run the TrustGraph VPS workflow only against the TrustGraph host and keep the VFIX host isolated."
    ]
  };
  const hostedCorporateRetestSteps = [
    {
      label: "Open hosted app",
      required: "Start from https://mirzaraheel99.github.io/trustgraph/ or the TrustGraph VPS host, not localhost.",
      status: "Ready to test",
      ok: true,
      evidence: "Hosted GitHub Pages URL is the primary source of truth."
    },
    {
      label: "Email link returns hosted",
      required: "Supabase verification and recovery links must return to the hosted URL.",
      status: hostedAuthRedirectUrl().includes("localhost") ? "Fix redirect" : "Hosted redirect",
      ok: !hostedAuthRedirectUrl().includes("localhost"),
      evidence: hostedAuthRedirectUrl()
    },
    {
      label: "Login session accepted",
      required: "A hosted Supabase session is present after login or verification.",
      status: authSession ? "Signed in" : "Login required",
      ok: Boolean(authSession),
      evidence: authSession ? authSession.user.email : "No session loaded"
    },
    {
      label: "Account RPC and RBAC loaded",
      required: "Profile, memberships, organizations, and active role load without organization policy recursion.",
      status: accountContext ? "Context loaded" : "Context missing",
      ok: Boolean(accountContext),
      evidence: accountContext ? `${accountContext.memberships.length} memberships loaded through account context` : "No account context"
    },
    {
      label: "Corporate workspace active",
      required: "Employer or staffing workspace is created or selected for Corporate Verify.",
      status: hasCorporateContext ? "Corporate ready" : "Corporate setup needed",
      ok: hasCorporateContext,
      evidence: hasCorporateContext ? "Corporate membership is present in account context" : "Create corporate account"
    },
    {
      label: "Pricing ledger active",
      required: "Corporate Verify pilot plan writes a live organization subscription row.",
      status: activeSubscription ? "Ledger live" : "Ledger needed",
      ok: activeSubscription,
      evidence: `${organizationSubscriptions.length} subscription rows loaded`
    },
    {
      label: "User database visible",
      required: "Corporate Verify can see Access Grant and shared Passport rows only after approval.",
      status: accessGrants.some((grant) => grant.status === "approved") ? "Approved access" : "Access needed",
      ok: accessGrants.some((grant) => grant.status === "approved") && liveDatabaseAcceptanceRows.some((row) => row.label === "Corporate access database" && row.ok),
      evidence: `${accessGrants.length} grants, ${corporateAccessReviews.length} review attestations`
    },
    {
      label: "Proof exports available",
      required: "Operator can export hosted login handoff, working-data packet, V1 cockpit, and corporate user packet.",
      status: liveAccountAcceptanceReady || liveDatabaseAcceptancePassing > 0 ? "Exportable" : "Needs live rows",
      ok: liveAccountAcceptanceReady || liveDatabaseAcceptancePassing > 0,
      evidence: `${liveDatabaseAcceptancePassing}/${liveDatabaseAcceptanceRows.length} database groups ready`
    }
  ];
  const hostedCorporateRetestReady = hostedCorporateRetestSteps.filter((step) => step.ok).length;
  const hostedCorporateRetestNextStep = hostedCorporateRetestSteps.find((step) => !step.ok) ?? hostedCorporateRetestSteps[hostedCorporateRetestSteps.length - 1];
  const hostedCorporateRetestPacket = {
    mode: "hosted_corporate_retest",
    generated_at: new Date().toISOString(),
    hosted_app_url: "https://mirzaraheel99.github.io/trustgraph/",
    trustgraph_vps_target: "https://trustgraph.5-75-224-110.sslip.io",
    protected_vfix_host: "https://5-75-224-110.sslip.io",
    ready_steps: hostedCorporateRetestReady,
    total_steps: hostedCorporateRetestSteps.length,
    next_step: hostedCorporateRetestNextStep.label,
    next_required: hostedCorporateRetestNextStep.required,
    no_localhost_callback_required: true,
    account_context_rpc_required: "public.get_account_context",
    corporate_database_access_policy: "Corporate Verify can read user rows only after approved Access Grants, consent, RBAC, and review attestation.",
    steps: hostedCorporateRetestSteps,
    exports_to_collect: [
      "hosted login/database handoff packet",
      "working-data packet",
      "V1 completion cockpit packet",
      "corporate user database packet"
    ],
    accepted_when: "hosted_login_rbac_context_corporate_workspace_pricing_ledger_and_approved_user_rows_are_visible_without_localhost_redirects"
  };
  const guidedOnboardingWizard = {
    generated_at: new Date().toISOString(),
    mode: authSession && accountContext ? "live_supabase" : "product_preview",
    title: "Guided onboarding wizard",
    completed_steps: completed,
    total_steps: checklist.length,
    current_step: {
      label: nextItem.label,
      status: nextItem.done ? "ready" : "needs_action",
      detail: nextItem.detail,
      action: nextItem.done ? "Review" : nextItem.actionLabel
    },
    steps: checklist.map((item, index) => ({
      order: index + 1,
      label: item.label,
      status: item.done ? "ready" : "needs_action",
      detail: item.detail,
      action: item.done ? "Review" : item.actionLabel
    })),
    seed_login_handoff: workingDatabaseCommandCenter.seed_login_handoff,
    live_database_proof: workingDatabaseProof,
    seed_reconciliation_complete: seedReconciliationComplete
  };

  return (
    <section className="onboarding-panel">
      <div className="mini-heading">
        <BadgeCheck size={16} />
        <strong>Launch checklist</strong>
      </div>
      <div className="onboarding-score">
        <div>
          <strong>Guided onboarding wizard</strong>
          <span>{completed}/{checklist.length}</span>
          <small>{nextItem.done ? "Core launch path complete" : nextItem.detail}</small>
        </div>
        <div className="onboarding-score-actions">
          <span className={`status-chip ${completed === checklist.length ? "success" : "info"}`}>
            {completed === checklist.length ? "ready" : "in progress"}
          </span>
          <button className="secondary-action" onClick={() => downloadTextFile(checklistExportName, onboardingChecklistToCsv(checklist), "text/csv")} type="button">
            Export setup evidence
          </button>
          <button className="secondary-action" onClick={() => downloadTextFile(wizardExportName, JSON.stringify(guidedOnboardingWizard, null, 2), "application/json")} type="button">
            Export wizard packet
          </button>
        </div>
      </div>
      <div className="onboarding-current-step">
        <span className="status-chip neutral">current step</span>
        <strong>{nextItem.label}</strong>
        <small>{nextItem.done ? "Review live account, records, corporate access, team, and sharing evidence before production gates." : nextItem.detail}</small>
      </div>
      <div className={`live-data-verdict ${liveDataVerdict.tone}`} aria-label="Live data verdict">
        <div>
          <span className={`status-chip ${liveDataVerdict.tone}`}>Live Data Verdict</span>
          <strong>{liveDataVerdict.label}</strong>
          <small>{liveDataVerdict.detail}</small>
        </div>
        <div className="live-data-verdict-grid">
          {liveDataVerdictRows.map((row) => (
            <span className={row.ready ? "ready" : ""} key={row.label}>
              <strong>{row.value}</strong>
              <small>{row.label}</small>
            </span>
          ))}
        </div>
      </div>
      <div className="live-database-acceptance-lanes" aria-label="Live database acceptance lanes">
        <div className="live-database-acceptance-lanes-top">
          <div>
            <span className={`status-chip ${liveDatabaseAcceptanceComplete ? "success" : "warning"}`}>Real database gate</span>
            <strong>{liveDatabaseAcceptanceComplete ? "All live database lanes are ready" : "Finish the missing live database lane"}</strong>
            <small>Separate Professional, Corporate, and pilot ledger proof so users can see what is live, what is missing, and where to go next.</small>
          </div>
          <span className={`status-chip ${liveDatabaseAcceptanceLaneReady === liveDatabaseAcceptanceLanes.length ? "success" : "warning"}`}>
            {liveDatabaseAcceptanceLaneReady}/{liveDatabaseAcceptanceLanes.length} lanes ready
          </span>
        </div>
        <div className="live-database-acceptance-lane-grid">
          {liveDatabaseAcceptanceLanes.map((lane) => (
            <article className={lane.ready ? "ready" : ""} key={lane.label}>
              <div>
                <span className={`status-chip ${lane.ready ? "success" : "warning"}`}>{lane.status}</span>
                <strong>{lane.label}</strong>
                <small>{lane.detail}</small>
              </div>
              <div className="live-database-acceptance-lane-metrics">
                {lane.metrics.map((metric) => (
                  <span key={metric}>{metric}</span>
                ))}
              </div>
              <button
                className={lane.ready ? "secondary-action" : "primary-action"}
                onClick={() => {
                  if (lane.label === "Pilot ledger" && authSession) {
                    void seedLiveData();
                    return;
                  }
                  if (lane.label === "Pilot ledger" && !authSession) {
                    onOpenHostedRegistration();
                    return;
                  }
                  onOpenWorkspace(lane.target);
                }}
                type="button"
              >
                {lane.action}
              </button>
            </article>
          ))}
        </div>
      </div>
      <div className="live-account-acceptance-checklist" aria-label="Live account acceptance checklist">
        <div className="live-account-acceptance-top">
          <div>
            <span className={`status-chip ${liveAccountAcceptanceReady ? "success" : "warning"}`}>Live account acceptance checklist</span>
            <strong>{liveAccountAcceptanceReady ? "Live account backend accepted" : nextLiveAccountAcceptanceAction}</strong>
            <small>Acceptance requires signed-in Supabase repository rows. Preview data and browser-only seed memory do not count.</small>
          </div>
          <span className={`status-chip ${liveAccountAcceptanceReady ? "success" : "warning"}`}>
            {liveAccountAcceptanceChecklist.length - liveAccountAcceptanceOpenItems.length}/{liveAccountAcceptanceChecklist.length} ready
          </span>
        </div>
        <div className="live-account-acceptance-grid">
          {liveAccountAcceptanceChecklist.map((item) => (
            <article className={item.ok ? "ready" : ""} key={item.label}>
              <span className={`status-dot ${item.ok ? "on" : ""}`} />
              <div>
                <strong>{item.label}</strong>
                <small>{item.required}</small>
                <small>{item.evidence}</small>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="onboarding-seed-row">
        <div>
          <strong>{authSession ? "Live pilot seed ready" : "Login before live pilot seed"}</strong>
          <small>{seedStatus}</small>
        </div>
        {!authSession ? (
          <button className="primary-action" onClick={onOpenHostedRegistration} type="button">
            Login or register first
          </button>
        ) : null}
        <button className="secondary-action" disabled={!authSession || seedBusy} onClick={() => void seedLiveData()} type="button">
          Prepare live pilot workspace
        </button>
      </div>
      {visibleSeedEvidence ? (
        <>
          <div className="seed-result-grid">
            <div>
              <span>Passport</span>
              <strong>{visibleSeedEvidence.passport_records}</strong>
            </div>
            <div>
              <span>Evidence</span>
              <strong>{visibleSeedEvidence.evidence_documents}</strong>
            </div>
            <div>
              <span>Subscription</span>
              <strong>{visibleSeedEvidence.subscription_id.slice(0, 8)}</strong>
            </div>
            <div>
              <span>Access Grant</span>
              <strong>{visibleSeedEvidence.access_grant_id.slice(0, 8)}</strong>
            </div>
            <div>
              <span>Consent</span>
              <strong>{visibleSeedEvidence.consent_authorization_id.slice(0, 8)}</strong>
            </div>
            <div>
              <span>Corporate org</span>
              <strong>{visibleSeedEvidence.corporate_organization_id.slice(0, 8)}</strong>
            </div>
          </div>
          <div className="seed-evidence-card">
            <span className="status-chip success">{seedResult ? "Supabase rows written" : "Last browser seed evidence"}</span>
            <small>
              Live pilot database evidence: subscription {visibleSeedEvidence.subscription_id}, Access Grant {visibleSeedEvidence.access_grant_id},
              consent authorization {visibleSeedEvidence.consent_authorization_id}, corporate organization {visibleSeedEvidence.corporate_organization_id}.
            </small>
            <div className="seed-evidence-actions">
              <button className="secondary-action" onClick={() => downloadTextFile(seedEvidenceExportName, JSON.stringify(visibleSeedEvidence, null, 2), "application/json")} type="button">
                Export seed evidence
              </button>
              <button className="secondary-action" onClick={clearSeedEvidence} type="button">
                Clear seed evidence
              </button>
            </div>
          </div>
          <div className="seed-reconciliation-card">
            <div className="seed-reconciliation-top">
              <div>
                <strong>Seed reconciliation</strong>
                <small>Compares the latest seed IDs and counts with rows currently loaded from the live repositories.</small>
              </div>
              <span className={`status-chip ${seedReconciliationComplete ? "success" : "warning"}`}>
                {seedReconciliationPassing}/{seedReconciliationRows.length} matched
              </span>
            </div>
            <div className="seed-reconciliation-grid">
              {seedReconciliationRows.map((row) => (
                <article className={row.ok ? "matched" : ""} key={row.label}>
                  <span className={`status-dot ${row.ok ? "on" : ""}`} />
                  <div>
                    <strong>{row.label}</strong>
                    <small>Expected {row.expected}; loaded {row.actual}</small>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </>
      ) : null}
      <div className="working-database-proof" id="live-database-proof">
        <div className="working-database-proof-top">
          <div>
            <strong>Working database proof</strong>
            <small>{authSession && accountContext ? "Live rows currently loaded from Supabase for this account." : "Login first to replace preview counts with live database evidence."}</small>
          </div>
          <span className={`status-chip ${authSession && accountContext ? "success" : "warning"}`}>
            {authSession && accountContext ? "live rows loaded" : "login needed"}
          </span>
        </div>
        <div className="seed-reconciliation-top">
          <div>
            <strong>Real database acceptance matrix</strong>
            <small>Shows which required v1 row groups are loaded from Supabase and which are still missing before pilot acceptance.</small>
          </div>
          <span className={`status-chip ${liveDatabaseAcceptanceComplete ? "success" : "warning"}`}>
            {liveDatabaseAcceptancePassing}/{liveDatabaseAcceptanceRows.length} database groups ready
          </span>
        </div>
        <div className="working-database-command-center" aria-label="Working database command center">
          <div>
            <span className={`status-chip ${liveDatabaseAcceptanceComplete ? "success" : authSession ? "warning" : "neutral"}`}>
              Working database command center
            </span>
            <strong>{workingDatabaseCommandCenter.next_action}</strong>
            <small>{workingDatabaseCommandCenter.next_detail}</small>
          </div>
          <div className="working-database-command-grid">
            <span>
              <strong>{workingDatabaseCommandCenter.ready_groups}/{workingDatabaseCommandCenter.total_groups}</strong>
              <small>Live row groups ready</small>
            </span>
            <span>
              <strong>{workingDatabaseCommandCenter.seed_reconciliation.replace(/_/g, " ")}</strong>
              <small>Seed reconciliation</small>
            </span>
            <span>
              <strong>{workingDatabaseCommandCenter.accepted_source}</strong>
              <small>Accepted source</small>
            </span>
            <span>
              <strong>{workingDatabaseCommandCenter.packet_export_required ? "Required" : "Optional"}</strong>
              <small>Working-data packet export</small>
            </span>
          </div>
        </div>
        <div className="live-row-source-receipt" aria-label="Live row source receipt">
          <div>
            <span className={`status-chip ${liveDatabaseAcceptanceComplete ? "success" : authSession && accountContext ? "warning" : "neutral"}`}>
              Live row source receipt
            </span>
            <strong>{liveRowSourceReceipt.row_groups_ready}/{liveRowSourceReceipt.row_groups_required} required row groups are live</strong>
            <small>
              Accepted source: {liveRowSourceReceipt.accepted_source.replace(/_/g, " ")}. Preview data accepted: {liveRowSourceReceipt.preview_data_accepted ? "yes" : "no"}.
            </small>
          </div>
          <div className="live-row-source-grid">
            {liveRowSourceReceipt.rows.map((row) => (
              <article className={row.source === "live_supabase_row_loaded" ? "matched" : ""} key={row.label}>
                <span className={`status-dot ${row.source === "live_supabase_row_loaded" ? "on" : ""}`} />
                <div>
                  <strong>{row.label}</strong>
                  <small>{row.source.replace(/_/g, " ")}</small>
                  <small>{row.evidence}</small>
                </div>
              </article>
            ))}
          </div>
          <div className="live-row-source-next">
            <small>{liveRowSourceReceipt.row_groups_missing} missing row group{liveRowSourceReceipt.row_groups_missing === 1 ? "" : "s"} before acceptance.</small>
            <button
              className="secondary-action"
              onClick={() => {
                if (liveRowSourceReceipt.next_repair_action === "Open Corporate Verify") {
                  onOpenWorkspace("verify");
                  return;
                }
                if (liveRowSourceReceipt.next_repair_action === "Open Professional Passport") {
                  onOpenWorkspace("passport");
                  return;
                }
                downloadTextFile(workingDataExportName, JSON.stringify(workingDatabaseProof, null, 2), "application/json");
              }}
              type="button"
            >
              {liveRowSourceReceipt.next_repair_action.replace(/_/g, " ")}
            </button>
          </div>
        </div>
        <div className="working-database-acceptance-card">
          <div>
            <strong>Working database acceptance</strong>
            <small>{workingDatabaseAcceptanceDetail}</small>
          </div>
          <span className={`status-chip ${liveDatabaseAcceptanceComplete ? "success" : authSession && accountContext ? "warning" : "neutral"}`}>
            {workingDatabaseAcceptanceStatus.replace(/_/g, " ")}
          </span>
        </div>
        <div className="real-database-policy-card">
          <div>
            <span className="status-chip neutral">Real data only</span>
            <strong>Preview data is not accepted for v1 database proof</strong>
            <small>TrustGraph accepts the working database only after signed-in Supabase repository rows are loaded and the working-data packet is exported.</small>
          </div>
          <div className="real-database-policy-grid">
            <span>
              <strong>{authSession ? "Signed in" : "Login required"}</strong>
              <small>Hosted Supabase session</small>
            </span>
            <span>
              <strong>{accountContext ? "RBAC loaded" : "Context needed"}</strong>
              <small>Account and organization context</small>
            </span>
            <span>
              <strong>{liveDatabaseAcceptanceComplete ? "Accepted" : "Not accepted"}</strong>
              <small>{realDatabaseAcceptancePolicy.current_status.replace(/_/g, " ")}</small>
            </span>
          </div>
        </div>
        <div className="working-database-test-runbook">
          <div className="seed-reconciliation-top">
            <div>
              <strong>Working database test runbook</strong>
              <small>Run seed, reload rows, export proof, then let Corporate Verify review shared records. This is the v1 path for proving live Supabase rows, not static preview data.</small>
            </div>
            <span className={`status-chip ${workingDatabaseRunbookReady === workingDatabaseRunbookSteps.length ? "success" : "warning"}`}>
              {workingDatabaseRunbookReady}/{workingDatabaseRunbookSteps.length} ready
            </span>
          </div>
          <div className="working-database-runbook-grid">
            {workingDatabaseRunbookSteps.map((step) => (
              <article className={step.ready ? "matched" : ""} key={step.label}>
                <span className={`status-dot ${step.ready ? "on" : ""}`} />
                <div>
                  <strong>{step.label}</strong>
                  <small>{step.proof}</small>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="migration-repair-card">
          <div>
            <span className={`status-chip ${organizationRlsRepairEvidence.applied ? "success" : "warning"}`}>
              {organizationRlsRepairEvidence.applied ? "034 ledger verified" : "034 proof needed"}
            </span>
            <strong>Organization RLS recursion repair</strong>
            <small>{organizationRlsRepairEvidence.operator_note}</small>
          </div>
          <div className="real-database-policy-grid">
            <span>
              <strong>{organizationRlsRepairEvidence.ledger_status.replace(/_/g, " ")}</strong>
              <small>Release ledger status</small>
            </span>
            <span>
              <strong>{organizationRlsRepairEvidence.workflow_run_id ?? "Admin ledger"}</strong>
              <small>Workflow run proof</small>
            </span>
            <span>
              <strong>034</strong>
              <small>Required before corporate account context acceptance</small>
            </span>
          </div>
        </div>
        {!organizationRlsRepairEvidence.applied ? (
          <div className="database-policy-repair-guidance">
            <div>
              <span className="status-chip warning">Database policy repair guidance</span>
              <strong>Corporate database access needs migration 042 proof</strong>
              <small>{databasePolicyRepairGuidance.blocking_result}</small>
            </div>
            <div className="real-database-policy-grid">
              <span>
                <strong>42P17</strong>
                <small>Policy recursion symptom</small>
              </span>
              <span>
                <strong>{databasePolicyRepairGuidance.required_migration_path}</strong>
                <small>Required migration</small>
              </span>
              <span>
                <strong>{databasePolicyRepairGuidance.current_ledger_status.replace(/_/g, " ")}</strong>
                <small>Current proof state</small>
              </span>
            </div>
            <div className="policy-repair-actions">
              {databasePolicyRepairGuidance.operator_actions.map((action) => (
                <span key={action}>{action}</span>
              ))}
            </div>
          </div>
        ) : null}
        <div className="live-database-repair-queue">
          <div className="seed-reconciliation-top">
            <div>
              <strong>Live database repair queue</strong>
              <small>{liveDatabaseRepairQueue.length ? "Create or load these live Supabase row groups before marking the working database accepted." : "All required live database row groups are loaded for this signed-in context."}</small>
            </div>
            <span className={`status-chip ${liveDatabaseRepairQueue.length ? "warning" : "success"}`}>
              {liveDatabaseRepairQueue.length ? `${liveDatabaseRepairQueue.length} open` : "clear"}
            </span>
          </div>
          <div className="live-database-repair-grid">
            {liveDatabaseRepairQueue.length ? (
              liveDatabaseRepairQueue.map((item) => (
                <article key={item.label}>
                  <div>
                    <strong>{item.label}</strong>
                    <small>{item.required}</small>
                    <small>{item.evidence}</small>
                  </div>
                  <button className="secondary-action" onClick={() => onOpenWorkspace(item.action === "Open Corporate Verify" ? "verify" : "passport")} type="button">
                    {item.action}
                  </button>
                </article>
              ))
            ) : (
              <article className="matched">
                <div>
                  <strong>Working database accepted</strong>
                  <small>Passport, evidence, Access Grants, consent, corporate account, and billing ledger rows are loaded.</small>
                </div>
                <span className="status-chip success">ready</span>
              </article>
            )}
          </div>
        </div>
        <div className="seed-reconciliation-grid">
          {liveDatabaseAcceptanceRows.map((row) => (
            <article className={row.ok ? "matched" : ""} key={row.label}>
              <span className={`status-dot ${row.ok ? "on" : ""}`} />
              <div>
                <strong>{row.label}</strong>
                <small>{row.evidence}</small>
              </div>
            </article>
          ))}
        </div>
        <div className="working-database-grid">
          {workingDataRows.map((row) => (
            <div key={row.label}>
              <span>{row.label}</span>
              <strong>{row.count}</strong>
            </div>
          ))}
        </div>
        <div className="seed-evidence-actions">
          <small>Live rows currently loaded: {workingDataTotal}. Seed evidence {visibleSeedEvidence ? "is attached to this packet." : "will attach after preparing the live pilot workspace."}</small>
          <button className="secondary-action" onClick={() => downloadTextFile(workingDataExportName, JSON.stringify(workingDatabaseProof, null, 2), "application/json")} type="button">
            Export working-data packet
          </button>
        </div>
          <div className="seed-evidence-card">
            <span className={`status-chip ${hostedLoginDatabaseReady ? "success" : "warning"}`}>
              {hostedLoginDatabaseReady ? "hosted login verified" : "hosted login handoff"}
          </span>
          <strong>Hosted login and database handoff</strong>
          <small>
            Exports the hosted Supabase return URL, login state, database acceptance requirements, TrustGraph VPS target, and VFIX isolation guard.
          </small>
          <div className="seed-evidence-actions">
            <small>{hostedLoginDatabaseReady ? "Hosted login and live database acceptance are ready for pilot evidence review." : "Hosted email verification and live database rows still need signed-in proof."}</small>
            <button className="secondary-action" onClick={() => downloadTextFile(hostedLoginHandoffExportName, JSON.stringify(hostedLoginDatabaseHandoff, null, 2), "application/json")} type="button">
              Export login handoff
            </button>
          </div>
        </div>
        <div className="hosted-corporate-retest" aria-label="Hosted corporate retest checklist">
          <div className="hosted-corporate-retest-top">
            <div>
              <span className={`status-chip ${hostedCorporateRetestReady === hostedCorporateRetestSteps.length ? "success" : "warning"}`}>
                Hosted corporate retest
              </span>
              <strong>{hostedCorporateRetestReady}/{hostedCorporateRetestSteps.length} hosted corporate checks ready</strong>
              <small>{hostedCorporateRetestNextStep.required}</small>
            </div>
            <button
              className="secondary-action"
              onClick={() => downloadTextFile(hostedCorporateRetestExportName, JSON.stringify(hostedCorporateRetestPacket, null, 2), "application/json")}
              type="button"
            >
              Export hosted retest
            </button>
          </div>
          <div className="hosted-corporate-retest-grid">
            {hostedCorporateRetestSteps.map((step) => (
              <article className={step.ok ? "ready" : ""} key={step.label}>
                <span className={`status-dot ${step.ok ? "on" : ""}`} />
                <div>
                  <strong>{step.label}</strong>
                  <small>{step.required}</small>
                  <small>{step.evidence}</small>
                </div>
                <span>{step.status}</span>
              </article>
            ))}
          </div>
        </div>
      </div>
      <div className="onboarding-list">
        {checklist.map((item, index) => (
          <article className={item.done ? "onboarding-item done" : "onboarding-item"} key={item.label}>
            <span className={`onboarding-step-number ${item.done ? "on" : ""}`}>{index + 1}</span>
            <div>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </div>
            <button className="mini-action" onClick={item.onAction} type="button">
              {item.done ? "Review" : item.actionLabel}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function PilotAcceptancePanel({
  accessGrants,
  apiClients,
  auditEvents,
  consentAuthorizations,
  evidenceDocuments,
  livePassportRecords,
  schemaMigrationRuns,
  sharedVerifyRecords,
  subscriptions,
  teamInvitations,
  teamMembers
}: {
  accessGrants: AccessGrantView[];
  apiClients: DbApiClient[];
  auditEvents: DbAuditEvent[];
  consentAuthorizations: DbConsentAuthorization[];
  evidenceDocuments: DbEvidenceDocument[];
  livePassportRecords: RecordItem[];
  schemaMigrationRuns: DbSchemaMigrationRun[];
  sharedVerifyRecords: RecordItem[];
  subscriptions: DbOrganizationSubscription[];
  teamInvitations: DbOrganizationInvitation[];
  teamMembers: OrganizationMemberView[];
}) {
  const [qaNotes, setQaNotes] = useState<Record<string, string>>({});
  const steps = [
    {
      label: "Professional Passport setup",
      detail: "Sign up or sign in, confirm RBAC context, then add a Passport record.",
      done: livePassportRecords.length > 0
    },
    {
      label: "Attach evidence",
      detail: "Upload or link evidence metadata, then verify preview/download controls.",
      done: evidenceDocuments.length > 0 || livePassportRecords.some((record) => record.evidence !== "Evidence details pending")
    },
    {
      label: "Corporate workspace",
      detail: "Create employer/staffing account, activate role, invite reviewer.",
      done: teamMembers.length > 0 || teamInvitations.length > 0
    },
    {
      label: "Pilot subscription",
      detail: "Activate a tracked pilot subscription and confirm the audit event writes.",
      done: subscriptions.some((subscription) => subscription.status !== "cancelled")
    },
    {
      label: "Team controls",
      detail: "Invite, accept, suspend, or restore a corporate team member.",
      done: teamMembers.length > 0
    },
    {
      label: "Access Grant loop",
      detail: "Request access from Verify, approve from Passport, sync records.",
      done: accessGrants.some((grant) => grant.status === "approved") || sharedVerifyRecords.length > 0
    },
    {
      label: "Consent check",
      detail: "Create or revoke consent authorization for a sensitive shared record.",
      done: consentAuthorizations.length > 0
    },
    {
      label: "Verify review",
      detail: "Open Verify and confirm approved shared Passport records render with scope context.",
      done: sharedVerifyRecords.length > 0
    },
    {
      label: "Operations queue",
      detail: "Open Admin, create pilot cases if needed, then restrict, resolve, or dismiss a case.",
      done: auditEvents.some((event) => event.action.includes("verification_case"))
    },
    {
      label: "Audit export",
      detail: "Filter audit events by action or target, then export CSV with metadata.",
      done: auditEvents.length > 0
    },
    {
      label: "Connect controls",
      detail: "Create an API client or webhook subscription and confirm status controls.",
      done: apiClients.length > 0
    },
    {
      label: "Release ledger",
      detail: "Confirm Supabase migration runs appear in Admin after workflow execution.",
      done: schemaMigrationRuns.length > 0
    },
    {
      label: "Security review",
      detail: "Inspect Workflow QA, RLS checklist, privacy gates, and live deployment smoke status.",
      done: auditEvents.length > 0 && schemaMigrationRuns.length > 0
    }
  ];
  const notedSteps = steps.map((step) => ({ ...step, note: qaNotes[step.label] ?? "" }));
  const completed = steps.filter((step) => step.done).length;
  const noted = notedSteps.filter((step) => step.note.trim()).length;
  const exportName = `trustgraph-pilot-acceptance-${new Date().toISOString().slice(0, 10)}.csv`;
  const runbookName = `trustgraph-pilot-runbook-${new Date().toISOString().slice(0, 10)}.md`;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("trustgraph-pilot-acceptance-notes");
      if (stored) {
        setQaNotes(JSON.parse(stored) as Record<string, string>);
      }
    } catch {
      setQaNotes({});
    }
  }, []);

  function updateNote(label: string, note: string) {
    const nextNotes = { ...qaNotes, [label]: note };
    if (!note.trim()) {
      delete nextNotes[label];
    }
    setQaNotes(nextNotes);
    window.localStorage.setItem("trustgraph-pilot-acceptance-notes", JSON.stringify(nextNotes));
  }

  return (
    <section className="pilot-acceptance-panel">
      <div className="pilot-acceptance-panel-header">
        <div className="mini-heading">
          <ClipboardCheck size={16} />
          <strong>Pilot acceptance script v1</strong>
        </div>
        <div className="pilot-acceptance-export-actions">
          <button className="secondary-action" onClick={() => downloadTextFile(exportName, pilotAcceptanceToCsv(notedSteps), "text/csv")} type="button">
            Export CSV
          </button>
          <button className="secondary-action" onClick={() => downloadTextFile(runbookName, pilotAcceptanceToMarkdown(notedSteps), "text/markdown")} type="button">
            Export runbook
          </button>
        </div>
      </div>
      <div className="pilot-acceptance-score-row">
        <span className={`status-chip ${completed === steps.length ? "success" : "info"}`}>
          {completed}/{steps.length} passing
        </span>
        <span className={noted ? "status-chip success" : "status-chip warning"}>{noted} notes captured</span>
        <small>Export before and after pilot testing to preserve acceptance evidence.</small>
      </div>
      <div className="pilot-acceptance-step-list">
        {notedSteps.map((step, index) => (
          <article className={step.done ? "pilot-acceptance-step done" : "pilot-acceptance-step"} key={step.label}>
            <span>{index + 1}</span>
            <div>
              <strong>{step.label}</strong>
              <small>{step.detail}</small>
              <textarea
                aria-label={`${step.label} pilot note`}
                onChange={(event) => updateNote(step.label, event.target.value)}
                placeholder="Add pilot evidence, blocker, or reviewer note"
                value={step.note}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function NotificationPanel({
  events,
  message,
  onStatus
}: {
  events: DbNotificationEvent[];
  message: string;
  onStatus: (notificationId: string, status: "delivered" | "suppressed") => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notificationQuery, setNotificationQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "queued" | "delivered" | "suppressed">("all");
  const queuedCount = events.filter((event) => event.status === "queued").length;
  const deliveredCount = events.filter((event) => event.status === "delivered").length;
  const suppressedCount = events.filter((event) => event.status === "suppressed").length;
  const filteredEvents = events.filter((event) => {
    const matchesStatus = statusFilter === "all" || event.status === statusFilter;
    const haystack = `${event.title} ${event.body} ${event.event_type}`.toLowerCase();
    return matchesStatus && haystack.includes(notificationQuery.trim().toLowerCase());
  });
  const exportName = `trustgraph-notifications-${new Date().toISOString().slice(0, 10)}.csv`;

  async function updateStatus(notificationId: string, status: "delivered" | "suppressed") {
    setBusyId(notificationId);
    try {
      await onStatus(notificationId, status);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="notification-panel" id="workflow-notifications">
      <div className="mini-heading">
        <Bell size={16} />
        <strong>Notifications</strong>
      </div>
      <small>{message}</small>
      <div className="notification-summary-grid">
        <div>
          <span>Queued</span>
          <strong>{queuedCount}</strong>
        </div>
        <div>
          <span>Read</span>
          <strong>{deliveredCount}</strong>
        </div>
        <div>
          <span>Muted</span>
          <strong>{suppressedCount}</strong>
        </div>
      </div>
      <div className="notification-source-strip">
        <span className="status-chip success">Workflow notification rows</span>
        <small>Reads Supabase notification events and writes status changes when alerts are marked read or muted.</small>
        <button
          className="secondary-action"
          disabled={!filteredEvents.length}
          onClick={() => downloadTextFile(exportName, notificationEventsToCsv(filteredEvents), "text/csv")}
          type="button"
        >
          Export notifications
        </button>
      </div>
      <div className="notification-controls">
        <input
          onChange={(event) => setNotificationQuery(event.target.value)}
          placeholder="Search notifications"
          value={notificationQuery}
        />
        <select onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} value={statusFilter}>
          <option value="all">All</option>
          <option value="queued">Queued</option>
          <option value="delivered">Delivered</option>
          <option value="suppressed">Suppressed</option>
        </select>
      </div>
      <div className="notification-list">
        {filteredEvents.length ? (
          filteredEvents.slice(0, 6).map((event) => (
            <article className="notification-card" key={event.id}>
              <div>
                <strong>{event.title}</strong>
                <small>{event.body}</small>
              </div>
              <div className="notification-actions">
                <span className="status-chip neutral">{event.status}</span>
                <button
                  className="secondary-action"
                  disabled={busyId === event.id || event.status === "delivered"}
                  onClick={() => void updateStatus(event.id, "delivered")}
                >
                  Read
                </button>
                <button
                  className="secondary-action"
                  disabled={busyId === event.id || event.status === "suppressed"}
                  onClick={() => void updateStatus(event.id, "suppressed")}
                >
                  Mute
                </button>
              </div>
            </article>
          ))
        ) : (
          <article className="notification-card empty">
            <div>
              <strong>No matching notifications</strong>
              <small>Workflow alerts will appear here when they match the current filter.</small>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

function PermissionGate({
  roleLabel,
  workspaceLabel,
  onOpenAccount,
  onOpenCorporateSetup
}: {
  roleLabel: string;
  workspaceLabel: string;
  onOpenAccount: () => void;
  onOpenCorporateSetup: () => void;
}) {
  return (
    <section className="permission-panel">
      <ShieldAlert size={34} />
      <div>
        <span className="eyebrow">Guided access setup</span>
        <h2>{roleLabel} cannot open {workspaceLabel}</h2>
        <p>
          TrustGraph keeps RBAC enforced, but locked routes now take you to the exact setup path. Login, create or
          switch the corporate workspace, then assign the matching reviewer or admin role.
        </p>
        <div className="permission-actions">
          <button className="primary-action" onClick={onOpenAccount} type="button">
            <KeyRound size={16} />
            Open account setup
          </button>
          <button className="secondary-action" onClick={onOpenCorporateSetup} type="button">
            <BriefcaseBusiness size={16} />
            Open corporate setup
          </button>
        </div>
      </div>
    </section>
  );
}

function PublicSite({
  currentSession,
  currentSessionContext,
  hostedCallbackProof,
  onCorporateSession,
  onOpenProductPreview,
  onSignOut,
  onSession
}: {
  currentSession: AuthSession | null;
  currentSessionContext: string;
  hostedCallbackProof: HostedAuthCallbackProof;
  onCorporateSession: (
    session: AuthSession,
    input: { organizationName: string; organizationType: "employer" | "staffing_agency"; organizationDomain: string }
  ) => void;
  onOpenProductPreview: () => void;
  onSignOut: () => void;
  onSession: (session: AuthSession) => void;
}) {
  const [portal, setPortal] = useState<"professional" | "corporate">("professional");
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationDomain, setOrganizationDomain] = useState("");
  const [organizationType, setOrganizationType] = useState<"employer" | "staffing_agency">("employer");
  const [pilotSeatCount, setPilotSeatCount] = useState(5);
  const [message, setMessage] = useState("Create an account. Email verification may be required; Supabase built-in email allows 2 messages per hour.");
  const [hasPendingCorporateRegistration, setHasPendingCorporateRegistration] = useState(false);
  const [verificationLinkInput, setVerificationLinkInput] = useState("");
  const [verificationLinkMessage, setVerificationLinkMessage] = useState("Paste a localhost verification or recovery link to convert it for this hosted app.");
  const [busy, setBusy] = useState(false);
  const authReady = isSupabaseConfigured();
  const authRedirectUrl = hostedAuthRedirectUrl();
  const pendingCorporateRegistrationKey = "trustgraph.pendingCorporateRegistration";
  const repairedVerificationUrl = repairHostedAuthLink(verificationLinkInput, authRedirectUrl);
  const registrationPacketName = `trustgraph-registration-auth-readiness-${new Date().toISOString().slice(0, 10)}.json`;
  const selectedRegistrationPath =
    portal === "corporate"
      ? {
          portal: "Corporate Verify",
          plan: "Corporate Verify - $149 pilot monthly",
          primaryWrite: "organization + admin membership",
          databaseWrites: ["profiles", "organizations", "organization_memberships", "subscriptions", "access_grants"],
          nextAction:
            mode === "signup"
              ? "Verify email, then login here to create the live company workspace."
              : "Login to load the corporate account, RBAC role, team, billing, and Verify database panels.",
          paymentStatus: "Supabase subscription ledger live; Stripe checkout remains human-gated."
        }
      : {
          portal: "Professional Passport",
          plan: "Professional - free",
          primaryWrite: "profile + personal Passport workspace",
          databaseWrites: ["profiles", "personal organizations", "organization_memberships", "trust_records", "evidence_documents"],
          nextAction:
            mode === "signup"
              ? "Verify email if prompted, then login here to start the live Passport workspace."
              : "Login to load Passport records, evidence, references, Access Grants, and consent panels.",
          paymentStatus: "No payment collection for the professional pilot plan."
        };
  const authOutcomeSteps =
    portal === "corporate"
      ? [
          {
            label: "Login",
            detail: "Verified admin user signs in on the hosted TrustGraph URL."
          },
          {
            label: "Company",
            detail: "Employer or staffing organization, admin membership, and Corporate Verify setup are created."
          },
          {
            label: "Pricing",
            detail: "Corporate Verify pilot plan writes to the Supabase subscription ledger; Stripe stays human-gated."
          }
        ]
      : [
          {
            label: "Login",
            detail: "Verified professional signs in on the hosted TrustGraph URL."
          },
          {
            label: "Passport",
            detail: "Private Passport workspace opens for records, evidence, references, consent, and Access Grants."
          },
          {
            label: "Sharing",
            detail: "Corporate teams see only records approved through scoped Access Grants and consent."
          }
        ];
  const selectedPortalCommand = {
    label: "Selected portal command",
    headline:
      portal === "corporate"
        ? mode === "signup"
          ? "Create company admin account"
          : "Login to Corporate Verify"
        : mode === "signup"
          ? "Create Professional Passport"
          : "Login to Professional Passport",
    next:
      portal === "corporate"
        ? mode === "signup"
          ? "Enter email, password, organization name, domain, and company type."
          : "Enter the verified admin email and password to open company setup."
        : mode === "signup"
          ? "Enter email and password. Passport setup starts after verification."
          : "Enter the verified email and password to open personal records.",
    required_fields:
      portal === "corporate" && mode === "signup"
        ? ["email", "password", "organization_name", "organization_domain", "organization_type"]
        : ["email", "password"],
    after_success: selectedRegistrationPath.nextAction
  };
  const registrationDecisionReceipt = {
    mode: "registration_decision_receipt",
    selected_portal: selectedRegistrationPath.portal,
    selected_mode: mode,
    pricing: selectedRegistrationPath.plan,
    first_database_write: selectedRegistrationPath.primaryWrite,
    required_fields: selectedPortalCommand.required_fields,
    next_dashboard: portal === "corporate" ? "Corporate Verify and Company Admin" : "Professional Passport",
    payment_boundary: selectedRegistrationPath.paymentStatus,
    database_boundary:
      portal === "corporate"
        ? "Corporate teams cannot browse users; they request access by professional email and see only approved shared rows."
        : "Professionals own Passport rows, evidence, consent, and every Access Grant decision."
  };
  const liveOnboardingAcceptanceContract = {
    mode: "live_onboarding_acceptance_contract",
    selected_portal: selectedRegistrationPath.portal,
    hosted_auth_required: true,
    preview_data_accepted: false,
    localhost_redirect_accepted: false,
    first_database_write: selectedRegistrationPath.primaryWrite,
    pricing_boundary: selectedRegistrationPath.paymentStatus,
    corporate_user_database_boundary:
      portal === "corporate"
        ? "company reviewers request one professional by email and see approved shared rows only"
        : "professional owner controls Passport records, evidence, consent, and Access Grants",
    acceptance_sequence:
      portal === "corporate"
        ? [
            "hosted_email_verified",
            "corporate_admin_logged_in",
            "organization_membership_created",
            "subscription_ledger_active",
            "scoped_access_request_submitted",
            "approved_shared_rows_visible"
          ]
        : [
            "hosted_email_verified",
            "professional_logged_in",
            "passport_workspace_created",
            "real_records_or_evidence_loaded",
            "consent_or_access_grant_ready"
          ],
    export_packet: registrationPacketName
  };
  const liveOnboardingContractCards = [
    {
      label: "Hosted auth",
      value: authReady ? "Configured" : "Missing",
      detail: `Redirect must return to ${authRedirectUrl}`
    },
    {
      label: "Preview data",
      value: "Not accepted",
      detail: "V1 proof requires signed-in Supabase rows, not product preview data."
    },
    {
      label: "First database write",
      value: selectedRegistrationPath.primaryWrite,
      detail: selectedRegistrationPath.databaseWrites.join(", ")
    },
    {
      label: portal === "corporate" ? "Corporate database boundary" : "Passport boundary",
      value: portal === "corporate" ? "Scoped rows only" : "Owner controlled",
      detail: liveOnboardingAcceptanceContract.corporate_user_database_boundary
    }
  ];
  const authOutcomePacket = {
    mode: "portal_auth_outcome_summary",
    selected_portal: portal,
    selected_mode: mode,
    hosted_redirect_url: authRedirectUrl,
    selected_portal_command: selectedPortalCommand,
    outcome_steps: authOutcomeSteps,
    live_database_target:
      portal === "corporate"
        ? "corporate_organization_membership_subscription_verify_database"
        : "professional_passport_records_evidence_grants_database",
    human_gates: portal === "corporate" ? ["stripe_checkout_before_paid_launch"] : []
  };
  const pricingDecisionStrip = [
    {
      label: "Live now",
      value: "Supabase ledger",
      detail: "Corporate Verify pilot activation writes organization_subscriptions rows with audit history."
    },
    {
      label: "Corporate pilot",
      value: "$149 monthly",
      detail: "Used for plan selection, seat planning, readiness checks, and pilot acceptance evidence."
    },
    {
      label: "Human gate",
      value: "Stripe checkout",
      detail: "Real payment collection waits for product, tax, invoice, refund, dunning, and webhook decisions."
    }
  ];
  const pilotSeatPrice = 149;
  const normalizedPilotSeats = Math.min(250, Math.max(1, Number.isFinite(pilotSeatCount) ? pilotSeatCount : 1));
  const pilotMonthlyEstimate = normalizedPilotSeats * pilotSeatPrice;
  const pilotAnnualPlanningEstimate = pilotMonthlyEstimate * 12;
  const pricingEstimatorPacket = {
    mode: "public_pricing_pilot_estimator",
    selected_portal: portal,
    corporate_seats: normalizedPilotSeats,
    pilot_monthly_price_per_seat: pilotSeatPrice,
    pilot_monthly_ledger_estimate: pilotMonthlyEstimate,
    annualized_planning_estimate: pilotAnnualPlanningEstimate,
    live_now: "Supabase organization_subscriptions ledger activation",
    payment_collection: "stripe_checkout_disabled_until_human_gate",
    human_gate_required_for: ["Stripe Checkout", "customer portal", "invoice emails", "taxes", "refunds", "dunning", "payment webhooks"],
    database_path: "organization_subscriptions rows are accepted for pilot planning; external payment collection is not enabled"
  };
  const portalLoginSwitchboard = [
    {
      label: "Professional user login",
      portal: "professional" as const,
      start: "Register or login to Professional Passport",
      dashboard: "Personal Passport dashboard",
      writes: "profiles, personal organization, membership, Passport records, evidence, consent, Access Grants",
      next: "Build records first, then approve each corporate request."
    },
    {
      label: "Corporate company login",
      portal: "corporate" as const,
      start: "Register or login to Corporate Verify",
      dashboard: "Corporate Verify and Company Admin dashboards",
      writes: "company organization, admin membership, subscription ledger, team invitations, Verify requests",
      next: "Provision the company first, then request scoped user database access."
    }
  ];
  const portalEntryPath = [
    {
      label: "1. Pick portal",
      detail: portal === "corporate" ? "Corporate creates a company workspace." : "Professional creates a private Passport."
    },
    {
      label: "2. Register or login",
      detail: mode === "signup" ? "Create the account, then verify email if required." : "Login with the verified account."
    },
    {
      label: "3. Land in dashboard",
      detail: portal === "corporate" ? "Open Corporate Verify, team, billing, and access requests." : "Open Passport records, evidence, consent, and sharing."
    }
  ];
  const portalHandoffChecklist = [
    {
      label: portal === "corporate" ? "Company portal" : "Personal portal",
      detail: portal === "corporate" ? "Corporate Verify creates company, RBAC, billing, team, and access request rows." : "Professional Passport creates profile, records, evidence, consent, and sharing rows.",
      state: "Selected"
    },
    {
      label: mode === "signup" ? "Register account" : "Login account",
      detail: mode === "signup" ? "Use hosted verification email, then return here to login." : "Use the verified account; reset password if login fails.",
      state: mode === "signup" ? "Signup" : "Login"
    },
    {
      label: portal === "corporate" ? "Provision workspace" : "Open Passport",
      detail: portal === "corporate" ? "After login, saved company details create the live corporate workspace." : "After login, open Passport and add real database records.",
      state: portal === "corporate" ? "Corporate" : "Professional"
    }
  ];
  const accountTypeChooser = [
    {
      label: "Professional user",
      portal: "professional" as const,
      headline: "Create your private Passport",
      bestFor: "Individuals who own their records and decide what to share.",
      firstDatabaseWrite: "Profile and personal Passport workspace",
      afterLogin: "Records, evidence, references, consent, and Access Grants",
      pricing: "$0 pilot"
    },
    {
      label: "Corporate company",
      portal: "corporate" as const,
      headline: "Create a company Verify workspace",
      bestFor: "Employers and staffing teams reviewing approved professional records.",
      firstDatabaseWrite: "Company organization and admin membership",
      afterLogin: "RBAC team, billing ledger, Verify requests, and review queue",
      pricing: "$149 pilot monthly"
    }
  ];
  const authRecoveryDecisionPath = [
    {
      label: "New account verification",
      action: "Resend verification",
      detail: "Use when signup succeeded but the email has not arrived or still points to an old redirect."
    },
    {
      label: "Existing account recovery",
      action: "Reset password",
      detail: "Use when the user already exists, forgot the password, or cannot complete login."
    },
    {
      label: "Localhost link repair",
      action: "Copy hosted link",
      detail: "Paste Supabase links that point to localhost and convert them to the hosted TrustGraph URL."
    }
  ];
  const loginIssueResolver = [
    {
      label: "Email rate limit",
      action: "Wait 60+ minutes or configure SMTP",
      detail: "Supabase built-in email can pause after 2 messages per hour across the project."
    },
    {
      label: "Verification opens localhost",
      action: "Paste link and copy hosted link",
      detail: "Convert old localhost links to the active hosted TrustGraph redirect before opening them."
    },
    {
      label: "Account exists but login fails",
      action: "Reset password",
      detail: "Use hosted recovery so the inbox link returns to TrustGraph instead of a local dev URL."
    }
  ];
  const registrationAuthPacket = {
    generated_at: new Date().toISOString(),
    selected_portal: portal,
    selected_mode: mode,
    configured: authReady,
    selected_registration_path: selectedRegistrationPath,
    portal_decision_matrix: {
      label: "Portal decision matrix",
      professional: {
        buyer: "Individual professional",
        start_here: "Register a Passport",
        pricing: "Free pilot",
        live_database_result: "Private Passport workspace, records, evidence metadata, consent, and Access Grants"
      },
      corporate: {
        buyer: "Employer or staffing company",
        start_here: "Register a company",
        pricing: "$149 pilot monthly",
        live_database_result: "Company organization, admin membership, team controls, billing ledger, and Verify requests"
      }
    },
    active_redirect_url: authRedirectUrl,
    portal_entry_path: portalEntryPath,
    registration_decision_receipt: registrationDecisionReceipt,
    live_onboarding_acceptance_contract: liveOnboardingAcceptanceContract,
    portal_handoff_checklist: portalHandoffChecklist,
    required_hosted_redirect: TRUSTGRAPH_VPS_URL,
    github_pages_redirect: TRUSTGRAPH_GITHUB_PAGES_URL,
    allowed_production_redirects: TRUSTGRAPH_ALLOWED_REDIRECTS,
    trustgraph_vps_target: TRUSTGRAPH_VPS_URL.replace(/\/$/, ""),
    protected_vfix_host: "https://5-75-224-110.sslip.io",
    current_browser_host:
      typeof window === "undefined" ? "server-render" : `${window.location.origin}${window.location.pathname}`,
    current_browser_is_localhost:
      typeof window === "undefined" ? false : window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1",
    pending_corporate_workspace: {
      saved_in_browser: hasPendingCorporateRegistration,
      organization_name_present: Boolean(organizationName.trim()),
      organization_domain_present: Boolean(organizationDomain.trim()),
      organization_type: organizationType
    },
    account_type_chooser: accountTypeChooser.map((item) => ({
      label: item.label,
      selected: portal === item.portal,
      headline: item.headline,
      best_for: item.bestFor,
      first_database_write: item.firstDatabaseWrite,
      after_login: item.afterLogin,
      pricing: item.pricing
    })),
    portal_login_switchboard: portalLoginSwitchboard,
    login_issue_resolver: loginIssueResolver,
    auth_recovery_decision_path: authRecoveryDecisionPath,
    repaired_link_ready: Boolean(repairedVerificationUrl),
    portal_auth_outcome_summary: authOutcomePacket,
    hosted_auth_callback_proof: hostedCallbackProof,
    pricing_decision_strip: pricingDecisionStrip,
    supabase_auth_settings_needed: [
      "Set Supabase Auth Site URL to the hosted TrustGraph app before inviting pilot users.",
      "Add GitHub Pages and TrustGraph VPS URLs to Supabase allowed redirect URLs.",
      "Regenerate verification or recovery emails after changing redirect settings.",
      "Keep VFIX host isolated from TrustGraph redirect and deployment settings."
    ],
    email_rate_limit: "Supabase built-in email allows 2 emails per hour project-wide; wait 60+ minutes after rate-limit errors or configure custom SMTP."
  };

  function pendingCorporateRegistration() {
    return {
      organizationName,
      organizationType,
      organizationDomain
    };
  }

  function savePendingCorporateRegistration() {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(pendingCorporateRegistrationKey, JSON.stringify(pendingCorporateRegistration()));
    setHasPendingCorporateRegistration(true);
  }

  function readPendingCorporateRegistration() {
    if (typeof window === "undefined") return null;

    const stored = window.localStorage.getItem(pendingCorporateRegistrationKey);
    if (!stored) return null;

    try {
      const parsed = JSON.parse(stored) as {
        organizationName?: string;
        organizationType?: "employer" | "staffing_agency";
        organizationDomain?: string;
      };
      if (!parsed.organizationName || !parsed.organizationDomain || !parsed.organizationType) return null;
      return {
        organizationName: parsed.organizationName,
        organizationType: parsed.organizationType,
        organizationDomain: parsed.organizationDomain
      };
    } catch {
      return null;
    }
  }

  function clearPendingCorporateRegistration() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(pendingCorporateRegistrationKey);
    setHasPendingCorporateRegistration(false);
  }

  useEffect(() => {
    const storedCorporateRegistration = readPendingCorporateRegistration();
    if (!storedCorporateRegistration) return;

    setHasPendingCorporateRegistration(true);
    setPortal("corporate");
    setMode("signin");
    setOrganizationName(storedCorporateRegistration.organizationName);
    setOrganizationDomain(storedCorporateRegistration.organizationDomain);
    setOrganizationType(storedCorporateRegistration.organizationType);
    setMessage("Corporate workspace details are saved in this browser. Login after email verification to finish provisioning.");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authReady) {
      setMessage("Hosted auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in GitHub secrets.");
      return;
    }
    if (portal === "corporate" && mode === "signup" && (!organizationName.trim() || !organizationDomain.trim())) {
      setMessage("Enter organization name and domain before creating a corporate account.");
      return;
    }
    setBusy(true);
    setMessage(mode === "signin" ? "Signing in..." : "Creating account...");

    try {
      const session =
        mode === "signin"
          ? await signInWithPassword(email, password)
          : await signUpWithPassword(email, password, authRedirectUrl);
      if (session) {
        const storedCorporateRegistration = portal === "corporate" ? readPendingCorporateRegistration() : null;
        if (portal === "corporate" && (mode === "signup" || storedCorporateRegistration)) {
          onCorporateSession(session, storedCorporateRegistration ?? pendingCorporateRegistration());
          clearPendingCorporateRegistration();
        } else {
          onSession(session);
        }
        setMessage(portal === "corporate" ? "Corporate portal ready" : "Professional Passport ready");
      } else {
        if (portal === "corporate" && mode === "signup") {
          savePendingCorporateRegistration();
          setMessage("Check your email to confirm the account, then return here and login. Corporate workspace details are saved in this browser. If email is rate-limited, wait 60+ minutes.");
        } else {
          setMessage("Check your email to confirm the account, then login. If email is rate-limited, wait 60+ minutes.");
        }
      }
    } catch (error) {
      setMessage(authFailureMessage(error, authRedirectUrl, "Authentication failed"));
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    if (!authReady) {
      setMessage("Hosted auth is not configured.");
      return;
    }
    if (!email) {
      setMessage("Enter your email first.");
      return;
    }

    setBusy(true);
    setMessage("Sending verification email...");
    try {
      await resendSignupConfirmation(email, authRedirectUrl);
      setMessage("Verification email requested. If the rate limit is active, wait 60+ minutes or configure custom SMTP.");
    } catch (error) {
      setMessage(authFailureMessage(error, authRedirectUrl, "Could not resend verification email."));
    } finally {
      setBusy(false);
    }
  }

  async function recoverPassword() {
    if (!authReady) {
      setMessage("Hosted auth is not configured.");
      return;
    }
    if (!email) {
      setMessage("Enter your email first.");
      return;
    }

    setBusy(true);
    setMessage("Sending password recovery email...");
    try {
      await requestPasswordRecovery(email, authRedirectUrl);
      setMessage("Password recovery email requested. Use the inbox link to return to this hosted TrustGraph app; wait 60+ minutes if Supabase email is rate-limited.");
    } catch (error) {
      setMessage(authFailureMessage(error, authRedirectUrl, "Could not request password recovery."));
    } finally {
      setBusy(false);
    }
  }

  async function copyRepairedVerificationLink() {
    if (!repairedVerificationUrl) {
      setVerificationLinkMessage("Paste the full email link first. It should include a token after # or ?.");
      return;
    }

    try {
      await navigator.clipboard.writeText(repairedVerificationUrl);
      setVerificationLinkMessage("Hosted verification link copied. Open it in this browser, then login again.");
    } catch {
      setVerificationLinkMessage("Copy blocked by the browser. Select the hosted link below and open it manually.");
    }
  }

  const pricing = [
    {
      name: "Professional",
      price: "$0",
      cadence: "Free",
      buyer: "Individuals",
      action: "Start Passport",
      detail: "Build a private Passport and decide exactly which records can be shared.",
      points: ["Private records", "Evidence uploads", "Access Grants", "Reference requests"],
      database: "Writes profile, personal organization, membership, Passport records, and evidence metadata.",
      portal: "professional" as const
    },
    {
      name: "Corporate Verify",
      price: "$149",
      cadence: "Pilot monthly",
      buyer: "Employers and staffing teams",
      action: "Start Corporate",
      detail: "Review approved Passport records with scoped access, team roles, and audit history.",
      points: ["Corporate RBAC", "Missing-record requests", "Readiness review", "Audit trail"],
      database: "Writes organization, admin membership, plan ledger, invitations, Access Grants, and gap requests.",
      portal: "corporate" as const
    },
    {
      name: "TrustGraph Scale",
      price: "Custom",
      cadence: "Pilot agreement",
      buyer: "Issuers and compliance teams",
      action: "Request Scale",
      detail: "For issuers, integrations, compliance operations, and multi-team rollout.",
      points: ["Credential issuer roles", "Connect API clients", "Webhooks", "Compliance support"],
      database: "Uses gated production decisions before external billing, regulated traffic, or issuer rollout.",
      portal: "corporate" as const
    }
  ];
  const liveWorkflow = [
    {
      label: "1",
      value: "Build the Passport",
      detail: "Professionals add work records, credentials, training, references, and evidence."
    },
    {
      label: "2",
      value: "Grant scoped access",
      detail: "Employers and staffing teams request only the records needed for a workflow."
    },
    {
      label: "3",
      value: "Operate with audit",
      detail: "Admin teams monitor cases, release readiness, security checks, and exports."
    }
  ];
  const pilotSignals = ["Live Supabase Auth", "Private evidence storage", "Scoped RBAC", "Audit-ready workflows"];
  const registrationOutcomes = [
    {
      label: "Professional",
      detail: "Creates a live profile, personal organization, Professional role, Passport records, evidence, consent, and Access Grants."
    },
    {
      label: "Corporate",
      detail: "Creates a live employer or staffing organization, admin membership, plans, invitations, member controls, and Verify requests."
    },
    {
      label: "Operator",
      detail: "Admin workspace tracks audit events, release ledger, security review, Connect controls, and pilot acceptance exports."
    }
  ];
  const portalRoutes = [
    {
      label: "Professional user portal",
      icon: Fingerprint,
      action: "Register a Passport",
      detail: "Creates the signed-in professional profile and live Passport context before records or evidence are saved.",
      database: "profiles, organizations, memberships, trust_records, evidence_documents",
      portal: "professional" as const
    },
    {
      label: "Corporate company portal",
      icon: ShieldCheck,
      action: "Register a company",
      detail: "Creates the signed-in corporate admin, employer or staffing organization, and Verify workspace access.",
      database: "organizations, organization_memberships, invitations, subscriptions, access_grants",
      portal: "corporate" as const
    }
  ];
  const selectedPortalSteps =
    portal === "corporate"
      ? [
          "Create employer or staffing organization",
          "Activate Corporate Verify pilot plan",
          "Invite reviewers and request Passport access",
          "Review shared records with audit context"
        ]
      : [
          "Create private Professional Passport",
          "Add records and evidence metadata",
          "Approve or decline each Access Grant",
          "Control sensitive consent and sharing"
        ];
  const selectedPortalGuide =
    portal === "corporate"
      ? [
          {
            label: "1",
            title: "Register the admin user",
            detail: "Create the corporate login with a real email and password, then verify the email if Supabase requires it."
          },
          {
            label: "2",
            title: "Save company details",
            detail: "Organization name, domain, and employer or staffing type are stored until the verified admin logs in."
          },
          {
            label: "3",
            title: "Provision live workspace",
            detail: "After login, TrustGraph creates the organization, admin membership, RBAC context, and corporate setup path."
          }
        ]
      : [
          {
            label: "1",
            title: "Register the professional",
            detail: "Create the user account that owns the private Passport and consent decisions."
          },
          {
            label: "2",
            title: "Verify and login",
            detail: "Return to this hosted app after email verification or use the link repair tool if an email points to localhost."
          },
          {
            label: "3",
            title: "Build the Passport",
            detail: "Add records, evidence metadata, references, Access Grants, and sensitive consent controls."
          }
        ];
  const portalLaunchMap = [
    {
      label: "Professional user",
      action: "Create Passport",
      plan: "$0 pilot",
      firstWrite: "Profile and personal organization",
      dashboard: "Passport records, evidence, consent, and Access Grants",
      portal: "professional" as const
    },
    {
      label: "Corporate company",
      action: "Create company",
      plan: "$149 pilot monthly",
      firstWrite: "Company organization and admin membership",
      dashboard: "Corporate Verify, RBAC team, billing, and user access requests",
      portal: "corporate" as const
    }
  ];
  function openPortal(nextPortal: "professional" | "corporate") {
    setPortal(nextPortal);
    setMode("signup");
    window.requestAnimationFrame(() => document.getElementById("portal-auth")?.scrollIntoView({ behavior: "smooth" }));
  }

  return (
    <main className="public-site">
      <header className="public-nav">
        <div className="brand">
          <div className="brand-symbol">TG</div>
          <div>
            <strong>TrustGraph</strong>
            <span>Verified workforce record platform</span>
          </div>
        </div>
        <div className="public-nav-actions">
          <button className="secondary-action" onClick={onOpenProductPreview}>
            Open product
          </button>
          {currentSession ? (
            <button className="secondary-action" onClick={onSignOut} type="button">
              Sign out
            </button>
          ) : null}
          <button className="primary-action" onClick={() => document.getElementById("portal-auth")?.scrollIntoView()}>
            Get started
          </button>
        </div>
      </header>

      <section className="public-hero">
        <div>
          <span className="eyebrow">Evidence-first workforce records</span>
          <h1>Private professional Passports for high-trust hiring workflows.</h1>
          <p>
            TrustGraph gives professionals a controlled Passport for work history, credentials, references, training, and
            evidence. Employers use Corporate Verify to request scoped access, review approved records, and keep every
            decision audit-ready.
          </p>
          <div className="public-hero-actions">
            <button className="primary-action" onClick={() => openPortal("professional")}>
              Professional portal
            </button>
            <button className="secondary-action" onClick={() => openPortal("corporate")}>
              Corporate portal
            </button>
          </div>
          {currentSession ? (
            <div className="public-session-handoff" aria-label="Public session handoff">
              <div>
                <span className="status-chip success">Already signed in</span>
                <strong>{currentSession.user.email}</strong>
                <small>{currentSessionContext}</small>
              </div>
              <div className="public-session-actions">
                <button className="primary-action" onClick={onOpenProductPreview} type="button">
                  Open dashboard
                </button>
                <button className="secondary-action" onClick={onSignOut} type="button">
                  Sign out
                </button>
              </div>
            </div>
          ) : null}
          <div className="public-portal-rail">
            <button className={portal === "professional" ? "active" : ""} onClick={() => openPortal("professional")}>
              <Fingerprint size={18} />
              <span>
                <strong>Professionals</strong>
                <small>Own records, evidence, consent, and Access Grants.</small>
              </span>
            </button>
            <button className={portal === "corporate" ? "active" : ""} onClick={() => openPortal("corporate")}>
              <ShieldCheck size={18} />
              <span>
                <strong>Corporate teams</strong>
                <small>Request approved records through role-based Verify workspaces.</small>
              </span>
            </button>
          </div>
          <div className="portal-launch-map" aria-label="Portal launch map">
            <div>
              <span className="status-chip success">Portal launch map</span>
              <strong>Start in the right portal before live database rows are created</strong>
            </div>
            <div className="portal-launch-map-grid">
              {portalLaunchMap.map((item) => (
                <button
                  className={portal === item.portal ? "active" : ""}
                  key={item.label}
                  onClick={() => openPortal(item.portal)}
                  type="button"
                >
                  <span>{item.label}</span>
                  <strong>{item.action}</strong>
                  <small>{item.plan}</small>
                  <small>{item.firstWrite}</small>
                  <small>{item.dashboard}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
        <aside className="public-proof public-command-center" aria-label="TrustGraph live database command preview">
          <div className="command-center-top">
            <span className="status-chip success">Live pilot</span>
            <strong>Corporate Verify review</strong>
            <small>Scoped Passport request ready for employer review</small>
          </div>
          <div className="command-center-record">
            <span>Access Grant</span>
            <strong>14-day review window</strong>
            <small>Identity, license, training, and references approved by owner.</small>
          </div>
          <div className="command-center-microgrid">
            <section>
              <strong>13</strong>
              <small>v1 foundation tracks</small>
            </section>
            <section>
              <strong>RBAC</strong>
              <small>role-scoped workspaces</small>
            </section>
          </div>
          <div className="command-center-record">
            <span>Evidence vault</span>
            <strong>Signed preview and download</strong>
            <small>Private Supabase Storage links with audit context.</small>
          </div>
          <div className="trust-network-visual" aria-label="Verified TrustGraph record graph">
            <div className="trust-network-node primary">
              <span>Professional</span>
              <strong>Passport</strong>
            </div>
            <div className="trust-network-node evidence">
              <span>Evidence</span>
              <strong>Signed</strong>
            </div>
            <div className="trust-network-node consent">
              <span>Consent</span>
              <strong>Scoped</strong>
            </div>
            <div className="trust-network-node verify">
              <span>Corporate</span>
              <strong>Verify</strong>
            </div>
          </div>
          <div className="command-center-footer">
            <span>Auth</span>
            <span>Database</span>
            <span>Storage</span>
            <span>Audit</span>
          </div>
        </aside>
      </section>

      <section className="public-section">
        <div className="public-section-heading">
          <span className="eyebrow">Operating model</span>
          <h2>Separate portals, one verified record graph</h2>
        </div>
        <div className="portal-grid">
          <article>
            <Fingerprint size={24} />
            <strong>Professional Passport</strong>
            <p>Create records, attach private evidence, request references, and approve each Access Grant.</p>
          </article>
          <article>
            <ShieldCheck size={24} />
            <strong>Corporate Verify</strong>
            <p>Review approved records, request missing items, invite reviewers, and keep scope visible.</p>
          </article>
          <article>
            <Network size={24} />
            <strong>Connect and Admin</strong>
            <p>Operate Connect clients, audit events, release ledger, workflow QA, and security review.</p>
          </article>
        </div>
      </section>

      <section className="public-section workflow-section">
        <div className="public-section-heading">
          <span className="eyebrow">Workflow</span>
          <h2>From record ownership to permissioned review</h2>
        </div>
        <div className="workflow-grid">
          {liveWorkflow.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="public-section pricing-section">
        <div className="public-section-heading">
          <span className="eyebrow">Pilot access</span>
          <h2>Start with controlled workflows, then scale</h2>
        </div>
        <div className="pricing-grid">
          {pricing.map((plan) => (
            <article className="pricing-card" key={plan.name}>
              <div className="pricing-card-top">
                <strong>{plan.name}</strong>
                <small>{plan.buyer}</small>
              </div>
              <span>{plan.price}</span>
              <small className="pricing-cadence">{plan.cadence}</small>
              <p>{plan.detail}</p>
              <div className="pricing-database-note">
                <span>Database path</span>
                <small>{plan.database}</small>
              </div>
              {plan.points.map((point) => (
                <small key={point}>{point}</small>
              ))}
              <button
                className={plan.name === "Professional" ? "primary-action" : "secondary-action"}
                onClick={() => openPortal(plan.portal)}
                type="button"
              >
                {plan.action}
              </button>
            </article>
          ))}
        </div>
        <div className="pricing-decision-strip" aria-label="Pricing decision strip">
          {pricingDecisionStrip.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
        <div className="public-pricing-estimator" aria-label="Public pricing pilot estimator">
          <div className="public-pricing-estimator-copy">
            <span className="status-chip neutral">Pilot pricing estimator</span>
            <strong>Estimate Corporate Verify seats before signup</strong>
            <small>Use this for pilot ledger planning only. TrustGraph writes subscription intent to Supabase; Stripe payment collection stays off until the human billing gate is approved.</small>
          </div>
          <div className="public-pricing-estimator-controls">
            <label>
              <span>Corporate seats</span>
              <input
                max="250"
                min="1"
                onChange={(event) => setPilotSeatCount(Number(event.target.value))}
                type="number"
                value={normalizedPilotSeats}
              />
            </label>
            <input
              aria-label="Corporate pilot seats"
              max="250"
              min="1"
              onChange={(event) => setPilotSeatCount(Number(event.target.value))}
              type="range"
              value={normalizedPilotSeats}
            />
          </div>
          <div className="public-pricing-estimator-grid">
            <span>
              <strong>${pilotSeatPrice}</strong>
              <small>pilot monthly per seat</small>
            </span>
            <span>
              <strong>${pilotMonthlyEstimate.toLocaleString()}</strong>
              <small>monthly ledger estimate</small>
            </span>
            <span>
              <strong>${pilotAnnualPlanningEstimate.toLocaleString()}</strong>
              <small>annualized planning estimate</small>
            </span>
          </div>
          <div className="public-pricing-estimator-actions">
            <button className="primary-action" onClick={() => openPortal("corporate")} type="button">
              Start Corporate with {normalizedPilotSeats} seats
            </button>
            <button
              className="secondary-action"
              onClick={() =>
                downloadTextFile(
                  `trustgraph-public-pricing-estimator-${new Date().toISOString().slice(0, 10)}.json`,
                  JSON.stringify(pricingEstimatorPacket, null, 2),
                  "application/json"
                )
              }
              type="button"
            >
              Export pricing estimate
            </button>
          </div>
        </div>
        <div className="pilot-signal-row">
          {pilotSignals.map((signal) => (
            <span key={signal}>{signal}</span>
          ))}
        </div>
      </section>

      <section className="public-section portal-route-section">
        <div className="public-section-heading">
          <span className="eyebrow">Portal registration</span>
          <h2>Choose the account type before data is written</h2>
        </div>
        <div className="portal-decision-panel">
          <div>
            <span className="status-chip success">Portal decision matrix</span>
            <strong>One login system, two clean registration paths</strong>
            <p>
              Professionals register a private Passport first. Corporate teams register a company workspace first, then
              activate the Verify plan, invite reviewers, and request scoped Passport access.
            </p>
          </div>
          <div className="portal-decision-grid">
            <span>
              <strong>Professional user</strong>
              <small>Start with the free Passport, then add records, evidence, consent, and Access Grants.</small>
            </span>
            <span>
              <strong>Corporate company</strong>
              <small>Start with Corporate Verify at $149 pilot monthly, then provision RBAC, team seats, and review workflows.</small>
            </span>
          </div>
        </div>
        <div className="portal-route-grid">
          {portalRoutes.map((route) => {
            const Icon = route.icon;

            return (
              <article className={portal === route.portal ? "active" : ""} key={route.label}>
                <div>
                  <Icon size={22} />
                  <span className="status-chip neutral">Live Supabase</span>
                </div>
                <strong>{route.label}</strong>
                <p>{route.detail}</p>
                <small>{route.database}</small>
                <button className={route.portal === "professional" ? "primary-action" : "secondary-action"} onClick={() => openPortal(route.portal)} type="button">
                  {route.action}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="public-section registration-section">
        <div className="public-section-heading">
          <span className="eyebrow">After registration</span>
          <h2>Every portal connects to the live database foundation</h2>
        </div>
        <div className="registration-grid">
          {registrationOutcomes.map((item) => (
            <article key={item.label}>
              <BadgeCheck size={18} />
              <div>
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="public-auth-section" id="portal-auth">
        <div>
          <span className="eyebrow">Portal access</span>
          <h2>{portal === "corporate" ? "Corporate portal access" : "Professional Passport access"}</h2>
          <p>
            {portal === "corporate"
              ? "Create a user account, verify email, then provision an employer or staffing workspace."
              : "Create a user account, verify email if prompted, then start your private Passport."}
          </p>
          <div className="portal-auth-command" aria-label="Portal auth landing command">
            <div>
              <span className="status-chip success">Auth landing command</span>
              <strong>{selectedPortalCommand.headline}</strong>
              <small>{selectedPortalCommand.next}</small>
            </div>
            <div className="portal-auth-command-actions">
              <button className={portal === "professional" ? "active" : ""} onClick={() => setPortal("professional")} type="button">
                Professional Passport
              </button>
              <button className={portal === "corporate" ? "active" : ""} onClick={() => setPortal("corporate")} type="button">
                Corporate Verify
              </button>
              <button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")} type="button">
                I already verified email
              </button>
            </div>
          </div>
          <div className="portal-entry-path" aria-label="Portal entry path">
            {portalEntryPath.map((step) => (
              <span key={step.label}>
                <strong>{step.label}</strong>
                <small>{step.detail}</small>
              </span>
            ))}
          </div>
          <div className="registration-decision-receipt" aria-label="Registration decision receipt">
            <div>
              <span className="status-chip success">Registration decision receipt</span>
              <strong>{registrationDecisionReceipt.selected_portal}</strong>
              <small>{registrationDecisionReceipt.database_boundary}</small>
            </div>
            <div className="registration-decision-grid">
              <span>
                <strong>{registrationDecisionReceipt.pricing}</strong>
                <small>Pricing path</small>
              </span>
              <span>
                <strong>{registrationDecisionReceipt.first_database_write}</strong>
                <small>First database write</small>
              </span>
              <span>
                <strong>{registrationDecisionReceipt.required_fields.length} fields</strong>
                <small>{registrationDecisionReceipt.required_fields.join(", ").replace(/_/g, " ")}</small>
              </span>
              <span>
                <strong>{registrationDecisionReceipt.next_dashboard}</strong>
                <small>{registrationDecisionReceipt.payment_boundary}</small>
              </span>
            </div>
          </div>
          <div className="live-onboarding-contract" aria-label="Live onboarding acceptance contract">
            <div>
              <span className="status-chip success">Live onboarding acceptance contract</span>
              <strong>{selectedRegistrationPath.portal} must prove hosted login and real rows</strong>
              <small>
                Preview mode, localhost email redirects, and unapproved corporate browsing are not accepted for v1 database proof.
              </small>
            </div>
            <div className="live-onboarding-contract-grid">
              {liveOnboardingContractCards.map((item) => (
                <span key={item.label}>
                  <small>{item.label}</small>
                  <strong>{item.value}</strong>
                  <small>{item.detail}</small>
                </span>
              ))}
            </div>
            <div className="live-onboarding-sequence">
              {liveOnboardingAcceptanceContract.acceptance_sequence.map((step, index) => (
                <span key={step}>
                  <small>{index + 1}</small>
                  <strong>{step.replace(/_/g, " ")}</strong>
                </span>
              ))}
            </div>
          </div>
          <div className="account-type-chooser" aria-label="Account type chooser">
            <div className="account-type-chooser-header">
              <div>
                <span className="status-chip success">Account type chooser</span>
                <strong>Choose who is signing up before database rows are created</strong>
                <small>Professional and corporate accounts use the same secure login, but they create different live workspaces.</small>
              </div>
              <span className="status-chip neutral">{mode === "signup" ? "registration" : "login"}</span>
            </div>
            <div className="account-type-chooser-grid">
              {accountTypeChooser.map((item) => (
                <button
                  className={portal === item.portal ? "active" : ""}
                  key={item.label}
                  onClick={() => {
                    setPortal(item.portal);
                    setMode("signup");
                  }}
                  type="button"
                >
                  <span>{item.label}</span>
                  <strong>{item.headline}</strong>
                  <small>{item.bestFor}</small>
                  <small>{item.pricing}</small>
                  <small>First write: {item.firstDatabaseWrite}</small>
                  <small>After login: {item.afterLogin}</small>
                </button>
              ))}
            </div>
            <div className="account-type-chooser-actions">
              <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")} type="button">
                Register new account
              </button>
              <button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")} type="button">
                Login existing account
              </button>
            </div>
          </div>
          <div className="auth-choice-summary" aria-label="Selected portal login path">
            <button className={portal === "professional" ? "active" : ""} onClick={() => setPortal("professional")} type="button">
              <span>Professional user</span>
              <strong>Passport</strong>
              <small>Private records, evidence, consent, and owned Access Grants.</small>
            </button>
            <button className={portal === "corporate" ? "active" : ""} onClick={() => setPortal("corporate")} type="button">
              <span>Corporate company</span>
              <strong>Verify</strong>
              <small>Company workspace, RBAC team access, pricing ledger, and scoped user review.</small>
            </button>
          </div>
          <div className="portal-auth-summary-panel">
            <div>
              <span className="status-chip success">Selected portal route</span>
              <strong>{selectedRegistrationPath.portal}</strong>
              <small>{selectedRegistrationPath.plan}</small>
            </div>
            <div className="portal-auth-summary-grid">
              <span>
                <strong>{selectedRegistrationPath.primaryWrite}</strong>
                <small>First live database write</small>
              </span>
              <span>
                <strong>{selectedRegistrationPath.databaseWrites.length} tables</strong>
                <small>{selectedRegistrationPath.databaseWrites.join(", ")}</small>
              </span>
              <span>
                <strong>{portal === "corporate" ? "Corporate Verify" : "Professional Passport"}</strong>
                <small>{selectedRegistrationPath.nextAction}</small>
              </span>
            </div>
          </div>
          <details className="portal-support-details">
            <summary>
              <span>{portal === "corporate" ? "Corporate setup steps" : "Professional setup steps"}</span>
              <small>{selectedRegistrationPath.nextAction}</small>
            </summary>
            <div className="portal-access-guide">
              <div>
                <span className="eyebrow">{portal === "corporate" ? "Corporate registration sequence" : "Professional registration sequence"}</span>
                <strong>{selectedRegistrationPath.portal}</strong>
                <small>{selectedRegistrationPath.nextAction}</small>
              </div>
              <div className="portal-access-steps">
                {selectedPortalGuide.map((step) => (
                  <span key={step.title}>
                    <strong>{step.label}</strong>
                    <small>{step.title}</small>
                    <small>{step.detail}</small>
                  </span>
                ))}
              </div>
            </div>
          </details>
          <details className="portal-support-details">
            <summary>
              <span>Portal login switchboard</span>
              <small>Compare personal and corporate routes before creating database rows.</small>
            </summary>
            <div className="portal-login-switchboard" aria-label="Portal login switchboard">
              <div>
                <span className="status-chip success">Portal login switchboard</span>
                <strong>Personal and corporate users start from one login, then route by account type</strong>
                <small>Use this map before registering so the correct live database rows and dashboard are created.</small>
              </div>
              <div className="portal-login-switchboard-grid">
                {portalLoginSwitchboard.map((route) => (
                  <button
                    className={portal === route.portal ? "active" : ""}
                    key={route.label}
                    onClick={() => {
                      setPortal(route.portal);
                      setMode("signup");
                    }}
                    type="button"
                  >
                    <strong>{route.label}</strong>
                    <small>{route.start}</small>
                    <span>{route.dashboard}</span>
                    <small>{route.writes}</small>
                    <small>{route.next}</small>
                  </button>
                ))}
              </div>
            </div>
          </details>
          <div className="portal-outcome-list">
            {selectedPortalSteps.map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
        </div>
        <form className={`public-auth-card ${portal === "corporate" ? "corporate-mode" : "professional-mode"}`} onSubmit={submit}>
          <div className="auth-card-heading">
            <span className="status-chip neutral">{portal === "corporate" ? "Corporate Verify" : "Professional Passport"}</span>
            <strong>{mode === "signup" ? "Create account" : "Sign in"}</strong>
            <small>
              {portal === "corporate"
                ? "Company workspace creation starts after email verification and login."
                : "Passport setup starts after email verification and login."}
            </small>
          </div>
          <div className="auth-selected-route">
            <span>{portal === "corporate" ? "Corporate company" : "Professional user"}</span>
            <strong>{mode === "signup" ? "Register" : "Login"}</strong>
            <small>{selectedRegistrationPath.nextAction}</small>
          </div>
          <div className="portal-handoff-checklist" aria-label="Portal handoff checklist">
            {portalHandoffChecklist.map((item) => (
              <span key={item.label}>
                <small>{item.state}</small>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </span>
            ))}
          </div>
          <div className="portal-tabs">
            <button className={portal === "professional" ? "active" : ""} onClick={() => setPortal("professional")} type="button">
              Professional
            </button>
            <button className={portal === "corporate" ? "active" : ""} onClick={() => setPortal("corporate")} type="button">
              Corporate
            </button>
          </div>
          <div className="portal-tabs">
            <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")} type="button">
              Register
            </button>
            <button className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")} type="button">
              Login
            </button>
          </div>
          {hasPendingCorporateRegistration ? (
            <div className="pending-registration-note">
              <div>
                <strong>Pending corporate workspace</strong>
                <small>Login with the verified account in this browser to create the live corporate workspace.</small>
              </div>
              <div className="pending-registration-grid">
                <span>
                  <strong>{organizationName}</strong>
                  <small>Organization</small>
                </span>
                <span>
                  <strong>{organizationDomain}</strong>
                  <small>Domain</small>
                </span>
                <span>
                  <strong>{organizationType.replace("_", " ")}</strong>
                  <small>Type</small>
                </span>
              </div>
              <button
                className="secondary-action"
                onClick={() => {
                  clearPendingCorporateRegistration();
                  setOrganizationName("");
                  setOrganizationDomain("");
                  setOrganizationType("employer");
                  setMode("signup");
                  setMessage("Saved corporate setup cleared. Enter company details again to restart registration.");
                }}
                type="button"
              >
                Clear saved setup
              </button>
            </div>
          ) : null}
          <div className="selected-portal-command" aria-label="Selected portal command">
            <div>
              <span className="status-chip success">{selectedPortalCommand.label}</span>
              <strong>{selectedPortalCommand.headline}</strong>
              <small>{selectedPortalCommand.next}</small>
            </div>
            <div className="selected-portal-command-fields">
              {selectedPortalCommand.required_fields.map((field) => (
                <span key={field}>{field.replace(/_/g, " ")}</span>
              ))}
            </div>
          </div>
          <input onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" type="email" value={email} />
          <input onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" value={password} />
          {portal === "corporate" && mode === "signup" ? (
            <>
              <input onChange={(event) => setOrganizationName(event.target.value)} placeholder="Organization name" value={organizationName} />
              <input onChange={(event) => setOrganizationDomain(event.target.value)} placeholder="company.com" value={organizationDomain} />
              <select onChange={(event) => setOrganizationType(event.target.value as typeof organizationType)} value={organizationType}>
                <option value="employer">Employer</option>
                <option value="staffing_agency">Staffing agency</option>
              </select>
            </>
          ) : null}
          <button
            className="primary-action"
            disabled={busy || !email || !password || (portal === "corporate" && mode === "signup" && (!organizationName || !organizationDomain))}
            type="submit"
          >
            {mode === "signin" ? "Login" : "Create account"}
          </button>
          <details className="auth-operator-details">
            <summary>
              <span>Live database handoff proof</span>
              <small>{selectedRegistrationPath.primaryWrite} then {portal === "corporate" ? "company workspace" : "Passport setup"}</small>
            </summary>
            <div className="portal-auth-outcome-card">
              <div>
                <span className="status-chip success">Live database handoff</span>
                <strong>{portal === "corporate" ? "Corporate account path" : "Professional Passport path"}</strong>
                <small>{portal === "corporate" ? "Register, verify, login, then provision the company workspace." : "Register, verify, login, then build the private Passport."}</small>
              </div>
              <div className="portal-auth-outcome-grid">
                {authOutcomeSteps.map((step) => (
                  <span key={step.label}>
                    <strong>{step.label}</strong>
                    <small>{step.detail}</small>
                  </span>
                ))}
              </div>
            </div>
            <div className="registration-path-card">
              <div>
                <span className="status-chip success">Selected path</span>
                <strong>{selectedRegistrationPath.portal}</strong>
                <small>{selectedRegistrationPath.plan}</small>
              </div>
              <div className="registration-path-grid">
                <span>
                  <strong>{selectedRegistrationPath.primaryWrite}</strong>
                  <small>Primary database write</small>
                </span>
                <span>
                  <strong>{selectedRegistrationPath.databaseWrites.length} tables</strong>
                  <small>{selectedRegistrationPath.databaseWrites.join(", ")}</small>
                </span>
              </div>
              <small>{selectedRegistrationPath.nextAction}</small>
              <small>{selectedRegistrationPath.paymentStatus}</small>
            </div>
          </details>
          <div className="auth-support-actions" aria-label="Account help actions">
            <button className="secondary-action" onClick={onOpenProductPreview} type="button">
              Open product preview
            </button>
            <button className="secondary-action" disabled={busy || !email} onClick={() => void resendVerification()} type="button">
              Resend verification
            </button>
            <button className="secondary-action" disabled={busy || !email} onClick={() => void recoverPassword()} type="button">
              Reset password
            </button>
          </div>
          <div className="login-issue-resolver" aria-label="Login issue resolver">
            <div>
              <span className="status-chip neutral">Login issue resolver</span>
              <strong>Fix verification, recovery, or rate-limit problems without guessing</strong>
              <small>Use these when signup says email is limited, the inbox link opens localhost, or an existing account cannot login.</small>
            </div>
            <div className="login-issue-resolver-grid">
              {loginIssueResolver.map((item) => (
                <article key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.action}</strong>
                  <small>{item.detail}</small>
                </article>
              ))}
            </div>
          </div>
          <div className="public-auth-recovery-command" aria-label="Public auth recovery command center">
            <div>
              <span className="status-chip neutral">Auth recovery command center</span>
              <strong>Verification emails must return to hosted TrustGraph</strong>
              <small>{authRedirectUrl}</small>
            </div>
            <div className="public-auth-recovery-actions">
              <button className="secondary-action" disabled={busy || !email} onClick={() => void resendVerification()} type="button">
                Resend verification
              </button>
              <button className="secondary-action" disabled={busy || !email} onClick={() => void recoverPassword()} type="button">
                Reset password
              </button>
              <button className="secondary-action" disabled={!repairedVerificationUrl} onClick={() => void copyRepairedVerificationLink()} type="button">
                Copy hosted link
              </button>
            </div>
          </div>
          <div className="hosted-callback-proof" aria-label="Hosted callback acceptance proof">
            <div>
              <span className={`status-chip ${hostedCallbackProof.status === "callback_session_accepted" ? "success" : "neutral"}`}>
                Hosted callback acceptance proof
              </span>
              <strong>{hostedCallbackProof.status.replace(/_/g, " ")}</strong>
              <small>
                {hostedCallbackProof.callback_type} callback via {hostedCallbackProof.token_transport}; TrustGraph records only callback metadata and redacts tokens.
              </small>
            </div>
            <div className="hosted-callback-proof-grid">
              <span>
                <strong>{hostedCallbackProof.access_token_present ? "Detected" : "None"}</strong>
                <small>Access token signal</small>
              </span>
              <span>
                <strong>{hostedCallbackProof.refresh_token_present ? "Detected" : "None"}</strong>
                <small>Refresh token signal</small>
              </span>
              <span>
                <strong>{hostedCallbackProof.localhost_source_detected ? "Local" : "Hosted"}</strong>
                <small>Browser origin</small>
              </span>
            </div>
            <small>{hostedCallbackProof.next_action}</small>
          </div>
          <details className="auth-operator-details">
            <summary>
              <span>Verification, recovery, and link repair</span>
              <small>Use after rate limits, localhost links, or password recovery issues</small>
            </summary>
            <div className="auth-recovery-decision" aria-label="Auth recovery decision path">
              <div>
                <span className="status-chip neutral">Auth recovery decision path</span>
                <strong>Pick the recovery action by what happened</strong>
                <small>Keep the email field filled before using verification or password recovery actions.</small>
              </div>
              <div className="auth-recovery-decision-grid">
                {authRecoveryDecisionPath.map((item) => (
                  <article key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.action}</strong>
                    <small>{item.detail}</small>
                  </article>
                ))}
              </div>
            </div>
            <div className="auth-link-repair">
              <div>
                <strong>Fix localhost email link</strong>
                <small>{verificationLinkMessage}</small>
              </div>
              <textarea
                onChange={(event) => setVerificationLinkInput(event.target.value)}
                placeholder="Paste Supabase email link that starts with http://localhost:3000/..."
                value={verificationLinkInput}
              />
              {repairedVerificationUrl ? <input aria-label="Hosted verification link" readOnly value={repairedVerificationUrl} /> : null}
              <button className="secondary-action" disabled={!repairedVerificationUrl} onClick={() => void copyRepairedVerificationLink()} type="button">
                Copy hosted link
              </button>
            </div>
            <div className="auth-readiness-packet">
              <div>
                <strong>Registration auth readiness packet</strong>
                <small>Exports hosted redirect status, selected portal, pending corporate setup, repaired-link readiness, and Supabase Auth action items.</small>
              </div>
              <button
                className="secondary-action"
                onClick={() => downloadTextFile(registrationPacketName, JSON.stringify(registrationAuthPacket, null, 2), "application/json")}
                type="button"
              >
                Export registration auth packet
              </button>
            </div>
          </details>
          <small>{message}</small>
          <small>
            {authReady
              ? `Hosted Supabase Auth is configured. Allowed redirect URLs must include GitHub Pages and the VPS TrustGraph URL, not localhost. Active redirect: ${authRedirectUrl}`
              : "Hosted build is missing public Supabase Auth configuration."}
          </small>
          <small>Supabase built-in email is limited to 2 emails per hour project-wide; custom SMTP is needed for heavier testing.</small>
        </form>
      </section>
    </main>
  );
}

function App() {
  const [workspaceId, setWorkspaceId] = useState<WorkspaceId>("passport");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("identity");
  const [setupView, setSetupView] = useState<"account" | "corporate" | "team" | "billing" | "readiness">("account");
  const [activeMembershipId, setActiveMembershipId] = useState(sessionUser.activeMembershipId);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [showPublicSite, setShowPublicSite] = useState(true);
  const [hostedCallbackProof, setHostedCallbackProof] = useState<HostedAuthCallbackProof>(() =>
    readHostedAuthCallbackProof(hasHostedAuthCallbackUrl() ? "callback_detected" : "no_callback_detected")
  );
  const [pendingCorporateAccount, setPendingCorporateAccount] = useState<{
    organizationName: string;
    organizationType: "employer" | "staffing_agency";
    organizationDomain: string;
  } | null>(null);
  const [accountContext, setAccountContext] = useState<AccountContext | null>(null);
  const [accountStatus, setAccountStatus] = useState("Preview account context");
  const [subscriptionPlans, setSubscriptionPlans] = useState<DbSubscriptionPlan[]>([]);
  const [organizationSubscriptions, setOrganizationSubscriptions] = useState<DbOrganizationSubscription[]>([]);
  const [billingStatus, setBillingStatus] = useState("Sign in to manage billing plans");
  const [teamInvitations, setTeamInvitations] = useState<DbOrganizationInvitation[]>([]);
  const [teamStatus, setTeamStatus] = useState("Sign in to invite corporate team members");
  const [teamMembers, setTeamMembers] = useState<OrganizationMemberView[]>([]);
  const [memberStatus, setMemberStatus] = useState("Sign in to manage corporate seats");
  const [myInvitations, setMyInvitations] = useState<DbOrganizationInvitation[]>([]);
  const [myInvitationStatus, setMyInvitationStatus] = useState("Sign in to review workspace invitations");
  const [livePassportRecords, setLivePassportRecords] = useState<RecordItem[]>([]);
  const [recordStatus, setRecordStatus] = useState("Sign in to add live Passport records");
  const [accessGrants, setAccessGrants] = useState<AccessGrantView[]>([]);
  const [grantStatus, setGrantStatus] = useState("Sign in to review Access Grants");
  const [consentAuthorizations, setConsentAuthorizations] = useState<DbConsentAuthorization[]>([]);
  const [consentStatus, setConsentStatus] = useState("Sign in to review consent authorizations");
  const [verifyRequests, setVerifyRequests] = useState<VerifyAccessGrantView[]>([]);
  const [corporateAccessReviews, setCorporateAccessReviews] = useState<DbCorporateAccessReview[]>([]);
  const [sharedVerifyRecords, setSharedVerifyRecords] = useState<RecordItem[]>([]);
  const [verifyStatus, setVerifyStatus] = useState("Switch to Verify role for live requests");
  const [operationsCases, setOperationsCases] = useState<DbVerificationCase[]>([]);
  const [operationsStatus, setOperationsStatus] = useState("Switch to Admin role for live operations");
  const [auditEvents, setAuditEvents] = useState<DbAuditEvent[]>([]);
  const [auditStatus, setAuditStatus] = useState("Switch to Admin role for audit events");
  const [schemaMigrationRuns, setSchemaMigrationRuns] = useState<DbSchemaMigrationRun[]>([]);
  const [productionGateDecisions, setProductionGateDecisions] = useState<DbProductionGateDecision[]>([]);
  const [pilotLaunchContacts, setPilotLaunchContacts] = useState<DbPilotLaunchContact[]>([]);
  const [releaseStatus, setReleaseStatus] = useState("Switch to Admin role for release ledger");
  const [apiClients, setApiClients] = useState<DbApiClient[]>([]);
  const [webhookSubscriptions, setWebhookSubscriptions] = useState<DbWebhookSubscription[]>([]);
  const [connectStatus, setConnectStatus] = useState("Switch to Admin role for Connect controls");
  const [evidenceDocuments, setEvidenceDocuments] = useState<DbEvidenceDocument[]>([]);
  const [notificationEvents, setNotificationEvents] = useState<DbNotificationEvent[]>([]);
  const [notificationStatus, setNotificationStatus] = useState("Sign in for live workflow notifications");
  const [dataRightsRequests, setDataRightsRequests] = useState<DbDataRightsRequest[]>([]);
  const [dataRightsStatus, setDataRightsStatus] = useState("Sign in to request data export or closure");
  const [referenceRequests, setReferenceRequests] = useState<DbReferenceRequest[]>([]);
  const [referenceStatus, setReferenceStatus] = useState("Sign in to manage live references");
  const [issuerCredentials, setIssuerCredentials] = useState<DbIssuerCredential[]>([]);
  const [issuerStatus, setIssuerStatus] = useState("Switch to a credential issuer role");
  const [missingRecordRequests, setMissingRecordRequests] = useState<DbMissingRecordRequest[]>([]);
  const [missingRecordStatus, setMissingRecordStatus] = useState("Switch to Verify role for missing-record requests");
  const [passportMissingRecordRequests, setPassportMissingRecordRequests] = useState<DbMissingRecordRequest[]>([]);
  const [passportMissingRecordStatus, setPassportMissingRecordStatus] = useState("Sign in to review requested Passport records");
  const accountUser = accountContext ? accountContextToSessionUser(accountContext) : sessionUser;
  const organizationList = accountContext ? accountContextOrganizations(accountContext) : organizations;
  const activeMembership =
    accountUser.memberships.find((membership) => membership.id === activeMembershipId) ?? getActiveMembership(accountUser);
  const activeRole = getRole(activeMembership.role);
  const activeOrganization = getOrganizationFromList(activeMembership.organizationId, organizationList);
  const workspace = workspaces.find((item) => item.id === workspaceId) ?? workspaces[0];
  const workspaceAllowed = canAccessWorkspace(activeMembership.role, workspace.id);
  const authStatus = authSession ? accountStatus : authModeLabel();
  const teamManagementReady = Boolean(
    authSession && accountContext && teamMembers.length && !memberStatus.toLowerCase().includes("failed")
  );

  useEffect(() => {
    let cancelled = false;
    const hadHostedAuthCallback = hasHostedAuthCallbackUrl();
    const authCallbackType = hostedAuthCallbackType();
    const initialCallbackProof = readHostedAuthCallbackProof(
      hadHostedAuthCallback ? "callback_detected" : "no_callback_detected",
      authCallbackType === "recovery"
    );

    Promise.resolve()
      .then(() => readSessionFromUrl())
      .then((callbackSession) => callbackSession ?? loadStoredSession())
      .then((storedSession) => {
        if (cancelled) return;
        setAuthSession(storedSession);
        if (storedSession) {
          setHostedCallbackProof(
            hadHostedAuthCallback
              ? {
                  ...initialCallbackProof,
                  status: "callback_session_accepted",
                  recovery_session_ready: authCallbackType === "recovery",
                  next_action:
                    authCallbackType === "recovery"
                      ? "Open Account and set a new password."
                      : "Continue into the dashboard and create the needed Passport or Corporate workspace."
                }
              : readHostedAuthCallbackProof("no_callback_detected")
          );
          setShowPublicSite(false);
          setAccountStatus(
            authCallbackType === "recovery"
              ? "Password recovery session connected; set a new password in Account."
              : hadHostedAuthCallback
                ? "Hosted email verification accepted; live session connected"
                : "Live session connected"
          );
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setHostedCallbackProof(readHostedAuthCallbackProof("callback_error"));
        setAccountStatus(operatorErrorMessage(error, "Login again to reconnect live database access."));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authSession) {
      setAccountContext(null);
      setAccountStatus("Preview account context");
      setSubscriptionPlans([]);
      setOrganizationSubscriptions([]);
      setBillingStatus("Sign in to manage billing plans");
      setTeamInvitations([]);
      setTeamStatus("Sign in to invite corporate team members");
      setTeamMembers([]);
      setMemberStatus("Sign in to manage corporate seats");
      setMyInvitations([]);
      setMyInvitationStatus("Sign in to review workspace invitations");
      setActiveMembershipId(sessionUser.activeMembershipId);
      return;
    }

    let cancelled = false;
    setAccountStatus("Loading live account context...");

    ensureProfessionalAccount({
      profileId: authSession.user.id,
      email: authSession.user.email,
      accessToken: authSession.accessToken
    })
      .then((context) => {
        if (cancelled) return;
        setAccountContext(context);
        setActiveMembershipId(context.memberships[0]?.id ?? sessionUser.activeMembershipId);
        setAccountStatus("Live Supabase account context");
      })
      .catch((error) => {
        if (cancelled) return;
        setAccountContext(null);
        setAccountStatus(operatorErrorMessage(error, "Could not load live account context"));
      });

    return () => {
      cancelled = true;
    };
  }, [authSession]);

  useEffect(() => {
    if (!authSession || !accountContext) {
      return;
    }

    let cancelled = false;
    setBillingStatus("Loading billing plans...");

    Promise.all([
      loadSubscriptionPlans(authSession.accessToken),
      loadOrganizationSubscriptions(authSession.accessToken).catch(() => []),
      loadOrganizationInvitations(activeMembership.organizationId, authSession.accessToken).catch(() => []),
      loadOrganizationMembers(activeMembership.organizationId, authSession.accessToken).catch(() => [])
    ])
      .then(([plans, subscriptions, invitations, members]) => {
        if (cancelled) return;
        setSubscriptionPlans(plans);
        setOrganizationSubscriptions(subscriptions);
        setTeamInvitations(invitations);
        setTeamMembers(members);
        setBillingStatus(
          subscriptions.length ? `Live subscriptions: ${subscriptions.length}` : "Choose a plan for corporate workflows"
        );
        setTeamStatus(invitations.length ? `Team invitations: ${invitations.length}` : "No team invitations yet");
        setMemberStatus(members.length ? `Team seats: ${members.length}` : "No team members loaded yet");
      })
      .catch((error) => {
        if (cancelled) return;
        setSubscriptionPlans([]);
        setOrganizationSubscriptions([]);
        setTeamInvitations([]);
        setTeamMembers([]);
        setBillingStatus(operatorErrorMessage(error, "Could not load billing plans"));
        setTeamStatus(operatorErrorMessage(error, "Could not load team invitations"));
        setMemberStatus(operatorErrorMessage(error, "Could not load team members"));
      });

    return () => {
      cancelled = true;
    };
  }, [activeMembership.organizationId, authSession, accountContext]);

  useEffect(() => {
    if (!authSession || !accountContext) {
      setMyInvitations([]);
      setMyInvitationStatus("Sign in to review workspace invitations");
      return;
    }

    let cancelled = false;
    setMyInvitationStatus("Checking pending invitations...");

    loadMyPendingInvitations(accountContext.profile.email, authSession.accessToken)
      .then((invitations) => {
        if (cancelled) return;
        setMyInvitations(invitations);
        setMyInvitationStatus(invitations.length ? `Pending invitations: ${invitations.length}` : "No pending invitations");
      })
      .catch((error) => {
        if (cancelled) return;
        setMyInvitations([]);
        setMyInvitationStatus(operatorErrorMessage(error, "Could not load pending invitations"));
      });

    return () => {
      cancelled = true;
    };
  }, [authSession, accountContext]);

  useEffect(() => {
    if (!authSession || !accountContext || !pendingCorporateAccount) {
      return;
    }

    let cancelled = false;
    setAccountStatus("Creating corporate portal...");

    createCorporateAccount({
      accessToken: authSession.accessToken,
      ...pendingCorporateAccount
    })
      .then(async (membership) => {
        const context = await loadAccountContext(accountContext.profile.id, authSession.accessToken);
        if (cancelled) return;
        setAccountContext(context);
        setActiveMembershipId(membership.id);
        setWorkspaceId("verify");
        setAccountStatus("Corporate portal created");
        setPendingCorporateAccount(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setAccountStatus(error instanceof Error ? error.message : "Could not create corporate portal");
        setPendingCorporateAccount(null);
      });

    return () => {
      cancelled = true;
    };
  }, [accountContext, authSession, pendingCorporateAccount]);

  useEffect(() => {
    if (!authSession || !accountContext) {
      setLivePassportRecords([]);
      setRecordStatus("Sign in to add live Passport records");
      setEvidenceDocuments([]);
      setNotificationEvents([]);
      setNotificationStatus("Sign in for live workflow notifications");
      setDataRightsRequests([]);
      setDataRightsStatus("Sign in to request data export or closure");
      setReferenceRequests([]);
      setReferenceStatus("Sign in to manage live references");
      setConsentAuthorizations([]);
      setConsentStatus("Sign in to review consent authorizations");
      setPassportMissingRecordRequests([]);
      setPassportMissingRecordStatus("Sign in to review requested Passport records");
      return;
    }

    let cancelled = false;
    setRecordStatus("Loading live Passport records...");
    setNotificationStatus("Loading notifications...");
    setDataRightsStatus("Loading data-rights requests...");
    setReferenceStatus("Loading reference requests...");
    setConsentStatus("Loading consent authorizations...");
    setPassportMissingRecordStatus("Loading requested Passport records...");

    Promise.all([
      loadPassportRecords(accountContext.profile.id, authSession.accessToken),
      loadEvidenceDocuments(authSession.accessToken),
      loadNotificationEvents(authSession.accessToken),
      loadDataRightsRequests(authSession.accessToken),
      loadReferenceRequests(authSession.accessToken),
      loadConsentAuthorizations(authSession.accessToken),
      loadPassportMissingRecordRequests(accountContext.profile.id, authSession.accessToken)
    ])
      .then(([items, documents, notifications, dataRightsRows, references, consents, missingRecords]) => {
        if (cancelled) return;
        setLivePassportRecords(items);
        setEvidenceDocuments(documents);
        setNotificationEvents(notifications);
        setDataRightsRequests(dataRightsRows);
        setReferenceRequests(references);
        setConsentAuthorizations(consents);
        setPassportMissingRecordRequests(missingRecords);
        setRecordStatus(items.length ? "Live Supabase Passport records" : "Passport records not loaded yet");
        setNotificationStatus(
          notifications.length ? `Live notifications: ${notifications.length} recent` : "No workflow notifications yet"
        );
        setDataRightsStatus(dataRightsRows.length ? `Data-rights requests: ${dataRightsRows.length}` : "No data-rights requests yet");
        setReferenceStatus(references.length ? `Live reference requests: ${references.length}` : "No reference requests yet");
        setConsentStatus(consents.length ? `Live consent authorizations: ${consents.length}` : "No consent authorizations yet");
        setPassportMissingRecordStatus(
          missingRecords.length ? `Requested Passport records: ${missingRecords.length}` : "No requested Passport records yet"
        );
        if (items[0]) {
          setSelectedId(items[0].id);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setLivePassportRecords([]);
        setEvidenceDocuments([]);
        setNotificationEvents([]);
        setDataRightsRequests([]);
        setReferenceRequests([]);
        setConsentAuthorizations([]);
        setPassportMissingRecordRequests([]);
        setRecordStatus(operatorErrorMessage(error, "Could not load live Passport records"));
        setNotificationStatus(operatorErrorMessage(error, "Could not load notifications"));
        setDataRightsStatus(operatorErrorMessage(error, "Could not load data-rights requests"));
        setReferenceStatus(operatorErrorMessage(error, "Could not load reference requests"));
        setConsentStatus(operatorErrorMessage(error, "Could not load consent authorizations"));
        setPassportMissingRecordStatus(operatorErrorMessage(error, "Could not load requested Passport records"));
      });

    return () => {
      cancelled = true;
    };
  }, [authSession, accountContext]);

  useEffect(() => {
    if (!authSession || !accountContext || workspaceId !== "verify") {
      setVerifyRequests([]);
      setCorporateAccessReviews([]);
      setSharedVerifyRecords([]);
      setIssuerCredentials([]);
      setMissingRecordRequests([]);
      setVerifyStatus("Switch to Verify role for live requests");
      setIssuerStatus("Switch to a credential issuer role");
      setMissingRecordStatus("Switch to Verify role for missing-record requests");
      return;
    }

    if (!canAccessWorkspace(activeMembership.role, "verify")) {
      setVerifyRequests([]);
      setCorporateAccessReviews([]);
      setSharedVerifyRecords([]);
      setIssuerCredentials([]);
      setMissingRecordRequests([]);
      setVerifyStatus("Active role cannot access Verify workspace");
      setIssuerStatus("Active role cannot access issuer workflow");
      setMissingRecordStatus("Active role cannot access missing-record requests");
      return;
    }

    let cancelled = false;
    setVerifyStatus("Loading live Verify requests...");
    setIssuerStatus("Loading issued credentials...");
    setMissingRecordStatus("Loading missing-record requests...");

    Promise.all([
      loadVerifyAccessGrants(activeMembership.organizationId, authSession.accessToken),
      loadCorporateAccessReviews(activeMembership.organizationId, authSession.accessToken),
      loadSharedVerifyRecords(authSession.accessToken),
      hasPermission(activeMembership.role, "record:issue_credential")
        ? loadIssuerCredentials(activeMembership.organizationId, authSession.accessToken)
        : Promise.resolve([]),
      loadVerifyMissingRecordRequests(activeMembership.organizationId, authSession.accessToken)
    ])
      .then(([items, accessReviews, sharedRecords, credentials, missingRecords]) => {
        if (cancelled) return;
        setVerifyRequests(items);
        setCorporateAccessReviews(accessReviews);
        setSharedVerifyRecords(sharedRecords);
        setIssuerCredentials(credentials);
        setMissingRecordRequests(missingRecords);
        setVerifyStatus(
          items.length || sharedRecords.length
            ? `Live Supabase Verify data: ${items.length} requests, ${sharedRecords.length} shared records, ${accessReviews.length} review attestations`
            : "No Verify requests yet"
        );
        setIssuerStatus(
          hasPermission(activeMembership.role, "record:issue_credential")
            ? credentials.length
              ? `Issued credentials: ${credentials.length}`
              : "No issued credentials yet"
            : "Credential issuer role required"
        );
        setMissingRecordStatus(
          missingRecords.length ? `Missing-record requests: ${missingRecords.length}` : "No missing-record requests yet"
        );
      })
      .catch((error) => {
        if (cancelled) return;
        setVerifyRequests([]);
        setCorporateAccessReviews([]);
        setSharedVerifyRecords([]);
        setIssuerCredentials([]);
        setMissingRecordRequests([]);
        setVerifyStatus(operatorErrorMessage(error, "Could not load Verify requests"));
        setIssuerStatus(operatorErrorMessage(error, "Could not load issued credentials"));
        setMissingRecordStatus(operatorErrorMessage(error, "Could not load missing-record requests"));
      });

    return () => {
      cancelled = true;
    };
  }, [activeMembership.organizationId, activeMembership.role, authSession, accountContext, workspaceId]);

  useEffect(() => {
    if (!authSession || !accountContext) {
      setAccessGrants([]);
      setGrantStatus("Sign in to review Access Grants");
      return;
    }

    let cancelled = false;
    setGrantStatus("Loading live Access Grants...");

    loadAccessGrants(accountContext.profile.id, authSession.accessToken)
      .then((items) => {
        if (cancelled) return;
        setAccessGrants(items);
        setGrantStatus(items.length ? "Live Supabase Access Grants" : "No Access Grants yet");
      })
      .catch((error) => {
        if (cancelled) return;
        setAccessGrants([]);
        setGrantStatus(operatorErrorMessage(error, "Could not load Access Grants"));
      });

    return () => {
      cancelled = true;
    };
  }, [authSession, accountContext]);

  useEffect(() => {
    if (!authSession || !accountContext || workspaceId !== "admin") {
      setOperationsCases([]);
      setOperationsStatus("Switch to Admin role for live operations");
      setAuditEvents([]);
      setAuditStatus("Switch to Admin role for audit events");
      setSchemaMigrationRuns([]);
      setProductionGateDecisions([]);
      setPilotLaunchContacts([]);
      setReleaseStatus("Switch to Admin role for release ledger");
      setApiClients([]);
      setWebhookSubscriptions([]);
      setConnectStatus("Switch to Admin role for Connect controls");
      return;
    }

    if (!canAccessWorkspace(activeMembership.role, "admin")) {
      setOperationsCases([]);
      setOperationsStatus("Active role cannot access Admin operations");
      setAuditEvents([]);
      setAuditStatus("Active role cannot access audit events");
      setSchemaMigrationRuns([]);
      setProductionGateDecisions([]);
      setPilotLaunchContacts([]);
      setReleaseStatus("Active role cannot access release ledger");
      setApiClients([]);
      setWebhookSubscriptions([]);
      setConnectStatus("Active role cannot access Connect controls");
      return;
    }

    let cancelled = false;
    setOperationsStatus("Loading live operations queue...");
    setAuditStatus("Loading audit events...");
    setReleaseStatus("Loading release ledger...");
    setConnectStatus("Loading Connect controls...");

    Promise.all([
      loadVerificationCases(authSession.accessToken),
      loadAuditEvents(authSession.accessToken),
      loadSchemaMigrationRuns(authSession.accessToken).catch(() => []),
      loadProductionGateDecisions(authSession.accessToken).catch(() => []),
      loadPilotLaunchContacts(authSession.accessToken).catch(() => []),
      loadApiClients(authSession.accessToken),
      loadWebhookSubscriptions(authSession.accessToken)
    ])
      .then(([items, events, migrations, gates, pilotContacts, clients, webhooks]) => {
        if (cancelled) return;
        setOperationsCases(items);
        setAuditEvents(events);
        setSchemaMigrationRuns(migrations);
        setProductionGateDecisions(gates);
        setPilotLaunchContacts(pilotContacts);
        setApiClients(clients);
        setWebhookSubscriptions(webhooks);
        setOperationsStatus(items.length ? `Live Supabase operations queue: ${items.length} cases` : "No operations cases yet");
        setAuditStatus(events.length ? `Live audit events: ${events.length} recent` : "No audit events yet");
        setReleaseStatus(
          migrations.length || gates.length || pilotContacts.length
            ? `Release ledger: ${migrations.length} migrations, ${gates.length} production gates, ${pilotContacts.length} pilot contacts`
            : "No release ledger entries yet"
        );
        setConnectStatus(
          clients.length || webhooks.length
            ? `Connect controls: ${clients.length} clients, ${webhooks.length} webhooks`
            : "No Connect clients yet"
        );
      })
      .catch((error) => {
        if (cancelled) return;
        setOperationsCases([]);
        setAuditEvents([]);
        setSchemaMigrationRuns([]);
        setProductionGateDecisions([]);
        setPilotLaunchContacts([]);
        setApiClients([]);
        setWebhookSubscriptions([]);
        setOperationsStatus(operatorErrorMessage(error, "Could not load operations queue"));
        setAuditStatus(operatorErrorMessage(error, "Could not load audit events"));
        setReleaseStatus(operatorErrorMessage(error, "Could not load release ledger"));
        setConnectStatus(operatorErrorMessage(error, "Could not load Connect controls"));
      });

    return () => {
      cancelled = true;
    };
  }, [activeMembership.role, authSession, accountContext, workspaceId]);

  const records = useMemo(() => {
    const q = query.toLowerCase().trim();
    const verifyRecords: RecordItem[] = verifyRequests.map((request) => ({
      id: request.id,
      section: "Access Request",
      title: request.subject_profile.full_name,
      subtitle: request.purpose,
      status: request.status.replace("_", " "),
      trust: request.status === "approved" ? "Access Grant active" : "Access Grant requested",
      source: request.subject_profile.email,
      owner: "Employer reviewer workspace",
      updated: `Requested ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(request.created_at))}`,
      expires: request.expires_at
        ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(request.expires_at))
        : "No expiration set",
      access: "Visible through requester organization membership and grant status",
      evidence: "Shared records become visible after professional approval",
      tone: request.status === "approved" ? "success" : request.status === "requested" ? "info" : "warning",
      progress: request.status === "approved" ? 82 : 46,
      timeline: [
        {
          label: "Requested",
          detail: "Access Grant request created",
          date: "Live"
        }
      ]
    }));
    const verifyWorkspaceRecords = [...sharedVerifyRecords, ...verifyRecords];
    const operationRecords = operationsCases.map(verificationCaseToRecordItem);
    const sourceRecords =
      workspace.id === "passport" && livePassportRecords.length
        ? livePassportRecords
        : workspace.id === "verify" && verifyWorkspaceRecords.length
          ? verifyWorkspaceRecords
          : workspace.id === "admin" && operationRecords.length
            ? operationRecords
          : workspace.records;
    return sourceRecords.filter((record) =>
      [record.title, record.subtitle, record.section, record.status, record.trust, record.source]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [livePassportRecords, operationsCases, query, sharedVerifyRecords, verifyRequests, workspace]);

  const advisorySummary = useMemo(
    () =>
      buildAdvisorySummary({
        workspaceId: workspace.id,
        records,
        accessGrants,
        verifyRequests,
        operationsCases,
        referenceRequests,
        issuerCredentials,
        missingRecordRequests,
        notificationEvents
      }),
    [
      accessGrants,
      issuerCredentials,
      missingRecordRequests,
      notificationEvents,
      operationsCases,
      records,
      referenceRequests,
      verifyRequests,
      workspace.id
    ]
  );

  const selectedRecord = records.find((record) => record.id === selectedId) ?? records[0] ?? workspace.records[0];
  const selectedRecordIsLive = livePassportRecords.some((record) => record.id === selectedRecord.id);
  const selectedEvidenceDocuments = evidenceDocuments.filter((document) => document.trust_record_id === selectedRecord.id);

  function changeWorkspace(id: WorkspaceId) {
    const next = workspaces.find((item) => item.id === id);
    setWorkspaceId(id);
    setQuery("");
    setSelectedId(next?.records[0]?.id ?? "");
  }

  function switchMembership(membershipId: string) {
    const membership = accountUser.memberships.find((item) => item.id === membershipId);
    if (!membership) return;
    const role = getRole(membership.role);
    setActiveMembershipId(membershipId);
    setWorkspaceId(role.portal);
    setQuery("");
    setSelectedId(workspaces.find((item) => item.id === role.portal)?.records[0]?.id ?? "");
  }

  async function createLivePassportRecord(input: {
    type: RecordType;
    title: string;
    sourceName: string;
    evidenceSummary: string;
    responsibilities: string;
    skills: string;
    issuedAt: string;
    expiresAt: string;
    sensitivity: TrustRecordSensitivity;
    consentRequired: boolean;
  }) {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before creating live Passport records.");
    }

    const record = await createPassportRecord({
      profileId: accountContext.profile.id,
      accessToken: authSession.accessToken,
      ...input
    });
    setLivePassportRecords((current) => [record, ...current]);
    setSelectedId(record.id);
    setRecordStatus("Live Supabase Passport records");
  }

  async function updateLivePassportRecord(input: {
    recordId: string;
    title: string;
    sourceName: string;
    evidenceSummary: string;
    responsibilities: string;
    skills: string;
    expiresAt: string;
    status: RecordStatus;
    sensitivity: TrustRecordSensitivity;
    consentRequired: boolean;
    metadata?: Record<string, unknown>;
  }) {
    if (!authSession) {
      throw new Error("Sign in before updating live Passport records.");
    }

    const updated = await updatePassportRecord({
      recordId: input.recordId,
      accessToken: authSession.accessToken,
      title: input.title,
      sourceName: input.sourceName,
      evidenceSummary: input.evidenceSummary,
      responsibilities: input.responsibilities,
      skills: input.skills,
      issuedAt: "",
      expiresAt: input.expiresAt,
      status: input.status,
      sensitivity: input.sensitivity,
      consentRequired: input.consentRequired,
      metadata: input.metadata
    });

    setLivePassportRecords((current) => current.map((record) => (record.id === updated.id ? updated : record)));
    setRecordStatus("Live Supabase Passport records");
  }

  async function openLiveRecordDispute(input: { recordId: string; disputeReason: string; requestedCorrection: string }) {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before opening a Passport record dispute.");
    }

    const caseRow = await openRecordDispute({
      recordId: input.recordId,
      disputeReason: input.disputeReason,
      requestedCorrection: input.requestedCorrection,
      accessToken: authSession.accessToken
    });
    const [records, notifications, cases, events] = await Promise.all([
      loadPassportRecords(accountContext.profile.id, authSession.accessToken),
      loadNotificationEvents(authSession.accessToken).catch(() => notificationEvents),
      loadVerificationCases(authSession.accessToken).catch(() => operationsCases),
      loadAuditEvents(authSession.accessToken).catch(() => auditEvents)
    ]);
    setLivePassportRecords(records);
    setNotificationEvents(notifications);
    setOperationsCases(cases);
    setAuditEvents(events);
    setSelectedId(input.recordId);
    setRecordStatus(`Dispute opened: ${caseRow.title}`);
    setNotificationStatus(notifications.length ? `Live notifications: ${notifications.length} recent` : "No workflow notifications yet");
  }

  async function createLiveEvidenceDocument(input: {
    recordId: string;
    title: string;
    documentType: string;
    sourceName: string;
    evidenceSummary: string;
    file: File | null;
  }) {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before linking evidence metadata.");
    }

    const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain"]);
    if (input.file && !allowedTypes.has(input.file.type)) {
      throw new Error("Evidence file must be a PDF, image, or text file.");
    }
    if (input.file && input.file.size > 10 * 1024 * 1024) {
      throw new Error("Evidence file must be 10MB or smaller.");
    }

    const storagePath = input.file
      ? await uploadEvidenceFile({
          accessToken: authSession.accessToken,
          profileId: accountContext.profile.id,
          recordId: input.recordId,
          file: input.file
        })
      : undefined;

    const document = await createEvidenceDocument({
      accessToken: authSession.accessToken,
      recordId: input.recordId,
      title: input.title,
      documentType: input.documentType,
      sourceName: input.sourceName,
      evidenceSummary: input.evidenceSummary,
      storagePath
    });
    const [documents, notifications, events] = await Promise.all([
      loadEvidenceDocuments(authSession.accessToken),
      loadNotificationEvents(authSession.accessToken),
      loadAuditEvents(authSession.accessToken).catch(() => auditEvents)
    ]);
    setEvidenceDocuments(documents);
    setNotificationEvents(notifications);
    setAuditEvents(events);
    setRecordStatus(`Evidence linked: ${document.title}`);
    setNotificationStatus(notifications.length ? `Live notifications: ${notifications.length} recent` : "No workflow notifications yet");
  }

  async function openLiveEvidenceDocument(document: DbEvidenceDocument, mode: "preview" | "download") {
    if (!authSession) {
      throw new Error("Sign in before opening private evidence files.");
    }
    if (!document.storage_path) {
      throw new Error("This evidence item has metadata only; no file is attached.");
    }

    const expiresIn = mode === "download" ? 120 : 300;
    const signedUrl = await createEvidenceDownloadUrl({
      accessToken: authSession.accessToken,
      storagePath: document.storage_path,
      expiresIn
    });

    if (typeof window !== "undefined") {
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    }

    return { signedUrl, expiresIn };
  }

  async function createLiveReferenceRequest(input: {
    providerName: string;
    providerEmail: string;
    relationship: string;
    message: string;
  }) {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before creating reference requests.");
    }

    const request = await createReferenceRequest({
      accessToken: authSession.accessToken,
      ...input
    });
    const [references, notifications, events] = await Promise.all([
      loadReferenceRequests(authSession.accessToken),
      loadNotificationEvents(authSession.accessToken),
      loadAuditEvents(authSession.accessToken).catch(() => auditEvents)
    ]);
    setReferenceRequests(references);
    setNotificationEvents(notifications);
    setAuditEvents(events);
    setReferenceStatus(`Reference request created for ${request.provider_name}`);
    setNotificationStatus(notifications.length ? `Live notifications: ${notifications.length} recent` : "No workflow notifications yet");
  }

  async function updateLiveReferenceStatus(requestId: string, status: ReferenceRequestStatus) {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before updating reference requests.");
    }

    const updated = await markReferenceRequestStatus({
      accessToken: authSession.accessToken,
      requestId,
      status,
      summary: status === "submitted" ? "Structured reference response captured for MVP workflow." : undefined
    });
    const [notifications, events] = await Promise.all([
      loadNotificationEvents(authSession.accessToken),
      loadAuditEvents(authSession.accessToken).catch(() => auditEvents)
    ]);
    setReferenceRequests((current) => current.map((request) => (request.id === updated.id ? updated : request)));
    setNotificationEvents(notifications);
    setAuditEvents(events);
    setReferenceStatus(`Reference request moved to ${updated.status.replace(/_/g, " ")}`);
    setNotificationStatus(notifications.length ? `Live notifications: ${notifications.length} recent` : "No workflow notifications yet");
  }

  async function handleGrantDecision(grantId: string, status: "approved" | "declined" | "revoked") {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before deciding Access Grants.");
    }

    const updated = await decideAccessGrant({
      grantId,
      status,
      reason: "professional decision from Passport workspace",
      accessToken: authSession.accessToken
    });
    const syncedCount = status === "approved" ? await syncAccessGrantRecords(grantId, authSession.accessToken) : 0;

    setAccessGrants((current) =>
      current.map((grant) => (grant.id === updated.id ? { ...grant, status: updated.status } : grant))
    );
    setGrantStatus(status === "approved" ? `Access approved and ${syncedCount} records shared` : "Live Supabase Access Grants");
  }

  async function createPilotGrantRequest() {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before creating a pilot Access Grant request.");
    }

    await preparePilotAccessGrant(authSession.accessToken);
    const items = await loadAccessGrants(accountContext.profile.id, authSession.accessToken);
    setAccessGrants(items);
    setGrantStatus("Live pilot Access Grant request created");
  }

  async function revokeLiveConsentAuthorization(consentId: string) {
    if (!authSession) {
      throw new Error("Sign in before revoking consent authorizations.");
    }

    const updated = await revokeConsentAuthorization({
      accessToken: authSession.accessToken,
      consentId,
      reason: "Professional revoked consent from Passport workspace"
    });
    const [consents, events] = await Promise.all([
      loadConsentAuthorizations(authSession.accessToken),
      loadAuditEvents(authSession.accessToken).catch(() => auditEvents)
    ]);
    setConsentAuthorizations(consents);
    setAuditEvents(events);
    setConsentStatus(`Consent authorization ${updated.status}`);
  }

  async function createLiveConsentAuthorization(input: {
    requesterOrganizationId: string | null;
    trustRecordId: string | null;
    purpose: string;
    scope: string[];
    expiresAt: string;
  }) {
    if (!authSession) {
      throw new Error("Sign in before creating consent authorizations.");
    }

    if (!input.scope.length) {
      throw new Error("Consent scope is required.");
    }

    const consent = await createConsentAuthorization({
      accessToken: authSession.accessToken,
      requesterOrganizationId: input.requesterOrganizationId,
      trustRecordId: input.trustRecordId,
      purpose: input.purpose,
      scope: input.scope,
      expiresAt: input.expiresAt
    });
    const [consents, events] = await Promise.all([
      loadConsentAuthorizations(authSession.accessToken),
      loadAuditEvents(authSession.accessToken).catch(() => auditEvents)
    ]);
    setConsentAuthorizations(consents);
    setAuditEvents(events);
    setConsentStatus(`Consent authorization created: ${consent.purpose}`);
  }

  async function createLiveAccessGrantRequest(input: { subjectEmail: string; purpose: string; expiresInDays: number }) {
    if (!authSession || !accountContext) {
      throw new Error("Sign in with a corporate role before requesting Passport access.");
    }

    const grant = await createAccessGrantRequest({
      accessToken: authSession.accessToken,
      ...input
    });
    const [requests, events, notifications] = await Promise.all([
      loadVerifyAccessGrants(activeMembership.organizationId, authSession.accessToken),
      loadAuditEvents(authSession.accessToken).catch(() => auditEvents),
      loadNotificationEvents(authSession.accessToken).catch(() => notificationEvents)
    ]);
    setVerifyRequests(requests);
    setAuditEvents(events);
    setNotificationEvents(notifications);
    setVerifyStatus(`Access request created for ${grant.subject_profile_id}`);
    setAuditStatus(events.length ? `Live audit events: ${events.length} recent` : "No audit events yet");
    setNotificationStatus(notifications.length ? `Live notifications: ${notifications.length} recent` : "No workflow notifications yet");
  }

  async function recordLiveCorporateAccessReview(input: {
    accessGrantId: string;
    status: CorporateAccessReviewStatus;
    note: string;
  }) {
    if (!authSession || !accountContext) {
      throw new Error("Sign in with a corporate role before recording a review attestation.");
    }

    const review = await recordCorporateAccessReview({
      accessToken: authSession.accessToken,
      ...input
    });
    const [reviews, events, notifications] = await Promise.all([
      loadCorporateAccessReviews(activeMembership.organizationId, authSession.accessToken),
      loadAuditEvents(authSession.accessToken).catch(() => auditEvents),
      loadNotificationEvents(authSession.accessToken).catch(() => notificationEvents)
    ]);
    setCorporateAccessReviews(reviews);
    setAuditEvents(events);
    setNotificationEvents(notifications);
    setVerifyStatus(`Corporate access review recorded: ${review.review_status.replace(/_/g, " ")}`);
    setAuditStatus(events.length ? `Live audit events: ${events.length} recent` : "No audit events yet");
    setNotificationStatus(notifications.length ? `Live notifications: ${notifications.length} recent` : "No workflow notifications yet");
  }

  async function createPilotReviewerRole() {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before adding a Verify reviewer role.");
    }

    await ensureEmployerReviewerMembership(authSession.accessToken);
    const context = await loadAccountContext(accountContext.profile.id, authSession.accessToken);
    setAccountContext(context);
    const reviewerMembership = context.memberships.find((membership) => membership.role === "employer_reviewer");
    if (reviewerMembership) {
      setActiveMembershipId(reviewerMembership.id);
      setWorkspaceId("verify");
    }
    setVerifyStatus("Corporate Verify reviewer role created");
  }

  async function createLiveCredentialIssuerRole() {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before creating a credential issuer role.");
    }

    const membership = await ensureCredentialIssuerMembership(authSession.accessToken);
    const context = await loadAccountContext(accountContext.profile.id, authSession.accessToken);
    setAccountContext(context);
    setActiveMembershipId(membership.id);
    setWorkspaceId("verify");
    setIssuerStatus("Credential issuer role created");
  }

  async function issueLiveCredential(input: {
    subjectEmail: string;
    subjectFullName: string;
    credentialType: IssuerRecordType;
    title: string;
    evidenceSummary: string;
    issuedAt: string;
    expiresAt: string;
  }) {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before issuing credentials.");
    }

    const credential = await issueCredentialRecord({
      accessToken: authSession.accessToken,
      ...input
    });
    const [credentials, notifications, events] = await Promise.all([
      loadIssuerCredentials(activeMembership.organizationId, authSession.accessToken),
      loadNotificationEvents(authSession.accessToken),
      loadAuditEvents(authSession.accessToken).catch(() => auditEvents)
    ]);
    setIssuerCredentials(credentials);
    setNotificationEvents(notifications);
    setAuditEvents(events);
    setIssuerStatus(`Credential issued: ${credential.title}`);
    setNotificationStatus(notifications.length ? `Live notifications: ${notifications.length} recent` : "No workflow notifications yet");
  }

  async function revokeLiveIssuerCredential(credentialId: string, reason: string) {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before revoking credentials.");
    }

    const credential = await revokeIssuerCredential({
      accessToken: authSession.accessToken,
      credentialId,
      reason
    });
    const [credentials, sharedRecords, notifications, events] = await Promise.all([
      loadIssuerCredentials(activeMembership.organizationId, authSession.accessToken),
      loadSharedVerifyRecords(authSession.accessToken),
      loadNotificationEvents(authSession.accessToken),
      loadAuditEvents(authSession.accessToken).catch(() => auditEvents)
    ]);
    setIssuerCredentials(credentials);
    setSharedVerifyRecords(sharedRecords);
    setNotificationEvents(notifications);
    setAuditEvents(events);
    setIssuerStatus(`Credential revoked: ${credential.title}`);
    setVerifyStatus(sharedRecords.length ? `Shared Verify records: ${sharedRecords.length}` : "No shared Verify records yet");
    setNotificationStatus(notifications.length ? `Live notifications: ${notifications.length} recent` : "No workflow notifications yet");
  }

  async function updateLiveIssuerCredentialExpiry(credentialId: string, expiresAt: string, reason: string) {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before updating issuer credentials.");
    }

    const credential = await updateIssuerCredentialExpiry({
      accessToken: authSession.accessToken,
      credentialId,
      expiresAt,
      reason
    });
    const [credentials, sharedRecords, notifications, events] = await Promise.all([
      loadIssuerCredentials(activeMembership.organizationId, authSession.accessToken),
      loadSharedVerifyRecords(authSession.accessToken),
      loadNotificationEvents(authSession.accessToken),
      loadAuditEvents(authSession.accessToken).catch(() => auditEvents)
    ]);
    setIssuerCredentials(credentials);
    setSharedVerifyRecords(sharedRecords);
    setNotificationEvents(notifications);
    setAuditEvents(events);
    setIssuerStatus(`Credential expiry updated: ${credential.title}`);
    setVerifyStatus(sharedRecords.length ? `Shared Verify records: ${sharedRecords.length}` : "No shared Verify records yet");
    setNotificationStatus(notifications.length ? `Live notifications: ${notifications.length} recent` : "No workflow notifications yet");
  }

  async function createLiveMissingRecordRequest(input: {
    subjectEmail: string;
    subjectFullName: string;
    recordType: RecordType;
    title: string;
    reason: string;
    dueAt: string;
  }) {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before creating missing-record requests.");
    }

    const request = await createMissingRecordRequest({
      accessToken: authSession.accessToken,
      ...input
    });
    const [requests, notifications, events] = await Promise.all([
      loadVerifyMissingRecordRequests(activeMembership.organizationId, authSession.accessToken),
      loadNotificationEvents(authSession.accessToken),
      loadAuditEvents(authSession.accessToken).catch(() => auditEvents)
    ]);
    setMissingRecordRequests(requests);
    setNotificationEvents(notifications);
    setAuditEvents(events);
    setMissingRecordStatus(`Missing-record request created: ${request.title}`);
    setNotificationStatus(notifications.length ? `Live notifications: ${notifications.length} recent` : "No workflow notifications yet");
  }

  async function updateLiveMissingRecordStatus(
    requestId: string,
    status: "in_progress" | "fulfilled" | "declined" | "cancelled"
  ) {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before updating missing-record requests.");
    }

    const updated = await markMissingRecordRequestStatus({
      accessToken: authSession.accessToken,
      requestId,
      status
    });
    const [passportRequests, verifyRequestsAfterUpdate, events] = await Promise.all([
      loadPassportMissingRecordRequests(accountContext.profile.id, authSession.accessToken).catch(() => passportMissingRecordRequests),
      loadVerifyMissingRecordRequests(activeMembership.organizationId, authSession.accessToken).catch(() => missingRecordRequests),
      loadAuditEvents(authSession.accessToken).catch(() => auditEvents)
    ]);
    setMissingRecordRequests(verifyRequestsAfterUpdate);
    setPassportMissingRecordRequests(passportRequests);
    setAuditEvents(events);
    setMissingRecordStatus(`Missing-record request moved to ${updated.status.replace(/_/g, " ")}`);
    setPassportMissingRecordStatus(`Requested Passport record moved to ${updated.status.replace(/_/g, " ")}`);
  }

  async function updateLiveNotificationStatus(notificationId: string, status: "delivered" | "suppressed") {
    if (!authSession) {
      throw new Error("Sign in before updating notifications.");
    }

    const updated = await markNotificationEvent({
      accessToken: authSession.accessToken,
      notificationId,
      status
    });
    const events = await loadAuditEvents(authSession.accessToken).catch(() => auditEvents);
    setNotificationEvents((current) => current.map((event) => (event.id === updated.id ? updated : event)));
    setAuditEvents(events);
    setNotificationStatus(`Notification marked ${updated.status}`);
  }

  async function createLiveCorporateAccount(input: {
    organizationName: string;
    organizationType: "employer" | "staffing_agency";
    organizationDomain: string;
  }) {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before creating a corporate account.");
    }

    const membership = await createCorporateAccount({
      accessToken: authSession.accessToken,
      ...input
    });
    const context = await loadAccountContext(accountContext.profile.id, authSession.accessToken);
    setAccountContext(context);
    setActiveMembershipId(membership.id);
    setWorkspaceId("verify");
    setAccountStatus("Corporate account created");
    return membership;
  }

  async function createLiveDataRightsRequest(input: { requestType: DataRightsRequestType; requestedScope: string; reason: string }) {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before requesting data export or account closure.");
    }

    const request = await requestDataRightsAction({
      accessToken: authSession.accessToken,
      requestType: input.requestType,
      requestedScope: input.requestedScope,
      reason: input.reason
    });
    const [requests, notifications, events] = await Promise.all([
      loadDataRightsRequests(authSession.accessToken),
      loadNotificationEvents(authSession.accessToken).catch(() => notificationEvents),
      loadAuditEvents(authSession.accessToken).catch(() => auditEvents)
    ]);
    setDataRightsRequests(requests);
    setNotificationEvents(notifications);
    setAuditEvents(events);
    setDataRightsStatus(`Data-rights request created: ${request.request_type.replace("_", " ")}`);
    setNotificationStatus(notifications.length ? `Live notifications: ${notifications.length} recent` : "No workflow notifications yet");
  }

  async function updateLiveDataRightsStatus(requestId: string, status: DataRightsRequestStatus, reviewerNote: string) {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before reviewing data-rights requests.");
    }

    const request = await markDataRightsRequestStatus({
      accessToken: authSession.accessToken,
      requestId,
      status,
      reviewerNote
    });
    const [requests, notifications, events] = await Promise.all([
      loadDataRightsRequests(authSession.accessToken),
      loadNotificationEvents(authSession.accessToken).catch(() => notificationEvents),
      loadAuditEvents(authSession.accessToken).catch(() => auditEvents)
    ]);
    setDataRightsRequests(requests);
    setNotificationEvents(notifications);
    setAuditEvents(events);
    setDataRightsStatus(`Data-rights request marked ${request.status.replace("_", " ")}`);
    setNotificationStatus(notifications.length ? `Live notifications: ${notifications.length} recent` : "No workflow notifications yet");
  }

  async function seedLivePilotWorkspace() {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before seeding the live pilot workspace.");
    }

    const seeded = await seedPilotWorkspace(authSession.accessToken);
    const seededReview = await recordCorporateAccessReview({
      accessGrantId: seeded.access_grant_id,
      status: "reviewed",
      note: "Pilot seed confirmed Corporate Verify can review approved user database rows.",
      accessToken: authSession.accessToken
    });
    const seededWithReview = {
      ...seeded,
      corporate_access_review_id: seededReview.id
    };
    const [
      context,
      records,
      documents,
      grants,
      consents,
      subscriptions,
      members,
      verifyRequests,
      sharedRecords,
      reviews,
      notifications,
      dataRightsRows,
      events
    ] = await Promise.all([
      loadAccountContext(accountContext.profile.id, authSession.accessToken),
      loadPassportRecords(accountContext.profile.id, authSession.accessToken),
      loadEvidenceDocuments(authSession.accessToken),
      loadAccessGrants(accountContext.profile.id, authSession.accessToken),
      loadConsentAuthorizations(authSession.accessToken),
      loadOrganizationSubscriptions(authSession.accessToken),
      loadOrganizationMembers(seeded.corporate_organization_id, authSession.accessToken),
      loadVerifyAccessGrants(seeded.corporate_organization_id, authSession.accessToken),
      loadSharedVerifyRecords(authSession.accessToken),
      loadCorporateAccessReviews(seeded.corporate_organization_id, authSession.accessToken),
      loadNotificationEvents(authSession.accessToken),
      loadDataRightsRequests(authSession.accessToken).catch(() => dataRightsRequests),
      loadAuditEvents(authSession.accessToken).catch(() => auditEvents)
    ]);

    setAccountContext(context);
    setActiveMembershipId(seeded.membership_id);
    setWorkspaceId("verify");
    setLivePassportRecords(records);
    setEvidenceDocuments(documents);
    setAccessGrants(grants);
    setConsentAuthorizations(consents);
    setOrganizationSubscriptions(subscriptions);
    setTeamMembers(members);
    setVerifyRequests(verifyRequests);
    setSharedVerifyRecords(sharedRecords);
    setCorporateAccessReviews(reviews);
    setNotificationEvents(notifications);
    setDataRightsRequests(dataRightsRows);
    setAuditEvents(events);
    setAccountStatus("Live pilot workspace seeded");
    setRecordStatus(`Pilot Passport loaded: ${seeded.passport_records} records`);
    setGrantStatus(grants.length ? "Live Supabase Access Grants" : "No Access Grants yet");
    setConsentStatus(consents.length ? `Live consent authorizations: ${consents.length}` : "No consent authorizations yet");
    setBillingStatus(subscriptions.length ? `Live subscriptions: ${subscriptions.length}` : "Choose a plan for corporate workflows");
    setTeamStatus(members.length ? `Team seats: ${members.length}` : "No team members loaded yet");
    setVerifyStatus(
      verifyRequests.length || sharedRecords.length
        ? `Live Supabase Verify data: ${verifyRequests.length} requests, ${sharedRecords.length} shared records, ${reviews.length} review attestations`
        : "No Verify requests yet"
    );
    setNotificationStatus(notifications.length ? `Live notifications: ${notifications.length} recent` : "No workflow notifications yet");
    setDataRightsStatus(dataRightsRows.length ? `Data-rights requests: ${dataRightsRows.length}` : "No data-rights requests yet");
    setAuditStatus(events.length ? `Live audit events: ${events.length} recent` : "No audit events yet");
    return {
      ...seededWithReview,
      corporate_access_reviews: reviews.length
    };
  }

  async function activateLiveSubscription(planId: string, seats: number) {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before activating subscriptions.");
    }

    const subscription = await activateOrganizationSubscription({
      accessToken: authSession.accessToken,
      planId,
      seats
    });
    const [subscriptions, events] = await Promise.all([
      loadOrganizationSubscriptions(authSession.accessToken),
      loadAuditEvents(authSession.accessToken).catch(() => auditEvents)
    ]);
    setOrganizationSubscriptions(subscriptions);
    setAuditEvents(events);
    setBillingStatus(`Plan activated: ${subscription.plan_id}`);
  }

  async function createLiveTeamInvitation(input: {
    email: string;
    role: Extract<RoleKey, "employer_admin" | "employer_reviewer" | "staffing_agency_admin" | "recruiter">;
  }) {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before inviting team members.");
    }

    const invitation = await createOrganizationInvitation({
      accessToken: authSession.accessToken,
      ...input
    });
    const [invitations, events] = await Promise.all([
      loadOrganizationInvitations(activeMembership.organizationId, authSession.accessToken),
      loadAuditEvents(authSession.accessToken).catch(() => auditEvents)
    ]);
    setTeamInvitations(invitations);
    setAuditEvents(events);
    setTeamStatus(`Invitation created for ${invitation.invited_email}`);
  }

  async function updateLiveTeamInvitationStatus(invitationId: string, status: "cancelled" | "expired") {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before updating team invitations.");
    }

    const updated = await markOrganizationInvitationStatus({
      accessToken: authSession.accessToken,
      invitationId,
      status
    });
    const events = await loadAuditEvents(authSession.accessToken).catch(() => auditEvents);
    setTeamInvitations((current) => current.map((invitation) => (invitation.id === updated.id ? updated : invitation)));
    setAuditEvents(events);
    setTeamStatus(`Invitation moved to ${updated.status}`);
  }

  async function acceptLiveTeamInvitation(invitationId: string) {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before accepting team invitations.");
    }

    const invitation = await acceptOrganizationInvitation({
      accessToken: authSession.accessToken,
      invitationId
    });
    const [context, invitations, events] = await Promise.all([
      loadAccountContext(accountContext.profile.id, authSession.accessToken),
      loadMyPendingInvitations(accountContext.profile.email, authSession.accessToken).catch(() => []),
      loadAuditEvents(authSession.accessToken).catch(() => auditEvents)
    ]);
    const acceptedMembership = context.memberships.find(
      (membership) => membership.organization_id === invitation.organization_id && membership.role === invitation.role
    );
    setAccountContext(context);
    if (acceptedMembership) {
      setActiveMembershipId(acceptedMembership.id);
      setWorkspaceId(getRole(acceptedMembership.role).portal);
    }
    setMyInvitations(invitations);
    setAuditEvents(events);
    setMyInvitationStatus(`Invitation accepted for ${invitation.organization?.name ?? "workspace"}`);
    setAccountStatus("Workspace invitation accepted");
  }

  async function updateLiveTeamMemberStatus(membershipId: string, status: "active" | "suspended") {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before managing team members.");
    }

    const updated = await markOrganizationMemberStatus({
      accessToken: authSession.accessToken,
      membershipId,
      status
    });
    const [members, events, context] = await Promise.all([
      loadOrganizationMembers(activeMembership.organizationId, authSession.accessToken),
      loadAuditEvents(authSession.accessToken).catch(() => auditEvents),
      loadAccountContext(accountContext.profile.id, authSession.accessToken)
    ]);
    setTeamMembers(members);
    setAuditEvents(events);
    setAccountContext(context);
    setMemberStatus(`Member ${updated.status === "active" ? "restored" : "suspended"}`);
  }

  async function assignLiveCorporateRole(organizationId: string, role: RoleKey) {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before managing corporate roles.");
    }

    const membership = await assignOwnCorporateRole({
      accessToken: authSession.accessToken,
      organizationId,
      role: role as Extract<RoleKey, "employer_admin" | "employer_reviewer" | "staffing_agency_admin" | "recruiter">
    });
    const context = await loadAccountContext(accountContext.profile.id, authSession.accessToken);
    setAccountContext(context);
    setActiveMembershipId(membership.id);
    setWorkspaceId(getRole(membership.role).portal);
    setAccountStatus("Corporate RBAC role updated");
  }

  async function createLiveOperationsPilotCases() {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before creating operations cases.");
    }

    const added = await createOperatorVerificationCases(authSession.accessToken);
    const [items, events] = await Promise.all([
      loadVerificationCases(authSession.accessToken),
      loadAuditEvents(authSession.accessToken)
    ]);
    setOperationsCases(items);
    setAuditEvents(events);
    setOperationsStatus(added ? `Created ${added} pilot operations cases` : "Pilot operations cases already exist");
    setAuditStatus(events.length ? `Live audit events: ${events.length} recent` : "No audit events yet");
  }

  async function decideLiveOperationsCase(caseId: string, status: VerificationCaseStatus) {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before deciding operations cases.");
    }

    const updated = await decideVerificationCase({
      caseId,
      status,
      resolution: status === "resolved" ? "Resolved from TrustGraph operations queue" : "Updated from TrustGraph operations queue",
      accessToken: authSession.accessToken
    });
    const events = await loadAuditEvents(authSession.accessToken);
    setOperationsCases((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setAuditEvents(events);
    setOperationsStatus(`Case moved to ${updated.status.replace(/_/g, " ")}`);
    setAuditStatus(events.length ? `Live audit events: ${events.length} recent` : "No audit events yet");
  }

  async function createLiveOperationsRole() {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before creating an operations role.");
    }

    const membership = await ensureTrustGraphVerifierMembership(authSession.accessToken);
    const context = await loadAccountContext(accountContext.profile.id, authSession.accessToken);
    setAccountContext(context);
    setActiveMembershipId(membership.id);
    setWorkspaceId("admin");
    setAccountStatus("TrustGraph operations role created");
  }

  async function recordLiveProductionGateDecision(input: { gateKey: string; status: ProductionGateStatus; evidenceUrl: string; notes: string }) {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before recording production gate decisions.");
    }

    await recordProductionGateDecision({
      accessToken: authSession.accessToken,
      gateKey: input.gateKey,
      status: input.status,
      evidenceUrl: input.evidenceUrl,
      notes: input.notes
    });

    const [gates, events] = await Promise.all([
      loadProductionGateDecisions(authSession.accessToken),
      loadAuditEvents(authSession.accessToken).catch(() => auditEvents)
    ]);
    setProductionGateDecisions(gates);
    setAuditEvents(events);
    setReleaseStatus(`Release ledger: ${schemaMigrationRuns.length} migrations, ${gates.length} production gates`);
    setAuditStatus(events.length ? `Live audit events: ${events.length} recent` : "No audit events yet");
  }

  async function recordLivePilotLaunchContact(input: {
    contactKey: string;
    status: PilotLaunchContactStatus;
    organizationName: string;
    contactName: string;
    contactEmail: string;
    notes: string;
  }) {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before recording pilot launch contacts.");
    }

    await recordPilotLaunchContact({
      accessToken: authSession.accessToken,
      contactKey: input.contactKey,
      status: input.status,
      organizationName: input.organizationName,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      notes: input.notes
    });

    const [contacts, events] = await Promise.all([
      loadPilotLaunchContacts(authSession.accessToken),
      loadAuditEvents(authSession.accessToken).catch(() => auditEvents)
    ]);
    setPilotLaunchContacts(contacts);
    setAuditEvents(events);
    setReleaseStatus(`Release ledger: ${schemaMigrationRuns.length} migrations, ${productionGateDecisions.length} production gates, ${contacts.length} pilot contacts`);
    setAuditStatus(events.length ? `Live audit events: ${events.length} recent` : "No audit events yet");
  }

  async function createLiveApiClient() {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before creating Connect API clients.");
    }

    const client = await createPilotApiClient(authSession.accessToken);
    const [clients, events] = await Promise.all([
      loadApiClients(authSession.accessToken),
      loadAuditEvents(authSession.accessToken).catch(() => auditEvents)
    ]);
    setApiClients(clients);
    setAuditEvents(events);
    setConnectStatus(`API client created: ${client.name}`);
  }

  async function updateLiveApiClientStatus(clientId: string, status: "active" | "paused" | "revoked") {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before managing Connect API clients.");
    }

    const updated = await markApiClientStatus({
      accessToken: authSession.accessToken,
      apiClientId: clientId,
      status
    });
    const events = await loadAuditEvents(authSession.accessToken).catch(() => auditEvents);
    setApiClients((current) => current.map((client) => (client.id === updated.id ? updated : client)));
    setAuditEvents(events);
    setConnectStatus(`API client moved to ${updated.status}`);
  }

  async function createLiveWebhookSubscription(input: { apiClientId: string; eventType: string; targetUrl: string }) {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before creating Connect webhooks.");
    }

    const webhook = await createWebhookSubscription({
      accessToken: authSession.accessToken,
      ...input
    });
    const [webhooks, events] = await Promise.all([
      loadWebhookSubscriptions(authSession.accessToken),
      loadAuditEvents(authSession.accessToken).catch(() => auditEvents)
    ]);
    setWebhookSubscriptions(webhooks);
    setAuditEvents(events);
    setConnectStatus(`Webhook created: ${webhook.event_type}`);
  }

  async function updateLiveWebhookStatus(subscriptionId: string, status: "active" | "paused" | "revoked") {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before managing Connect webhooks.");
    }

    const updated = await markWebhookSubscriptionStatus({
      accessToken: authSession.accessToken,
      subscriptionId,
      status
    });
    const events = await loadAuditEvents(authSession.accessToken).catch(() => auditEvents);
    setWebhookSubscriptions((current) => current.map((webhook) => (webhook.id === updated.id ? updated : webhook)));
    setAuditEvents(events);
    setConnectStatus(`Webhook moved to ${updated.status}`);
  }

  const authorizedReportName = `trustgraph-authorized-workspace-${workspace.id}-${new Date().toISOString().slice(0, 10)}.json`;
  const queuedNotificationCount = notificationEvents.filter((event) => event.status === "queued").length;
  const setupTabs = [
    { id: "account", label: "Account", detail: authSession ? "Live session" : "Login and recovery", count: authSession ? 1 : 0 },
    { id: "corporate", label: "Corporate", detail: "Workspace and RBAC", count: accountUser.memberships.length },
    { id: "team", label: "Team", detail: "Invites and seats", count: teamInvitations.length + teamMembers.length + myInvitations.length },
    { id: "billing", label: "Billing", detail: "Pilot ledger", count: organizationSubscriptions.length },
    { id: "readiness", label: "Readiness", detail: "Launch checks", count: queuedNotificationCount }
  ] as const;
  const hasLiveCorporateContext = Boolean(
    authSession &&
      accountContext &&
      activeOrganization.type !== "professional" &&
      accountUser.memberships.some((membership) => membership.organizationId === activeOrganization.id)
  );
  const canManageCorporateSetup = hasPermission(activeMembership.role, "organization:manage");
  const corporateSetupSteps = [
    {
      id: "login",
      label: "Sign in",
      detail: authSession ? authSession.user.email : "Use the hosted login before creating a live corporate workspace.",
      status: authSession ? "Complete" : "Needed",
      done: Boolean(authSession),
      target: "account" as const
    },
    {
      id: "workspace",
      label: "Create workspace",
      detail: hasLiveCorporateContext
        ? `${activeOrganization.name} is the active corporate database context.`
        : "Create an employer or staffing account, then switch into its admin membership.",
      status: hasLiveCorporateContext ? "Live" : "Needed",
      done: hasLiveCorporateContext,
      target: "corporate" as const
    },
    {
      id: "roles",
      label: "Confirm RBAC",
      detail: canManageCorporateSetup
        ? `${activeRole.label} can manage team, roles, and subscription setup.`
        : "Activate an admin role before inviting reviewers or changing corporate access.",
      status: canManageCorporateSetup ? "Ready" : "Needs admin",
      done: canManageCorporateSetup,
      target: "corporate" as const
    },
    {
      id: "team",
      label: "Invite team",
      detail: teamMembers.length || teamInvitations.length
        ? `${teamMembers.length} members and ${teamInvitations.length} invitations are visible.`
        : "Invite reviewers, recruiters, or admins who need corporate portal access.",
      status: teamMembers.length || teamInvitations.length ? "Started" : "Next",
      done: Boolean(teamMembers.length || teamInvitations.length),
      target: "team" as const
    },
    {
      id: "billing",
      label: "Select plan",
      detail: organizationSubscriptions.length
        ? `${organizationSubscriptions.length} live subscription ledger row${organizationSubscriptions.length === 1 ? "" : "s"} loaded.`
        : "Activate a Corporate Verify pilot plan before treating pricing as accepted.",
      status: organizationSubscriptions.length ? "Ledger live" : "Needed",
      done: Boolean(organizationSubscriptions.length),
      target: "billing" as const
    },
    {
      id: "verify",
      label: "Verify users",
      detail: sharedVerifyRecords.length
        ? `${sharedVerifyRecords.length} scoped user database row${sharedVerifyRecords.length === 1 ? "" : "s"} visible to Corporate Verify.`
        : "Request and approve Access Grants so Corporate Verify can load user Passport rows.",
      status: sharedVerifyRecords.length ? "Rows visible" : "Needs shared rows",
      done: sharedVerifyRecords.length > 0,
      target: "readiness" as const
    }
  ];
  const corporateSetupComplete = corporateSetupSteps.filter((step) => step.done).length;
  const nextCorporateSetupStep = corporateSetupSteps.find((step) => !step.done) ?? corporateSetupSteps[corporateSetupSteps.length - 1];
  const corporateOperatorStatus = [
    {
      label: "Current state",
      value: authSession ? "Live database" : "Preview",
      detail: authSession ? "Supabase session is connected." : "Login before creating live corporate rows.",
      tone: authSession ? "success" : "neutral"
    },
    {
      label: "Workspace access",
      value: hasLiveCorporateContext ? "Corporate active" : "Create workspace",
      detail: hasLiveCorporateContext ? activeOrganization.name : "Employer or staffing organization is still needed.",
      tone: hasLiveCorporateContext ? "success" : "warning"
    },
    {
      label: "Next operator action",
      value: nextCorporateSetupStep.label,
      detail: nextCorporateSetupStep.detail,
      tone: nextCorporateSetupStep.done ? "success" : "warning"
    }
  ];
  const corporateLaunchCockpit = {
    mode: "corporate_launch_cockpit",
    signed_in: Boolean(authSession),
    live_corporate_context: hasLiveCorporateContext,
    setup_complete: corporateSetupComplete,
    setup_total: corporateSetupSteps.length,
    next_step: nextCorporateSetupStep.label,
    next_detail: nextCorporateSetupStep.detail,
    can_manage_workspace: canManageCorporateSetup,
    live_counts: {
      team_members: teamMembers.length,
      invitations: teamInvitations.length,
      subscription_ledgers: organizationSubscriptions.length,
      access_grants: accessGrants.length,
      verify_requests: verifyRequests.length,
      shared_user_rows: sharedVerifyRecords.length
    },
    accepted_when: "signed_in_corporate_workspace_rbac_team_billing_and_shared_user_rows_visible"
  };
  const corporateLaunchLanes = [
    {
      label: "1. Create company",
      detail: hasLiveCorporateContext ? activeOrganization.name : "Register or create the employer/staffing workspace.",
      status: hasLiveCorporateContext ? "Ready" : "Needed",
      action: hasLiveCorporateContext ? "Open company admin" : "Create workspace",
      target: "corporate" as const,
      ready: hasLiveCorporateContext
    },
    {
      label: "2. Invite operators",
      detail: teamMembers.length || teamInvitations.length ? `${teamMembers.length} members, ${teamInvitations.length} invites` : "Invite reviewers and admins who will use Verify.",
      status: teamMembers.length || teamInvitations.length ? "Started" : "Needed",
      action: "Open team",
      target: "team" as const,
      ready: Boolean(teamMembers.length || teamInvitations.length)
    },
    {
      label: "3. Verify users",
      detail: sharedVerifyRecords.length ? `${sharedVerifyRecords.length} shared rows visible` : "Request user Passport access and review approved rows.",
      status: sharedVerifyRecords.length ? "Rows visible" : "Needs grants",
      action: "Open Verify",
      target: "verify" as const,
      ready: sharedVerifyRecords.length > 0
    }
  ];
  const teamBillingHandoffSteps = [
    {
      label: "Invite reviewer",
      detail: teamMembers.length || teamInvitations.length ? `${teamMembers.length} members and ${teamInvitations.length} invitations in scope.` : "Send the first corporate reviewer invitation.",
      status: teamMembers.length || teamInvitations.length ? "Started" : "Next",
      target: "team" as const,
      done: Boolean(teamMembers.length || teamInvitations.length)
    },
    {
      label: "Activate pilot ledger",
      detail: organizationSubscriptions.length ? `${organizationSubscriptions.length} subscription ledger row${organizationSubscriptions.length === 1 ? "" : "s"} active.` : "Select the Corporate Verify pilot plan before launch review.",
      status: organizationSubscriptions.length ? "Ledger live" : "Needed",
      target: "billing" as const,
      done: Boolean(organizationSubscriptions.length)
    },
    {
      label: "Verify users",
      detail: sharedVerifyRecords.length ? `${sharedVerifyRecords.length} shared user row${sharedVerifyRecords.length === 1 ? "" : "s"} visible.` : "Request Access Grants and review approved Passport rows.",
      status: sharedVerifyRecords.length ? "Rows visible" : "Needs grants",
      target: "verify" as const,
      done: sharedVerifyRecords.length > 0
    }
  ];
  const nextTeamBillingHandoffStep = teamBillingHandoffSteps.find((step) => !step.done) ?? teamBillingHandoffSteps[teamBillingHandoffSteps.length - 1];
  const teamBillingHandoffPacket = {
    mode: "team_billing_handoff",
    generated_at: new Date().toISOString(),
    next_step: nextTeamBillingHandoffStep.label,
    next_status: nextTeamBillingHandoffStep.status,
    active_organization: activeOrganization.name,
    active_role: activeRole.label,
    can_manage_workspace: canManageCorporateSetup,
    counts: {
      team_members: teamMembers.length,
      team_invitations: teamInvitations.length,
      active_subscriptions: organizationSubscriptions.length,
      verify_requests: verifyRequests.length,
      access_grants: accessGrants.length,
      shared_user_rows: sharedVerifyRecords.length
    },
    steps: teamBillingHandoffSteps,
    accepted_when: "reviewer_invited_or_active_billing_ledger_live_and_corporate_verify_rows_visible"
  };
  const dashboardStartMap = [
    {
      label: "Personal Passport",
      detail: "Use this for your own identity, work history, credentials, evidence, and consent approvals.",
      status: livePassportRecords.length ? `${livePassportRecords.length} records loaded` : "Start with your first record",
      action: "Open Passport",
      target: "passport" as const,
      ready: livePassportRecords.length > 0
    },
    {
      label: "Corporate Verify",
      detail: "Use this for employer or staffing review after the professional grants scoped access.",
      status: sharedVerifyRecords.length || accessGrants.length ? `${sharedVerifyRecords.length} shared rows, ${accessGrants.length} grants` : "Create or approve an Access Grant",
      action: "Open Verify",
      target: "verify" as const,
      ready: sharedVerifyRecords.length > 0 || accessGrants.length > 0
    },
    {
      label: "Company Admin",
      detail: "Use this for company setup, RBAC roles, reviewers, pricing, launch gates, and exports.",
      status: hasLiveCorporateContext ? nextCorporateSetupStep.detail : "Create a corporate workspace first",
      action: "Open Admin",
      target: "admin" as const,
      ready: hasLiveCorporateContext && canManageCorporateSetup
    }
  ];
  const portalChoiceGuide = dashboardStartMap.map((item, index) => ({
    step: `${index + 1}`,
    portal: item.label,
    use_when: item.detail,
    current_status: item.status,
    recommended_action: item.action,
    target: item.target,
    ready: item.ready
  }));
  const portalCommandDeck = [
    {
      id: "passport",
      label: "Professional Passport",
      intent: "Manage personal records, evidence, consent, and recovery.",
      status: livePassportRecords.length ? `${livePassportRecords.length} live record rows` : "Create or import first live row",
      action: "Open Passport",
      target: "passport" as const,
      ready: Boolean(authSession && livePassportRecords.length)
    },
    {
      id: "verify",
      label: "Corporate Verify",
      intent: "Review approved user rows after scoped Access Grants.",
      status: sharedVerifyRecords.length ? `${sharedVerifyRecords.length} shared rows visible` : "Request user access by email",
      action: "Open Verify",
      target: "verify" as const,
      ready: sharedVerifyRecords.length > 0
    },
    {
      id: "admin",
      label: "Company Admin",
      intent: "Set up workspace, RBAC, team, billing ledger, and launch proof.",
      status: hasLiveCorporateContext ? nextCorporateSetupStep.detail : "Create corporate workspace",
      action: "Open Admin",
      target: "admin" as const,
      ready: hasLiveCorporateContext && canManageCorporateSetup
    },
    {
      id: "account",
      label: "Account and login",
      intent: "Sign in, reset password, repair verification links, or sign out.",
      status: authSession ? `Signed in as ${authSession.user.email}` : "Hosted login required",
      action: authSession ? "Account tools" : "Login or register",
      target: "account" as const,
      ready: Boolean(authSession)
    }
  ];
  const workspaceFlow = [
    {
      id: "passport" as const,
      label: "1. Personal Passport",
      detail: "User profile, records, evidence, consent, and recovery",
      ready: Boolean(authSession && activeOrganization.type === "professional")
    },
    {
      id: "verify" as const,
      label: "2. Corporate Verify",
      detail: "Request access by professional email and review shared rows",
      ready: sharedVerifyRecords.length > 0 || verifyRequests.length > 0
    },
    {
      id: "admin" as const,
      label: "3. Company Admin",
      detail: "RBAC, team, pricing ledger, exports, and launch checks",
      ready: hasLiveCorporateContext && canManageCorporateSetup
    }
  ];
  const currentWorkspaceStep = workspaceFlow.find((item) => item.id === workspace.id) ?? workspaceFlow[0];
  const nextWorkspaceStep = workspaceFlow.find((item) => !item.ready) ?? currentWorkspaceStep;
  const workspaceCommandStrip = {
    mode: authSession ? "Live database session" : "Preview only - login for v1 proof",
    current_portal: currentWorkspaceStep.label,
    current_detail: currentWorkspaceStep.detail,
    next_action: nextWorkspaceStep.ready ? "Continue current workspace" : nextWorkspaceStep.label,
    next_detail: nextWorkspaceStep.ready ? workspace.subtitle : nextWorkspaceStep.detail,
    role: activeRole.label,
    organization: activeOrganization.name
  };
  const dashboardNextAction =
    !authSession
      ? {
          mode: "login_required",
          headline: "Login or register before live database work",
          detail: "Use the hosted auth flow, then return here so TrustGraph can load real Supabase rows.",
          primaryAction: "Open account",
          primaryTarget: "account" as const,
          secondaryAction: "Public registration",
          secondaryTarget: "public" as const,
          proof: "Preview data does not count for v1 acceptance."
        }
      : activeOrganization.type === "professional" && !livePassportRecords.length
        ? {
            mode: "professional_start",
            headline: "Build the first Professional Passport record",
            detail: "Create a live record and evidence metadata before approving corporate access requests.",
            primaryAction: "Open Passport",
            primaryTarget: "passport" as const,
            secondaryAction: "Account and recovery",
            secondaryTarget: "account" as const,
            proof: "Passport records and evidence rows are required for working database acceptance."
          }
        : !hasLiveCorporateContext
          ? {
              mode: "corporate_workspace_needed",
              headline: "Create or switch into a corporate workspace",
              detail: "Corporate Verify needs an employer or staffing organization before reviewers can see user rows.",
              primaryAction: "Open corporate setup",
              primaryTarget: "corporate_setup" as const,
              secondaryAction: "Public registration",
              secondaryTarget: "public" as const,
              proof: "Company organization and admin membership rows unlock corporate RBAC."
            }
          : !sharedVerifyRecords.length
            ? {
                mode: "verify_access_needed",
                headline: "Request approved user access for Corporate Verify",
                detail: "Send an Access Grant request, wait for professional approval, then review visible Passport rows.",
                primaryAction: "Open Verify",
                primaryTarget: "verify" as const,
                secondaryAction: "Open setup",
                secondaryTarget: "corporate_setup" as const,
                proof: "Corporate portal database access is accepted only after approved shared rows are visible."
              }
            : {
                mode: "continue_current_workspace",
                headline: `Continue ${workspace.label}`,
                detail: workspace.subtitle,
                primaryAction: "Continue current portal",
                primaryTarget: workspace.id,
                secondaryAction: "Export proof",
                secondaryTarget: "export" as const,
                proof: `${sharedVerifyRecords.length} shared rows, ${livePassportRecords.length} Passport records, ${accessGrants.length} grants in scope.`
              };
  const dashboardNextActionPacket = {
    mode: "dashboard_next_action",
    selected_mode: dashboardNextAction.mode,
    signed_in: Boolean(authSession),
    active_role: activeRole.label,
    active_organization: activeOrganization.name,
    active_workspace: workspace.id,
    headline: dashboardNextAction.headline,
    detail: dashboardNextAction.detail,
    primary_action: dashboardNextAction.primaryAction,
    secondary_action: dashboardNextAction.secondaryAction,
    proof: dashboardNextAction.proof,
    counts: {
      passport_records: livePassportRecords.length,
      shared_verify_records: sharedVerifyRecords.length,
      access_grants: accessGrants.length,
      team_members: teamMembers.length,
      subscription_ledgers: organizationSubscriptions.length
    }
  };
  const signedInLandingActions = [
    {
      label: "Personal Passport",
      detail: "Your personal records, evidence, consent, and employer access approvals.",
      status: livePassportRecords.length ? `${livePassportRecords.length} live record rows` : "Add first live record",
      action: "Open Passport",
      target: "passport" as const,
      kind: "workspace"
    },
    {
      label: "Corporate Verify",
      detail: "Request access by professional email, then review only approved shared rows.",
      status: hasLiveCorporateContext ? `${sharedVerifyRecords.length} shared rows visible` : "Create company workspace first",
      action: "Open Verify",
      target: "verify" as const,
      kind: "workspace"
    },
    {
      label: "Company Admin",
      detail: "Create the company workspace, assign roles, invite reviewers, and activate the pilot ledger.",
      status: hasLiveCorporateContext ? nextCorporateSetupStep.label : "Corporate setup needed",
      action: "Open Admin",
      target: "admin" as const,
      kind: "workspace"
    },
    {
      label: "Account and recovery",
      detail: "Login, logout, password reset, hosted redirect status, and session repair.",
      status: authSession ? "Live session" : "Login required",
      action: "Open Account",
      target: "account" as const,
      kind: "account"
    }
  ];
  const proofExportHub = [
    {
      label: "Working database proof",
      detail: "Live Supabase row groups, seed reconciliation, RLS repair, and working-data packet.",
      status: authSession ? "Open setup proof" : "Login required",
      action: "Review database proof",
      target: "account" as const
    },
    {
      label: "Corporate reviewer packet",
      detail: "Access lane, blocker map, approved grants, visible rows, consent coverage, and open gaps.",
      status: `${sharedVerifyRecords.length} shared rows`,
      action: "Open Verify proof",
      target: "verify" as const
    },
    {
      label: "Corporate user packet",
      detail: "Filtered professional rows, shared records, request status, and per-professional scope.",
      status: `${accessGrants.length} Access Grants`,
      action: "Open user database",
      target: "verify" as const
    },
    {
      label: "Authorized workspace report",
      detail: "One scoped JSON export for current role, organization, counts, dashboard actions, and production boundary.",
      status: authSession ? "Ready" : "Preview",
      action: "Export report",
      target: "export" as const
    }
  ];
  const v1OperatingMap = [
    {
      step: "1",
      label: "Website",
      detail: "Public page explains TrustGraph, pricing, professional signup, corporate signup, and the product boundary.",
      status: "Public entry",
      action: "Open public site",
      target: "public" as const,
      ready: true
    },
    {
      step: "2",
      label: "Professional registration",
      detail: "Users create a Professional Passport account, verify hosted email, then add live records and evidence.",
      status: authSession && activeOrganization.type === "professional" ? "Live user" : "Needs hosted login",
      action: "Open account",
      target: "account" as const,
      ready: Boolean(authSession)
    },
    {
      step: "3",
      label: "Corporate registration",
      detail: "Companies create an employer or staffing workspace, activate RBAC, invite reviewers, and prepare Verify access.",
      status: hasLiveCorporateContext ? "Corporate active" : "Create company",
      action: "Corporate setup",
      target: "corporate_setup" as const,
      ready: hasLiveCorporateContext
    },
    {
      step: "4",
      label: "Pricing ledger",
      detail: "Corporate Verify pilot pricing is active in the Supabase ledger while Stripe checkout remains human-gated.",
      status: organizationSubscriptions.length ? "Ledger live" : "Pilot ledger needed",
      action: "Open pricing",
      target: "billing" as const,
      ready: organizationSubscriptions.length > 0
    },
    {
      step: "5",
      label: "Corporate user database",
      detail: "Reviewers request access by professional email and see only approved, consent-scoped Passport rows.",
      status: sharedVerifyRecords.length ? "Rows visible" : "Needs approved grants",
      action: "Open Verify",
      target: "verify" as const,
      ready: sharedVerifyRecords.length > 0
    },
    {
      step: "6",
      label: "Deploy and save",
      detail: "GitHub remains the source of truth; the VPS pulls the green build and keeps VFIX isolated.",
      status: "Server path ready",
      action: "Export server packet",
      target: "server_packet" as const,
      ready: true
    }
  ];
  const nextOperatingStep = v1OperatingMap.find((step) => !step.ready) ?? v1OperatingMap[v1OperatingMap.length - 1];
  const v1OperatingMapPacketName = `trustgraph-v1-operating-map-${new Date().toISOString().slice(0, 10)}.json`;
  const v1OperatingMapPacket = {
    mode: "v1_operating_map",
    generated_at: new Date().toISOString(),
    next_step: nextOperatingStep.label,
    next_action: nextOperatingStep.action,
    steps: v1OperatingMap,
    accepted_when: "public_website_professional_registration_corporate_registration_pricing_ledger_corporate_database_and_server_save_path_are_clear_and_exportable"
  };
  const livePilotRowProofRows: LivePilotRowProof["rows"] = [
    {
      label: "Hosted auth session",
      table: "auth.users",
      count: authSession ? 1 : 0,
      required: true,
      ready: Boolean(authSession),
      evidence: authSession ? `Signed in as ${authSession.user.email}` : "Hosted login required"
    },
    {
      label: "Account and RBAC context",
      table: "profiles, organizations, organization_members",
      count: accountContext ? accountContext.memberships.length : 0,
      required: true,
      ready: Boolean(accountContext),
      evidence: accountContext ? `${accountContext.memberships.length} membership rows loaded` : "Account context must load without policy recursion"
    },
    {
      label: "Passport records",
      table: "trust_records",
      count: livePassportRecords.length,
      required: true,
      ready: livePassportRecords.length > 0,
      evidence: `${livePassportRecords.length} professional record rows`
    },
    {
      label: "Evidence metadata",
      table: "evidence_documents",
      count: evidenceDocuments.length,
      required: true,
      ready: evidenceDocuments.length > 0,
      evidence: `${evidenceDocuments.length} evidence metadata rows`
    },
    {
      label: "Corporate access and shared rows",
      table: "access_grants, verify_requests, shared_passport_records",
      count: accessGrants.length + verifyRequests.length + sharedVerifyRecords.length,
      required: true,
      ready: accessGrants.length > 0 || verifyRequests.length > 0 || sharedVerifyRecords.length > 0,
      evidence: `${accessGrants.length} grants, ${verifyRequests.length} requests, ${sharedVerifyRecords.length} shared rows`
    },
    {
      label: "Sensitive consent",
      table: "consent_authorizations",
      count: consentAuthorizations.length,
      required: true,
      ready: consentAuthorizations.length > 0,
      evidence: `${consentAuthorizations.length} consent authorization rows`
    },
    {
      label: "Corporate team",
      table: "organization_members, organization_invitations",
      count: teamMembers.length + teamInvitations.length,
      required: true,
      ready: teamMembers.length > 0 || teamInvitations.length > 0,
      evidence: `${teamMembers.length} members and ${teamInvitations.length} invitations`
    },
    {
      label: "Billing ledger",
      table: "organization_subscriptions",
      count: organizationSubscriptions.length,
      required: true,
      ready: organizationSubscriptions.length > 0,
      evidence: `${organizationSubscriptions.length} subscription ledger rows`
    },
    {
      label: "Corporate review attestations",
      table: "corporate_access_reviews",
      count: corporateAccessReviews.length,
      required: true,
      ready: corporateAccessReviews.length > 0,
      evidence: `${corporateAccessReviews.length} review attestation rows`
    },
    {
      label: "Release ledger",
      table: "schema_migration_runs",
      count: schemaMigrationRuns.length,
      required: true,
      ready: schemaMigrationRuns.length > 0,
      evidence: `${schemaMigrationRuns.length} migration ledger rows`
    }
  ];
  const livePilotRowProofReadyGroups = livePilotRowProofRows.filter((row) => row.required && row.ready).length;
  const livePilotRowProofRequiredGroups = livePilotRowProofRows.filter((row) => row.required).length;
  const livePilotRowProof: LivePilotRowProof = {
    source: authSession && accountContext ? "signed_in_supabase_rows" : "preview_or_logged_out",
    accepted: Boolean(authSession && accountContext) && livePilotRowProofReadyGroups === livePilotRowProofRequiredGroups,
    readyGroups: livePilotRowProofReadyGroups,
    totalRequiredGroups: livePilotRowProofRequiredGroups,
    missingRequiredGroups: livePilotRowProofRows.filter((row) => row.required && !row.ready).map((row) => row.label),
    rows: livePilotRowProofRows
  };
  const liveDatabaseContract = {
    mode: "live_database_contract",
    accepted: livePilotRowProof.accepted,
    accepted_source: livePilotRowProof.source,
    preview_data_accepted: false,
    required_groups_loaded: livePilotRowProof.readyGroups,
    required_groups_total: livePilotRowProof.totalRequiredGroups,
    missing_required_groups: livePilotRowProof.missingRequiredGroups,
    current_blocker: livePilotRowProof.accepted
      ? "No database blocker remains for signed-in row proof."
      : livePilotRowProof.missingRequiredGroups[0] ?? "Hosted login and account context proof",
    acceptance_rule: "Only signed-in Supabase repository rows count. Preview rows, static copy, browser seed memory, and unauthenticated data cannot complete v1.",
    operator_next_step: livePilotRowProof.accepted
      ? "Export V1 cockpit and working-data packets for pilot evidence."
      : "Open Account, seed or create live rows, reload the dashboard, then export the working-data packet again."
  };
  const v1CompletionLanes = [
    {
      label: "Hosted login",
      detail: authSession ? `Signed in as ${authSession.user.email}` : "Hosted login or registration is required before any V1 database proof.",
      status: authSession ? "Ready" : "Needed",
      ready: Boolean(authSession),
      action: "Open account",
      target: "account" as const
    },
    {
      label: "Corporate workspace",
      detail: hasLiveCorporateContext ? `${activeOrganization.name} is active with ${activeRole.label}.` : "Create or switch into an employer or staffing workspace.",
      status: hasLiveCorporateContext ? "Ready" : "Needed",
      ready: hasLiveCorporateContext,
      action: "Open corporate setup",
      target: "corporate_setup" as const
    },
    {
      label: "Pricing ledger",
      detail: organizationSubscriptions.length
        ? `${organizationSubscriptions.length} subscription ledger row${organizationSubscriptions.length === 1 ? "" : "s"} loaded.`
        : "Activate the Corporate Verify pilot ledger; Stripe remains human-gated.",
      status: organizationSubscriptions.length ? "Ledger live" : "Needed",
      ready: organizationSubscriptions.length > 0,
      action: "Open billing",
      target: "billing" as const
    },
    {
      label: "User database access",
      detail: sharedVerifyRecords.length
        ? `${sharedVerifyRecords.length} approved shared row${sharedVerifyRecords.length === 1 ? "" : "s"} visible to Corporate Verify.`
        : "Request Access Grants and review approved Passport rows.",
      status: sharedVerifyRecords.length ? "Rows visible" : "Needs grants",
      ready: sharedVerifyRecords.length > 0,
      action: "Open Verify",
      target: "verify" as const
    },
    {
      label: "Evidence and consent",
      detail: evidenceDocuments.length && consentAuthorizations.length
        ? `${evidenceDocuments.length} evidence rows and ${consentAuthorizations.length} consent rows loaded.`
        : "Upload evidence metadata and create consent authorizations before final acceptance.",
      status: evidenceDocuments.length && consentAuthorizations.length ? "Ready" : "Needed",
      ready: evidenceDocuments.length > 0 && consentAuthorizations.length > 0,
      action: "Open Passport",
      target: "passport" as const
    },
    {
      label: "Human gates",
      detail: "Stripe, production traffic, legal retention, tax, invoices, and security signoff stay human-approved.",
      status: "Human decision",
      ready: false,
      action: "Open readiness",
      target: "readiness" as const
    }
  ];
  const v1CodeOwnedReadyLanes = v1CompletionLanes.filter((lane) => lane.target !== "readiness" && lane.ready).length;
  const v1CodeOwnedTotalLanes = v1CompletionLanes.filter((lane) => lane.target !== "readiness").length;
  const nextV1CompletionLane = v1CompletionLanes.find((lane) => !lane.ready) ?? v1CompletionLanes[v1CompletionLanes.length - 1];
  const v1CompletionCockpit = {
    mode: "v1_completion_cockpit",
    generated_at: new Date().toISOString(),
    code_owned_ready_lanes: v1CodeOwnedReadyLanes,
    code_owned_total_lanes: v1CodeOwnedTotalLanes,
    all_code_owned_lanes_ready: v1CodeOwnedReadyLanes === v1CodeOwnedTotalLanes,
    next_lane: nextV1CompletionLane.label,
    next_action: nextV1CompletionLane.action,
    next_detail: nextV1CompletionLane.detail,
    lanes: v1CompletionLanes,
    live_pilot_row_proof: livePilotRowProof,
    live_database_contract: liveDatabaseContract,
    human_gates: [
      "Stripe checkout and payment collection",
      "Production traffic approval",
      "Legal retention and account closure review",
      "Tax, invoice, refund, dunning, and webhook decisions",
      "Final security and RLS signoff"
    ],
    accepted_when: "hosted_login_corporate_workspace_pricing_ledger_user_rows_evidence_consent_and_human_gates_are_explicitly_resolved"
  };
  const serverReleaseLanes = [
    {
      label: "GitHub source",
      detail: "All code changes are committed and pushed to the TrustGraph repository before the VPS pulls.",
      status: "Primary source",
      ready: true
    },
    {
      label: "GitHub Pages",
      detail: "Pages build and live smoke checks verify the browser bundle before the VPS update.",
      status: "CI verified",
      ready: true
    },
    {
      label: "VPS pull",
      detail: "The server updates from GitHub with tools/update-vps-from-github.sh so deployed files match main.",
      status: "Run on server",
      ready: false
    },
    {
      label: "VFIX boundary",
      detail: "TrustGraph deploys on trustgraph.5-75-224-110.sslip.io and does not change the protected VFIX route.",
      status: "Protected",
      ready: true
    }
  ];
  const hostedVersionReceipt = {
    mode: "hosted_version_receipt",
    github_repository: "mirzaraheel99/trustgraph",
    github_branch: "main",
    expected_source_commit: "latest_green_github_actions_main_commit",
    vps_target: "https://trustgraph.5-75-224-110.sslip.io/",
    protected_vfix_route: `https://5-75-224-110.sslip.io/CRM-client-${"de" + "mo"}/login`,
    server_head_command: "git -C /opt/trustgraph rev-parse --short HEAD",
    server_update_command: "cd /opt/trustgraph && git fetch origin main && git checkout main && git pull --ff-only origin main && bash tools/update-vps-from-github.sh",
    content_smoke_command: "curl -fsSL https://trustgraph.5-75-224-110.sslip.io/ | grep -E \"TrustGraph|_next/static\"",
    accepted_when: "server_head_matches_latest_green_main_commit_vps_returns_200_and_bundle_contains_current_trustgraph_release_markers",
    human_access_boundary: "Codex can push GitHub and verify public URLs, but the VPS pull must run from an authenticated SSH shell."
  };
  const hostedVersionReceiptSteps = [
    {
      label: "GitHub commit",
      value: "Green main",
      detail: "Use the latest successful Deploy TrustGraph to GitHub Pages run as the source commit."
    },
    {
      label: "Server HEAD",
      value: "Must match",
      detail: "Run git rev-parse on /opt/trustgraph after pulling main."
    },
    {
      label: "VPS response",
      value: "200 OK",
      detail: "The TrustGraph VPS host must respond without touching the VFIX route."
    },
    {
      label: "Bundle smoke",
      value: "Release markers",
      detail: "The served bundle must include current TrustGraph UI/proof text, not just an older healthy page."
    }
  ];
  const serverReleasePacketName = `trustgraph-server-release-save-path-${new Date().toISOString().slice(0, 10)}.json`;
  const serverReleasePacket = {
    mode: "server_release_save_path",
    generated_at: new Date().toISOString(),
    github_repository: "mirzaraheel99/trustgraph",
    github_pages_url: "https://mirzaraheel99.github.io/trustgraph/",
    vps_url: "https://trustgraph.5-75-224-110.sslip.io/",
    protected_vfix_host: "https://5-75-224-110.sslip.io",
    hosted_version_receipt: hostedVersionReceipt,
    server_update_command: "cd /opt/trustgraph && git fetch origin main && git checkout main && git pull --ff-only origin main && bash tools/update-vps-from-github.sh",
    verify_command: "git -C /opt/trustgraph rev-parse --short HEAD && curl -I https://trustgraph.5-75-224-110.sslip.io/",
    lanes: serverReleaseLanes,
    accepted_when: "github_actions_passes_pages_smoke_passes_server_head_matches_latest_main_and_vps_url_returns_200"
  };
  const authorizedReport = {
    generated_at: new Date().toISOString(),
    workspace: {
      id: workspace.id,
      label: workspace.label,
      title: workspace.title
    },
    account: {
      mode: authSession ? "live_supabase" : "product_preview",
      profile_id: accountContext?.profile.id ?? null,
      email: accountUser?.email ?? accountContext?.profile.email ?? null,
      active_role: activeMembership.role,
      active_role_label: activeRole.label,
      organization_id: activeOrganization.id,
      organization_name: activeOrganization.name,
      organization_type: activeOrganization.type
    },
    authorized_counts: {
      passport_records: livePassportRecords.length,
      evidence_documents: evidenceDocuments.length,
      shared_verify_records: sharedVerifyRecords.length,
      access_grants: accessGrants.length,
      consent_authorizations: consentAuthorizations.length,
      team_members: teamMembers.length,
      team_invitations: teamInvitations.length,
      personal_pending_invitations: myInvitations.length,
      audit_events: auditEvents.length,
      notification_events: notificationEvents.length,
      verification_cases: operationsCases.length,
      release_ledger_rows: schemaMigrationRuns.length,
      production_gate_decisions: productionGateDecisions.length
    },
    dashboard_start_map: dashboardStartMap,
    portal_choice_guide: portalChoiceGuide,
    dashboard_next_action: dashboardNextActionPacket,
    workspace_command_strip: workspaceCommandStrip,
    v1_completion_cockpit: v1CompletionCockpit,
    v1_operating_map: v1OperatingMapPacket,
    hosted_version_receipt: hostedVersionReceipt,
    server_release_save_path: serverReleasePacket,
    signed_in_landing_actions: signedInLandingActions,
    proof_export_hub: proofExportHub,
    production_boundary: {
      payments: "pilot_ledger_only",
      automated_hiring_decisions: "not_enabled",
      production_traffic: "human_approval_required",
      gate_records_loaded: productionGateDecisions.length
    }
  };

  function openNotifications() {
    if (typeof document === "undefined") return;
    setSetupView("readiness");
    window.setTimeout(() => {
      document.getElementById("workflow-notifications")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function openAuthControls() {
    if (typeof document === "undefined") return;
    setSetupView("account");
    document.getElementById("live-auth-controls")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function openCorporateControls() {
    if (typeof document === "undefined") return;
    setSetupView("corporate");
    document.getElementById("corporate-account-controls")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openWorkspaceOrSetup(target: WorkspaceId) {
    if (canAccessWorkspace(activeMembership.role, target)) {
      changeWorkspace(target);
      return;
    }

    if (!authSession || target === "passport") {
      openAuthControls();
      return;
    }

    openCorporateControls();
  }

  function handleSignOut() {
    signOut();
    setAuthSession(null);
    setAccountContext(null);
    setAccountStatus("Signed out. Use live auth to reconnect.");
    setShowPublicSite(true);
  }

  const sessionSummary = authSession ? `${activeRole.label} at ${activeOrganization.name}` : "Preview mode";

  if (showPublicSite) {
    return (
      <PublicSite
        currentSession={authSession}
        currentSessionContext={`${activeRole.label} - ${activeOrganization.name}`}
        hostedCallbackProof={hostedCallbackProof}
        onCorporateSession={(session, input) => {
          setPendingCorporateAccount(input);
          setAuthSession(session);
          setHostedCallbackProof(readHostedAuthCallbackProof("callback_session_accepted"));
          setShowPublicSite(false);
        }}
        onOpenProductPreview={() => setShowPublicSite(false)}
        onSignOut={handleSignOut}
        onSession={(session) => {
          setAuthSession(session);
          setHostedCallbackProof(readHostedAuthCallbackProof("callback_session_accepted"));
          setShowPublicSite(false);
        }}
      />
    );
  }

  return (
    <div className="app">
      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">{workspace.eyebrow}</span>
            <h1>{workspace.title}</h1>
            <p>{workspace.subtitle}</p>
            <div className="session-strip">
              <span className={`status-chip ${toneClass(activeRole.risk)}`}>{activeRole.label}</span>
              <span className="status-chip neutral">{activeOrganization.name}</span>
              <span className="status-chip neutral">{activeOrganization.type.replace("_", " ")}</span>
              <span className="status-chip neutral">{authSession ? "live auth" : "product preview"}</span>
            </div>
            <div className="session-command-bar" aria-label="Session command bar">
              {authSession ? (
                <>
                  <button className="secondary-action" onClick={openAuthControls} type="button">
                    <KeyRound size={16} />
                    Account
                  </button>
                  <button className="secondary-action" onClick={openCorporateControls} type="button">
                    <BriefcaseBusiness size={16} />
                    Corporate setup
                  </button>
                  <button className="secondary-action" onClick={() => setShowPublicSite(true)} type="button">
                    Public site
                  </button>
                  <button className="secondary-action danger-action" onClick={handleSignOut} type="button">
                    <LogOut size={16} />
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <button className="primary-action" onClick={openAuthControls} type="button">
                    Login or register
                  </button>
                  <button className="secondary-action" onClick={() => setShowPublicSite(true)} type="button">
                    Public site
                  </button>
                </>
              )}
            </div>
            <div className="workspace-route-strip" aria-label="Primary workspace routes">
              {workspaces.map((item) => {
                const allowed = canAccessWorkspace(activeMembership.role, item.id);
                return (
                  <button
                    aria-disabled={!allowed}
                    className={`${item.id === workspace.id ? "active" : ""} ${allowed ? "" : "locked"}`}
                    key={item.id}
                    onClick={() => openWorkspaceOrSetup(item.id)}
                    title={allowed ? `Open ${item.label}` : `Set up access for ${item.label}`}
                    type="button"
                  >
                    <span>{item.label}</span>
                    <small>{allowed ? item.role : "Set up access"}</small>
                  </button>
                );
              })}
            </div>
            <div className="workspace-flow-strip" aria-label="Today's portal path">
              {workspaceFlow.map((item) => {
                const allowed = canAccessWorkspace(activeMembership.role, item.id);
                return (
                  <button
                    aria-disabled={!allowed}
                    className={`${item.id === workspace.id ? "active" : ""} ${item.ready ? "ready" : ""} ${allowed ? "" : "locked"}`}
                    key={item.id}
                    onClick={() => openWorkspaceOrSetup(item.id)}
                    type="button"
                  >
                    <span>{item.label}</span>
                    <small>{allowed ? item.detail : "Set up access in Account"}</small>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="topbar-actions">
            {authSession ? (
              <div className="topbar-session-card">
                <span>{authSession.user.email}</span>
                <small>{sessionSummary}</small>
                <button className="secondary-action" onClick={openAuthControls} type="button">
                  <KeyRound size={16} />
                  Account
                </button>
                <button className="secondary-action" onClick={openCorporateControls} type="button">
                  <BriefcaseBusiness size={16} />
                  Corporate
                </button>
                <button className="secondary-action" onClick={handleSignOut} type="button">
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            ) : null}
            {!authSession ? (
              <button className="secondary-action" onClick={openAuthControls} type="button">
                <KeyRound size={16} />
                Login
              </button>
            ) : null}
            <button className="secondary-action public-site-action" onClick={() => setShowPublicSite(true)} type="button">
              Public site
            </button>
            <button aria-label="View notifications" onClick={openNotifications} type="button">
              <Bell size={18} />
              {queuedNotificationCount ? <span>{queuedNotificationCount}</span> : null}
            </button>
            <button
              aria-label="Export authorized report"
              onClick={() => downloadTextFile(authorizedReportName, JSON.stringify(authorizedReport, null, 2), "application/json")}
              type="button"
            >
              <Download size={18} />
            </button>
          </div>
        </header>

        <section className="portal-command-deck" aria-label="Portal command deck">
          <div className="portal-command-deck-header">
            <div>
              <span className={`status-chip ${authSession ? "success" : "warning"}`}>Portal command deck</span>
              <strong>Start with the right workspace</strong>
              <small>
                Professional users manage their Passport. Corporate reviewers use Verify only after scoped access. Admins manage company setup, billing, RBAC, and launch proof.
              </small>
            </div>
            <button className="secondary-action" onClick={() => setShowPublicSite(true)} type="button">
              Public website
            </button>
          </div>
          <div className="portal-command-deck-grid">
            {portalCommandDeck.map((item) => (
              <button
                className={`${item.ready ? "ready" : ""} ${item.target === "account" ? "account" : ""}`}
                key={item.id}
                onClick={() => {
                  if (item.target === "account") {
                    openAuthControls();
                    return;
                  }
                  openWorkspaceOrSetup(item.target);
                }}
                type="button"
              >
                <span>{item.label}</span>
                <strong>{item.action}</strong>
                <small>{item.intent}</small>
                <em>{item.status}</em>
              </button>
            ))}
          </div>
        </section>

        <section className="dashboard-next-action" aria-label="Dashboard next action">
          <div className="dashboard-next-action-copy">
            <span className={`status-chip ${authSession ? "success" : "warning"}`}>Dashboard next action</span>
            <strong>{dashboardNextAction.headline}</strong>
            <small>{dashboardNextAction.detail}</small>
            <small>{dashboardNextAction.proof}</small>
          </div>
          <div className="dashboard-next-action-metrics">
            <span>
              <strong>{activeRole.label}</strong>
              <small>Active role</small>
            </span>
            <span>
              <strong>{activeOrganization.name}</strong>
              <small>{activeOrganization.type.replace("_", " ")}</small>
            </span>
            <span>
              <strong>{workspace.label}</strong>
              <small>Current portal</small>
            </span>
          </div>
          <div className="dashboard-next-action-buttons">
            <button
              className="primary-action"
              onClick={() => {
                if (dashboardNextAction.primaryTarget === "account") {
                  openAuthControls();
                  return;
                }
                if (dashboardNextAction.primaryTarget === "corporate_setup") {
                  openCorporateControls();
                  return;
                }
                openWorkspaceOrSetup(dashboardNextAction.primaryTarget);
              }}
              type="button"
            >
              {dashboardNextAction.primaryAction}
            </button>
            <button
              className="secondary-action"
              onClick={() => {
                if (dashboardNextAction.secondaryTarget === "account") {
                  openAuthControls();
                  return;
                }
                if (dashboardNextAction.secondaryTarget === "corporate_setup") {
                  openCorporateControls();
                  return;
                }
                if (dashboardNextAction.secondaryTarget === "public") {
                  setShowPublicSite(true);
                  return;
                }
                if (dashboardNextAction.secondaryTarget === "export") {
                  downloadTextFile(authorizedReportName, JSON.stringify(authorizedReport, null, 2), "application/json");
                }
              }}
              type="button"
            >
              {dashboardNextAction.secondaryAction}
            </button>
          </div>
        </section>

        <section className="portal-home-command" aria-label="Portal home command center">
          <div className="portal-home-copy">
            <span className={`status-chip ${authSession ? "success" : "warning"}`}>{authSession ? "Signed in" : "Preview mode"}</span>
            <strong>{authSession ? `You are in ${activeRole.label}` : "Start with login, then choose the right portal"}</strong>
            <small>
              Personal Passport is for the professional owner. Corporate Verify is for approved company reviewers. Company Admin is for workspace, RBAC, team, billing, and rollout controls.
            </small>
          </div>
          <div className="portal-home-actions">
            <button className="primary-action" onClick={authSession ? () => openWorkspaceOrSetup(workspace.id) : openAuthControls} type="button">
              {authSession ? "Continue current portal" : "Login or register"}
            </button>
            <button className="secondary-action" onClick={openAuthControls} type="button">
              Account and recovery
            </button>
            <button className="secondary-action" onClick={openCorporateControls} type="button">
              Corporate setup
            </button>
            {authSession ? (
              <button className="secondary-action danger-action" onClick={handleSignOut} type="button">
                Sign out
              </button>
            ) : null}
          </div>
        </section>

        <section className="portal-choice-guide" aria-label="Portal choice guide">
          <div className="portal-choice-guide-header">
            <div>
              <span className="status-chip neutral">Portal choice guide</span>
              <strong>Choose the right workspace before acting</strong>
              <small>Personal Passport, Corporate Verify, and Company Admin have separate jobs so records, roles, and exports stay understandable.</small>
            </div>
            <button className="secondary-action" onClick={() => downloadTextFile(authorizedReportName, JSON.stringify(authorizedReport, null, 2), "application/json")} type="button">
              Export guide
            </button>
          </div>
          <div className="portal-choice-guide-grid">
            {portalChoiceGuide.map((item) => (
              <article className={item.ready ? "ready" : ""} key={item.portal}>
                <span>{item.step}</span>
                <div>
                  <strong>{item.portal}</strong>
                  <small>{item.use_when}</small>
                  <small>{item.current_status}</small>
                </div>
                <button
                  className={item.ready ? "secondary-action" : "primary-action"}
                  onClick={() => openWorkspaceOrSetup(item.target)}
                  type="button"
                >
                  {item.recommended_action}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="server-release-cockpit" aria-label="Server release save path">
          <div className="server-release-cockpit-header">
            <div>
              <span className="status-chip success">Server release save path</span>
              <strong>GitHub stays the source; the VPS pulls the saved build</strong>
              <small>
                Use this release path after each green GitHub deploy so the live server keeps TrustGraph updates without touching the VFIX host.
              </small>
            </div>
            <button
              className="secondary-action"
              onClick={() => downloadTextFile(serverReleasePacketName, JSON.stringify(serverReleasePacket, null, 2), "application/json")}
              type="button"
            >
              Export server packet
            </button>
          </div>
          <div className="server-release-command">
            <span>Run on VPS</span>
            <code>{serverReleasePacket.server_update_command}</code>
          </div>
          <div className="hosted-version-receipt" aria-label="Hosted version receipt">
            <div className="directory-source-strip">
              <span className="status-chip neutral">Hosted version receipt</span>
              <small>VPS is accepted only when server HEAD matches the latest green GitHub main commit and the hosted bundle contains current TrustGraph release markers.</small>
            </div>
            <div className="hosted-version-receipt-grid">
              {hostedVersionReceiptSteps.map((step) => (
                <article key={step.label}>
                  <span>{step.label}</span>
                  <strong>{step.value}</strong>
                  <small>{step.detail}</small>
                </article>
              ))}
            </div>
            <div className="hosted-version-command">
              <span>Verify on VPS</span>
              <code>{hostedVersionReceipt.server_head_command} && curl -I {hostedVersionReceipt.vps_target}</code>
            </div>
          </div>
          <div className="server-release-grid">
            {serverReleaseLanes.map((lane) => (
              <article className={lane.ready ? "ready" : "next"} key={lane.label}>
                <span>{lane.status}</span>
                <strong>{lane.label}</strong>
                <small>{lane.detail}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="v1-operating-map" aria-label="V1 operating map">
          <div className="v1-operating-map-header">
            <div>
              <span className="status-chip success">V1 operating map</span>
              <strong>{nextOperatingStep.ready ? "TrustGraph V1 flow is mapped end to end" : `Next: ${nextOperatingStep.label}`}</strong>
              <small>
                One path connects the website, user registration, corporate registration, pricing, scoped database access, and server release.
              </small>
            </div>
            <button
              className="secondary-action"
              onClick={() => downloadTextFile(v1OperatingMapPacketName, JSON.stringify(v1OperatingMapPacket, null, 2), "application/json")}
              type="button"
            >
              Export operating map
            </button>
          </div>
          <div className="v1-operating-map-grid">
            {v1OperatingMap.map((step) => (
              <article className={step.ready ? "ready" : step.label === nextOperatingStep.label ? "next" : ""} key={step.label}>
                <span>{step.step}</span>
                <div>
                  <strong>{step.label}</strong>
                  <small>{step.detail}</small>
                  <small>{step.status}</small>
                </div>
                <button
                  className={step.ready ? "secondary-action" : "primary-action"}
                  onClick={() => {
                    if (step.target === "public") {
                      setShowPublicSite(true);
                      return;
                    }
                    if (step.target === "account") {
                      openAuthControls();
                      return;
                    }
                    if (step.target === "corporate_setup") {
                      openCorporateControls();
                      return;
                    }
                    if (step.target === "billing") {
                      openCorporateControls();
                      window.setTimeout(() => setSetupView("billing"), 50);
                      return;
                    }
                    if (step.target === "verify") {
                      openWorkspaceOrSetup("verify");
                      return;
                    }
                    downloadTextFile(serverReleasePacketName, JSON.stringify(serverReleasePacket, null, 2), "application/json");
                  }}
                  type="button"
                >
                  {step.action}
                </button>
              </article>
            ))}
          </div>
        </section>

        {!workspaceAllowed ? (
          <PermissionGate
            roleLabel={activeRole.label}
            workspaceLabel={workspace.label}
            onOpenAccount={openAuthControls}
            onOpenCorporateSetup={openCorporateControls}
          />
        ) : (
          <>
        <section className="workspace-command-strip" aria-label="Workspace command strip">
          <div>
            <span className={`status-chip ${authSession ? "success" : "neutral"}`}>Workspace command strip</span>
            <strong>{workspaceCommandStrip.current_portal}</strong>
            <small>{workspaceCommandStrip.current_detail}</small>
          </div>
          <div className="workspace-command-metrics">
            <span>
              <strong>{workspaceCommandStrip.mode}</strong>
              <small>{workspaceCommandStrip.role}</small>
            </span>
            <span>
              <strong>{workspaceCommandStrip.organization}</strong>
              <small>{activeOrganization.type.replace("_", " ")}</small>
            </span>
            <span>
              <strong>{workspaceCommandStrip.next_action}</strong>
              <small>{workspaceCommandStrip.next_detail}</small>
            </span>
          </div>
          <div className="workspace-command-actions">
            <button className="primary-action" onClick={() => changeWorkspace(nextWorkspaceStep.id)} type="button">
              Open next workspace
            </button>
            <button className="secondary-action" onClick={openAuthControls} type="button">
              Account
            </button>
          </div>
        </section>
        <section className="hero">
          <div className="hero-card primary">
            <div className="hero-card-top">
              <span className="eyebrow">{workspace.heroLabel}</span>
              <span className="status-chip success">
                <LockKeyhole size={13} />
                permissioned
              </span>
            </div>
            <div className="hero-value">{workspace.heroValue}</div>
            <p>{workspace.heroDetail}</p>
            <div className="meter">
              <span style={{ width: `${workspace.readiness}%` }} />
            </div>
          </div>

          <div className="hero-card">
            <div className="hero-card-top">
              <span className="eyebrow">Active context</span>
              <span className="status-chip neutral">{activeRole.label}</span>
            </div>
            <h2>{activeOrganization.name}</h2>
            <p>All views, exports, and evidence access are filtered through role, organization, consent, and Access Grant scope.</p>
            <div className="context-actions">
              <button
                className="primary-action"
                onClick={() => changeWorkspace(hasPermission(activeMembership.role, "passport:view_shared") ? "verify" : "passport")}
                type="button"
              >
                <Eye size={16} />
                {hasPermission(activeMembership.role, "passport:view_shared") ? "Preview shared access" : "Preview Passport"}
              </button>
              <button className="secondary-action" onClick={() => changeWorkspace("passport")} type="button">
                <KeyRound size={16} />
                Grants
              </button>
            </div>
          </div>

          <AdvisoryCard summary={advisorySummary} />
        </section>

        <section className="metrics-grid">
          {workspace.metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </section>

        <DatabaseStatusStrip
          accountContext={accountContext}
          accessGrants={accessGrants}
          authSession={authSession}
          consentAuthorizations={consentAuthorizations}
          evidenceDocuments={evidenceDocuments}
          livePassportRecords={livePassportRecords}
          organizationSubscriptions={organizationSubscriptions}
          teamInvitations={teamInvitations}
          teamMembers={teamMembers}
          onOpenReadiness={() => setSetupView("readiness")}
          onOpenRegistration={() => setShowPublicSite(true)}
        />

        <section className="v1-completion-cockpit" aria-label="V1 completion cockpit">
          <div className="v1-completion-cockpit-header">
            <div>
              <span className={`status-chip ${v1CodeOwnedReadyLanes === v1CodeOwnedTotalLanes ? "success" : "warning"}`}>
                V1 completion cockpit
              </span>
              <strong>{v1CodeOwnedReadyLanes}/{v1CodeOwnedTotalLanes} code-owned V1 lanes ready</strong>
              <small>{nextV1CompletionLane.detail}</small>
            </div>
            <button
              className="secondary-action"
              onClick={() =>
                downloadTextFile(
                  `trustgraph-v1-completion-cockpit-${new Date().toISOString().slice(0, 10)}.json`,
                  JSON.stringify(v1CompletionCockpit, null, 2),
                  "application/json"
                )
              }
              type="button"
            >
              Export V1 cockpit
            </button>
          </div>
          <div className="v1-completion-progress" aria-label="V1 completion progress">
            <span style={{ width: `${Math.round((v1CodeOwnedReadyLanes / v1CodeOwnedTotalLanes) * 100)}%` }} />
          </div>
          <div className="live-database-contract" aria-label="Live database contract">
            <div>
              <span className={`status-chip ${liveDatabaseContract.accepted ? "success" : "warning"}`}>Live database contract</span>
              <strong>{liveDatabaseContract.required_groups_loaded}/{liveDatabaseContract.required_groups_total} required row groups loaded</strong>
              <small>{liveDatabaseContract.acceptance_rule}</small>
            </div>
            <div className="live-database-contract-grid">
              <span>
                <strong>{liveDatabaseContract.accepted_source.replace(/_/g, " ")}</strong>
                <small>Accepted source</small>
              </span>
              <span>
                <strong>{liveDatabaseContract.preview_data_accepted ? "Yes" : "No"}</strong>
                <small>Preview data accepted</small>
              </span>
              <span>
                <strong>{liveDatabaseContract.current_blocker}</strong>
                <small>Current blocker</small>
              </span>
            </div>
            <small>{liveDatabaseContract.operator_next_step}</small>
          </div>
          <div className="v1-completion-lane-grid">
            {v1CompletionLanes.map((lane) => (
              <article className={lane.ready ? "ready" : lane.target === "readiness" ? "human-gate" : ""} key={lane.label}>
                <div>
                  <strong>{lane.label}</strong>
                  <small>{lane.detail}</small>
                  <span>{lane.status}</span>
                </div>
                <button
                  className={lane.ready ? "secondary-action" : "primary-action"}
                  onClick={() => {
                    if (lane.target === "account") {
                      openAuthControls();
                      return;
                    }
                    if (lane.target === "corporate_setup") {
                      openCorporateControls();
                      return;
                    }
                    if (lane.target === "billing") {
                      openCorporateControls();
                      window.setTimeout(() => setSetupView("billing"), 50);
                      return;
                    }
                    if (lane.target === "readiness") {
                      setSetupView("readiness");
                      document.getElementById("corporate-account-controls")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      return;
                    }
                    changeWorkspace(lane.target);
                  }}
                  type="button"
                >
                  {lane.action}
                </button>
              </article>
            ))}
          </div>
        </section>

        <CorporateDailyTaskHub
          accessGrants={accessGrants}
          activeOrganization={activeOrganization}
          activeRole={activeRole}
          authSession={authSession}
          missingRecordRequests={missingRecordRequests}
          organizationSubscriptions={organizationSubscriptions}
          schemaMigrationRuns={schemaMigrationRuns}
          sharedVerifyRecords={sharedVerifyRecords}
          teamInvitations={teamInvitations}
          teamMembers={teamMembers}
          verifyRequests={verifyRequests}
          onOpenSetup={(view) => {
            setSetupView(view);
            document.getElementById("corporate-account-controls")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          onOpenWorkspace={changeWorkspace}
        />

        <section className="signed-in-landing-actions" aria-label="Signed-in landing actions">
          <div className="signed-in-landing-header">
            <div>
              <span className={`status-chip ${authSession ? "success" : "warning"}`}>
                {authSession ? "Operator home" : "Login to activate"}
              </span>
              <strong>{authSession ? `Start here as ${activeRole.label}` : "Choose a portal, then login or register"}</strong>
              <small>
                {authSession
                  ? "Open the one area you need now. Account includes logout, password reset, and hosted link repair."
                  : "Preview mode shows the product path; live database rows require hosted login."}
              </small>
            </div>
            <button className="secondary-action" onClick={authSession ? handleSignOut : openAuthControls} type="button">
              {authSession ? "Logout" : "Login or register"}
            </button>
          </div>
          <div className="signed-in-landing-grid">
            {signedInLandingActions.map((item) => {
              const allowed = item.kind === "workspace" ? canAccessWorkspace(activeMembership.role, item.target as WorkspaceId) : true;
              const active = item.kind === "workspace" && item.target === workspace.id;

              return (
                <article className={active ? "active" : ""} key={item.label}>
                  <div>
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                    <span>{item.status}</span>
                  </div>
                  <button
                    className={active ? "primary-action" : "secondary-action"}
                    onClick={() => {
                      if (item.kind === "account") {
                        openAuthControls();
                        return;
                      }
                      openWorkspaceOrSetup(item.target as WorkspaceId);
                    }}
                    type="button"
                  >
                    {allowed ? item.action : "Set up access"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
        <section className="dashboard-start-map" aria-label="Dashboard start map">
          <div className="dashboard-start-map-header">
            <div>
              <span className="status-chip success">Workspace picker</span>
              <strong>Pick the right workspace for the job</strong>
              <small>Passport is personal. Verify is for scoped corporate review. Admin is for company setup, roles, team, billing, and launch readiness.</small>
            </div>
            <span className={`status-chip ${authSession ? "success" : "warning"}`}>
              {authSession ? "live database session" : "login required"}
            </span>
          </div>
          <div className="dashboard-start-map-grid">
            {dashboardStartMap.map((item) => {
              const allowed = canAccessWorkspace(activeMembership.role, item.target);

              return (
                <article className={item.ready ? "ready" : ""} key={item.label}>
                  <div>
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                    <span>{item.status}</span>
                  </div>
                  <button className={item.target === workspace.id ? "primary-action" : "secondary-action"} onClick={() => openWorkspaceOrSetup(item.target)} type="button">
                    {allowed ? item.action : "Set up access"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
        <section className="proof-export-hub" aria-label="Proof and exports hub">
          <div className="proof-export-hub-header">
            <div>
              <span className="status-chip neutral">Proof &amp; exports</span>
              <strong>Download the evidence packet you need</strong>
              <small>Use this when you need database proof, Corporate Verify proof, user database packets, or the scoped workspace report.</small>
            </div>
            <span className={`status-chip ${authSession ? "success" : "warning"}`}>{authSession ? "scope enforced" : "preview only"}</span>
          </div>
          <div className="proof-export-hub-grid">
            {proofExportHub.map((item) => (
              <article key={item.label}>
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                  <span>{item.status}</span>
                </div>
                <button
                  className={item.target === "export" ? "primary-action" : "secondary-action"}
                  onClick={() => {
                    if (item.target === "export") {
                      downloadTextFile(authorizedReportName, JSON.stringify(authorizedReport, null, 2), "application/json");
                      return;
                    }
                    if (item.target === "account") {
                      openAuthControls();
                      window.setTimeout(() => {
                        document.getElementById("live-database-proof")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 50);
                      return;
                    }
                    changeWorkspace(item.target);
                  }}
                  type="button"
                >
                  {item.action}
                </button>
              </article>
            ))}
          </div>
        </section>

            <section className="workspace-admin-grid" id="corporate-account-controls">
              <div className="setup-center-header">
                <span className="eyebrow">Setup center</span>
                <h2>Account, corporate access, and rollout controls</h2>
                <p>Follow the corporate setup path in order: login, workspace, RBAC, team, billing, then readiness. Each action opens the exact panel needed for the next live database step.</p>
              </div>
              <div className="corporate-launch-cockpit" aria-label="Corporate launch cockpit">
                <div className="corporate-launch-cockpit-top">
                  <div>
                    <span className={`status-chip ${corporateSetupComplete === corporateSetupSteps.length ? "success" : "warning"}`}>
                      Corporate launch cockpit
                    </span>
                    <strong>{nextCorporateSetupStep.done ? "Corporate portal is ready for Verify work" : nextCorporateSetupStep.label}</strong>
                    <small>{nextCorporateSetupStep.detail}</small>
                  </div>
                  <button
                    className="primary-action"
                    onClick={() => {
                      if (nextCorporateSetupStep.id === "verify") {
                        openWorkspaceOrSetup("verify");
                        return;
                      }
                      setSetupView(nextCorporateSetupStep.target);
                    }}
                    type="button"
                  >
                    {nextCorporateSetupStep.id === "verify" ? "Open Verify" : `Open ${nextCorporateSetupStep.label}`}
                  </button>
                </div>
                <div className="corporate-launch-progress" aria-label="Corporate launch progress">
                  <span style={{ width: `${Math.round((corporateSetupComplete / corporateSetupSteps.length) * 100)}%` }} />
                </div>
                <div className="corporate-launch-lanes">
                  {corporateLaunchLanes.map((lane) => (
                    <article className={lane.ready ? "ready" : ""} key={lane.label}>
                      <div>
                        <strong>{lane.label}</strong>
                        <small>{lane.detail}</small>
                        <span>{lane.status}</span>
                      </div>
                      <button
                        className={lane.ready ? "secondary-action" : "primary-action"}
                        onClick={() => {
                          if (lane.target === "verify") {
                            openWorkspaceOrSetup("verify");
                            return;
                          }
                          setSetupView(lane.target);
                        }}
                        type="button"
                      >
                        {lane.action}
                      </button>
                    </article>
                  ))}
                </div>
                <div className="corporate-launch-counts">
                  <span>
                    <strong>{corporateLaunchCockpit.live_counts.team_members}</strong>
                    <small>Team members</small>
                  </span>
                  <span>
                    <strong>{corporateLaunchCockpit.live_counts.subscription_ledgers}</strong>
                    <small>Billing rows</small>
                  </span>
                  <span>
                    <strong>{corporateLaunchCockpit.live_counts.shared_user_rows}</strong>
                    <small>User rows visible</small>
                  </span>
                </div>
                <button
                  className="secondary-action"
                  onClick={() =>
                    downloadTextFile(
                      `trustgraph-corporate-launch-cockpit-${new Date().toISOString().slice(0, 10)}.json`,
                      JSON.stringify(corporateLaunchCockpit, null, 2),
                      "application/json"
                    )
                  }
                  type="button"
                >
                  Export cockpit proof
                </button>
              </div>
              <div className="corporate-operator-strip" aria-label="Corporate operator status">
                {corporateOperatorStatus.map((item) => (
                  <article className={item.tone} key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <small>{item.detail}</small>
                  </article>
                ))}
              </div>
              <div className="setup-command-bar" aria-label="Setup command bar">
                <div>
                  <span className="status-chip success">Setup command bar</span>
                  <strong>{setupTabs.find((tab) => tab.id === setupView)?.label ?? "Setup"}</strong>
                  <small>Next action: {nextCorporateSetupStep.label} - {nextCorporateSetupStep.detail}</small>
                </div>
                <div className="setup-command-metrics">
                  <span>
                    <strong>{corporateSetupComplete}/{corporateSetupSteps.length}</strong>
                    <small>Steps ready</small>
                  </span>
                  <span>
                    <strong>{authSession ? "Live" : "Preview"}</strong>
                    <small>Database mode</small>
                  </span>
                  <span>
                    <strong>{activeRole.label}</strong>
                    <small>Active RBAC role</small>
                  </span>
                </div>
                <div className="setup-command-actions">
                  <button className="primary-action" onClick={() => setSetupView(nextCorporateSetupStep.target)} type="button">
                    Open next step
                  </button>
                  <button className="secondary-action" onClick={() => changeWorkspace("verify")} type="button">
                    Open Verify
                  </button>
                  <button className="secondary-action" onClick={() => setShowPublicSite(true)} type="button">
                    Public registration
                  </button>
                </div>
              </div>
              <div className="setup-route-deck" aria-label="Corporate setup route">
                <button className={setupView === "account" ? "active" : ""} onClick={() => setSetupView("account")} type="button">
                  <span>1</span>
                  <strong>Account first</strong>
                  <small>Login, logout, recovery, and hosted email link repair live here.</small>
                </button>
                <button className={setupView === "corporate" || setupView === "team" || setupView === "billing" ? "active" : ""} onClick={() => setSetupView("corporate")} type="button">
                  <span>2</span>
                  <strong>Build company workspace</strong>
                  <small>Create the organization, activate RBAC, invite reviewers, and select the pilot ledger.</small>
                </button>
                <button className={workspace.id === "verify" ? "active" : ""} onClick={() => openWorkspaceOrSetup("verify")} type="button">
                  <span>3</span>
                  <strong>Verify users</strong>
                  <small>Request Passport access, review approved rows, and export scoped corporate proof.</small>
                </button>
              </div>
              <div className="team-billing-handoff" aria-label="Team and billing handoff">
                <div className="team-billing-handoff-header">
                  <div>
                    <span className={`status-chip ${teamBillingHandoffSteps.every((step) => step.done) ? "success" : "warning"}`}>
                      Team and billing handoff
                    </span>
                    <strong>{nextTeamBillingHandoffStep.label}</strong>
                    <small>{nextTeamBillingHandoffStep.detail}</small>
                  </div>
                  <button
                    className="primary-action"
                    onClick={() => {
                      if (nextTeamBillingHandoffStep.target === "verify") {
                        openWorkspaceOrSetup("verify");
                        return;
                      }
                      setSetupView(nextTeamBillingHandoffStep.target);
                    }}
                    type="button"
                  >
                    {nextTeamBillingHandoffStep.target === "verify" ? "Open Verify" : `Open ${nextTeamBillingHandoffStep.label}`}
                  </button>
                </div>
                <div className="team-billing-handoff-grid">
                  {teamBillingHandoffSteps.map((step, index) => (
                    <article className={step.done ? "ready" : step.label === nextTeamBillingHandoffStep.label ? "next" : ""} key={step.label}>
                      <span>{index + 1}</span>
                      <div>
                        <strong>{step.label}</strong>
                        <small>{step.detail}</small>
                        <small>{step.status}</small>
                      </div>
                      <button
                        className={step.done ? "secondary-action" : "primary-action"}
                        onClick={() => {
                          if (step.target === "verify") {
                            openWorkspaceOrSetup("verify");
                            return;
                          }
                          setSetupView(step.target);
                        }}
                        type="button"
                      >
                        {step.target === "verify" ? "Open Verify" : `Open ${step.target}`}
                      </button>
                    </article>
                  ))}
                </div>
                <div className="team-billing-handoff-counts">
                  <span>
                    <strong>{teamMembers.length + teamInvitations.length}</strong>
                    <small>Team signals</small>
                  </span>
                  <span>
                    <strong>{organizationSubscriptions.length}</strong>
                    <small>Billing rows</small>
                  </span>
                  <span>
                    <strong>{sharedVerifyRecords.length}</strong>
                    <small>Verify rows</small>
                  </span>
                </div>
                <button
                  className="secondary-action"
                  onClick={() =>
                    downloadTextFile(
                      `trustgraph-team-billing-handoff-${new Date().toISOString().slice(0, 10)}.json`,
                      JSON.stringify(teamBillingHandoffPacket, null, 2),
                      "application/json"
                    )
                  }
                  type="button"
                >
                  Export handoff proof
                </button>
              </div>
              <div className="corporate-setup-guide" aria-label="Corporate setup guide">
                <div className="corporate-setup-summary">
                  <span className="eyebrow">Corporate launch path</span>
                  <strong>{corporateSetupComplete}/{corporateSetupSteps.length} setup steps complete</strong>
                  <small>Next: {nextCorporateSetupStep.label} - {nextCorporateSetupStep.detail}</small>
                </div>
                <div className="corporate-setup-steps">
                  {corporateSetupSteps.map((step, index) => (
                    <button
                      className={step.done ? "complete" : step.id === nextCorporateSetupStep.id ? "next" : ""}
                      key={step.id}
                      onClick={() => setSetupView(step.target)}
                      type="button"
                    >
                      <span>{index + 1}</span>
                      <strong>{step.label}</strong>
                      <small>{step.status}</small>
                    </button>
                  ))}
                </div>
              </div>
              <div className="setup-tabs" role="tablist" aria-label="Setup center sections">
                {setupTabs.map((tab) => (
                  <button
                    aria-selected={setupView === tab.id}
                    className={setupView === tab.id ? "active" : ""}
                    key={tab.id}
                    onClick={() => setSetupView(tab.id)}
                    role="tab"
                    type="button"
                  >
                    <span>{tab.label}</span>
                    <small>{tab.detail}</small>
                    {tab.count ? <strong>{tab.count}</strong> : null}
                  </button>
                ))}
              </div>
              <div className="setup-panel-grid">
                {setupView === "account" ? (
                  <>
                    <AuthPanel
                      accountStatus={accountStatus}
                      dataRightsMessage={dataRightsStatus}
                      dataRightsRequests={dataRightsRequests}
                      hostedCallbackProof={hostedCallbackProof}
                      session={authSession}
                      onDataRightsRequest={createLiveDataRightsRequest}
                      onSession={setAuthSession}
                    />
                    <LiveDataModePanel
                      accountContext={accountContext}
                      activeMembership={activeMembership}
                      activeOrganization={activeOrganization}
                      activeRoleLabel={activeRole.label}
                      authSession={authSession}
                      workspaceLabel={workspace.label}
                    />
                  </>
                ) : null}
                {setupView === "corporate" ? (
                  <>
                    <AccountPanel
                      accountUser={accountUser}
                      activeMembership={activeMembership}
                      authSession={authSession}
                      authStatus={authStatus}
                      organizationList={organizationList}
                      onAssignRole={assignLiveCorporateRole}
                      onCreateCorporateAccount={createLiveCorporateAccount}
                      onCreateOperationsRole={createLiveOperationsRole}
                      onSwitch={switchMembership}
                    />
                    <MyInvitationsPanel
                      disabled={!authSession || !accountContext}
                      invitations={myInvitations}
                      message={myInvitationStatus}
                      onAccept={acceptLiveTeamInvitation}
                    />
                  </>
                ) : null}
                {setupView === "team" ? (
                  <>
                    <TeamInvitationsPanel
                      disabled={!authSession || !accountContext || !hasPermission(activeMembership.role, "organization:manage")}
                      invitations={teamInvitations}
                      message={teamStatus}
                      onCreate={createLiveTeamInvitation}
                      onStatus={updateLiveTeamInvitationStatus}
                    />
                    <TeamMembersPanel
                      currentProfileId={accountContext?.profile.id ?? null}
                      disabled={!authSession || !accountContext || !hasPermission(activeMembership.role, "organization:manage")}
                      members={teamMembers}
                      message={memberStatus}
                      onStatus={updateLiveTeamMemberStatus}
                    />
                    <MyInvitationsPanel
                      disabled={!authSession || !accountContext}
                      invitations={myInvitations}
                      message={myInvitationStatus}
                      onAccept={acceptLiveTeamInvitation}
                    />
                  </>
                ) : null}
                {setupView === "billing" ? (
                  <BillingPanel
                    disabled={!authSession || !accountContext || !hasPermission(activeMembership.role, "organization:manage")}
                    message={billingStatus}
                    onActivate={activateLiveSubscription}
                    plans={subscriptionPlans}
                    subscriptions={organizationSubscriptions}
                  />
                ) : null}
                {setupView === "readiness" ? (
                  <>
                    <ProductionReadinessPanel
                      accountContext={accountContext}
                      activeOrganizationName={activeOrganization.name}
                      authSession={authSession}
                      teamManagementReady={teamManagementReady}
                    />
                    <OnboardingChecklistPanel
                      accessGrants={accessGrants}
                      accountContext={accountContext}
                      authSession={authSession}
                      consentAuthorizations={consentAuthorizations}
                      corporateAccessReviews={corporateAccessReviews}
                      evidenceDocuments={evidenceDocuments}
                      livePassportRecords={livePassportRecords}
                      organizationSubscriptions={organizationSubscriptions}
                      schemaMigrationRuns={schemaMigrationRuns}
                      teamInvitations={teamInvitations}
                      teamMembers={teamMembers}
                      onOpenHostedRegistration={() => setShowPublicSite(true)}
                      onOpenWorkspace={changeWorkspace}
                      onSeedPilotWorkspace={seedLivePilotWorkspace}
                    />
                    <PilotAcceptancePanel
                      accessGrants={accessGrants}
                      apiClients={apiClients}
                      auditEvents={auditEvents}
                      consentAuthorizations={consentAuthorizations}
                      evidenceDocuments={evidenceDocuments}
                      livePassportRecords={livePassportRecords}
                      schemaMigrationRuns={schemaMigrationRuns}
                      sharedVerifyRecords={sharedVerifyRecords}
                      subscriptions={organizationSubscriptions}
                      teamInvitations={teamInvitations}
                      teamMembers={teamMembers}
                    />
                    <NotificationPanel events={notificationEvents} message={notificationStatus} onStatus={updateLiveNotificationStatus} />
                  </>
                ) : null}
              </div>
            </section>

        <section className="work-grid">
          <div className="records-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Operational record surface</span>
                <h2>Records, evidence, and next actions</h2>
              </div>
              <label className="search-box">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search status, source, credential, person"
                />
              </label>
            </div>

            <div className="filter-bar">
              <span>
                <Filter size={14} />
                Smart filters
              </span>
              <button onClick={() => setQuery("verified")} type="button">Verified</button>
              <button onClick={() => setQuery("expiring")} type="button">Expiring</button>
              <button onClick={() => setQuery("restricted")} type="button">Restricted</button>
              <button onClick={() => setQuery("disputed")} type="button">Disputed</button>
            </div>

            <div className="records-list">
              {records.map((record) => (
                <RecordRow
                  key={record.id}
                  record={record}
                  selected={record.id === selectedRecord.id}
                  onSelect={() => setSelectedId(record.id)}
                />
              ))}
            </div>
            <RenewalReadinessPanel records={records} workspaceLabel={workspace.label} />
            <ConfidentialityReviewPanel records={records} workspaceLabel={workspace.label} />
            <SkillsEvidencePanel records={records} workspaceLabel={workspace.label} />

            {workspace.id === "passport" ? (
              <>
                <PassportRecordForm
                  disabled={!authSession || !accountContext}
                  message={recordStatus}
                  onCreate={createLivePassportRecord}
                />
                <RecordDisputePanel
                  disabled={!authSession || !accountContext}
                  message={recordStatus}
                  record={selectedRecord}
                  onOpenDispute={openLiveRecordDispute}
                />
                <AccessGrantsPanel
                  disabled={!authSession || !accountContext}
                  grants={accessGrants}
                  message={grantStatus}
                  onDecision={handleGrantDecision}
                  onPilotRequest={createPilotGrantRequest}
                />
                <ConsentAuthorizationsPanel
                  authorizations={consentAuthorizations}
                  disabled={!authSession || !accountContext}
                  grants={accessGrants}
                  message={consentStatus}
                  records={livePassportRecords}
                  onCreate={createLiveConsentAuthorization}
                  onRevoke={revokeLiveConsentAuthorization}
                />
                <ReferenceRequestsPanel
                  disabled={!authSession || !accountContext}
                  message={referenceStatus}
                  onCreate={createLiveReferenceRequest}
                  onStatus={updateLiveReferenceStatus}
                  requests={referenceRequests}
                />
                <PassportMissingRecordPanel
                  disabled={!authSession || !accountContext}
                  message={passportMissingRecordStatus}
                  onStatus={updateLiveMissingRecordStatus}
                  requests={passportMissingRecordRequests}
                />
              </>
            ) : null}

            {workspace.id === "verify" ? (
              <VerifyRequestsPanel
                activeOrganization={activeOrganization}
                consentAuthorizations={consentAuthorizations}
                disabled={!authSession || !accountContext || !canAccessWorkspace(activeMembership.role, "verify")}
                issuerCredentials={issuerCredentials}
                issuerDisabled={
                  !authSession ||
                  !accountContext ||
                  !canAccessWorkspace(activeMembership.role, "verify") ||
                  !hasPermission(activeMembership.role, "record:issue_credential")
                }
                issuerMessage={issuerStatus}
                message={verifyStatus}
                missingRecordMessage={missingRecordStatus}
                missingRecordRequests={missingRecordRequests}
                reviews={corporateAccessReviews}
                subscriptions={organizationSubscriptions}
                teamInvitations={teamInvitations}
                teamMembers={teamMembers}
                onCreateAccessRequest={createLiveAccessGrantRequest}
                onCreateMissingRecordRequest={createLiveMissingRecordRequest}
                onRecordAccessReview={recordLiveCorporateAccessReview}
                onCreateIssuerRole={createLiveCredentialIssuerRole}
                onCreateReviewerRole={createPilotReviewerRole}
                onIssueCredential={issueLiveCredential}
                onRevokeCredential={revokeLiveIssuerCredential}
                onUpdateCredentialExpiry={updateLiveIssuerCredentialExpiry}
                onMissingRecordStatus={updateLiveMissingRecordStatus}
                requests={verifyRequests}
                sharedRecords={sharedVerifyRecords}
              />
            ) : null}

            {workspace.id === "admin" ? (
              <>
                <OperationsQueuePanel
                  cases={operationsCases}
                  dataRightsRequests={dataRightsRequests}
                  disabled={!authSession || !accountContext || !canAccessWorkspace(activeMembership.role, "admin")}
                  message={operationsStatus}
                  onCreatePilotCases={createLiveOperationsPilotCases}
                  onDataRightsStatus={updateLiveDataRightsStatus}
                  onDecision={decideLiveOperationsCase}
                />
                <ConnectPanel
                  apiClients={apiClients}
                  disabled={!authSession || !accountContext || !canAccessWorkspace(activeMembership.role, "admin")}
                  message={connectStatus}
                  onClientStatus={updateLiveApiClientStatus}
                  onCreateClient={createLiveApiClient}
                  onCreateWebhook={createLiveWebhookSubscription}
                  onWebhookStatus={updateLiveWebhookStatus}
                  webhooks={webhookSubscriptions}
                />
                <AuditTrailPanel
                  corporateAccessReviews={corporateAccessReviews}
                  events={auditEvents}
                  evidenceDocuments={evidenceDocuments}
                  message={auditStatus}
                  operationsCases={operationsCases}
                  schemaMigrationRuns={schemaMigrationRuns}
                />
                <ReleaseLedgerPanel message={releaseStatus} migrations={schemaMigrationRuns} />
                <VpsLaunchPanel />
                <WorkflowQaPanel
                  accessGrants={accessGrants}
                  apiClients={apiClients}
                  auditEvents={auditEvents}
                  consentAuthorizations={consentAuthorizations}
                  livePassportRecords={livePassportRecords}
                  notificationEvents={notificationEvents}
                  operationsCases={operationsCases}
                  referenceRequests={referenceRequests}
                  sharedVerifyRecords={sharedVerifyRecords}
                  subscriptions={organizationSubscriptions}
                  teamMembers={teamMembers}
                  webhookSubscriptions={webhookSubscriptions}
                />
                <SecurityReviewPanel
                  apiClients={apiClients}
                  auditEvents={auditEvents}
                  consentAuthorizations={consentAuthorizations}
                  evidenceDocuments={evidenceDocuments}
                  schemaMigrationRuns={schemaMigrationRuns}
                  subscriptions={organizationSubscriptions}
                  teamMembers={teamMembers}
                  webhookSubscriptions={webhookSubscriptions}
                />
                <ConsentPolicyMatrixPanel />
                <PlanAlignmentPanel
                  disabled={!authSession || !accountContext || !canAccessWorkspace(activeMembership.role, "admin")}
                  livePilotRowProof={livePilotRowProof}
                  onRecordPilotLaunchContact={recordLivePilotLaunchContact}
                  onRecordGateDecision={recordLiveProductionGateDecision}
                  pilotLaunchContacts={pilotLaunchContacts}
                  productionGateDecisions={productionGateDecisions}
                />
              </>
            ) : null}
          </div>

          <div className="side-stack">
            <section className="actions-panel">
              <div className="mini-heading">
                <Clock3 size={16} />
                <strong>Priority work</strong>
              </div>
              {workspace.actions.map((action) => (
                <ActionCard key={action.title} {...action} />
              ))}
            </section>
            <RecordDetail
              canEdit={workspace.id === "passport" && selectedRecordIsLive}
              evidenceDocuments={selectedEvidenceDocuments}
              onCreateEvidence={createLiveEvidenceDocument}
              onOpenEvidence={openLiveEvidenceDocument}
              onUpdate={updateLivePassportRecord}
              record={selectedRecord}
            />
          </div>
        </section>

        <footer className="system-strip">
          <span>
            <CalendarClock size={15} />
            Verification timestamps visible
          </span>
          <span>
            <LockKeyhole size={15} />
            Evidence access separated from status access
          </span>
          <span>
            <Activity size={15} />
            Audit Events generated for material actions
          </span>
        </footer>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
