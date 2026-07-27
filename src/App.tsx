"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Activity,
  Bell,
  CalendarClock,
  ChevronRight,
  Clock3,
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
import type { DbVerificationCase, RecordStatus, RecordType, VerificationCaseStatus } from "./database";
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
import {
  authModeLabel,
  readStoredSession,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  type AuthSession
} from "./auth";
import {
  createSampleAccessGrant,
  decideAccessGrant,
  loadAccessGrants,
  loadVerifyAccessGrants,
  syncAccessGrantRecords,
  type VerifyAccessGrantView,
  type AccessGrantView
} from "./grantRepository";
import {
  createSampleTrustGraphVerifierMembership,
  createSampleVerificationCases,
  decideVerificationCase,
  loadVerificationCases,
  verificationCaseToRecordItem
} from "./operationsRepository";
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
  onUpdate
}: {
  record: RecordItem;
  canEdit: boolean;
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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTitle(record.title);
    setSourceName(record.source);
    setEvidenceSummary(record.evidence === "Evidence details pending" ? "" : record.evidence);
    setExpiresAt("");
    setStatus(record.status === "pending verification" ? "pending_verification" : "draft");
    setMessage("Update selected live record");
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
      </section>

      {canEdit ? (
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

function VerifyRequestsPanel({
  disabled,
  message,
  requests,
  sharedRecords,
  onCreateReviewerRole
}: {
  disabled: boolean;
  message: string;
  requests: VerifyAccessGrantView[];
  sharedRecords: RecordItem[];
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
      return;
    }

    let cancelled = false;
    setRecordStatus("Loading live Passport records...");

    loadPassportRecords(accountContext.profile.id, authSession.accessToken)
      .then((items) => {
        if (cancelled) return;
        setLivePassportRecords(items);
        setRecordStatus(items.length ? "Live Supabase Passport records" : "No live records yet");
        if (items[0]) {
          setSelectedId(items[0].id);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setLivePassportRecords([]);
        setRecordStatus(error instanceof Error ? error.message : "Could not load live Passport records");
      });

    return () => {
      cancelled = true;
    };
  }, [authSession, accountContext]);

  useEffect(() => {
    if (!authSession || !accountContext || workspaceId !== "verify") {
      setVerifyRequests([]);
      setSharedVerifyRecords([]);
      setVerifyStatus("Switch to Verify role for live requests");
      return;
    }

    if (!canAccessWorkspace(activeMembership.role, "verify")) {
      setVerifyRequests([]);
      setSharedVerifyRecords([]);
      setVerifyStatus("Active role cannot access Verify workspace");
      return;
    }

    let cancelled = false;
    setVerifyStatus("Loading live Verify requests...");

    Promise.all([
      loadVerifyAccessGrants(activeMembership.organizationId, authSession.accessToken),
      loadSharedVerifyRecords(authSession.accessToken)
    ])
      .then(([items, sharedRecords]) => {
        if (cancelled) return;
        setVerifyRequests(items);
        setSharedVerifyRecords(sharedRecords);
        setVerifyStatus(
          items.length || sharedRecords.length
            ? `Live Supabase Verify data: ${items.length} requests, ${sharedRecords.length} shared records`
            : "No live Verify requests yet"
        );
      })
      .catch((error) => {
        if (cancelled) return;
        setVerifyRequests([]);
        setSharedVerifyRecords([]);
        setVerifyStatus(error instanceof Error ? error.message : "Could not load Verify requests");
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
      return;
    }

    if (!canAccessWorkspace(activeMembership.role, "admin")) {
      setOperationsCases([]);
      setOperationsStatus("Active role cannot access Admin operations");
      return;
    }

    let cancelled = false;
    setOperationsStatus("Loading live operations queue...");

    loadVerificationCases(authSession.accessToken)
      .then((items) => {
        if (cancelled) return;
        setOperationsCases(items);
        setOperationsStatus(items.length ? `Live Supabase operations queue: ${items.length} cases` : "No live operations cases yet");
      })
      .catch((error) => {
        if (cancelled) return;
        setOperationsCases([]);
        setOperationsStatus(error instanceof Error ? error.message : "Could not load operations queue");
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
    const items = await loadVerificationCases(authSession.accessToken);
    setOperationsCases(items);
    setOperationsStatus(added ? `Created ${added} sample operations cases` : "Sample operations cases already exist");
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
    setOperationsCases((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setOperationsStatus(`Case moved to ${updated.status.replace(/_/g, " ")}`);
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
              </>
            ) : null}

            {workspace.id === "verify" ? (
              <VerifyRequestsPanel
                disabled={!authSession || !accountContext || !canAccessWorkspace(activeMembership.role, "verify")}
                message={verifyStatus}
                onCreateReviewerRole={createSampleReviewerRole}
                requests={verifyRequests}
                sharedRecords={sharedVerifyRecords}
              />
            ) : null}

            {workspace.id === "admin" ? (
              <OperationsQueuePanel
                cases={operationsCases}
                disabled={!authSession || !accountContext || !canAccessWorkspace(activeMembership.role, "admin")}
                message={operationsStatus}
                onCreateSamples={createLiveOperationsSamples}
                onDecision={decideLiveOperationsCase}
              />
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
