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
  DbEvidenceDocument,
  DbIssuerCredential,
  DbMissingRecordRequest,
  DbNotificationEvent,
  DbOrganizationInvitation,
  DbOrganizationSubscription,
  DbReferenceRequest,
  DbSubscriptionPlan,
  DbVerificationCase,
  DbWebhookSubscription,
  ReferenceRequestStatus,
  RecordStatus,
  RecordType,
  VerificationCaseStatus
} from "./database";
import {
  accountContextOrganizations,
  accountContextToSessionUser,
  assignOwnCorporateRole,
  createCorporateAccount,
  createSampleEmployerReviewerMembership,
  ensureProfessionalAccount,
  loadAccountContext,
  type AccountContext
} from "./accountRepository";
import { auditActionLabel, loadAuditEvents } from "./auditRepository";
import { buildAdvisorySummary } from "./aiAdvisor";
import {
  authModeLabel,
  readStoredSession,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  type AuthSession
} from "./auth";
import {
  activateOrganizationSubscription,
  loadOrganizationSubscriptions,
  loadSubscriptionPlans
} from "./billingRepository";
import {
  createSampleCredentialIssuerMembership,
  issueCredentialRecord,
  loadIssuerCredentials
} from "./credentialRepository";
import {
  createSampleApiClient,
  createWebhookSubscription,
  loadApiClients,
  loadWebhookSubscriptions,
  markApiClientStatus,
  markWebhookSubscriptionStatus
} from "./connectRepository";
import {
  createAccessGrantRequest,
  createSampleAccessGrant,
  decideAccessGrant,
  loadAccessGrants,
  loadVerifyAccessGrants,
  syncAccessGrantRecords,
  type VerifyAccessGrantView,
  type AccessGrantView
} from "./grantRepository";
import { createEvidenceDocument, loadEvidenceDocuments, uploadEvidenceFile } from "./evidenceRepository";
import {
  createMissingRecordRequest,
  loadVerifyMissingRecordRequests,
  markMissingRecordRequestStatus
} from "./missingRecordRepository";
import { loadNotificationEvents, markNotificationEvent } from "./notificationRepository";
import { createReferenceRequest, loadReferenceRequests, markReferenceRequestStatus } from "./referenceRepository";
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
  createSampleTrustGraphVerifierMembership,
  createSampleVerificationCases,
  decideVerificationCase,
  loadVerificationCases,
  verificationCaseToRecordItem
} from "./operationsRepository";
import { foundationTracks, lockedProfileAreas } from "./planAlignment";
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
  onUpdate: (input: {
    recordId: string;
    title: string;
    sourceName: string;
    evidenceSummary: string;
    expiresAt: string;
    status: RecordStatus;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState(record.title);
  const [sourceName, setSourceName] = useState(record.source);
  const [evidenceSummary, setEvidenceSummary] = useState(record.evidence === "Evidence details pending" ? "" : record.evidence);
  const [expiresAt, setExpiresAt] = useState("");
  const [status, setStatus] = useState<RecordStatus>("draft");
  const [message, setMessage] = useState("Update selected live record");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [documentType, setDocumentType] = useState("credential");
  const [evidenceSource, setEvidenceSource] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceMessage, setEvidenceMessage] = useState("Attach evidence metadata to selected record");
  const [busy, setBusy] = useState(false);
  const [evidenceBusy, setEvidenceBusy] = useState(false);
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

  useEffect(() => {
    setTitle(record.title);
    setSourceName(record.source);
    setEvidenceSummary(record.evidence === "Evidence details pending" ? "" : record.evidence);
    setExpiresAt("");
    setStatus(record.status === "pending verification" ? "pending_verification" : "draft");
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
        status
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
      </div>

      <section className="evidence-box">
        <div className="mini-heading">
          <FileText size={16} />
          <strong>Evidence and access</strong>
        </div>
        <p>{record.evidence}</p>
        <small>{record.access}</small>
        {evidenceDocuments.length ? (
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
          </div>
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
            </div>
            <div className="evidence-document-list">
              {filteredEvidenceDocuments.length ? (
                filteredEvidenceDocuments.map((document) => (
                  <article className="evidence-document-card" key={document.id}>
                    <div>
                      <strong>{document.title}</strong>
                      <small>{document.document_type} - {document.source_name}</small>
                    </div>
                    <span className="status-chip neutral">{document.status}</span>
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
  }) => Promise<void>;
}) {
  const plannedRecordGuidance = [
    "Contract assignments",
    "Training records",
    "Skills evidence",
    "Performance reviews",
    "Continuing education"
  ];
  const [type, setType] = useState<RecordType>("employment");
  const [title, setTitle] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [evidenceSummary, setEvidenceSummary] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(message);

  useEffect(() => {
    setStatus(message);
  }, [message]);

  async function submitRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("Saving live Passport record...");

    try {
      await onCreate({ type, title, sourceName, evidenceSummary, issuedAt, expiresAt });
      setTitle("");
      setSourceName("");
      setEvidenceSummary("");
      setIssuedAt("");
      setExpiresAt("");
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
        <select value={type} onChange={(event) => setType(event.target.value as RecordType)} disabled={disabled || busy}>
          <option value="employment">Employment</option>
          <option value="education">Education</option>
          <option value="license">License</option>
          <option value="certification">Certification</option>
          <option value="reference">Reference</option>
          <option value="background_check">Background check</option>
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
      </div>
      <div className="record-type-guide">
        <span>Use Custom for:</span>
        {plannedRecordGuidance.map((item) => (
          <small key={item}>{item}</small>
        ))}
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
  onSampleRequest
}: {
  disabled: boolean;
  grants: AccessGrantView[];
  message: string;
  onDecision: (grantId: string, status: "approved" | "declined" | "revoked") => Promise<void>;
  onSampleRequest: () => Promise<void>;
}) {
  const [busyGrantId, setBusyGrantId] = useState<string | null>(null);
  const [sampleBusy, setSampleBusy] = useState(false);
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
        <small>Test data tool for validating Passport approval without waiting on an external corporate request.</small>
        <button
          className="secondary-action"
          disabled={disabled || sampleBusy}
          onClick={async () => {
            setSampleBusy(true);
            try {
              await onSampleRequest();
            } finally {
              setSampleBusy(false);
            }
          }}
        >
          Create test request
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
              <strong>No matching Access Grants</strong>
              <p>Corporate Verify requests will appear here when a live employer or staffing team requests Passport access.</p>
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
              <strong>No live reference requests yet</strong>
              <p>Request structured references from managers, supervisors, clients, or colleagues.</p>
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
    credentialType: Extract<RecordType, "license" | "certification" | "education" | "health_clearance" | "custom">;
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
        <small>Test data tool for quickly adding a reviewer role while validating a new Supabase project.</small>
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
          Create test reviewer
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
              <strong>No live Verify requests yet</strong>
              <p>Request Passport access from a professional by email, then track the approval state here.</p>
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
              <strong>No shared records yet</strong>
              <p>Approve an Access Grant from Passport to sync the professional's current records here.</p>
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
              <strong>No matching corporate users</strong>
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
  const filteredRequests = requests.filter((request) => {
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const haystack = `${request.title} ${request.reason} ${request.subject_profile?.full_name ?? ""} ${request.subject_profile?.email ?? ""}`.toLowerCase();
    return matchesStatus && haystack.includes(requestQuery.trim().toLowerCase());
  });

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
      </div>
      <form className="missing-form" onSubmit={submit}>
        <div className="record-form-grid">
          <input disabled={disabled || busy} onChange={(event) => setSubjectEmail(event.target.value)} placeholder="Professional email" type="email" value={subjectEmail} />
          <input disabled={disabled || busy} onChange={(event) => setSubjectFullName(event.target.value)} placeholder="Professional name" value={subjectFullName} />
          <select disabled={disabled || busy} onChange={(event) => setRecordType(event.target.value as RecordType)} value={recordType}>
            <option value="license">License</option>
            <option value="certification">Certification</option>
            <option value="education">Education</option>
            <option value="health_clearance">Health clearance</option>
            <option value="background_check">Background check</option>
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
      </div>
      <div className="missing-list">
        {filteredRequests.length ? (
          filteredRequests.slice(0, 8).map((request) => (
            <article className="missing-card" key={request.id}>
              <div>
                <strong>{request.title}</strong>
                <p>{request.subject_profile?.full_name ?? request.subject_profile?.email ?? "Professional profile"}</p>
                <small>{request.reason}</small>
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
              <strong>No matching missing-record requests</strong>
              <p>Request only specific records needed for a role, placement, or compliance workflow.</p>
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
    credentialType: Extract<RecordType, "license" | "certification" | "education" | "health_clearance" | "custom">;
    title: string;
    evidenceSummary: string;
    issuedAt: string;
    expiresAt: string;
  }) => Promise<void>;
}) {
  const [subjectEmail, setSubjectEmail] = useState("");
  const [subjectFullName, setSubjectFullName] = useState("");
  const [credentialType, setCredentialType] =
    useState<Extract<RecordType, "license" | "certification" | "education" | "health_clearance" | "custom">>("certification");
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
          Create test issuer role
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
              <p>Credential issuers can publish verified licenses, certifications, education, and health clearances into a professional Passport.</p>
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
  onCreateSamples,
  onDecision
}: {
  cases: DbVerificationCase[];
  disabled: boolean;
  message: string;
  onCreateSamples: () => Promise<void>;
  onDecision: (caseId: string, status: VerificationCaseStatus) => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busySamples, setBusySamples] = useState(false);
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
          disabled={disabled || busySamples}
          onClick={async () => {
            setBusySamples(true);
            try {
              await onCreateSamples();
            } finally {
              setBusySamples(false);
            }
          }}
        >
          Seed test cases
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
              <strong>No matching operations cases</strong>
              <p>Fraud, compliance, and verifier review cases will appear here as live workflows create exceptions.</p>
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
  const [actionFilter, setActionFilter] = useState<"all" | "access" | "organization" | "record" | "connect" | "verification">("all");
  const filteredEvents = events.filter((event) => {
    const action = event.action.toLowerCase();
    const matchesAction = actionFilter === "all" || action.includes(actionFilter);
    const haystack = `${event.action} ${event.reason ?? ""} ${event.target_table ?? ""}`.toLowerCase();
    return matchesAction && haystack.includes(auditQuery.trim().toLowerCase());
  });

  return (
    <section className="audit-panel">
      <div className="mini-heading">
        <Activity size={16} />
        <strong>Audit trail</strong>
      </div>
      <small>{message}</small>
      <div className="audit-controls">
        <input
          onChange={(event) => setAuditQuery(event.target.value)}
          placeholder="Search action, target, or reason"
          value={auditQuery}
        />
        <select onChange={(event) => setActionFilter(event.target.value as typeof actionFilter)} value={actionFilter}>
          <option value="all">All actions</option>
          <option value="access">Access</option>
          <option value="organization">Organization</option>
          <option value="record">Records</option>
          <option value="connect">Connect</option>
          <option value="verification">Verification</option>
        </select>
      </div>
      <div className="audit-list">
        {filteredEvents.length ? (
          filteredEvents.map((event) => (
            <article className="audit-card" key={event.id}>
              <div>
                <strong>{auditActionLabel(event.action)}</strong>
                <small>{event.reason || event.target_table}</small>
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
              <strong>No API clients yet</strong>
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

function PlanAlignmentPanel() {
  const deployedCount = foundationTracks.filter((track) => track.status === "deployed").length;
  const foundationCount = foundationTracks.filter((track) => track.status === "foundation").length;
  const plannedCount = foundationTracks.filter((track) => track.status === "planned").length;
  const coveredProfileAreas = lockedProfileAreas.filter((area) => area.status !== "planned").length;
  const plannedProfileAreas = lockedProfileAreas.length - coveredProfileAreas;

  return (
    <section className="plan-panel">
      <div className="mini-heading">
        <ClipboardCheck size={16} />
        <strong>13-track foundation alignment</strong>
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
          <small>Migrations 022 and 023 are active for member status controls and real corporate Access Grant requests.</small>
        </div>
        <span className="status-chip success">database live</span>
      </article>
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

function permissionLabel(permission: string) {
  return permission
    .split(":")
    .map((part) => part.replace(/_/g, " "))
    .join(" / ");
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
          Sample ops role
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
              <strong>No live plans loaded</strong>
              <p>Run pricing migrations to activate plan selection.</p>
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
  const [message, setMessage] = useState(authModeLabel());
  const [busy, setBusy] = useState(false);
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

  async function handleAuth(event: FormEvent<HTMLFormElement>, mode: "signin" | "signup") {
    event.preventDefault();
    await submitAuth(mode);
  }

  async function submitAuth(mode: "signin" | "signup") {
    setBusy(true);
    setMessage(mode === "signin" ? "Signing in..." : "Creating account...");

    try {
      const nextSession =
        mode === "signin" ? await signInWithPassword(email, password) : await signUpWithPassword(email, password);
      onSession(nextSession);
      setMessage(nextSession ? "Live Supabase session connected" : "Check your email to confirm the account");
      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
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
      detail: accountContext ? `${accountContext.memberships.length} active memberships` : "Demo shell only"
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
  onOpenDemo,
  onSession
}: {
  onCorporateSession: (
    session: AuthSession,
    input: { organizationName: string; organizationType: "employer" | "staffing_agency"; organizationDomain: string }
  ) => void;
  onOpenDemo: () => void;
  onSession: (session: AuthSession) => void;
}) {
  const [portal, setPortal] = useState<"professional" | "corporate">("professional");
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationDomain, setOrganizationDomain] = useState("");
  const [organizationType, setOrganizationType] = useState<"employer" | "staffing_agency">("employer");
  const [message, setMessage] = useState("Create your TrustGraph account");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(mode === "signin" ? "Signing in..." : "Creating account...");

    try {
      const session =
        mode === "signin"
          ? await signInWithPassword(email, password)
          : await signUpWithPassword(email, password);
      if (session) {
        if (portal === "corporate" && mode === "signup") {
          onCorporateSession(session, { organizationName, organizationType, organizationDomain });
        } else {
          onSession(session);
        }
        setMessage(portal === "corporate" ? "Corporate portal ready" : "Professional Passport ready");
      } else {
        setMessage("Check your email to confirm the account, then login.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  const pricing = [
    {
      name: "Professional",
      price: "$0",
      detail: "Own your Passport, records, references, and sharing consent.",
      points: ["Private Passport", "Evidence uploads", "Access Grants", "Reference requests"]
    },
    {
      name: "Corporate Verify",
      price: "$149",
      detail: "For employers and staffing teams reviewing approved shared records.",
      points: ["Corporate RBAC", "Missing-record requests", "Readiness review", "Audit trail"]
    },
    {
      name: "TrustGraph Scale",
      price: "Custom",
      detail: "For issuer, integration, compliance, and multi-team workflows.",
      points: ["Credential issuer roles", "Connect API clients", "Webhooks", "Compliance support"]
    }
  ];
  const liveWorkflow = [
    {
      label: "Professional",
      value: "Passport",
      detail: "Create records, attach evidence, request references, and approve corporate Access Grants."
    },
    {
      label: "Corporate",
      value: "Verify",
      detail: "Register an employer or staffing workspace, invite reviewers, and work approved records."
    },
    {
      label: "Admin",
      value: "Control",
      detail: "Monitor operations cases, audit events, notifications, Connect clients, and readiness status."
    }
  ];
  const pilotSignals = ["Supabase Auth", "Real database repositories", "Private evidence storage", "GitHub Pages deployment"];
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
          <button className="secondary-action" onClick={onOpenDemo}>
            Open demo
          </button>
          <button className="primary-action" onClick={() => document.getElementById("portal-auth")?.scrollIntoView()}>
            Get started
          </button>
        </div>
      </header>

      <section className="public-hero">
        <div>
          <span className="eyebrow">Passport, Verify, Admin, Connect</span>
          <h1>Verified workforce records for professionals and corporate hiring teams.</h1>
          <p>
            TrustGraph gives professionals a private evidence-first Passport and gives employers or staffing agencies
            a permissioned Verify portal for approved records, missing items, credentials, and audit-backed decisions.
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
                <small>Build a private Passport and approve each Access Grant.</small>
              </span>
            </button>
            <button className={portal === "corporate" ? "active" : ""} onClick={() => openPortal("corporate")}>
              <ShieldCheck size={18} />
              <span>
                <strong>Corporate teams</strong>
                <small>Register an employer or staffing workspace with RBAC.</small>
              </span>
            </button>
          </div>
        </div>
        <aside className="public-proof">
          <div>
            <span>13</span>
            <small>foundation tracks</small>
          </div>
          <div>
            <span>Live</span>
            <small>Supabase auth, database, storage</small>
          </div>
          <div>
            <span>RBAC</span>
            <small>Professional, corporate, issuer, admin</small>
          </div>
        </aside>
      </section>

      <section className="public-section">
        <div className="public-section-heading">
          <span className="eyebrow">Portals</span>
          <h2>One product, separate experiences</h2>
        </div>
        <div className="portal-grid">
          <article>
            <Fingerprint size={24} />
            <strong>Professional Passport</strong>
            <p>Create records, upload evidence, request references, approve Access Grants, and control sharing.</p>
          </article>
          <article>
            <ShieldCheck size={24} />
            <strong>Corporate Verify</strong>
            <p>Review approved shared Passports, request missing records, manage issuer workflows, and monitor readiness.</p>
          </article>
          <article>
            <Network size={24} />
            <strong>Connect and Admin</strong>
            <p>Operate API clients, webhooks, audit events, verification cases, and source-grounded advisory summaries.</p>
          </article>
        </div>
      </section>

      <section className="public-section workflow-section">
        <div className="public-section-heading">
          <span className="eyebrow">Live workflow</span>
          <h2>From registration to verified workforce decisions</h2>
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
          <span className="eyebrow">Pricing</span>
          <h2>Start simple, scale into corporate workflows</h2>
        </div>
        <div className="pricing-grid">
          {pricing.map((plan) => (
            <article className="pricing-card" key={plan.name}>
              <strong>{plan.name}</strong>
              <span>{plan.price}</span>
              <p>{plan.detail}</p>
              {plan.points.map((point) => (
                <small key={point}>{point}</small>
              ))}
            </article>
          ))}
        </div>
        <div className="pilot-signal-row">
          {pilotSignals.map((signal) => (
            <span key={signal}>{signal}</span>
          ))}
        </div>
      </section>

      <section className="public-auth-section" id="portal-auth">
        <div>
          <span className="eyebrow">Login and registration</span>
          <h2>{portal === "corporate" ? "Corporate portal access" : "Professional Passport access"}</h2>
          <p>
            {portal === "corporate"
              ? "Sign in or register, then create an employer or staffing agency account from the live RBAC panel."
              : "Sign in or register to create your professional account and start building your private Passport."}
          </p>
        </div>
        <form className={`public-auth-card ${portal === "corporate" ? "corporate-mode" : "professional-mode"}`} onSubmit={submit}>
          <div className="auth-card-heading">
            <span className="status-chip neutral">{portal === "corporate" ? "Corporate Verify" : "Professional Passport"}</span>
            <strong>{mode === "signup" ? "Create live account" : "Login to portal"}</strong>
            <small>
              {portal === "corporate"
                ? "Create a company workspace, invite reviewers, activate billing, and request Passport access."
                : "Create your professional profile, add records, upload evidence, and control sharing."}
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
            disabled={busy || !email || !password || (portal === "corporate" && mode === "signup" && !organizationName)}
            type="submit"
          >
            {mode === "signin" ? "Login" : "Create account"}
          </button>
          <button className="secondary-action" onClick={onOpenDemo} type="button">
            Explore demo app
          </button>
          <small>{message}</small>
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
  const [accountStatus, setAccountStatus] = useState("Demo account context");
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
  const [verifyRequests, setVerifyRequests] = useState<VerifyAccessGrantView[]>([]);
  const [sharedVerifyRecords, setSharedVerifyRecords] = useState<RecordItem[]>([]);
  const [verifyStatus, setVerifyStatus] = useState("Switch to Verify role for live requests");
  const [operationsCases, setOperationsCases] = useState<DbVerificationCase[]>([]);
  const [operationsStatus, setOperationsStatus] = useState("Switch to Admin role for live operations");
  const [auditEvents, setAuditEvents] = useState<DbAuditEvent[]>([]);
  const [auditStatus, setAuditStatus] = useState("Switch to Admin role for audit events");
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
    const storedSession = readStoredSession();
    setAuthSession(storedSession);
    if (storedSession) {
      setShowPublicSite(false);
    }
  }, []);

  useEffect(() => {
    if (!authSession) {
      setAccountContext(null);
      setAccountStatus("Demo account context");
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
        setMemberStatus(members.length ? `Team seats: ${members.length}` : "No live team members loaded");
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
      return;
    }

    let cancelled = false;
    setRecordStatus("Loading live Passport records...");
    setNotificationStatus("Loading notifications...");
    setReferenceStatus("Loading reference requests...");

    Promise.all([
      loadPassportRecords(accountContext.profile.id, authSession.accessToken),
      loadEvidenceDocuments(authSession.accessToken),
      loadNotificationEvents(authSession.accessToken),
      loadReferenceRequests(authSession.accessToken)
    ])
      .then(([items, documents, notifications, references]) => {
        if (cancelled) return;
        setLivePassportRecords(items);
        setEvidenceDocuments(documents);
        setNotificationEvents(notifications);
        setReferenceRequests(references);
        setRecordStatus(items.length ? "Live Supabase Passport records" : "No live records yet");
        setNotificationStatus(
          notifications.length ? `Live notifications: ${notifications.length} recent` : "No live notifications yet"
        );
        setReferenceStatus(references.length ? `Live reference requests: ${references.length}` : "No live reference requests yet");
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
        setRecordStatus(error instanceof Error ? error.message : "Could not load live Passport records");
        setNotificationStatus(error instanceof Error ? error.message : "Could not load notifications");
        setReferenceStatus(error instanceof Error ? error.message : "Could not load reference requests");
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
            : "No live Verify requests yet"
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
        setGrantStatus(items.length ? "Live Supabase Access Grants" : "No live Access Grants yet");
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
      setApiClients([]);
      setWebhookSubscriptions([]);
      setConnectStatus("Active role cannot access Connect controls");
      return;
    }

    let cancelled = false;
    setOperationsStatus("Loading live operations queue...");
    setAuditStatus("Loading audit events...");
    setConnectStatus("Loading Connect controls...");

    Promise.all([
      loadVerificationCases(authSession.accessToken),
      loadAuditEvents(authSession.accessToken),
      loadApiClients(authSession.accessToken),
      loadWebhookSubscriptions(authSession.accessToken)
    ])
      .then(([items, events, clients, webhooks]) => {
        if (cancelled) return;
        setOperationsCases(items);
        setAuditEvents(events);
        setApiClients(clients);
        setWebhookSubscriptions(webhooks);
        setOperationsStatus(items.length ? `Live Supabase operations queue: ${items.length} cases` : "No live operations cases yet");
        setAuditStatus(events.length ? `Live audit events: ${events.length} recent` : "No live audit events yet");
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
        setApiClients([]);
        setWebhookSubscriptions([]);
        setOperationsStatus(error instanceof Error ? error.message : "Could not load operations queue");
        setAuditStatus(error instanceof Error ? error.message : "Could not load audit events");
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
      status: input.status
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
    setNotificationStatus(notifications.length ? `Live notifications: ${notifications.length} recent` : "No live notifications yet");
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
    setNotificationStatus(notifications.length ? `Live notifications: ${notifications.length} recent` : "No live notifications yet");
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
    setNotificationStatus(notifications.length ? `Live notifications: ${notifications.length} recent` : "No live notifications yet");
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

  async function createSampleGrantRequest() {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before creating a sample Access Grant request.");
    }

    await createSampleAccessGrant(authSession.accessToken);
    const items = await loadAccessGrants(accountContext.profile.id, authSession.accessToken);
    setAccessGrants(items);
    setGrantStatus("Sample Access Grant request created");
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
    setAuditStatus(events.length ? `Live audit events: ${events.length} recent` : "No live audit events yet");
    setNotificationStatus(notifications.length ? `Live notifications: ${notifications.length} recent` : "No live notifications yet");
  }

  async function createSampleReviewerRole() {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before creating a sample reviewer role.");
    }

    await createSampleEmployerReviewerMembership(authSession.accessToken);
    const context = await loadAccountContext(accountContext.profile.id, authSession.accessToken);
    setAccountContext(context);
    const reviewerMembership = context.memberships.find((membership) => membership.role === "employer_reviewer");
    if (reviewerMembership) {
      setActiveMembershipId(reviewerMembership.id);
      setWorkspaceId("verify");
    }
    setVerifyStatus("Sample employer reviewer role created");
  }

  async function createLiveCredentialIssuerRole() {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before creating a credential issuer role.");
    }

    const membership = await createSampleCredentialIssuerMembership(authSession.accessToken);
    const context = await loadAccountContext(accountContext.profile.id, authSession.accessToken);
    setAccountContext(context);
    setActiveMembershipId(membership.id);
    setWorkspaceId("verify");
    setIssuerStatus("Sample credential issuer role created");
  }

  async function issueLiveCredential(input: {
    subjectEmail: string;
    subjectFullName: string;
    credentialType: Extract<RecordType, "license" | "certification" | "education" | "health_clearance" | "custom">;
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
    setNotificationStatus(notifications.length ? `Live notifications: ${notifications.length} recent` : "No live notifications yet");
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
    setNotificationStatus(notifications.length ? `Live notifications: ${notifications.length} recent` : "No live notifications yet");
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
    const events = await loadAuditEvents(authSession.accessToken).catch(() => auditEvents);
    setMissingRecordRequests((current) => current.map((request) => (request.id === updated.id ? updated : request)));
    setAuditEvents(events);
    setMissingRecordStatus(`Missing-record request moved to ${updated.status.replace(/_/g, " ")}`);
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

  async function createLiveOperationsSamples() {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before creating operations cases.");
    }

    const added = await createSampleVerificationCases(authSession.accessToken);
    const [items, events] = await Promise.all([
      loadVerificationCases(authSession.accessToken),
      loadAuditEvents(authSession.accessToken)
    ]);
    setOperationsCases(items);
    setAuditEvents(events);
    setOperationsStatus(added ? `Created ${added} sample operations cases` : "Sample operations cases already exist");
    setAuditStatus(events.length ? `Live audit events: ${events.length} recent` : "No live audit events yet");
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
    setAuditStatus(events.length ? `Live audit events: ${events.length} recent` : "No live audit events yet");
  }

  async function createLiveOperationsRole() {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before creating an operations role.");
    }

    const membership = await createSampleTrustGraphVerifierMembership(authSession.accessToken);
    const context = await loadAccountContext(accountContext.profile.id, authSession.accessToken);
    setAccountContext(context);
    setActiveMembershipId(membership.id);
    setWorkspaceId("admin");
    setAccountStatus("TrustGraph operations role created");
  }

  async function createLiveApiClient() {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before creating Connect API clients.");
    }

    const client = await createSampleApiClient(authSession.accessToken);
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

  if (showPublicSite && !authSession) {
    return (
      <PublicSite
        onCorporateSession={(session, input) => {
          setPendingCorporateAccount(input);
          setAuthSession(session);
          setShowPublicSite(false);
        }}
        onOpenDemo={() => setShowPublicSite(false)}
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
        <ProductionReadinessPanel
          accountContext={accountContext}
          activeOrganizationName={activeOrganization.name}
          authSession={authSession}
          teamManagementReady={teamManagementReady}
        />
        <NotificationPanel events={notificationEvents} message={notificationStatus} onStatus={updateLiveNotificationStatus} />

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
              <span className="status-chip neutral">{authSession ? "live auth" : "demo session"}</span>
            </div>
          </div>
          <div className="topbar-actions">
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
                  onSampleRequest={createSampleGrantRequest}
                />
                <ReferenceRequestsPanel
                  disabled={!authSession || !accountContext}
                  message={referenceStatus}
                  onCreate={createLiveReferenceRequest}
                  onStatus={updateLiveReferenceStatus}
                  requests={referenceRequests}
                />
              </>
            ) : null}

            {workspace.id === "verify" ? (
              <VerifyRequestsPanel
                activeOrganization={activeOrganization}
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
                onCreateReviewerRole={createSampleReviewerRole}
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
                  onCreateSamples={createLiveOperationsSamples}
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
                <PlanAlignmentPanel />
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
