"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity,
  BadgeCheck,
  Bell,
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
  DbEvidenceDocument,
  DbIssuerCredential,
  DbMissingRecordRequest,
  DbNotificationEvent,
  DbOrganizationInvitation,
  DbOrganizationSubscription,
  DbPilotLaunchContact,
  DbProductionGateDecision,
  DbReferenceRequest,
  DbSchemaMigrationRun,
  DbSubscriptionPlan,
  DbVerificationCase,
  DbWebhookSubscription,
  ProductionGateStatus,
  PilotLaunchContactStatus,
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
  loadIssuerCredentials
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
import {
  createAccessGrantRequest,
  decideAccessGrant,
  loadAccessGrants,
  loadVerifyAccessGrants,
  preparePilotAccessGrant,
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
import { createPassportRecord, loadPassportRecords, loadSharedVerifyRecords, updatePassportRecord } from "./recordRepository";
import {
  canAccessWorkspace,
  getActiveMembership,
  getOrganization,
  getOrganizationFromList,
  getRole,
  hasPermission,
  organizations,
  type RoleKey,
  sessionUser,
  type Organization,
  type SessionUser,
  type Membership
} from "./rbac";

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
    <button className={`workspace-button ${active ? "active" : ""}`} disabled={!allowed} onClick={onClick}>
      <span>{workspace.label}</span>
      <small>{allowed ? workspace.role : "Role required"}</small>
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
      <small>{summary.sourceCount} authorized source items reviewed</small>
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
  onOpenEvidence: (document: DbEvidenceDocument, mode: "preview" | "download") => Promise<void>;
  onUpdate: (input: {
    recordId: string;
    title: string;
    sourceName: string;
    evidenceSummary: string;
    expiresAt: string;
    status: RecordStatus;
    sensitivity: TrustRecordSensitivity;
    consentRequired: boolean;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState(record.title);
  const [sourceName, setSourceName] = useState(record.source);
  const [evidenceSummary, setEvidenceSummary] = useState(record.evidence === "Evidence details pending" ? "" : record.evidence);
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
  const [evidenceQuery, setEvidenceQuery] = useState("");
  const [evidenceStatusFilter, setEvidenceStatusFilter] = useState<"all" | "uploaded" | "classified" | "linked" | "restricted" | "rejected" | "archived">("all");
  const linkedEvidenceCount = evidenceDocuments.filter((document) => document.status === "linked").length;
  const uploadedEvidenceCount = evidenceDocuments.filter((document) => document.status === "uploaded").length;
  const flaggedEvidenceCount = evidenceDocuments.filter((document) => document.status === "restricted" || document.status === "rejected").length;
  const filteredEvidenceDocuments = evidenceDocuments.filter((document) => {
    const matchesStatus = evidenceStatusFilter === "all" || document.status === evidenceStatusFilter;
    const haystack = `${document.title} ${document.document_type} ${document.source_name} ${document.status}`.toLowerCase();
    return matchesStatus && haystack.includes(evidenceQuery.trim().toLowerCase());
  });
  const evidenceManifestName = `trustgraph-evidence-manifest-${record.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`;

  useEffect(() => {
    setTitle(record.title);
    setSourceName(record.source);
    setEvidenceSummary(record.evidence === "Evidence details pending" ? "" : record.evidence);
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
        expiresAt,
        status,
        sensitivity,
        consentRequired
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
      await onOpenEvidence(document, mode);
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
                <strong>{evidenceDocuments.filter((document) => document.storage_path).length}</strong>
              </div>
            </div>
            <div className="evidence-source-strip">
              <span className="status-chip success">Signed evidence links</span>
              <small>Private files stay in Supabase Storage and open through short-lived preview or download URLs; metadata-only evidence remains visible without exposing files.</small>
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

  async function submitRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("Saving live Passport record...");

    try {
      await onCreate({ type, title, sourceName, evidenceSummary, issuedAt, expiresAt, sensitivity, consentRequired });
      setTitle("");
      setSourceName("");
      setEvidenceSummary("");
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
  sharedRecords,
  onCreateAccessRequest,
  onCreateIssuerRole,
  onCreateMissingRecordRequest,
  onIssueCredential,
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
  sharedRecords: RecordItem[];
  onCreateAccessRequest: (input: { subjectEmail: string; purpose: string; expiresInDays: number }) => Promise<void>;
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
      <form className="verify-request-form" onSubmit={submitAccessRequest}>
        <div className="record-form-grid">
          <input
            disabled={disabled || requestBusy}
            onChange={(event) => setSubjectEmail(event.target.value)}
            placeholder="professional@email.com"
            type="email"
            value={subjectEmail}
          />
          <input
            disabled={disabled || requestBusy}
            onChange={(event) => setPurpose(event.target.value)}
            placeholder="Business reason for requesting Passport access"
            value={purpose}
          />
          <input
            disabled={disabled || requestBusy}
            max={90}
            min={1}
            onChange={(event) => setExpiresInDays(Number(event.target.value))}
            type="number"
            value={expiresInDays}
          />
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
      <div className="grant-list">
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
      <CorporateDirectoryPanel missingRecordRequests={missingRecordRequests} requests={requests} sharedRecords={sharedRecords} />
      {disabled ? <small>Switch to an employer or staffing reviewer role to use live Verify data.</small> : null}
      <IssuerCredentialsPanel
        credentials={issuerCredentials}
        disabled={issuerDisabled}
        message={issuerMessage}
        onCreateIssuerRole={onCreateIssuerRole}
        onIssueCredential={onIssueCredential}
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

function CorporateDirectoryPanel({
  missingRecordRequests,
  requests,
  sharedRecords
}: {
  missingRecordRequests: DbMissingRecordRequest[];
  requests: VerifyAccessGrantView[];
  sharedRecords: RecordItem[];
}) {
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "requested" | "approved" | "declined" | "revoked">("all");
  const candidateRows = requests.map((request) => ({
    id: request.id,
    name: request.subject_profile.full_name,
    detail: request.subject_profile.email,
    rawStatus: request.status,
    status: request.status.replace(/_/g, " "),
    signal: request.purpose
  }));
  const filteredRows = candidateRows.filter((row) => {
    const matchesStatus = statusFilter === "all" || row.rawStatus === statusFilter;
    const haystack = `${row.name} ${row.detail} ${row.signal}`.toLowerCase();
    return matchesStatus && haystack.includes(directoryQuery.trim().toLowerCase());
  });
  const exportName = `trustgraph-corporate-directory-${new Date().toISOString().slice(0, 10)}.csv`;

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
        <button
          className="secondary-action"
          disabled={!filteredRows.length}
          onClick={() => downloadTextFile(exportName, corporateDirectoryToCsv(filteredRows), "text/csv")}
          type="button"
        >
          Export CSV
        </button>
      </div>
      <div className="directory-metrics">
        <div>
          <strong>{requests.length}</strong>
          <small>Access records</small>
        </div>
        <div>
          <strong>{sharedRecords.length}</strong>
          <small>Shared Passport records</small>
        </div>
        <div>
          <strong>{missingRecordRequests.filter((request) => request.status !== "fulfilled").length}</strong>
          <small>Open gaps</small>
        </div>
      </div>
      <div className="directory-source-strip">
        <span className="status-chip success">Live database view</span>
        <small>Reads corporate visibility from Supabase Access Grants, shared Passport records, professional profiles, and missing-record requests.</small>
      </div>
      <div className="directory-list">
        {filteredRows.length ? (
          filteredRows.slice(0, 8).map((row) => (
            <article className="directory-card" key={row.id}>
              <div>
                <strong>{row.name}</strong>
                <p>{row.signal}</p>
                <small>{row.detail}</small>
              </div>
              <span className="status-chip neutral">{row.status}</span>
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
  onIssueCredential
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
  const [status, setStatus] = useState(message);
  const expiringCredentials = credentials.filter((credential) => credential.expires_at).length;
  const noExpiryCredentials = credentials.length - expiringCredentials;

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
              <span className="status-chip success">{credential.status.replace(/_/g, " ")}</span>
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
  disabled,
  message,
  onCreatePilotCases,
  onDecision
}: {
  cases: DbVerificationCase[];
  disabled: boolean;
  message: string;
  onCreatePilotCases: () => Promise<void>;
  onDecision: (caseId: string, status: VerificationCaseStatus) => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyPilotCases, setBusyPilotCases] = useState(false);
  const [caseQuery, setCaseQuery] = useState("");
  const [caseStatusFilter, setCaseStatusFilter] = useState<"all" | VerificationCaseStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "medium" | "high" | "critical">("all");
  const openCaseCount = cases.filter((item) => item.status === "open" || item.status === "in_review").length;
  const restrictedCaseCount = cases.filter((item) => item.status === "restricted").length;
  const criticalCaseCount = cases.filter((item) => item.priority === "critical" || item.priority === "high").length;
  const filteredCases = cases.filter((item) => {
    const matchesStatus = caseStatusFilter === "all" || item.status === caseStatusFilter;
    const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter;
    const haystack = `${item.case_type} ${item.title} ${item.summary} ${item.reason_code} ${item.status} ${item.priority}`.toLowerCase();
    return matchesStatus && matchesPriority && haystack.includes(caseQuery.trim().toLowerCase());
  });

  async function decide(caseId: string, status: VerificationCaseStatus) {
    setBusyId(caseId);
    try {
      await onDecision(caseId, status);
    } finally {
      setBusyId(null);
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
          <strong>{openCaseCount}</strong>
        </div>
        <div>
          <span>Restricted</span>
          <strong>{restrictedCaseCount}</strong>
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
  message
}: {
  events: DbAuditEvent[];
  message: string;
}) {
  const [auditQuery, setAuditQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<
    "all" | "access" | "organization" | "record" | "connect" | "verification" | "evidence" | "schema"
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

  return (
    <section className="audit-panel">
      <div className="mini-heading">
        <Activity size={16} />
        <strong>Audit trail</strong>
      </div>
      <small>{message}</small>
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
  onRecordPilotLaunchContact,
  onRecordGateDecision,
  pilotLaunchContacts,
  productionGateDecisions
}: {
  disabled: boolean;
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
      <article className="plan-migration-card">
        <div>
          <strong>Live database migrations applied</strong>
          <small>Migrations through 033 are active, including member controls, corporate Access Grant requests, first-class record types, consent authorizations, sensitive-record controls, release ledger, live pilot workspace seeding, production gate decision tracking, gate status constraints, operator-named pilot workflow RPCs, and pilot launch contact tracking.</small>
        </div>
        <span className="status-chip success">database live</span>
      </article>
      <div className="production-gate-panel">
        <div className="production-gate-heading">
          <div>
            <span className="eyebrow">Human decision gates</span>
            <strong>Pilot-ready, not unrestricted production traffic</strong>
            <small>These approvals remain outside the automated build loop and must be resolved before live payments or regulated employment workflows.</small>
            <small>{productionGateDecisions.length ? "Production gate decisions loaded from Supabase" : "Production gate decisions use fallback plan copy until migration 030 is applied."}</small>
          </div>
          <button className="secondary-action" onClick={() => downloadTextFile(gateExportName, productionGatesToCsv(productionGates), "text/csv")} type="button">
            Export production gates
          </button>
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

  return (
    <section className="release-panel">
      <div className="mini-heading">
        <CalendarClock size={16} />
        <strong>Release ledger</strong>
      </div>
      <small>{message}</small>
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
    "pilot_launch_contacts"
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
  const runbookName = `trustgraph-security-runbook-${new Date().toISOString().slice(0, 10)}.csv`;

  return (
    <section className="security-review-panel">
      <div className="mini-heading">
        <ShieldAlert size={16} />
        <strong>Security/RLS review v1</strong>
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
  rows: Array<{ id: string; name: string; detail: string; rawStatus: string; status: string; signal: string }>
) {
  const csvRows = [
    ["access_grant_id", "professional_name", "professional_email", "status", "purpose"],
    ...rows.map((row) => [row.id, row.name, row.detail, row.status, row.signal])
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

function teamMembersToCsv(members: OrganizationMemberView[]) {
  const rows = [
    ["membership_id", "profile_id", "member_name", "member_email", "role", "status", "created_at", "updated_at"],
    ...members.map((member) => [
      member.id,
      member.profile_id,
      member.profile?.full_name ?? "",
      member.profile?.email ?? "",
      member.role,
      member.status,
      member.created_at,
      member.updated_at
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
  }) => Promise<void>;
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
  const [busy, setBusy] = useState(false);
  const [panelStatus, setPanelStatus] = useState("");
  const canManageActiveOrg = hasPermission(activeMembership.role, "organization:manage");
  const selectedRole = getRole(targetRole);
  const roleOptions =
    activeOrg.type === "staffing_agency"
      ? (["staffing_agency_admin", "recruiter"] as RoleKey[])
      : (["employer_admin", "employer_reviewer"] as RoleKey[]);

  useEffect(() => {
    setTargetRole(activeOrg.type === "staffing_agency" ? "recruiter" : "employer_reviewer");
  }, [activeOrg.type]);

  async function submitCorporateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setPanelStatus("Creating corporate account...");
    try {
      await onCreateCorporateAccount({ organizationName, organizationType, organizationDomain });
      setOrganizationName("");
      setOrganizationDomain("");
      setPanelStatus("Corporate account created");
    } catch (error) {
      setPanelStatus(error instanceof Error ? error.message : "Could not create corporate account");
    } finally {
      setBusy(false);
    }
  }

  async function submitRoleActivation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setPanelStatus("Activating role...");
    try {
      await onAssignRole(activeOrg.id, targetRole);
      setPanelStatus("Role activated for current profile");
    } catch (error) {
      setPanelStatus(error instanceof Error ? error.message : "Could not activate role");
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
      setPanelStatus(error instanceof Error ? error.message : "Could not create operations role");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="account-panel">
      <div className="mini-heading">
        <LockKeyhole size={16} />
        <strong>Corporate account and RBAC</strong>
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
      <form className="account-admin-form" onSubmit={submitCorporateAccount}>
        <div className="mini-heading">
          <UserPlus size={16} />
          <strong>Create corporate account</strong>
        </div>
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
        <button className="secondary-action" disabled={!authSession || busy} type="submit">
          Create admin org
        </button>
      </form>
      <form className="account-admin-form compact" onSubmit={submitRoleActivation}>
        <div className="mini-heading">
          <KeyRound size={16} />
          <strong>RBAC role admin</strong>
        </div>
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
      {panelStatus ? <small>{panelStatus}</small> : null}
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
  const renewsAt = primarySubscription?.renews_at
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(primarySubscription.renews_at))
    : "Trial or manual renewal";
  const estimatedSeatTotal = plans.length
    ? Math.min(...plans.map((plan) => Math.max(plan.monthly_price_usd, plan.monthly_price_usd + Math.max(0, seats - plan.included_seats) * 19)))
    : 0;
  const exportName = `trustgraph-billing-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
  const gateExportName = `trustgraph-billing-decision-gates-${new Date().toISOString().slice(0, 10)}.csv`;
  const readinessExportName = `trustgraph-billing-launch-readiness-${new Date().toISOString().slice(0, 10)}.csv`;
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
        </div>
      </div>
      <div className="billing-decision-card">
        <div>
          <strong>Payment launch boundary</strong>
          <small>TrustGraph can validate pricing, seats, subscription status, and audit history now. Checkout, invoices, refunds, dunning, and payment webhooks stay off until the Stripe production gate is approved.</small>
        </div>
        <span className="status-chip warning">Stripe gated</span>
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
  const filteredInvitations = invitations.filter((invitation) => {
    const matchesStatus = invitationStatusFilter === "all" || invitation.status === invitationStatusFilter;
    const haystack = `${invitation.invited_email} ${invitation.role} ${invitation.status}`.toLowerCase();
    return matchesStatus && haystack.includes(invitationQuery.trim().toLowerCase());
  });

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
      <form className="team-form" onSubmit={submit}>
        <input disabled={disabled || busy} onChange={(event) => setEmail(event.target.value)} placeholder="reviewer@company.com" type="email" value={email} />
        <select disabled={disabled || busy} onChange={(event) => setRole(event.target.value as typeof role)} value={role}>
          <option value="employer_reviewer">Employer reviewer</option>
          <option value="employer_admin">Employer admin</option>
          <option value="recruiter">Recruiter</option>
          <option value="staffing_agency_admin">Staffing admin</option>
        </select>
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
      <div className="team-list">
        {invitations.length ? (
          invitations.map((invitation) => (
            <article className="team-card" key={invitation.id}>
              <div>
                <strong>{invitation.organization?.name ?? "Corporate workspace"}</strong>
                <small>{invitation.role.replace(/_/g, " ")}</small>
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
  const filteredMembers = members.filter((member) => {
    const matchesStatus = memberStatusFilter === "all" || member.status === memberStatusFilter;
    const haystack = `${member.profile?.full_name ?? ""} ${member.profile?.email ?? ""} ${member.role} ${member.status}`.toLowerCase();
    return matchesStatus && haystack.includes(memberQuery.trim().toLowerCase());
  });
  const exportName = `trustgraph-team-members-${new Date().toISOString().slice(0, 10)}.csv`;

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
      </div>
      <div className="team-source-strip">
        <span className="status-chip success">Membership database</span>
        <small>Reads live organization memberships and profile rows from Supabase. Current signed-in users cannot suspend their own active seat.</small>
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

function AuthPanel({
  session,
  accountStatus,
  onSession
}: {
  session: AuthSession | null;
  accountStatus: string;
  onSession: (session: AuthSession | null) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState(authModeLabel());
  const [busy, setBusy] = useState(false);
  const authRedirectUrl =
    typeof window === "undefined" ? "https://mirzaraheel99.github.io/trustgraph/" : `${window.location.origin}${window.location.pathname}`;
  const authPaths = [
    {
      label: "Professional",
      detail: "Create a Passport, add records, upload evidence, approve Access Grants."
    },
    {
      label: "Corporate",
      detail: "Create employer or staffing workspace from Corporate account and RBAC."
    }
  ];
  const authChecks = [
    {
      label: "Hosted redirect",
      detail: authRedirectUrl.includes("localhost")
        ? "Open the GitHub Pages app before requesting new verification links."
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
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
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
      setMessage(error instanceof Error ? error.message : "Could not request password recovery.");
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
      setMessage(error instanceof Error ? error.message : "Could not resend verification email.");
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
      setMessage(error instanceof Error ? error.message : "Could not update password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-panel">
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
        </div>
      ) : (
        <form className="auth-form" onSubmit={(event) => handleAuth(event, "signin")}>
          <div className="auth-path-grid">
            {authPaths.map((path) => (
              <article key={path.label}>
                <strong>{path.label}</strong>
                <small>{path.detail}</small>
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
              <small>Add this hosted URL in Supabase Auth redirect settings so emails do not return to localhost: {authRedirectUrl}</small>
            </div>
            <button className="secondary-action" onClick={() => void copyRedirectUrl()} type="button">
              Copy URL
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
  activeOrganization,
  activeRoleLabel,
  authSession,
  workspaceLabel
}: {
  accountContext: AccountContext | null;
  activeOrganization: Organization;
  activeRoleLabel: string;
  authSession: AuthSession | null;
  workspaceLabel: string;
}) {
  const isLive = Boolean(authSession && accountContext);
  const profileLabel = authSession?.user.email ?? "Not signed in";
  const membershipCount = accountContext?.memberships.length ?? 0;
  const rows = [
    { label: "Profile", value: profileLabel },
    { label: "Organization", value: isLive ? activeOrganization.name : "Evaluation organization" },
    { label: "Role", value: isLive ? activeRoleLabel : "Evaluation role" },
    { label: "Workspace", value: workspaceLabel }
  ];

  return (
    <section className={`live-data-panel ${isLive ? "live" : "preview"}`}>
      <div className="mini-heading">
        <Database size={16} />
        <strong>{isLive ? "Live Supabase database mode" : "Guided evaluation mode"}</strong>
      </div>
      <p>
        {isLive
          ? "This portal is reading and writing hosted Supabase data with account RBAC enforced."
          : "This portal is showing guided evaluation data only. Register or login before relying on saved records."}
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
        <small>{isLive ? `${membershipCount} RBAC memberships loaded` : "Supabase keys are configured; login unlocks live rows."}</small>
      </div>
    </section>
  );
}

function OnboardingChecklistPanel({
  accessGrants,
  accountContext,
  authSession,
  consentAuthorizations,
  livePassportRecords,
  organizationSubscriptions,
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
  livePassportRecords: RecordItem[];
  organizationSubscriptions: DbOrganizationSubscription[];
  teamInvitations: DbOrganizationInvitation[];
  teamMembers: OrganizationMemberView[];
  onOpenHostedRegistration: () => void;
  onOpenWorkspace: (workspaceId: WorkspaceId) => void;
  onSeedPilotWorkspace: () => Promise<Awaited<ReturnType<typeof seedPilotWorkspace>>>;
}) {
  const [seedStatus, setSeedStatus] = useState("Create live pilot rows after signing in.");
  const [seedResult, setSeedResult] = useState<Awaited<ReturnType<typeof seedPilotWorkspace>> | null>(null);
  const [seedBusy, setSeedBusy] = useState(false);
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

  async function seedLiveData() {
    setSeedBusy(true);
    setSeedStatus("Creating live pilot rows in Supabase...");
    try {
      const result = await onSeedPilotWorkspace();
      setSeedResult(result);
      setSeedStatus("Live pilot workspace seeded and portal data refreshed.");
    } catch (error) {
      setSeedStatus(error instanceof Error ? error.message : "Could not seed live pilot workspace");
    } finally {
      setSeedBusy(false);
    }
  }

  return (
    <section className="onboarding-panel">
      <div className="mini-heading">
        <BadgeCheck size={16} />
        <strong>Launch checklist</strong>
      </div>
      <div className="onboarding-score">
        <div>
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
        </div>
      </div>
      <div className="onboarding-current-step">
        <span className="status-chip neutral">current step</span>
        <strong>{nextItem.label}</strong>
        <small>{nextItem.done ? "Review live account, records, corporate access, team, and sharing evidence before production gates." : nextItem.detail}</small>
      </div>
      <div className="onboarding-seed-row">
        <small>{seedStatus}</small>
        <button className="secondary-action" disabled={!authSession || seedBusy} onClick={() => void seedLiveData()} type="button">
          Prepare live pilot workspace
        </button>
      </div>
      {seedResult ? (
        <>
          <div className="seed-result-grid">
            <div>
              <span>Passport</span>
              <strong>{seedResult.passport_records}</strong>
            </div>
            <div>
              <span>Evidence</span>
              <strong>{seedResult.evidence_documents}</strong>
            </div>
            <div>
              <span>Subscription</span>
              <strong>{seedResult.subscription_id.slice(0, 8)}</strong>
            </div>
            <div>
              <span>Access Grant</span>
              <strong>{seedResult.access_grant_id.slice(0, 8)}</strong>
            </div>
            <div>
              <span>Consent</span>
              <strong>{seedResult.consent_authorization_id.slice(0, 8)}</strong>
            </div>
            <div>
              <span>Corporate org</span>
              <strong>{seedResult.corporate_organization_id.slice(0, 8)}</strong>
            </div>
          </div>
          <div className="seed-evidence-card">
            <span className="status-chip success">Supabase rows written</span>
            <small>
              Live pilot database evidence: subscription {seedResult.subscription_id}, Access Grant {seedResult.access_grant_id},
              consent authorization {seedResult.consent_authorization_id}, corporate organization {seedResult.corporate_organization_id}.
            </small>
          </div>
        </>
      ) : null}
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

  async function updateStatus(notificationId: string, status: "delivered" | "suppressed") {
    setBusyId(notificationId);
    try {
      await onStatus(notificationId, status);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="notification-panel">
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

function PermissionGate({ roleLabel, workspaceLabel }: { roleLabel: string; workspaceLabel: string }) {
  return (
    <section className="permission-panel">
      <ShieldAlert size={34} />
      <div>
        <span className="eyebrow">Permission denied state</span>
        <h2>{roleLabel} cannot open {workspaceLabel}</h2>
        <p>
          TrustGraph blocks portal access unless the active Organization Membership grants the matching role. Switch
          account context to continue.
        </p>
      </div>
    </section>
  );
}

function PublicSite({
  onCorporateSession,
  onOpenGuidedEvaluation,
  onSession
}: {
  onCorporateSession: (
    session: AuthSession,
    input: { organizationName: string; organizationType: "employer" | "staffing_agency"; organizationDomain: string }
  ) => void;
  onOpenGuidedEvaluation: () => void;
  onSession: (session: AuthSession) => void;
}) {
  const [portal, setPortal] = useState<"professional" | "corporate">("professional");
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationDomain, setOrganizationDomain] = useState("");
  const [organizationType, setOrganizationType] = useState<"employer" | "staffing_agency">("employer");
  const [message, setMessage] = useState("Create an account. Email verification may be required; Supabase built-in email allows 2 messages per hour.");
  const [hasPendingCorporateRegistration, setHasPendingCorporateRegistration] = useState(false);
  const [busy, setBusy] = useState(false);
  const authReady = isSupabaseConfigured();
  const authRedirectUrl =
    typeof window === "undefined" ? "https://mirzaraheel99.github.io/trustgraph/" : `${window.location.origin}${window.location.pathname}`;
  const pendingCorporateRegistrationKey = "trustgraph.pendingCorporateRegistration";

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
      setMessage(error instanceof Error ? error.message : "Authentication failed");
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
      setMessage(error instanceof Error ? error.message : "Could not resend verification email.");
    } finally {
      setBusy(false);
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
          <button className="secondary-action" onClick={onOpenGuidedEvaluation}>
            Open product
          </button>
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
        </div>
        <aside className="public-proof public-command-center" aria-label="TrustGraph live product preview">
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
          <button className="secondary-action" onClick={onOpenGuidedEvaluation} type="button">
            Open guided evaluation
          </button>
          <button className="secondary-action" disabled={busy || !email} onClick={() => void resendVerification()} type="button">
            Resend verification
          </button>
          <small>{message}</small>
          <small>
            {authReady
              ? `Hosted Supabase Auth is configured. Allowed redirect URL must include this GitHub Pages URL, not localhost: ${authRedirectUrl}`
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
  const [activeMembershipId, setActiveMembershipId] = useState(sessionUser.activeMembershipId);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [showPublicSite, setShowPublicSite] = useState(true);
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

    Promise.resolve()
      .then(() => readSessionFromUrl())
      .then((callbackSession) => callbackSession ?? loadStoredSession())
      .then((storedSession) => {
        if (cancelled) return;
        setAuthSession(storedSession);
        if (storedSession) {
          setShowPublicSite(false);
          setAccountStatus("Live session connected");
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setAccountStatus(error instanceof Error ? error.message : "Login again to reconnect live database access.");
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
        setAccountStatus(error instanceof Error ? error.message : "Could not load live account context");
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
        setBillingStatus(error instanceof Error ? error.message : "Could not load billing plans");
        setTeamStatus(error instanceof Error ? error.message : "Could not load team invitations");
        setMemberStatus(error instanceof Error ? error.message : "Could not load team members");
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
        setMyInvitationStatus(error instanceof Error ? error.message : "Could not load pending invitations");
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
    setReferenceStatus("Loading reference requests...");
    setConsentStatus("Loading consent authorizations...");
    setPassportMissingRecordStatus("Loading requested Passport records...");

    Promise.all([
      loadPassportRecords(accountContext.profile.id, authSession.accessToken),
      loadEvidenceDocuments(authSession.accessToken),
      loadNotificationEvents(authSession.accessToken),
      loadReferenceRequests(authSession.accessToken),
      loadConsentAuthorizations(authSession.accessToken),
      loadPassportMissingRecordRequests(accountContext.profile.id, authSession.accessToken)
    ])
      .then(([items, documents, notifications, references, consents, missingRecords]) => {
        if (cancelled) return;
        setLivePassportRecords(items);
        setEvidenceDocuments(documents);
        setNotificationEvents(notifications);
        setReferenceRequests(references);
        setConsentAuthorizations(consents);
        setPassportMissingRecordRequests(missingRecords);
        setRecordStatus(items.length ? "Live Supabase Passport records" : "Passport records not loaded yet");
        setNotificationStatus(
          notifications.length ? `Live notifications: ${notifications.length} recent` : "No workflow notifications yet"
        );
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
        setReferenceRequests([]);
        setConsentAuthorizations([]);
        setPassportMissingRecordRequests([]);
        setRecordStatus(error instanceof Error ? error.message : "Could not load live Passport records");
        setNotificationStatus(error instanceof Error ? error.message : "Could not load notifications");
        setReferenceStatus(error instanceof Error ? error.message : "Could not load reference requests");
        setConsentStatus(error instanceof Error ? error.message : "Could not load consent authorizations");
        setPassportMissingRecordStatus(error instanceof Error ? error.message : "Could not load requested Passport records");
      });

    return () => {
      cancelled = true;
    };
  }, [authSession, accountContext]);

  useEffect(() => {
    if (!authSession || !accountContext || workspaceId !== "verify") {
      setVerifyRequests([]);
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
      loadSharedVerifyRecords(authSession.accessToken),
      hasPermission(activeMembership.role, "record:issue_credential")
        ? loadIssuerCredentials(activeMembership.organizationId, authSession.accessToken)
        : Promise.resolve([]),
      loadVerifyMissingRecordRequests(activeMembership.organizationId, authSession.accessToken)
    ])
      .then(([items, sharedRecords, credentials, missingRecords]) => {
        if (cancelled) return;
        setVerifyRequests(items);
        setSharedVerifyRecords(sharedRecords);
        setIssuerCredentials(credentials);
        setMissingRecordRequests(missingRecords);
        setVerifyStatus(
          items.length || sharedRecords.length
            ? `Live Supabase Verify data: ${items.length} requests, ${sharedRecords.length} shared records`
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
        setSharedVerifyRecords([]);
        setIssuerCredentials([]);
        setMissingRecordRequests([]);
        setVerifyStatus(error instanceof Error ? error.message : "Could not load Verify requests");
        setIssuerStatus(error instanceof Error ? error.message : "Could not load issued credentials");
        setMissingRecordStatus(error instanceof Error ? error.message : "Could not load missing-record requests");
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
        setGrantStatus(error instanceof Error ? error.message : "Could not load Access Grants");
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
        setOperationsStatus(error instanceof Error ? error.message : "Could not load operations queue");
        setAuditStatus(error instanceof Error ? error.message : "Could not load audit events");
        setReleaseStatus(error instanceof Error ? error.message : "Could not load release ledger");
        setConnectStatus(error instanceof Error ? error.message : "Could not load Connect controls");
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
    expiresAt: string;
    status: RecordStatus;
    sensitivity: TrustRecordSensitivity;
    consentRequired: boolean;
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
      issuedAt: "",
      expiresAt: input.expiresAt,
      status: input.status,
      sensitivity: input.sensitivity,
      consentRequired: input.consentRequired
    });

    setLivePassportRecords((current) => current.map((record) => (record.id === updated.id ? updated : record)));
    setRecordStatus("Live Supabase Passport records");
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

    const signedUrl = await createEvidenceDownloadUrl({
      accessToken: authSession.accessToken,
      storagePath: document.storage_path,
      expiresIn: mode === "download" ? 120 : 300
    });

    if (typeof window !== "undefined") {
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    }
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
  }

  async function seedLivePilotWorkspace() {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before seeding the live pilot workspace.");
    }

    const seeded = await seedPilotWorkspace(authSession.accessToken);
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
      notifications,
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
      loadNotificationEvents(authSession.accessToken),
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
    setNotificationEvents(notifications);
    setAuditEvents(events);
    setAccountStatus("Live pilot workspace seeded");
    setRecordStatus(`Pilot Passport loaded: ${seeded.passport_records} records`);
    setGrantStatus(grants.length ? "Live Supabase Access Grants" : "No Access Grants yet");
    setConsentStatus(consents.length ? `Live consent authorizations: ${consents.length}` : "No consent authorizations yet");
    setBillingStatus(subscriptions.length ? `Live subscriptions: ${subscriptions.length}` : "Choose a plan for corporate workflows");
    setTeamStatus(members.length ? `Team seats: ${members.length}` : "No team members loaded yet");
    setVerifyStatus(
      verifyRequests.length || sharedRecords.length
        ? `Live Supabase Verify data: ${verifyRequests.length} requests, ${sharedRecords.length} shared records`
        : "No Verify requests yet"
    );
    setNotificationStatus(notifications.length ? `Live notifications: ${notifications.length} recent` : "No workflow notifications yet");
    setAuditStatus(events.length ? `Live audit events: ${events.length} recent` : "No audit events yet");
    return seeded;
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

  if (showPublicSite) {
    return (
      <PublicSite
        onCorporateSession={(session, input) => {
          setPendingCorporateAccount(input);
          setAuthSession(session);
          setShowPublicSite(false);
        }}
        onOpenGuidedEvaluation={() => setShowPublicSite(false)}
        onSession={(session) => {
          setAuthSession(session);
          setShowPublicSite(false);
        }}
      />
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-symbol">TG</div>
          <div>
            <strong>TrustGraph</strong>
            <span>Verified workforce record</span>
          </div>
        </div>

        <div className="sidebar-section-label">Workspaces</div>
        <div className="workspace-stack">
          {workspaces.map((item) => (
            <WorkspaceButton
              key={item.id}
              workspace={item}
              active={item.id === workspace.id}
              allowed={canAccessWorkspace(activeMembership.role, item.id)}
              onClick={() => changeWorkspace(item.id)}
            />
          ))}
        </div>

        <div className="sidebar-section-label">Account</div>
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
        <BillingPanel
          disabled={!authSession || !accountContext || !hasPermission(activeMembership.role, "organization:manage")}
          message={billingStatus}
          onActivate={activateLiveSubscription}
          plans={subscriptionPlans}
          subscriptions={organizationSubscriptions}
        />
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

        <AuthPanel accountStatus={accountStatus} session={authSession} onSession={setAuthSession} />
        <LiveDataModePanel
          accountContext={accountContext}
          activeOrganization={activeOrganization}
          activeRoleLabel={activeRole.label}
          authSession={authSession}
          workspaceLabel={workspace.label}
        />
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
          livePassportRecords={livePassportRecords}
          organizationSubscriptions={organizationSubscriptions}
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

        <div className="sidebar-section-label">Current workspace</div>
        <nav className="module-nav" aria-label="Workspace modules">
          {workspace.nav.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.label}>
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="security-card">
          <ShieldCheck size={18} />
          <div>
            <strong>Evidence-first trust</strong>
            <span>No universal Trust Score. Every claim keeps source, status, and audit context.</span>
          </div>
        </div>
      </aside>

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
              <span className="status-chip neutral">{authSession ? "live auth" : "guided preview"}</span>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="secondary-action" onClick={() => setShowPublicSite(true)} type="button">
              Public site
            </button>
            <button aria-label="View notifications">
              <Bell size={18} />
            </button>
            <button aria-label="Export authorized report">
              <Download size={18} />
            </button>
          </div>
        </header>

        {!workspaceAllowed ? (
          <PermissionGate roleLabel={activeRole.label} workspaceLabel={workspace.label} />
        ) : (
          <>
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
              <button className="primary-action">
                <Eye size={16} />
                {hasPermission(activeMembership.role, "passport:view_shared") ? "Preview shared access" : "Preview Passport"}
              </button>
              <button className="secondary-action">
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
              <button>Verified</button>
              <button>Expiring</button>
              <button>Restricted</button>
              <button>Disputed</button>
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

            {workspace.id === "passport" ? (
              <>
                <PassportRecordForm
                  disabled={!authSession || !accountContext}
                  message={recordStatus}
                  onCreate={createLivePassportRecord}
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
                subscriptions={organizationSubscriptions}
                teamInvitations={teamInvitations}
                teamMembers={teamMembers}
                onCreateAccessRequest={createLiveAccessGrantRequest}
                onCreateMissingRecordRequest={createLiveMissingRecordRequest}
                onCreateIssuerRole={createLiveCredentialIssuerRole}
                onCreateReviewerRole={createPilotReviewerRole}
                onIssueCredential={issueLiveCredential}
                onMissingRecordStatus={updateLiveMissingRecordStatus}
                requests={verifyRequests}
                sharedRecords={sharedVerifyRecords}
              />
            ) : null}

            {workspace.id === "admin" ? (
              <>
                <OperationsQueuePanel
                  cases={operationsCases}
                  disabled={!authSession || !accountContext || !canAccessWorkspace(activeMembership.role, "admin")}
                  message={operationsStatus}
                  onCreatePilotCases={createLiveOperationsPilotCases}
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
                <AuditTrailPanel events={auditEvents} message={auditStatus} />
                <ReleaseLedgerPanel message={releaseStatus} migrations={schemaMigrationRuns} />
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
