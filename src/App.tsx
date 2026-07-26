"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Bell,
  CalendarClock,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FileText,
  Filter,
  KeyRound,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { workspaces, type RecordItem, type Tone, type Workspace, type WorkspaceId } from "./data";

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
  onClick
}: {
  workspace: Workspace;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`workspace-button ${active ? "active" : ""}`} onClick={onClick}>
      <span>{workspace.label}</span>
      <small>{workspace.role}</small>
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

function RecordDetail({ record }: { record: RecordItem }) {
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

function App() {
  const [workspaceId, setWorkspaceId] = useState<WorkspaceId>("passport");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("identity");
  const workspace = workspaces.find((item) => item.id === workspaceId) ?? workspaces[0];

  const records = useMemo(() => {
    const q = query.toLowerCase().trim();
    return workspace.records.filter((record) =>
      [record.title, record.subtitle, record.section, record.status, record.trust, record.source]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [query, workspace]);

  const selectedRecord = records.find((record) => record.id === selectedId) ?? records[0] ?? workspace.records[0];

  function changeWorkspace(id: WorkspaceId) {
    const next = workspaces.find((item) => item.id === id);
    setWorkspaceId(id);
    setQuery("");
    setSelectedId(next?.records[0]?.id ?? "");
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
              onClick={() => changeWorkspace(item.id)}
            />
          ))}
        </div>

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
              <span className="status-chip neutral">{workspace.role}</span>
            </div>
            <h2>{workspace.organization}</h2>
            <p>All views, exports, and evidence access are filtered through role, organization, consent, and Access Grant scope.</p>
            <div className="context-actions">
              <button className="primary-action">
                <Eye size={16} />
                Preview access
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
            <RecordDetail record={selectedRecord} />
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
      </main>
    </div>
  );
}

export default App;
