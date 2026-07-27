"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity,
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
  KeyRound,
  LogIn,
  LockKeyhole,
  ShieldAlert,
  Search,
  ShieldCheck,
  Sparkles,
  UserPlus
} from "lucide-react";
import { workspaces, type RecordItem, type Tone, type Workspace, type WorkspaceId } from "./data";
import type {
  DbAuditEvent,
  DbEvidenceDocument,
  DbIssuerCredential,
  DbMissingRecordRequest,
  DbNotificationEvent,
  DbReferenceRequest,
  DbVerificationCase,
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
import {
  authModeLabel,
  readStoredSession,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  type AuthSession
} from "./auth";
import {
  createSampleCredentialIssuerMembership,
  issueCredentialRecord,
  loadIssuerCredentials
} from "./credentialRepository";
import {
  createSampleAccessGrant,
  decideAccessGrant,
  loadAccessGrants,
  loadVerifyAccessGrants,
  syncAccessGrantRecords,
  type VerifyAccessGrantView,
  type AccessGrantView
} from "./grantRepository";
import { createEvidenceDocument, loadEvidenceDocuments } from "./evidenceRepository";
import {
  createMissingRecordRequest,
  loadVerifyMissingRecordRequests,
  markMissingRecordRequestStatus
} from "./missingRecordRepository";
import { loadNotificationEvents, markNotificationEvent } from "./notificationRepository";
import { createReferenceRequest, loadReferenceRequests, markReferenceRequestStatus } from "./referenceRepository";
import {
  createSampleTrustGraphVerifierMembership,
  createSampleVerificationCases,
  decideVerificationCase,
  loadVerificationCases,
  verificationCaseToRecordItem
} from "./operationsRepository";
import { foundationTracks } from "./planAlignment";
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
  const [evidenceMessage, setEvidenceMessage] = useState("Attach evidence metadata to selected record");
  const [busy, setBusy] = useState(false);
  const [evidenceBusy, setEvidenceBusy] = useState(false);

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
    setEvidenceMessage("Attach evidence metadata to selected record");
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
        evidenceSummary: evidenceNote
      });
      setEvidenceTitle("");
      setEvidenceNote("");
      setEvidenceMessage("Evidence metadata linked");
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
          <div className="evidence-document-list">
            {evidenceDocuments.map((document) => (
              <article className="evidence-document-card" key={document.id}>
                <div>
                  <strong>{document.title}</strong>
                  <small>{document.document_type} · {document.source_name}</small>
                </div>
                <span className="status-chip neutral">{document.status}</span>
              </article>
            ))}
          </div>
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
            <div className="record-form-footer">
              <small>{evidenceMessage}</small>
              <button className="secondary-action" disabled={evidenceBusy || !evidenceTitle || !evidenceSource} type="submit">
                Link evidence
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
      <div className="grant-panel-top">
        <small>{message}</small>
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
          Sample request
        </button>
      </div>
      <div className="grant-list">
        {grants.length ? (
          grants.map((grant) => (
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
              <strong>No live Access Grants yet</strong>
              <p>Employer and staffing requests will appear here once Verify workspace is connected.</p>
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
  issuerCredentials,
  issuerDisabled,
  issuerMessage,
  message,
  missingRecordMessage,
  missingRecordRequests,
  requests,
  sharedRecords,
  onCreateIssuerRole,
  onCreateMissingRecordRequest,
  onIssueCredential,
  onMissingRecordStatus,
  onCreateReviewerRole
}: {
  disabled: boolean;
  issuerCredentials: DbIssuerCredential[];
  issuerDisabled: boolean;
  issuerMessage: string;
  message: string;
  missingRecordMessage: string;
  missingRecordRequests: DbMissingRecordRequest[];
  requests: VerifyAccessGrantView[];
  sharedRecords: RecordItem[];
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

  return (
    <section className="verify-panel">
      <div className="mini-heading">
        <ShieldCheck size={16} />
        <strong>Live Verify requests</strong>
      </div>
      <div className="grant-panel-top">
        <small>{message}</small>
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
          Sample reviewer role
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
              <p>Create an employer reviewer role, then generate a sample request from Passport.</p>
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
      <div className="missing-list">
        {requests.length ? (
          requests.slice(0, 6).map((request) => (
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
              <strong>No missing-record requests yet</strong>
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
      <div className="grant-panel-top">
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
          Sample issuer role
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
              <p>Create a sample issuer role, switch to it, then issue a verified license or certification.</p>
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
      <div className="grant-panel-top">
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
          Seed cases
        </button>
      </div>
      <div className="operations-case-list">
        {cases.length ? (
          cases.map((item) => (
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
              <strong>No live operations cases yet</strong>
              <p>Seed sample cases to test TrustGraph verifier and compliance workflows.</p>
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
  return (
    <section className="audit-panel">
      <div className="mini-heading">
        <Activity size={16} />
        <strong>Audit trail</strong>
      </div>
      <small>{message}</small>
      <div className="audit-list">
        {events.length ? (
          events.map((event) => (
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
              <strong>No live audit events yet</strong>
              <small>Material workflow actions will appear here.</small>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

function PlanAlignmentPanel() {
  return (
    <section className="plan-panel">
      <div className="mini-heading">
        <ClipboardCheck size={16} />
        <strong>13-track foundation alignment</strong>
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
        <button className="secondary-action" disabled={!authSession || busy} onClick={() => void createOperationsRole()} type="button">
          Sample ops role
        </button>
      </form>
      {panelStatus ? <small>{panelStatus}</small> : null}
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
      <div className="notification-list">
        {events.length ? (
          events.slice(0, 4).map((event) => (
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
              <strong>No live notifications</strong>
              <small>Workflow alerts will appear here.</small>
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

function App() {
  const [workspaceId, setWorkspaceId] = useState<WorkspaceId>("passport");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("identity");
  const [activeMembershipId, setActiveMembershipId] = useState(sessionUser.activeMembershipId);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [accountContext, setAccountContext] = useState<AccountContext | null>(null);
  const [accountStatus, setAccountStatus] = useState("Demo account context");
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

  useEffect(() => {
    const storedSession = readStoredSession();
    setAuthSession(storedSession);
  }, []);

  useEffect(() => {
    if (!authSession) {
      setAccountContext(null);
      setAccountStatus("Demo account context");
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
      return;
    }

    if (!canAccessWorkspace(activeMembership.role, "admin")) {
      setOperationsCases([]);
      setOperationsStatus("Active role cannot access Admin operations");
      setAuditEvents([]);
      setAuditStatus("Active role cannot access audit events");
      return;
    }

    let cancelled = false;
    setOperationsStatus("Loading live operations queue...");
    setAuditStatus("Loading audit events...");

    Promise.all([loadVerificationCases(authSession.accessToken), loadAuditEvents(authSession.accessToken)])
      .then(([items, events]) => {
        if (cancelled) return;
        setOperationsCases(items);
        setAuditEvents(events);
        setOperationsStatus(items.length ? `Live Supabase operations queue: ${items.length} cases` : "No live operations cases yet");
        setAuditStatus(events.length ? `Live audit events: ${events.length} recent` : "No live audit events yet");
      })
      .catch((error) => {
        if (cancelled) return;
        setOperationsCases([]);
        setAuditEvents([]);
        setOperationsStatus(error instanceof Error ? error.message : "Could not load operations queue");
        setAuditStatus(error instanceof Error ? error.message : "Could not load audit events");
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
  }) {
    if (!authSession || !accountContext) {
      throw new Error("Sign in before linking evidence metadata.");
    }

    const document = await createEvidenceDocument({
      accessToken: authSession.accessToken,
      ...input
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

        <AuthPanel accountStatus={accountStatus} session={authSession} onSession={setAuthSession} />
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

          <div className="hero-card ai-card">
            <div className="hero-card-top">
              <span className="eyebrow">AI advisory</span>
              <span className="status-chip info">
                <Sparkles size={13} />
                source-grounded
              </span>
            </div>
            <h2>Readiness summary</h2>
            <p>Generated only from authorized records. Disputed, expired, and revoked claims stay labeled.</p>
          </div>
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
