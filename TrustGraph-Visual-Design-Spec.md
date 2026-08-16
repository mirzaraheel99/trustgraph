# TrustGraph — Visual Design Specification (v1)
**For Codex implementation. No code in this document.** Every color, size, weight, radius, and copy string below is a decision, not a suggestion. Where a value is stated, use that value.

This is the companion to `TrustGraph-UIUX-Redesign-Plan.md` (strategy/IA). Token names and values here are identical to that document — do not re-derive them.

---

# 1. Brand Direction

### Three words
**Precise · Owned · Calm**

- **Precise** — every number, date, and status is exact and legible. Tabular figures, hairline rules, no decoration that isn't information.
- **Owned** — the worker owns the record. The UI constantly demonstrates control (consent, scope, revoke) without lecturing.
- **Calm** — an enterprise buyer trusts what is quiet. No urgency, no glow, no motion for its own sake.

### What it should feel like
A well-run registry office rendered as software. Closer to a **bank statement, a land registry, or a clinical record system** than to a growth-stage startup. The nearest reference points: **Stripe Dashboard** (density done calmly), **Linear** (restraint, one accent), **Ramp** (institutional confidence), **Vanta/Drata** (trust surfaces without theatre).

The emotional target for each audience:
- Professional: *"This is mine, and nothing leaves it without me."*
- Corporate reviewer: *"I can finish my queue and defend every decision."*
- Buyer/exec: *"This company understands compliance."*

### What it must avoid
| Avoid | Why |
|---|---|
| Dark glassmorphism, blur panels, glow, neon | Reads consumer-crypto, not enterprise |
| Purple/blue gradient hero | Generic 2021 SaaS; zero differentiation |
| Multi-color palettes (more than one accent) | Color must mean status, not decoration |
| Emoji, illustration mascots, 3D blobs | Undermines a record-of-truth product |
| Stacked "hero cards" of equal weight | The current failure mode — no hierarchy |
| Internal telemetry as copy (release stamps, table names, `snake_case` markers) | Reads unfinished; a security smell to buyers |
| Bold + color + size all used for the same emphasis | Pick one per emphasis |
| Drop shadows above 1–2px | Elevation here is a whisper |

### Logo / wordmark treatment
**Wordmark-led. Build the wordmark now; keep the mark minimal.**

- **Wordmark:** `TrustGraph` set in the UI typeface at **weight 550, letter-spacing −0.02em**, single word, no space. Cap-height-aligned with the mark. Color `--ink` (`#16181A`) on light; `#FBFBFA` on ink.
- **Mark:** a **20×20 rounded square (radius 6)** filled `--accent-600` (`#0F615B`), containing a **2px-stroke glyph in `#FFFFFF`: three nodes connected by two edges forming an ascending line** (lower-left node → middle node → upper-right node). It reads as a graph of verified links and survives at 16px. No gradient, no shine, no outer ring.
- **Lockup:** mark + 8px gap + wordmark. Total header height 24px. Wordmark size 17px in the header, 20px in the footer.
- **Clear space:** 8px minimum on all sides (= mark half-height).
- **Favicon / app icon:** the mark alone on `--accent-600`, no wordmark.
- **Never:** outline the mark, place the wordmark on the accent fill, stretch, rotate, add a tagline inside the lockup, or use the mark as a decorative watermark larger than 96px.
- **Product sub-brands** are typographic only, never separate logos: `TrustGraph Passport`, `TrustGraph Verify`, `TrustGraph Scale` — wordmark at 550 + product word at 400, same size, same color.

### Icon style
- **Lucide, exclusively.** No second icon set, no custom icons except the logo mark.
- **Stroke 1.75px** at 16 and 20px; **1.5px** at 24px. Never fill an icon.
- **Sizes:** 14 (inline in `small` text), **16 (default — buttons, table actions, badges)**, 20 (nav rail, page headers), 24 (empty states, feature rows). Nothing larger except the 32px empty-state icon inside a 64px circle.
- **Color:** icons inherit text color. `--text-secondary` at rest in nav and tables; `--text` on hover/active; `--accent-600` only when the icon is the primary action's icon or marks a selected nav item.
- **Alignment:** icons sit on the text baseline box, optically centered, `flex-shrink: 0`, 8px gap to their label.
- **Canonical icon assignments** (use these consistently everywhere):

| Concept | Lucide icon |
|---|---|
| Dashboard | `layout-dashboard` |
| Passport | `id-card` |
| Records | `file-text` |
| Evidence | `paperclip` |
| Consent | `shield-check` |
| Access grants | `key-round` |
| Verify / review queue | `list-checks` |
| Request access | `send` |
| Company / workspace | `building-2` |
| Members | `users` |
| Roles / RBAC | `lock` |
| Billing | `credit-card` |
| Settings | `settings` |
| Audit / activity | `scroll-text` |
| Exports | `download` |
| Admin / operations | `wrench` |
| Verified | `circle-check` |
| Pending | `clock` |
| Expiring | `alert-triangle` |
| Revoked / blocked | `circle-slash` |
| Notifications | `bell` |
| Search | `search` |
| Sign out | `log-out` |
| Workspace switcher chevron | `chevrons-up-down` |

---

# 2. Exact Color Palette

Every value is final. Implement as CSS custom properties in one token file; nothing else in the codebase may contain a hex literal.

### 2.1 Core tokens

| Token | Hex | Role |
|---|---|---|
| `--bg` | `#FBFBFA` | Public website page background |
| `--bg-app` | `#FFFFFF` | App content background |
| `--surface` | `#FFFFFF` | Cards, tables, modals, popovers |
| `--surface-sunken` | `#F5F5F4` | Table headers, wells, empty states, code blocks |
| `--surface-hover` | `#F0F0EE` | Row/list hover on white |
| `--nav-bg` | `#16181A` | App left sidebar, site footer |
| `--nav-bg-hover` | `#22262A` | Sidebar item hover |
| `--nav-bg-active` | `#2A3033` | Sidebar item selected |
| `--nav-text` | `#B4B8BB` | Sidebar item at rest |
| `--nav-text-active` | `#FFFFFF` | Sidebar item selected |
| `--nav-border` | `#282C2F` | Sidebar dividers |
| `--text` | `#1A1A18` | Primary text, headings, table identity column |
| `--text-secondary` | `#5C5B57` | Labels, sub-copy, secondary table cells |
| `--text-muted` | `#8A8983` | Meta, timestamps, placeholders, captions |
| `--text-on-dark` | `#F7F7F5` | Text on `--nav-bg` |
| `--border` | `#E7E6E3` | Card borders, hairline dividers, table row rules |
| `--border-strong` | `#D3D2CE` | Input borders, section-header underline, secondary button border |
| `--primary` | `#0F615B` | Primary action fill (deep teal) |
| `--primary-hover` | `#137C74` | Primary action hover |
| `--primary-active` | `#0E4F4A` | Primary action pressed |
| `--primary-tint` | `#E6F2F0` | Selected rows, accent chips, tinted icon wells |
| `--primary-text` | `#0E4F4A` | Accent-colored text/links on light (AA-safe) |
| `--secondary-bg` | `#FFFFFF` | Secondary button fill |
| `--secondary-border` | `#D3D2CE` | Secondary button border |
| `--secondary-hover` | `#F5F5F4` | Secondary button hover fill |
| `--focus` | `#137C74` | Focus ring color (2px, 2px offset, 100% opacity) |

### 2.2 Status colors

Each status has **text** and **tint** only. Never a saturated fill.

| Status | Text/icon | Tint background | Used for |
|---|---|---|---|
| Success | `#146B45` | `#E8F3EC` | Verified, Approved, Active, Complete |
| Warning | `#8A5A10` | `#FBF2E2` | Pending you, Needs attention, Expiring |
| Danger | `#9B2C2C` | `#FBEBEB` | Expired, Revoked, Declined, Blocked, Failed |
| Info | `#2A5591` | `#EAF0F8` | In review, Requested, Awaiting others, Scoped |
| Neutral | `#5C5B57` | `#F1F1EF` | Draft, Not started, Archived |

Token names: `--success-text` / `--success-tint`, `--warning-*`, `--danger-*`, `--info-*`, `--neutral-*`.

### 2.3 Data-visualisation ramp (readiness rings, small charts only)
`#0F615B` → `#2E7D75` → `#5B9A93` → `#8CB8B3` → `#C3D9D6`. Track color `#EDEDEB`. No other chart colors.

### 2.4 Usage rules (non-negotiable)
1. **One accent.** `--primary` appears on at most **two** elements per viewport: the primary button, and either a selected nav item or one link cluster.
2. **Ink is for chrome only.** `--nav-bg` is used for the app sidebar, the site footer, and **one** marketing band. Never a card, never a hero background.
3. **No gradients.** A single permitted exception: the marketing preview band may sit on `--surface-sunken`, flat.
4. **No shadow over 1px+2px blur.** Card: `0 1px 2px rgba(20,20,18,0.04)`. Popover/dropdown: `0 4px 12px rgba(20,20,18,0.08)`. Modal: `0 16px 48px rgba(20,20,18,0.14)`. Nothing else.
5. **Status color never decorates.** If a card is tinted, it is because it carries a status.
6. **Contrast floors:** body text ≥4.5:1 (`--text` on `--surface` = 15.9:1; `--text-secondary` = 6.6:1; `--text-muted` = 4.0:1 — muted is permitted only at 13px+ for non-essential meta). White on `--primary` = 6.4:1.

### 2.5 How the website and app share the palette
They share **one token file**, imported by both. The only differences are three swaps, and they are the *entire* visual distinction between marketing and product:

| | Public website | Signed-in app |
|---|---|---|
| Page background | `--bg` `#FBFBFA` | `--bg-app` `#FFFFFF` |
| Ink surface | Footer + one band | Left sidebar (persistent) |
| Type scale entry point | `display` / `h1` 56/36 | `h1` 24 (page titles) |
| Section rhythm | 96px | 24px |
| Max content width | 1200px | 1200px |
| Buttons, inputs, cards, tables, badges | **identical components, identical tokens** | **identical** |

Because the site's product-preview band contains real screenshots of the app, and both use the same button/card/badge/table components, the family resemblance is structural rather than asserted.

---

# 3. Typography

### 3.1 Font
- **Primary (everything):** **Geist Sans** — self-hosted variable font, weights 400/500/550/600 subset latin. It has true tabular figures, a neutral institutional voice, and is not Inter.
- **Fallback stack:** `Geist, "Söhne", -apple-system, "Segoe UI", system-ui, sans-serif`
- **Monospace (ids, commands, hashes, table numerics if needed):** **Geist Mono**, fallback `ui-monospace, "SF Mono", Menlo, monospace`.
- **No serif. No second display face.** Hierarchy comes from size, weight, and space only.
- **Global:** `font-variant-numeric: tabular-nums` on all tables, stat tiles, prices, dates, counts, and percentages. `text-wrap: pretty` on paragraphs; `text-wrap: balance` on H1/H2.
- Letter-spacing: `−0.022em` at 40px+, `−0.018em` at 28–36px, `−0.011em` at 20–24px, `0` at ≤18px, `+0.04em` on uppercase labels.

### 3.2 Scale

| Token | Desktop | Mobile (<768) | Weight | Line height | Use |
|---|---|---|---|---|---|
| `display` | 56px | 34px | 500 | 1.06 / 1.14 | Marketing hero H1 only |
| `h1` | 36px | 27px | 500 | 1.15 | Marketing section heads |
| `h1-app` | 24px | 21px | 550 | 1.25 | App page titles |
| `h2` | 28px | 23px | 500 | 1.2 | Marketing sub-sections |
| `h2-app` | 18px | 17px | 550 | 1.35 | App section headers |
| `h3` | 20px | 19px | 550 | 1.4 | Card titles, modal titles |
| `body-lg` | 18px | 17px | 400 | 1.55 | Hero sub-copy, marketing body |
| `body` | 15px | 15px | 400 | 1.5 | App default, form values |
| `small` | 13px | 13px | 400 | 1.45 | Captions, helper text, table meta |
| `label` | 12px | 12px | 550 | 1.35 | Uppercase eyebrows, table headers, stat labels (`+0.04em`, uppercase) |
| `button` | 15px | 15px | 550 | 1 | Default & large buttons |
| `button-sm` | 13px | 13px | 550 | 1 | Small buttons, table row actions |
| `table` | 14px | 14px | 400 | 1.45 | Table cell text |
| `table-num` | 14px | 14px | 500 | 1.45 | Numeric cells, tabular, right-aligned |
| `stat` | 28px | 24px | 500 | 1.1 | Stat tile values, tabular |
| `mono` | 13px | 13px | 400 | 1.5 | Ids, hashes, commands |

### 3.3 Rules
- **Only 400, 500, 550, 600 exist.** 600 is reserved for the wordmark and table header emphasis; nothing in body copy uses it. No 700+ anywhere.
- **Measure:** marketing paragraphs 62–74ch; app helper text ≤72ch; table cells unconstrained but wrapping.
- **The identity column** in every table is `table` size at weight **500**, color `--text`. All other cells weight 400, color `--text-secondary`.
- Emphasis order when you need it: (1) weight 500, (2) color `--text`, (3) size. Never combine more than two.
- Uppercase is only for `label`. Never uppercase a heading, a button, or a badge.

---

# 4. Spacing and Layout System

### 4.1 Scale
4px base. **Permitted values only:** `2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 120`. Anything else is a bug.

### 4.2 Layout constants

| Property | Value |
|---|---|
| Max page width (marketing content) | **1200px** |
| Marketing outer gutter | 80px ≥1280 · 40px 1024–1279 · 24px 768–1023 · 20px <768 |
| Marketing section vertical padding | **96px** desktop · 72px 1024–1279 · 56px 768–1023 · 44px <768 |
| Hero vertical padding | 112px top / 96px bottom desktop · 56/48 mobile |
| App content max width | **1200px**, centered |
| App content padding | 32px desktop · 24px 1024–1279 · 20px <1024 · 16px <640 |
| Sidebar width | **256px** expanded · **64px** collapsed |
| Sidebar item height | 36px, 8px horizontal inset, 6px radius |
| Topbar height | **56px** |
| Marketing header height | **64px** (sticky, `--surface` at 92% + 8px backdrop blur, 1px `--border` bottom edge appears after 8px scroll) |
| App section gap (vertical, between sections) | **24px** |
| Card padding | **20px** compact · **24px** default · 16px on mobile |
| Card header → body gap | 16px |
| Grid gap | **16px** (tiles) · **24px** (cards) · **32px** (marketing columns) |
| Form field vertical gap | 20px; label → input 6px; input → helper 6px |
| Table row height | **48px** (default) · 40px (compact) · 56px (with avatar) |
| Table cell horizontal padding | 16px; first/last cell 20px |
| Border radius | **6px** (badge, chip, sidebar item, small button) · **8px** (button, input, select) · **10px** (card, modal, popover) · **12px** (large marketing card, preview frame) · **999px** (avatar only) |
| Border width | 1px everywhere. No 2px borders except the focus ring. |
| Shadow — card | `0 1px 2px rgba(20,20,18,0.04)` |
| Shadow — popover/dropdown/toast | `0 4px 12px rgba(20,20,18,0.08)` |
| Shadow — modal | `0 16px 48px rgba(20,20,18,0.14)` |
| Backdrop | `rgba(20,20,18,0.32)` |
| Focus ring | 2px `--focus`, offset 2px, radius follows the element |
| Motion | 150ms ease-out (hover/focus) · 200ms (popover, drawer) · 250ms cubic-bezier(.2,.8,.2,1) (modal, sheet). Respect `prefers-reduced-motion`. |

### 4.3 Breakpoints
`sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`

### 4.4 Overflow rules (these replace all existing ad-hoc "hardening" CSS)
1. Every flex/grid child: `min-width: 0`.
2. Every table lives inside an explicit scroll container with `overflow-x: auto` and an edge fade; the container, not the page, scrolls.
3. User-supplied strings: `overflow-wrap: anywhere`.
4. No `white-space: nowrap` on content — only on badges, buttons, and table headers.
5. Ids, URLs, hashes, and shell commands render through a single `CodeInline` component: mono, `--surface-sunken`, truncate with ellipsis at container width, copy button. Never wrap raw.
6. No fixed pixel widths on content containers; max-widths only.

---

# 5. Public Website Design — homepage, section by section

The homepage has **eight** sections. Nothing else. Total scroll ≈ 5.5 viewports at 1440×900.

---

## 5.1 Header

**Layout** — sticky, 64px, full-bleed with 1200px inner container. Three zones: logo lockup (left) · nav (center-left, 32px gap between items) · actions (right, 12px gap).

**Copy**
- Nav: `How it works` · `For professionals` · `For companies` · `Pricing` · `Security`
- Actions: `Log in` (ghost button) · `Get started` (primary button, 36px)

**Visual treatment** — `--surface` at 92% opacity, `backdrop-filter: blur(8px)`. Bottom hairline `--border` fades in after 8px scroll. Nav items `body` 15/400 `--text-secondary`; hover `--text`; active page gets `--text` + a 2px `--primary` underline sitting 20px below the text baseline.

**Components** — `MarketingHeader`, `Logo`, `NavLink`, `Button` (ghost, primary).

**Remove from current UI** — the "Open product / Get started" free-floating link pair; every mention of hosted build status, release stamp, or VPS in the header area.

---

## 5.2 Hero

**Layout** — 7/5 two-column at ≥1024 (copy left, preview right), 112px top padding. Stacks at <1024 with the preview below the CTAs.

**Copy**
- Eyebrow (`label`, `--text-muted`): `WORKFORCE RECORDS`
- H1 (`display`): **"Verified work records, owned by the worker."**
- Sub (`body-lg`, `--text-secondary`, max 58ch): *"Professionals keep one private record of their identity, work history, credentials, references and evidence. Companies request access to only what they need — with consent, scope, and a full audit trail."*
- Primary CTA: **`Create your Passport`** · qualifier beneath (`small`, `--text-muted`): *Free for professionals*
- Secondary CTA: **`Start Corporate Verify`** · qualifier: *$149/month per company*
- Below CTAs, one row of four `small` `--text-muted` items separated by 20px, each with a 14px Lucide icon: `shield-check Consent-first` · `lock Role-based access` · `paperclip Private evidence` · `scroll-text Full audit trail`

**Visual treatment** — no background image, no gradient. Ground is `--bg`. CTAs are 44px tall, side by side, 12px gap. The preview is a **browser-chrome-less product frame**: 12px radius, 1px `--border`, `0 1px 2px` shadow, containing a real screenshot of `/app/passport/overview`, bleeding 40px past the right container edge at ≥1440 (cropped, never scaled down).

**Components** — `Hero`, `Button` (primary lg, secondary lg), `IconTextRow`, `PreviewFrame`.

**Remove** — the current hero's "Evidence-first workforce records / Professional portal / Corporate portal / Start here" stack, the audience switchboard, all `snake_case` marker strings, all first-database-write copy, all server-status copy.

---

## 5.3 Professional / Corporate split

**Layout** — one row, two equal cards, 24px gap, 1200px container. Stacks <768.

**Copy**

| | Left card | Right card |
|---|---|---|
| Eyebrow | `FOR PROFESSIONALS` | `FOR COMPANIES` |
| Title (h3) | **Your record, your rules.** | **Verify without collecting.** |
| Body | *"Build one Passport of identity, work history, credentials, references and training. Attach private evidence. Approve every request, record by record."* | *"Request the records you need from a named professional. Review only what they approve, inside role-based workspaces, with an audit trail you can export."* |
| Bullets (4, 14px `circle-check` icon in `--primary`) | Private evidence storage · Reference requests · Access Grants you control · Export your record anytime | Scoped access by request · Reviewer roles and seats · Missing-record requests · Metadata-only exports |
| CTA | `Create your Passport` (primary) | `Start Corporate Verify` (secondary) |

**Corporate card sub-line** (13px `--text-muted`, under the bullets): *"$149/month per company — unlimited reviewers during the pilot."*

**Visual treatment** — `--surface`, 12px radius, 1px `--border`, 32px padding, card shadow. The two cards are visually identical; only the CTA variant differs. A single hairline `--border` divider runs above the section with 96px space.

**Components** — `SplitCard`, `BulletList`, `Button`.

**Remove** — the current "Who TrustGraph serves" switchboard, "Portal front door", "Portal launch map", "Buyer decision board", "Portal decision matrix", "Account type chooser" — six sections collapse into this one.

---

## 5.4 How it works

**Layout** — full-width `--surface-sunken` band, 96px padding. Section head centered (max 640px), then three columns 32px gap. Each column: a 320×200 UI crop (10px radius, 1px `--border`, white), then step number, then title, then body. Stacks <768.

**Copy**
- H2: **"From record to review, in three steps."**
- Sub (`body-lg`, `--text-secondary`, centered): *"One record. One request. One audit trail."*

| Step | Title | Body |
|---|---|---|
| `01` | **Build the Passport** | *"Add identity, work history, credentials, references and training. Attach evidence — files stay in private storage."* |
| `02` | **Approve a scoped request** | *"A company asks by email for specific records and a review window. You approve, decline, or revoke — per record."* |
| `03` | **Review with an audit trail** | *"Reviewers see only approved records. Every view, export and decision is logged for both sides."* |

Below step 03, one full-width line in a `--surface` bordered strip (16px padding, 8px radius, `shield-check` icon): **"Companies never browse the user database. Access is requested by email and granted record by record."** — this sentence appears **once** on the entire website.

**Components** — `SectionHeader`, `StepColumn`, `PreviewFrame` (small), `Banner` (info-neutral).

**Remove** — the current "Workflow", "Operating model", "Corporate access path", "Public entry sequence", "Public buyer launch path", "Registration database launch order" sections. All six become this.

---

## 5.5 Product preview area

**Layout** — 1200px container on `--bg`. Left rail of three text tabs (vertical, 240px), right a large preview frame (900×560, bleeding 40px right at ≥1440). Clicking a tab swaps the screenshot with a 200ms crossfade. Stacks <1024 into a horizontal 3-tab row above the image.

**Copy**
- H2: **"Built like the system of record it is."**
- Sub: *"The same tables, the same status language, the same audit trail — for both sides."*

| Tab label | Caption under the frame |
|---|---|
| `Passport overview` | *"Readiness at a glance: what's complete, what's expiring, what a company is waiting for."* |
| `Review queue` | *"Reviewers work a queue, not a wall of panels. Filters, bulk review, and scope always visible."* |
| `Access grant` | *"Approval shows exactly which records are shared, with whom, and for how long."* |

**Visual treatment** — active tab: `--text` + 500 + 2px `--primary` left rule; inactive: `--text-muted`. Frames are real screenshots at 2× resolution.

**Components** — `TabRail`, `PreviewFrame`, `Caption`.

**Remove** — the current "13 v1 foundation tracks / RBAC role-scoped workspaces / Evidence vault" stat cluster and the `Professional Passport · Evidence Signed · Consent Scoped · Corporate Verify · Auth Database Storage Audit` chip strip.

---

## 5.6 Trust / privacy / evidence / consent

**Layout** — 96px padding on `--bg`. Section head left-aligned, then a 4-column grid (24px gap) of borderless cells, each: 24px Lucide icon in a 40px `--primary-tint` rounded square (8px radius), 16px gap, title (h3 at 17px), body (`small`). Stacks to 2×2 at <1024, 1 column <640.

**Copy**
- H2: **"Privacy is the product, not a policy page."**
- Sub: *"Four guarantees, enforced in the database — not just described here."*

| Icon | Title | Body |
|---|---|---|
| `shield-check` | **Consent is per record** | *"Nothing is shared by default. Each Access Grant lists the exact records it covers and when it expires."* |
| `lock` | **Evidence stays private** | *"Files live in private storage. Companies see metadata; documents open only through short-lived signed links where consent allows."* |
| `users` | **Role-based access** | *"Company access is bound to a workspace and a role. Seats, permissions and suspensions are administered by the company, enforced by the database."* |
| `scroll-text` | **Auditable both ways** | *"Requests, approvals, views, exports and revocations are logged. Professionals and companies can each export their own trail."* |

Footer line of the section: `Read the security overview →` linking `/security`.

**Components** — `FeatureGrid`, `IconWell`, `TextLink`.

**Remove** — the current "Portal database access contract", "Public portal launch checklist", "pre-signup acceptance gate", "Live data contract", "Preview data accepted: no" strips. All become `/security` prose.

---

## 5.7 Pricing

**Layout** — `--surface-sunken` band, 96px padding. Centered head, then three cards in a 3-column grid (24px gap, equal height). The middle card (Corporate) is elevated: `--surface`, 1px `--primary` border, `0 4px 12px` shadow, and a 22px `Most popular` badge (`--primary-tint` / `--primary-text`) centered on its top edge. Cards stack <900, Corporate first.

**Copy**
- H2: **"Simple pilot pricing."**
- Sub: *"Start free as a professional. Companies run a paid pilot before anything scales."*

| | Professional | Corporate Verify | Scale |
|---|---|---|---|
| Eyebrow | `FOR INDIVIDUALS` | `FOR EMPLOYERS & AGENCIES` | `FOR ISSUERS & ENTERPRISE` |
| Price | **$0** · `small`: *free during pilot* | **$149** · `small`: */month per company, pilot* | **Custom** · `small`: *annual agreement* |
| One-liner | *Own and share your record.* | *Review approved records with your whole team.* | *Issuers, integrations and compliance operations.* |
| Bullets (5) | Unlimited Passport records · Private evidence storage · Reference requests · Access Grants and consent controls · Export your full record | Admin workspace and pilot team setup · Corporate Verify review queue · Scoped access requests by professional email · Audit exports and review attestations · Missing-record requests | Credential issuer roles · Connect API clients and webhooks · Compliance and rollout support · Custom review workflows · Named onboarding owner |
| CTA | `Create your Passport` (secondary) | `Start Corporate Verify` (primary) | `Talk to us` (secondary) |

Below the Corporate price, one 13px `--text-muted` line inside the card: *"One price per company — invite as many reviewers as your pilot needs."*

Below the grid, one line centered (`small`, `--text-muted`): *"Card payment isn't enabled during the pilot — we'll set billing up with you."*
Then a 3-question FAQ in a 2-column list: *What's included in the pilot?* · *Do you charge per reviewer?* (answer: *"No — $149/month covers the whole company during the pilot. Seat counts are shown to admins for visibility only."*) · *What happens to my data if I leave?*

**Components** — `PricingCard`, `Badge`, `BulletList`, `Button`, `FaqList`.

**Remove** — the per-seat estimator entirely (pilot billing is company-level; a reduced seat *tracker* lives in `/app/billing` for admin visibility only), the "Pricing and access summary", "Pricing path answer", "Pricing launch decision", "Live now / Supabase ledger", the Stripe-gate table, and all database-path copy. Six pricing surfaces become one.

---

## 5.8 CTA band + footer

**CTA band** — full-bleed `--nav-bg` (`#16181A`), 80px padding, centered content, max 720px.
- H2 in `--text-on-dark`: **"Start with one record."**
- Sub in `#B4B8BB`: *"Professionals are free during the pilot. Companies can run a Corporate Verify pilot this week."*
- Two CTAs: `Create your Passport` (primary — on ink, the primary button stays `--primary` fill with white text) · `Start Corporate Verify` (outline: 1px `#3A4044`, `--text-on-dark`, hover `#22262A`).

**Footer** — same `--nav-bg`, 64px top / 40px bottom padding, 1px `#282C2F` top divider between band and footer.
- Row 1: logo lockup (light) + 4 link columns (`Product`, `For you`, `Company`, `Legal`), column heads `label` in `#8A8983`, links `small` in `#B4B8BB` hover `#FFFFFF`, 12px row gap.
- Row 2 (after a `#282C2F` hairline, 32px above): `© 2026 TrustGraph` left; `Privacy` · `Terms` · `Security` right.
- **No** newsletter form, no social icons unless real accounts exist, **no** build/release/status information.

**Components** — `CtaBand`, `Footer`, `FooterColumn`.

---

## 5.9 Homepage removal summary
The current public page's ~40 stacked panels collapse into the eight sections above. Everything listed under each section's "Remove" line is deleted from public routes; its content survives as (a) one sentence in the section that owns it, (b) `/security` or `/pricing` prose, or (c) an Admin route behind auth.

---

# 6. Above-the-Fold Wireframe

## 6.1 Desktop, 1440×900

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ 64px HEADER  (sticky, --surface 92% + blur, hairline bottom on scroll)               │
│ ┌────────────────┐        ┌──────────────────────────────────┐   ┌────────┬────────┐ │
│ │[■] TrustGraph  │        │How it works  For professionals   │   │ Log in │Get     │ │
│ │ 20px mark+word │        │For companies  Pricing  Security  │   │ ghost  │started │ │
│ └────────────────┘        └──────────────────────────────────┘   └────────┴────────┘ │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ← 80px gutter →                          1200px container                           │
│                                                                                      │
│  ┌─────────────────────────────────────┐   ┌──────────────────────────────────────┐  │
│  │ WORKFORCE RECORDS      (label,muted)│   │ PRODUCT PREVIEW                      │  │
│  │                                     │   │ 12px radius · 1px --border           │  │
│  │ Verified work records,              │   │ 0 1px 2px shadow                     │  │
│  │ owned by the worker.                │   │ ┌──────────────────────────────────┐ │  │
│  │            (display 56/500, 2 lines)│   │ │ real screenshot:                 │ │  │
│  │                                     │   │ │ /app/passport/overview           │ │  │
│  │ Professionals keep one private      │   │ │                                  │ │  │
│  │ record of their identity, work      │   │ │ ┌sidebar┐ ┌ readiness ring 68% ┐ │ │  │
│  │ history, credentials, references    │   │ │ │ ink   │ │ checklist rows     │ │ │  │
│  │ and evidence. Companies request     │   │ │ │ 256px │ │ stat tiles ×4      │ │ │  │
│  │ access to only what they need —     │   │ │ │       │ │ records table      │ │ │  │
│  │ with consent, scope, and a full     │   │ │ └───────┘ └────────────────────┘ │ │  │
│  │ audit trail.  (body-lg, secondary)  │   │ └──────────────────────────────────┘ │  │
│  │                                     │   │        bleeds 40px past container →  │  │
│  │ ┌──────────────────┐ ┌────────────────────┐                                     │  │
│  │ │Create your       │ │Start Corporate     │  ← 44px tall, 12px gap              │  │
│  │ │Passport  PRIMARY │ │Verify   SECONDARY  │                                     │  │
│  │ └──────────────────┘ └────────────────────┘                                     │  │
│  │  Free for professionals   $149/month pilot   (small, muted, under each)          │  │
│  │                                     │                                            │  │
│  │ ✓Consent-first ✓Role-based access   │                                            │  │
│  │ ✓Private evidence ✓Full audit trail │  (small, muted, 14px icons, 20px gaps)     │  │
│  └─────────────────────────────────────┘                                            │  │
│                                                                                      │
│                       ↓ fold at ~900px — nothing else above it ↓                     │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

Vertical rhythm inside the hero: eyebrow → 16 → H1 → 20 → sub → 32 → CTA row → 12 → qualifiers → 32 → icon row.

## 6.2 Mobile, 390×844

```
┌────────────────────────────────────┐
│ 56px HEADER                        │
│ [■] TrustGraph        Log in  [☰]  │  ← Log in stays visible; nav in sheet
├────────────────────────────────────┤
│ 20px gutters                        │
│                                     │
│ WORKFORCE RECORDS      (12px label)│
│                                     │
│ Verified work                       │
│ records, owned                      │
│ by the worker.        (34px/500)    │
│                                     │
│ Professionals keep one private      │
│ record of their identity, work      │
│ history, credentials, references    │
│ and evidence. Companies request     │
│ access to only what they need.      │
│                       (17px/400)    │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │  Create your Passport  PRIMARY  │ │  ← full width, 48px
│ └─────────────────────────────────┘ │
│   Free for professionals            │
│ ┌─────────────────────────────────┐ │
│ │  Start Corporate Verify   SEC.  │ │  ← full width, 48px, 12px below
│ └─────────────────────────────────┘ │
│   $149/month pilot                  │
│                                     │
│ ✓ Consent-first                     │
│ ✓ Role-based access                 │  ← stacked, 8px gap
│ ✓ Private evidence                  │
│ ✓ Full audit trail                  │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ PRODUCT PREVIEW                 │ │  ← below the CTAs
│ │ screenshot, 10px radius,        │ │
│ │ cropped to the readiness        │ │
│ │ checklist (not scaled down)     │ │
│ └─────────────────────────────────┘ │
└────────────────────────────────────┘
```

Mobile nav sheet: full-height, `--surface`, links at 17px/500 with 52px rows, and `Log in` (secondary, full width) + `Get started` (primary, full width) pinned to the bottom with 20px padding and safe-area inset.

---

# 7. Auth / Login / Register Design

## 7.0 Shared auth shell
- Route background `--bg`. **No sidebar, no marketing nav.** A 64px top strip carries only the logo lockup (centered on mobile, left at 20px gutter on desktop) linking to `/`.
- Card: `--surface`, **max-width 420px**, centered horizontally, top offset 96px desktop / 40px mobile, 32px padding (24px mobile), 10px radius, 1px `--border`, card shadow.
- Card internals order: title (h3, 20px/550) → sub (`small`, `--text-secondary`) → 24px → fields → 24px → primary button (full width, 44px) → 16px → secondary link row (`small`, centered) → optional 20px → divider + tertiary help link.
- Below the card, 24px gap, one centered `small` `--text-muted` line for the legal/help note.
- **Nothing else on the page.** No pricing, no route boards, no server status, no first-database-write copy, no proof panels, no export buttons.

## 7.1 Login — `/login`

| | |
|---|---|
| **Title** | `Log in to TrustGraph` |
| **Sub** | *"Use the email you registered with."* |
| **Fields** | `Email` (type email, autocomplete username, autofocus) · `Password` (type password, autocomplete current-password, with a `Show`/`Hide` ghost text button inside the field on the right) |
| **Primary** | `Log in` (full width) |
| **Secondary row** | `Forgot password?` (left) · `Create an account` (right) — 13px, `--primary-text` |
| **Helper** | none — a login form needs no explanation |
| **Below card** | *"Trouble with an email link? Get help signing in"* → `/recover` |

**Error states**
- Wrong credentials → form-level strip above the fields: `--danger-tint` bg, 1px `#F0D4D4`, 8px radius, 12px 16px padding, `alert-triangle` 16px `--danger-text`, message **"That email and password don't match. Check the password, or reset it."** with `Reset password` link inline.
- Unverified email → same strip, warning variant: **"Confirm your email first. We sent a link to `name@company.com`."** + `Resend link` button (secondary, small) with a 60s cooldown showing `Resend in 0:47`.
- Rate limited → warning strip: **"Too many emails for now. Try again in about an hour, or use a link we already sent."** (never expose "Supabase 2/hour").
- Field-level: `Enter your email address` / `Enter your password`, 13px `--danger-text`, 6px under the input, input border `--danger-text`.

**Success** — no success state; navigate to the post-login destination immediately, with the button in a loading state (spinner replacing the label, button stays 44px, disabled).

**Mobile** — card becomes full-width with 20px page gutters, no card border or shadow, background `--surface`, top offset 24px. Inputs 48px. Primary button 48px. `Show` toggle stays.

## 7.2 Professional registration — `/register/professional`

Single step, three fields.

| | |
|---|---|
| **Title** | `Create your Passport` |
| **Sub** | *"Free for professionals during the pilot."* |
| **Fields** | `Full name` · `Email` · `Password` (helper under it: *"At least 8 characters."*) |
| **Primary** | `Create account` |
| **Secondary row** | `Already have an account? Log in` |
| **Below card** | *"By creating an account you agree to our Terms and Privacy Policy."* (links in `--primary-text`) |

**Error** — inline per field on blur/submit; duplicate email → form strip: **"An account already exists for this email."** + `Log in instead` link.
**Success** → the **Check your email** state (§7.5), replacing the card contents in place.
**Mobile** — as §7.1.

## 7.3 Corporate registration — `/register/corporate`

**Two steps.** Never one card of six fields.

Above the title, a 2-step indicator: two 4px-high bars (each 50% width, 4px gap, 2px radius) — active `--primary`, inactive `--border`; a `label` line above reads `STEP 1 OF 2`.

**Step 1 — Your account**
| | |
|---|---|
| Title | `Create your company account` |
| Sub | *"$149/month per company during the pilot. No card required to start."* |
| Fields | `Work email` (helper: *"Use your company domain."*) · `Full name` · `Password` |
| Primary | `Continue` |
| Secondary | `Already have an account? Log in` |

**Step 2 — Your company**
| | |
|---|---|
| Title | `Tell us about your company` |
| Sub | *"This creates your workspace. You can invite reviewers after setup."* |
| Fields | `Company name` · `Company domain` (prefix-styled, helper: *"We use this to match reviewer invitations."*) · `Organisation type` (Select: `Employer`, `Staffing agency`, `Healthcare provider`, `Other`) |
| Primary | `Create workspace` |
| Secondary | `← Back` (ghost, left-aligned above the primary) |

**Error** — missing org fields are inline; the current "preflight" panel is deleted. Domain format error: *"Enter a domain like acme.com — no https:// or path."*
**Success** → **Check your email** state, then post-verification landing at `/app/company/overview` in setup mode.
**Mobile** — steps are separate full-screen views; the step indicator stays pinned under the logo strip; `← Back` becomes a top-left icon button.

## 7.4 Password recovery — `/recover`

Three states in one route, one card.

**State A — Request**
| | |
|---|---|
| Title | `Reset your password` |
| Sub | *"We'll email you a link to set a new one."* |
| Field | `Email` |
| Primary | `Send reset link` |
| Secondary | `← Back to log in` |
| Advanced (see §7.6) | `My email link didn't work` — collapsed disclosure at the bottom |

**State B — Sent** — replaces card contents: 40px `mail-check` icon in a 64px `--primary-tint` circle, title `Check your email`, body *"We sent a reset link to **name@company.com**. It expires in 60 minutes."*, then `Resend link` (secondary, cooldown) and `← Back to log in`.

**State C — Set new password** (arriving from the emailed link)
| | |
|---|---|
| Title | `Set a new password` |
| Fields | `New password` (helper: *"At least 8 characters."*) · `Confirm new password` |
| Primary | `Update password` |
| Error | *"Passwords don't match."* / expired link → danger strip **"This link has expired. Request a new one."** + `Request new link` |
| Success | Toast `Password updated` + immediate redirect to `/app` |

## 7.5 Email verification state

Not a page of instructions — one focused state, used after both registrations.

```
┌──────────────────────────────────────────┐
│              ┌────────┐                  │
│              │  ✉ 40px│  64px circle,    │
│              │        │  --primary-tint  │
│              └────────┘                  │
│           Check your email               │  h3, centered
│                                          │
│  We sent a confirmation link to          │  body, secondary, centered
│  name@company.com. Open it to finish     │
│  setting up your account.                │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │        Resend link                 │  │  secondary, full width
│  └────────────────────────────────────┘  │  → becomes "Resend in 0:47"
│                                          │
│  Wrong email? Start over                 │  small link, centered
│  ────────────────────────────────────    │  --border hairline
│  ▸ My email link didn't work             │  advanced disclosure (§7.6)
└──────────────────────────────────────────┘
```

Copy rules: never mention rate limits proactively — the cooldown timer *is* the explanation. Never print the redirect URL. Never print a token or fragment.

## 7.6 Broken-link repair — advanced help (collapsed by default)

Rendered as a `Disclosure` at the bottom of the auth card: 13px row, `chevron-right` icon rotating to `chevron-down`, label **`My email link didn't work`**. Closed by default on every screen where it appears (login, recover, verification).

Expanded content, inside a `--surface-sunken` 8px-radius 16px-padded well:
- `small` `--text-secondary`: *"If the link opened a page that wouldn't load, paste it below and we'll point it at the right place. Your link is not stored."*
- One `Textarea` (3 rows, mono 13px, placeholder `Paste the full link from your email`).
- Primary small button: `Fix link`.
- On success: a `--success-tint` strip with `circle-check`, text **"Fixed. Open your repaired link"** and the link rendered as a `--primary-text` anchor (truncated to 60 chars, full URL in `title`).
- On failure: `--danger-tint` strip, *"That doesn't look like a TrustGraph email link. Paste the whole link, including the part after the # symbol."*

**Never** show: the words localhost, redirect URL, origin, token, Supabase, or any environment variable name.

---

# 8. Logged-In App Shell Design

**Decision: persistent left sidebar + 56px topbar.** Not top nav. Reason: the app has five role-scoped areas and deep sub-navigation; a rail communicates scope and role permanently, and it is what every reference product in this category uses.

## 8.1 Desktop wireframe, 1440×900

```
┌───────────────┬──────────────────────────────────────────────────────────────────────┐
│ 256px SIDEBAR │ 56px TOPBAR   --surface, 1px --border bottom                         │
│ --nav-bg      │ ┌────────────────────────────┐        ┌────┬────┬──────────────────┐ │
│ #16181A       │ │ Dashboard                  │        │ 🔍 │ 🔔 │ [AV] Amara ▾     │ │
│               │ │ (h1-app 24/550)            │        │16px│ 16 │ 28px avatar      │ │
│ ┌───────────┐ │ └────────────────────────────┘        └────┴────┴──────────────────┘ │
│ │[■] Trust  │ │                                                                      │
│ │   Graph   │ │──────────────────────────────────────────────────────────────────────│
│ └───────────┘ │                                                                      │
│               │  ← 32px →         content max 1200px, centered                        │
│ ┌───────────┐ │                                                                      │
│ │AB Amara B.│ │  ┌────────────────────────────────────────────────────────────────┐  │
│ │Personal   │ │  │ NEXT BEST ACTION  (see §9)                                     │  │
│ │Passport ⇅ │ │  └────────────────────────────────────────────────────────────────┘  │
│ └───────────┘ │                              ↕ 24px                                  │
│  workspace    │  ┌──────────┬──────────┬──────────┬──────────┐                       │
│  switcher     │  │ TILE     │ TILE     │ TILE     │ TILE     │  96px tall, 16px gap  │
│               │  └──────────┴──────────┴──────────┴──────────┘                       │
│ WORK          │                              ↕ 24px                                  │
│ ▸ Dashboard   │  ┌────────────────────────────────────────────────────────────────┐  │
│ ▸ Passport    │  │ SECTION: table with header, filters, rows                      │  │
│ ▸ Verify      │  └────────────────────────────────────────────────────────────────┘  │
│               │                              ↕ 24px                                  │
│ COMPANY       │  ┌────────────────────────────────────────────────────────────────┐  │
│ ▸ Overview    │  │ SECTION: recent activity list                                  │  │
│ ▸ Members     │  └────────────────────────────────────────────────────────────────┘  │
│ ▸ Roles       │                                                                      │
│ ▸ Audit       │                                                                      │
│               │                                                                      │
│ ACCOUNT       │                                                                      │
│ ▸ Billing     │                                                                      │
│ ▸ Settings    │                                                                      │
│  ─────────────│                                                                      │
│ ▸ Help        │                                                                      │
│ ▸ Admin       │  ← internal role only                                                │
└───────────────┴──────────────────────────────────────────────────────────────────────┘
```

### Sidebar specification
- Width 256px, `--nav-bg`, no shadow, 1px `--nav-border` right edge. Full height, `position: sticky`.
- **Logo block:** 56px tall (aligns with topbar), 16px inset, light wordmark, 1px `--nav-border` bottom.
- **Workspace switcher:** directly beneath, 16px inset, 8px vertical padding, 56px tall row: 28px rounded-square initials avatar (`#2A3033` bg, `--nav-text-active` text, 6px radius) + two lines (name 14/500 `--nav-text-active`; context 12/400 `--nav-text`) + `chevrons-up-down` 16px right. Hover `--nav-bg-hover`, 6px radius. Opens a 280px popover listing: `Personal Passport`, each company workspace (name + role), a hairline, then `Create a company workspace`. Current item marked with `check` 16px in `--primary`.
- **Nav groups:** group label `label` 12/550 uppercase `#6E7376`, 20px inset, 20px top / 8px bottom margin. Items 36px tall, 8px inset, 6px radius, 16px icon + 8px gap + 14/400 label. Rest `--nav-text`; hover `--nav-bg-hover` + `--nav-text-active`; **active** `--nav-bg-active` + `--nav-text-active` + a 3px `--primary` left bar (inset 0, 6px radius on the right side only) + icon in `--primary`.
- **Groups by role:** `WORK` (Dashboard, Passport, Verify) · `COMPANY` (Overview, Members, Roles, Audit) · `ACCOUNT` (Billing, Settings). Items absent when the role lacks them — never disabled-and-visible.
- **Sidebar footer:** pinned bottom, above a `--nav-border` hairline: `Help` and `Admin` (internal only), same item style, plus a 12/400 `#6E7376` line showing the plan (`Corporate pilot · $149/mo`) linking to Billing. **Never** a seat count in the sidebar — seats are not the billing unit.
- **Collapsed state (64px):** icons only, centered, tooltips on hover (dark popover, 12px). Toggle is a `panel-left-close` icon button in the topbar's far left. State persists per user in `localStorage`.

### Topbar specification
- 56px, `--surface`, 1px `--border` bottom, sticky. Left: page title (`h1-app` 24/550 `--text`) — or breadcrumb `Parent / Current` at 13px muted + title beneath on detail pages (topbar grows to 64px there).
- Right cluster, 8px gaps: **Search** (`search` icon button 32px; opens a command palette, ⌘K — ship the button in Phase C, the palette later) · **Notifications** (`bell` icon button 32px; unread = 6px `--danger-text` dot at top-right, no number) · **Avatar menu** (28px avatar + 14/400 first name + `chevron-down` 14px; hover `--surface-hover`, 6px radius, 6px 8px padding).
- **Avatar menu popover** (240px, 10px radius, popover shadow): header block (name 14/500, email 13/400 muted, 12px 16px padding, `--border` bottom) → items 36px, 16px icon + label: `Profile`, `Settings`, `Notifications`, hairline, `Help`, hairline, **`Sign out`** (`log-out` icon, `--danger-text` text). Sign out is always exactly two clicks from any screen, and is the last item.
- **Page-level primary action** lives in the page header inside the content area, **not** the topbar — except on index pages where the topbar's right side may carry one primary button before the search cluster (e.g. `Add record`, `Request access`).

## 8.2 Mobile wireframe, 390×844

```
┌────────────────────────────────────┐
│ 56px TOPBAR                        │
│ [☰]  Dashboard          🔔  [AV]   │  ← hamburger opens drawer
├────────────────────────────────────┤
│ 16px page padding                  │
│ ┌────────────────────────────────┐ │
│ │ NEXT BEST ACTION               │ │
│ └────────────────────────────────┘ │
│ ┌──────────────┬─────────────────┐ │
│ │ TILE         │ TILE            │ │  ← 2×2 grid, 12px gap
│ ├──────────────┼─────────────────┤ │
│ │ TILE         │ TILE            │ │
│ └──────────────┴─────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ QUEUE → rows become record     │ │
│ │ cards (identity + 2 meta lines │ │
│ │ + action row), not h-scroll    │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘

DRAWER (open):  280px, --nav-bg, slides from left, backdrop rgba(20,20,18,.32)
┌──────────────────────┐
│ [■] TrustGraph    [✕]│
│ ┌──────────────────┐ │
│ │AB Amara B.       │ │  ← workspace switcher (full-screen sheet when tapped)
│ │Personal Passport⇅│ │
│ └──────────────────┘ │
│ WORK                 │
│ ▸ Dashboard          │  ← 44px rows on touch
│ ▸ Passport           │
│ ▸ Verify             │
│ COMPANY … ACCOUNT …  │
│ ──────────────────── │
│ ▸ Help               │
│ ▸ Sign out           │  ← also in the drawer on mobile
└──────────────────────┘
```

Mobile rules: rail is never visible inline; the drawer closes on navigation; the topbar keeps title + bell + avatar only; page primary actions become a full-width button directly under the page header (never a floating action button).

---

# 9. Dashboard Design

Route `/app`. Four sections, in this order, nothing else.

## 9.1 Layout

```
┌────────────────────────────────────────────────────────────────────────────┐
│ PAGE HEADER                                                                │
│ Dashboard                                    (h1-app 24/550)               │
│ Tuesday, 18 August                           (small, --text-muted)         │
├────────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ NEXT BEST ACTION CARD    --surface, 1px --border, 10px, 24px padding    │ │
│ │ ┌──┐                                                                    │ │
│ │ │▲ │ 40px --warning-tint square, radius 8, alert-triangle 20px          │ │
│ │ └──┘                                                                    │ │
│ │ NEXT STEP                                    (label, --text-muted)      │ │
│ │ Northwind Health is waiting on your approval  (h3 20/550)               │ │
│ │ They've requested 4 records: identity, RN licence, immunisation record   │ │
│ │ and one reference. Review window: 14 days.     (body, --text-secondary)  │ │
│ │                                                                          │ │
│ │ ┌──────────────────────┐ ┌───────────────┐                              │ │
│ │ │ Review request  PRIM │ │ Not now  GHOST│                              │ │
│ │ └──────────────────────┘ └───────────────┘                              │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                    ↕ 24px                                   │
│ ┌──────────────┬──────────────┬──────────────┬──────────────┐              │
│ │ PASSPORT     │ RECORDS      │ PENDING      │ EXPIRING     │              │
│ │ READINESS    │              │ REQUESTS     │ SOON         │  96px tiles  │
│ │ 68%          │ 12           │ 1            │ 2            │  stat 28/500 │
│ │ ▓▓▓▓▓▓░░░ 4  │ 3 need       │ Northwind    │ within 45    │  small meta  │
│ │ of 6 complete│ evidence     │ Health       │ days         │              │
│ └──────────────┴──────────────┴──────────────┴──────────────┘              │
│                                    ↕ 24px                                   │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ SECTION HEADER  Needs your attention          [View all records →]      │ │
│ ├────────────────────────────────────────────────────────────────────────┤ │
│ │ RECORD               TYPE        STATUS          UPDATED     ACTION     │ │
│ │ RN Licence #4471     Credential  ⬤ Expiring      12 Aug      Renew  →  │ │
│ │ Northwind Health     Access      ⬤ Pending you   11 Aug      Review →  │ │
│ │ Ward Sister, St M.   Work        ⬤ Needs evidence 9 Aug      Attach →  │ │
│ │ Reference: J. Okafor Reference   ⬤ Requested      8 Aug      Remind →  │ │
│ │ Manual Handling 2026 Training    ⬤ Draft          4 Aug      Finish →  │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                    ↕ 24px                                   │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ SECTION HEADER  Recent activity                      [View audit →]     │ │
│ ├────────────────────────────────────────────────────────────────────────┤ │
│ │ ✓  You approved 4 records for Northwind Health          2 hours ago     │ │
│ │ ↓  Northwind Health exported record metadata            2 hours ago     │ │
│ │ ✎  You added evidence to RN Licence #4471               Yesterday       │ │
│ │ ✉  Reference request sent to J. Okafor                  14 Aug          │ │
│ │ ⬤  Manual Handling 2026 saved as draft                  12 Aug          │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

## 9.2 Next-best-action card — spec
- One per dashboard, always exactly one. `--surface`, 1px `--border`, 10px radius, 24px padding. **No tinted background** — the 40px status square carries the tone (warning/info/success/neutral).
- Order: icon square → `NEXT STEP` label → title (h3) → body (max 2 lines, 68ch) → 20px → action row (one primary + at most one ghost).
- When everything is clear: `circle-check` in `--success-tint`, label `ALL CLEAR`, title **"Your Passport is up to date."**, body *"12 records, all evidence attached, nothing expiring in the next 45 days."*, primary `Share your Passport`.
- Deterministic priority (professional): unverified email → identity incomplete → no work record → pending access request → missing-record request → expiring credential (≤45d) → evidence missing → all clear.
- Deterministic priority (corporate reviewer): workspace not created → plan not activated → no reviewers invited → no access request sent → awaiting approval → rows to review → gaps outstanding → attestation missing → all clear.

## 9.3 Stat tiles — copy per role
**Professional:** `PASSPORT READINESS` (68%, with a 4px progress bar and `4 of 6 complete`) · `RECORDS` (12, `3 need evidence`) · `PENDING REQUESTS` (1, `Northwind Health`) · `EXPIRING SOON` (2, `within 45 days`).
**Corporate reviewer:** `OPEN REQUESTS` (3, `2 awaiting approval`) · `ROWS TO REVIEW` (14, `across 4 professionals`) · `GAPS OUTSTANDING` (2, `missing-record requests`) · `REVIEWERS` (5, `active in this workspace`) — a team-size tile, not a billing tile.
Tiles are clickable, navigate to the filtered view, hover `--surface-hover`, and never contain more than value + one meta line.

## 9.4 Where the proof machinery goes

| Currently on the dashboard | New home |
|---|---|
| Real-row acceptance gate, live-data verdict, completion cockpit, mission control | `/app/admin/release` → *Readiness* tab |
| VPS freshness, server save commander, release stamp, manual sync command, VFIX boundary | `/app/admin/release` → *Deployment* tab (internal role only) |
| Registration handoff, portal acceptance checkpoints, route run receipts | `/app/admin/release` → *Receipts* table |
| Export packets of every kind | The owning module's `Exports` tab, as a table of generated packets |
| Per-action receipts (evidence access, review attestation, quote, recovery) | Written silently; surfaced as a **toast** on the action and a **row** in the relevant activity/history table |
| Preview-data rejection notices | Enforced silently; only appears as an error if a rejection actually occurs |

---

# 10. Professional Passport Design

Nav: `/app/passport` with tabs `Overview · Records · Evidence · Consent · Access grants · Requests · Exports` (Tabs component, 40px, under the page header).

## 10.1 Overview — `/app/passport/overview`

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Amara Boateng                                        [ Share Passport ]    │
│ Registered Nurse · Manchester · Member since Jan 2026                      │
│ ── Overview │ Records │ Evidence │ Consent │ Access grants │ Requests │ Exports
├────────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────┐ ┌──────────────────────────────────────────────┐ │
│ │ READINESS             │ │ CHECKLIST                                    │ │
│ │      ┌────┐           │ │ ✓ Identity          Verified      2 items  → │ │
│ │      │68% │ 120px ring│ │ ✓ Work history      Complete      4 records → │ │
│ │      └────┘           │ │ ▲ Credentials       1 expiring    3 records → │ │
│ │ 4 of 6 sections       │ │ ⬤ References        1 requested   2 of 3   → │ │
│ │ complete              │ │ ⬤ Training          Not started   0 items  → │ │
│ │                       │ │ ✓ Evidence          9 files       Complete  → │ │
│ │ [Complete your        │ │                                              │ │
│ │  Passport]            │ │  48px rows, hairline between, hover tint     │ │
│ └───────────────────────┘ └──────────────────────────────────────────────┘ │
│                                    ↕ 24px                                   │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ ALERTS (rendered only when non-empty)                                   │ │
│ │ ▲  RN Licence #4471 expires in 38 days.            [Renew] [Dismiss]    │ │
│ │ ⬤  Northwind Health requested 4 records.           [Review request]     │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

- Readiness card: 4-column span of 12 (min 300px); ring is an SVG donut, 120px, 10px stroke, track `#EDEDEB`, fill `--primary`, percentage centered at `stat` 28/500 tabular.
- Checklist card: 8-column span. Each row: 16px status icon → section name (`table` 14/500 `--text`) → status badge → count (`small` muted, right-aligned before the chevron) → `chevron-right` 16px muted. Entire row is the link.
- **This checklist replaces** the first-use wizard, the Passport hero, the portal desk, and every "answer/command" panel currently on this screen.

## 10.2 Records — `/app/passport/records`

- Page header: title `Records`, primary `Add record` (opens a modal with `Record type` select first, then type-specific fields).
- Filter bar (56px, `--surface`, 1px `--border` bottom, sticky under the tabs): `Search records` input (240px, `search` icon) · `Type` select · `Status` select · `Sensitivity` select · active-filter chips · result count right-aligned (`small` muted: `12 records`).
- Table columns: **Record** (identity, 500 weight; second line 13px muted showing organisation/period) · **Type** (badge, neutral) · **Period** (`Mar 2023 – Present`) · **Evidence** (`paperclip` + count, or `—`) · **Status** (badge) · **Shared with** (avatar stack max 3 + `+2`, or `Not shared`) · **Updated** (`12 Aug`) · **Actions** (`Edit`, `⋯`).
- Row click opens the detail page. Bulk select → bulk bar with `Add to grant`, `Export`, `Delete`.
- Empty state: `file-text` icon, **"No records yet."**, *"Start with your identity and current role — everything else builds on those."*, primary `Add your first record`.

## 10.3 Record detail — `/app/passport/records/:id`

Two columns, 2fr / 1fr, 24px gap; stacks <1024 (main first).

```
┌──────────────────────────────────────────────┬──────────────────────────────┐
│ ← Records                                    │ SHARING                      │
│ Ward Sister, St Mary's Hospital              │ Shared with 2 companies      │
│ Work history · Mar 2023 – Present  ⬤ Verified│ ┌──────────────────────────┐ │
│ ────────────────────────────────────────────  │ │ NH Northwind Health      │ │
│                                              │ │ Approved · ends 4 Sep  ⋯ │ │
│ DETAILS                          [Edit]      │ ├──────────────────────────┤ │
│ Employer        St Mary's Hospital NHS Trust │ │ AC Acme Staffing         │ │
│ Role            Ward Sister                  │ │ Approved · ends 20 Aug ⋯ │ │
│ Period          Mar 2023 – Present           │ └──────────────────────────┘ │
│ Location        Manchester, UK               │ [Manage sharing]             │
│ Responsibilities  4 listed                   │                              │
│ Skills          6 claimed                    │ CONSENT                      │
│                                              │ ⬤ Standard record            │
│ EVIDENCE (3)                    [Add file]   │ Explicit consent not required│
│ ┌──────────────────────────────────────────┐ │ [Mark as sensitive]          │
│ │ contract-2023.pdf   PDF 1.2MB  ⬇ 👁 ⋯    │ │                              │
│ │ payslip-mar24.pdf   PDF 0.4MB  ⬇ 👁 ⋯    │ │ ACTIVITY                     │
│ │ jobdesc-ward.docx   DOC 88KB   ⬇ 👁 ⋯    │ │ ✓ Approved for Northwind     │
│ └──────────────────────────────────────────┘ │   2 hours ago                │
│ Links open for 5 minutes. Files stay private.│ ✎ You edited responsibilities│
│                                              │   Yesterday                  │
└──────────────────────────────────────────────┴──────────────────────────────┘
```

- `DETAILS` is a definition list: label column 160px `small` `--text-secondary`, value `body` `--text`, 12px row gap, no borders between rows.
- Evidence rows: 48px, filename 14/500, type + size 13 muted, actions = three 28px icon buttons (`download`, `eye`, `ellipsis`). The expiry sentence is a single 13px muted caption under the list — **not** a panel, gate, or receipt card.
- Right column cards: 20px padding, `label` heading, hairline-separated rows.

## 10.4 Evidence — `/app/passport/evidence`

- One banner line at top (`--surface-sunken`, 8px radius, 12px 16px, `lock` 16px): **"Your files are stored privately. Companies see file names and metadata — documents open only through short-lived links you've approved."**
- Table: **File** (name 500 + 13px muted type/size) · **Linked record** (link) · **Uploaded** · **Visibility** (badge: `Private` / `Shared metadata` / `Shared document`) · **Actions** (`Preview`, `Download`, `⋯`).
- Primary action `Upload evidence` → modal with a 160px dashed drop zone (`--surface-sunken`, 1px dashed `--border-strong`, `upload-cloud` 24px), a `Link to record` select, and a `Description` field.
- Empty state: `paperclip`, **"No evidence uploaded."**, *"Attach contracts, certificates or payslips to prove a record. Files stay private until you approve sharing."*, primary `Upload evidence`.

## 10.5 Consent — `/app/passport/consent`

- Two sections. **1) Sensitive records:** a table of records flagged sensitive, with a `Requires explicit consent` toggle per row and a 13px caption *"Sensitive records are never included in a grant unless you approve them individually."* **2) Consent authorisations:** table — **Granted to** · **Scope** (`4 records`, hover shows the list) · **Granted** · **Expires** · **Status** (badge) · **Actions** (`Revoke`, danger ghost).
- `Revoke` opens a danger modal: title **"Revoke access for Northwind Health?"**, body *"They'll lose access to all 4 shared records immediately. This is recorded in your audit trail."*, buttons `Cancel` (secondary) / `Revoke access` (danger).

## 10.6 Access grants — `/app/passport/grants`

Tabs: `Requests (1)` · `Active (2)` · `History`. Default lands on `Requests` when non-empty.

**The approval modal is the most important screen in the product.** 560px wide, 10px radius, modal shadow.

```
┌──────────────────────────────────────────────────────────┐
│ Review access request                               [✕]  │
│ Northwind Health · requested 11 Aug by t.rice@northwind.…│
├──────────────────────────────────────────────────────────┤
│ PURPOSE                                                  │
│ "Pre-employment check for Ward Sister position, Ward 4B." │
│                                                           │
│ THEY'VE ASKED FOR   4 of your 12 records                  │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ ☑ Identity verification            Identity           │ │
│ │ ☑ RN Licence #4471                 Credential ▲ exp.  │ │
│ │ ☑ Ward Sister, St Mary's Hospital  Work history        │ │
│ │ ☑ Reference: J. Okafor             Reference          │ │
│ └───────────────────────────────────────────────────────┘ │
│ Uncheck anything you don't want to share.                 │
│                                                           │
│ REVIEW WINDOW    ( ) 7 days  (•) 14 days  ( ) 30 days     │
│ Access ends automatically on 4 September 2026.            │
│                                                           │
│ ⓘ They will see the records you approve and their         │
│   evidence metadata. Documents open only through          │
│   short-lived links. You can revoke at any time.          │
├──────────────────────────────────────────────────────────┤
│              [ Decline ]  [ Approve 4 records  PRIMARY ]  │
└──────────────────────────────────────────────────────────┘
```

Checkbox rows 44px, hairline-separated, `--primary-tint` when checked. The primary button label counts live (`Approve 3 records`) and disables at zero with the tooltip *"Select at least one record to approve."* On submit: modal closes, toast **"4 records shared with Northwind Health"** with an `Undo` action for 8 seconds.

## 10.7 Requests (missing records) — `/app/passport/requests`
Table: **Requested by** · **Record asked for** · **Why** (truncated, tooltip full) · **Asked** · **Status** · **Actions** (`Add record` primary-small / `Decline` ghost). Empty state: `inbox`, **"No requests."**, *"When a company needs a record you don't have yet, it'll appear here."*

## 10.8 Exports — `/app/passport/exports`
- List of available packets as 72px rows: name (14/500) + description (13 muted) + `Generate` (secondary small) right-aligned. Rows: `Full record export` · `Renewal readiness` · `Confidentiality review` · `Skills evidence` · `Sharing history`.
- Below, `Generated` table: **Packet** · **Scope** · **Rows** · **Created** · **Expires** · **Download**. Empty state: *"Nothing generated yet."*
- No receipts, gates, or acceptance panels. Generation writes its existing receipt rows silently.

---

# 11. Corporate Verify Design

Nav: `/app/verify` with tabs `Queue · Requests · Gaps · Exports`. **Landing is `Queue`.**

## 11.1 Review queue — `/app/verify/queue`

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Corporate Verify                                    [ Request access ]     │
│ Northwind Health · You are a Reviewer                                      │
│ ── Queue │ Requests │ Gaps │ Exports ─────────────────────────────────────  │
├────────────────────────────────────────────────────────────────────────────┤
│ 🛡  You can only see records a professional has approved for this workspace.│
│    --surface-sunken, 8px radius, 12/16 padding, shield-check 16px, 13px     │
├────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────┬──────────┬──────────┬──────────┐                              │
│ │ TO REVIEW│ AWAITING │ GAPS     │ EXPIRING │                              │
│ │ 14       │ APPROVAL │ 2        │ ACCESS   │                              │
│ │ 4 people │ 2        │ 1 person │ 1 in 3d  │                              │
│ └──────────┴──────────┴──────────┴──────────┘                              │
├────────────────────────────────────────────────────────────────────────────┤
│ 🔍 Search professionals   [Status ▾][Reviewer ▾][Expiring ▾]     14 rows    │
├────────────────────────────────────────────────────────────────────────────┤
│ ☐ PROFESSIONAL      ROLE          RECORDS  GAPS  ACCESS ENDS  STATUS       │
│ ☐ Amara Boateng     Ward Sister   4        —     4 Sep        ⬤ To review  │
│ ☐ Daniel Osei       Staff Nurse   6        1     28 Aug       ⬤ In review  │
│ ☐ Priya Raman       Theatre Nurse 3        —     20 Aug       ✓ Reviewed   │
│ ☐ Tomás Vidal       HCA           —        —     —            ⬤ Awaiting   │
│                                                        approval            │
│  48px rows · identity 14/500 · click → scoped record view                  │
├────────────────────────────────────────────────────────────────────────────┤
│ (selection active) 2 selected   [Mark reviewed] [Export metadata] [Clear]   │
└────────────────────────────────────────────────────────────────────────────┘
```

- The scope banner appears **once**, here, and nowhere else in the app.
- Row actions on hover: `Review →` (ghost small). Rows with `Awaiting approval` are not clickable and show a 13px muted `Waiting on the professional`.
- Empty state: `list-checks`, **"Nothing to review yet."**, *"Request access from a professional by email — you'll see their approved records here."*, primary `Request access`.

## 11.2 Request access flow — `/app/verify/requests`

Primary `Request access` opens a 520px modal, one step, inline validation only (the current "preflight" panel is deleted).

| Field | Type | Helper / validation |
|---|---|---|
| `Professional's email` | email | *"They'll get a request to approve. We don't reveal whether an account exists."* · error: *"Enter a valid email address."* |
| `What do you need?` | multi-select checkboxes: Identity · Work history · Credentials · References · Training · Evidence metadata | error: *"Choose at least one record type."* |
| `Business purpose` | textarea 3 rows, 300 char counter | *"Shown to the professional. Be specific — vague requests get declined."* |
| `Review window` | segmented: 7 / 14 / 30 days (default 14) | *"Access ends automatically."* |
| Footer note | — | 13px muted: *"You'll only see what they approve."* |

Buttons: `Cancel` / `Send request`. Success toast: **"Request sent to amara.b@example.com"**.

Requests table: **Professional** · **Requested** · **Types asked** · **Purpose** · **Window** · **Status** (`Awaiting approval` / `Approved` / `Declined` / `Expired`) · **Actions** (`Resend`, `Withdraw`).

## 11.3 Scoped professional record view — `/app/verify/professionals/:id`

Two columns, 2fr / 1fr.

```
┌──────────────────────────────────────────────┬──────────────────────────────┐
│ ← Queue                                      │ ACCESS SCOPE                 │
│ Amara Boateng                    [Mark reviewed]│ Approved 11 Aug            │
│ Ward Sister · 4 records shared · ends 4 Sep  │ Ends 4 Sep (17 days)         │
│ ─────────────────────────────────────────────│ Requested by you             │
│                                              │ 4 of 12 records shared       │
│ IDENTITY (1)                                 │                              │
│ ┌──────────────────────────────────────────┐ │ CONSENT                      │
│ │ Identity verification    ✓ Verified    → │ │ ✓ Standard records: 3        │
│ └──────────────────────────────────────────┘ │ ✓ Explicit consent given: 1  │
│                                              │                              │
│ CREDENTIALS (1)                              │ ACTIONS                      │
│ ┌──────────────────────────────────────────┐ │ [Request missing record]     │
│ │ RN Licence #4471   ▲ Expires 19 Sep   → │ │ [Export metadata]            │
│ │ NMC · verified by issuer                 │ │ [Mark reviewed]              │
│ └──────────────────────────────────────────┘ │                              │
│                                              │ REVIEW HISTORY               │
│ WORK HISTORY (1)  … REFERENCES (1) …         │ ⬤ Opened by you · today      │
│                                              │ ⬤ Metadata exported · today  │
│ NOT SHARED                                   │                              │
│ 8 further records exist and were not         │                              │
│ included in this grant.   (13px muted)       │                              │
└──────────────────────────────────────────────┴──────────────────────────────┘
```

- Records group by type with `label` group headers; each record is a 64px bordered row, expandable to show fields and evidence **metadata only** (file name, type, size, uploaded date). Where consent allows a document, a `Preview` button appears; otherwise a 13px muted `Document not shared`.
- The `NOT SHARED` line states the count without naming anything — this communicates the boundary honestly and replaces every "no open browse" panel.
- `Mark reviewed` opens a small modal: `Outcome` (segmented: Satisfied / Needs more / Concern), optional `Note`, then `Record review`. Writes the existing attestation; success is a toast plus a row in Review history.

## 11.4 Gaps — `/app/verify/gaps`
Table: **Professional** · **Record requested** · **Why** · **Asked** · **Status** (`Requested` / `Added` / `Declined`) · **Actions** (`Remind`, `Withdraw`). Empty state: `circle-help`, **"No outstanding gaps."**

## 11.5 Exports — `/app/verify/exports`
Same pattern as §10.8. Packets: `Review queue (CSV)` · `Scoped record metadata` · `Review attestations` · `Access history`. One 13px muted line above the list: **"Exports contain metadata only — never documents."** Buttons disable with a tooltip naming the exact missing precondition (e.g. *"Record a review first."*), replacing the standing export-gate panel.

---

# 12. Company Admin / RBAC Design

Nav `/app/company`, tabs `Overview · Members · Invitations · Roles · Audit`.

## 12.1 Overview
- **When setup incomplete:** a checklist card (identical component to the Passport checklist) with four rows: `Workspace created` ✓ · `Pilot plan activated` ▲ · `Reviewers invited` ⬤ · `First access request sent` ⬤ — each with an inline action. Above it, the next-best-action card.
- **When complete:** the checklist collapses to a single 48px `--success-tint` strip: `circle-check` **"Workspace ready."** + `View setup details` disclosure.
- Then two cards side by side: **Workspace** (Name, Domain, Type, Created, `Edit`) and **Plan** — title `Corporate Verify pilot`, price line `$149/month per company` (`stat` 28/500 for the figure, `small` muted for the unit), status badge `Active`, a 13px muted line **"Billed per company during the pilot — reviewer seats are unlimited."**, then `5 reviewers · 2 admins` as plain team context, and `Manage billing`.

## 12.2 Members
Table: **Member** (28px avatar + name 14/500 + email 13 muted) · **Role** (badge) · **Status** (`Active` / `Invited` / `Suspended`) · **Last active** · **Actions** (`⋯` → Change role, Suspend, Remove). Primary `Invite member` → modal: `Email`, `Role` (select with a one-line description under each option), optional `Message`, buttons `Cancel` / `Send invitation`.

## 12.3 Invitations
Tabs `Pending · Accepted · Expired`. Table: **Email** · **Role** · **Sent** · **Expires** · **Sent by** · **Actions** (`Resend`, `Copy link`, `Revoke`). Empty state: `mail`, **"No pending invitations."**

## 12.4 Roles — the RBAC matrix

This single table is what makes RBAC understandable. It replaces every RBAC status panel in the current app.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Roles and permissions                                                      │
│ What each role can do in this workspace. Enforced by the database.         │
├──────────────────────────────────────┬────────┬──────────┬───────┬────────┤
│ PERMISSION                           │ OWNER  │ ADMIN    │REVIEWER│ VIEWER │
├──────────────────────────────────────┼────────┼──────────┼───────┼────────┤
│ Request access from a professional   │   ✓    │    ✓     │   ✓   │   —    │
│ Review approved records              │   ✓    │    ✓     │   ✓   │   ✓    │
│ Record a review attestation          │   ✓    │    ✓     │   ✓   │   —    │
│ Request a missing record             │   ✓    │    ✓     │   ✓   │   —    │
│ Export record metadata               │   ✓    │    ✓     │   ✓   │   —    │
│ Invite and remove members            │   ✓    │    ✓     │   —   │   —    │
│ Change roles                         │   ✓    │    ✓     │   —   │   —    │
│ Manage billing and seats             │   ✓    │    —     │   —   │   —    │
│ View company audit trail             │   ✓    │    ✓     │   —   │   —    │
│ Delete the workspace                 │   ✓    │    —     │   —   │   —    │
├──────────────────────────────────────┴────────┴──────────┴───────┴────────┤
│ ⓘ No role can browse professionals who haven't approved access.            │
└────────────────────────────────────────────────────────────────────────────┘
```

- Permission column left-aligned 14/400; role columns centered, 100px wide, `label` headers; `✓` = 16px `check` in `--success-text`, `—` = `--text-muted`. Your own role's column has a `--primary-tint` background and a `You` chip in the header.
- Below: **Team** summary — `5 reviewers · 2 admins · 1 owner`, with `Invite member`. No seat quota, no "seats used" progress bar: the pilot has no per-seat limit.

## 12.5 Billing — `/app/billing`
- **Plan card:** `Corporate Verify pilot` · **$149/month per company** (`stat` 28/500 for the figure, `small` muted for the unit) · status badge `Active`. One 13px muted line: **"Billed at company level during the pilot. Reviewer seats are unlimited — the count below is for your visibility only."** Then a `Reviewers` row (`5 active`, `Manage team →`).
- Quote history table (§10.8 pattern). Payments rendered as an empty state: `credit-card` icon, **"Payment collection isn't enabled yet."**, *"We'll set billing up with you before the pilot converts."*, `Talk to us` (secondary). No per-seat stepper, no projected-total maths, no Stripe-gate copy.

## 12.6 Audit
Filter bar: date range · actor select · action-type select · search. Table: **When** (`18 Aug, 14:02`, tabular) · **Actor** (avatar + name) · **Action** (plain language: *"Approved access request"*) · **Object** (link) · **Scope**. One `Export` button applying the current filters, with a 13px muted caption *"Exports the current filters."*

---

# 13. Component System

All components use the tokens from §2 and §4. Nothing below invents a value.

## 13.1 Buttons

| Variant | Fill | Border | Text | Hover | Active | Use |
|---|---|---|---|---|---|---|
| Primary | `--primary` | none | `#FFFFFF` | `--primary-hover` | `--primary-active` | The one main action |
| Secondary | `--surface` | 1px `--border-strong` | `--text` | fill `--secondary-hover` | fill `#EBEBE9` | Alternate actions |
| Ghost | transparent | none | `--text-secondary` | fill `--surface-hover`, text `--text` | fill `#EAEAE8` | Tertiary, table rows, toolbars |
| Danger | `--surface` | 1px `#F0D4D4` | `--danger-text` | fill `--danger-tint` | fill `#F7DEDE` | Destructive |
| Link | none | none | `--primary-text` | underline | — | Inline in prose |
| Icon | transparent | none | `--text-secondary` | fill `--surface-hover` | — | 32px square, 16px icon |

**Sizes:** lg 44px / 20px padding / `button` 15px (marketing CTAs, auth submit) · default 36px / 14px padding / 15px · sm 32px / 12px padding / `button-sm` 13px. Radius 8 (6 for sm). Icon gap 8px. Multi-word labels never wrap (`white-space: nowrap`).
**States:** focus = 2px `--focus` ring, 2px offset. Disabled = 45% opacity, `cursor: not-allowed`, **always** with a tooltip stating why. Loading = 16px spinner replacing the label, width preserved, `aria-busy`.
**Rules:** one primary per screen region; primary is always the rightmost in a footer row and the leftmost in a content row; labels are verb-first and sentence case (`Create account`, not `CREATE ACCOUNT` or `Create Account`).
**Examples:** `Create your Passport` · `Request access` · `Approve 4 records` · `Mark reviewed` · `Revoke access` · `Generate`

## 13.2 Inputs

- Height 40px (48px mobile), radius 8, 1px `--border-strong`, `--surface` fill, 12px horizontal padding, `body` 15px `--text`, placeholder `--text-muted`.
- Label above: `small` 13/550 `--text-secondary`, 6px gap. Required marked with a 13px `--danger-text` asterisk; a legend line reads `* Required`. Optional fields are labelled `(optional)` in `--text-muted` instead.
- Helper text: `small` 13/400 `--text-muted`, 6px under.
- **Hover:** border `#C4C3BF`. **Focus:** border `--focus` + 2px ring at 2px offset, no shadow. **Error:** border `--danger-text`, message replaces helper text in `--danger-text` with a 14px `alert-circle`. **Disabled:** `--surface-sunken` fill, `--text-muted` text. **Read-only:** no border, `--surface-sunken` fill.
- Prefix/suffix: 13px `--text-muted` inside the field with a 1px `--border` divider (e.g. `https://` prefix, `Show` suffix).
- Textarea: same, min-height 88px, `resize: vertical`, optional character counter bottom-right in `small` muted.
- Search input: `search` 16px icon left at 12px, 36px height, 240px default width.
- Checkbox/radio: 16px, radius 4 (checkbox) / 999px (radio), 1px `--border-strong`; checked `--primary` fill + white 12px `check` / 6px dot. Label `body` with 10px gap. Hit area 44px on touch.
- Toggle: 36×20 track, radius 999, 16px knob; off `#D3D2CE`, on `--primary`; 150ms.
- Segmented control: 36px, `--surface-sunken` track, 6px radius, 4px inner padding; selected segment `--surface` + card shadow + `--text` 500; unselected `--text-secondary`.

**Examples:** label `Professional's email`, placeholder `name@company.com`, helper *"They'll get a request to approve."*, error *"Enter a valid email address."*

## 13.3 Select fields
- Trigger identical to an input, with `chevron-down` 16px `--text-muted` at 12px from the right. Placeholder in `--text-muted`.
- Menu: `--surface`, 10px radius, 1px `--border`, popover shadow, 4px padding, max-height 320px scroll, 4px offset. Options 36px, 8px 12px padding, 6px radius, `body` 15px; hover `--surface-hover`; selected `--primary-tint` + `check` 16px `--primary` right.
- Optional option description: 13px `--text-muted` second line (used in the role select).
- Multi-select renders 22px chips in the trigger, max 3 then `+2`; each chip has an `x` 12px.
- Native `<select>` on mobile <768.

## 13.4 Cards
- `--surface`, 1px `--border`, 10px radius, card shadow, 24px padding (20px compact, 16px mobile).
- Anatomy: optional `label` eyebrow (12/550 uppercase `--text-muted`) → title `h3` → 8px → body → 20px → footer action row (right-aligned, 8px gaps, separated by a `--border` hairline with 16px above when the card is long).
- **Max one nesting level.** A card may contain a table or a list, never another card. Max 4 key/value pairs in a summary card — beyond that, use a table.
- Interactive card (dashboard tiles, split cards): hover border `--border-strong` + shadow `0 2px 4px rgba(20,20,18,0.05)`, 150ms; focus ring on the whole card.
- Status card: add a 40px tinted icon square top-left; the card body stays on `--surface` (never tint the whole card except the collapsed success strip in §12.1).

## 13.5 Badges
- Height 22px, radius 6, 8px horizontal padding, `label`-sized 12/550 (not uppercase — sentence case), tint background + status text color, no border, optional 6px dot 6px before the label.
- Sizes: default 22px; sm 20px with 11px text (inside table dense rows).
- **Canonical vocabulary — use these exact words:** `Verified` `Approved` `Active` `Complete` `Reviewed` (success) · `Pending` `Awaiting approval` `Needs attention` `Expiring` `Invited` (warning) · `Expired` `Revoked` `Declined` `Blocked` `Suspended` (danger) · `In review` `Requested` `Scoped` `To review` (info) · `Draft` `Not started` `Archived` `Not shared` (neutral).
- Type/role badges (`Credential`, `Reviewer`) use the neutral variant. Never invent a new status word without adding it to this list.

## 13.6 Tables
- Container: `--surface`, 1px `--border`, 10px radius, overflow hidden; the scroll happens on an inner wrapper.
- Header row: `--surface-sunken`, 40px, `label` 12/550 uppercase `--text-secondary`, 1px `--border` bottom, sticky at the container top.
- Rows: 48px, 1px `--border` bottom (none on the last), hover `--surface-hover`, selected `--primary-tint`. Cell padding 16px (20px first/last).
- Identity column (first): `table` 14/500 `--text`, optional 13px `--text-muted` second line. Other cells 14/400 `--text-secondary`. Numeric cells right-aligned, tabular, 14/500.
- Actions column: right-aligned, ghost sm buttons or 28px icon buttons; opacity 0 → 1 on row hover (always 1 on touch and on keyboard focus).
- Filter bar above (56px, inside the container, `--border` bottom): search + up to 3 selects + filter chips + right-aligned `small` muted count.
- Selection: 40px checkbox column; when any row is selected the filter bar is replaced in place by a bulk bar (`--primary-tint`, `2 selected` 14/500, then actions, then `Clear`).
- Pagination: footer 52px, `--surface`, `Showing 1–25 of 143` left (`small` muted), `Previous`/`Next` secondary sm right. Use `Load more` instead for activity feeds.
- **Loading:** 5 skeleton rows — 14px `#EFEFED` bars at 60%/40%/30% widths, 1.4s pulse. **Never a spinner in place of a table.**
- **Mobile <768:** each row becomes a `RecordCard` — identity line 15/500, 2–3 `label: value` lines at 13px, badge, then a full-width action row. Horizontal scroll only for genuinely numeric tables.

## 13.7 Tabs
- Underline style. Track height 40px with a 1px `--border` bottom spanning the full content width. Tab: 14/500, 12px horizontal padding, 16px gap between tabs; rest `--text-secondary`, hover `--text`, **active** `--text` + a 2px `--primary` bar on the bottom edge. Optional count as a 20px neutral badge after the label (`--primary-tint` when active).
- Placement: directly under the page header, above filter bars. Never nested tabs; if a section needs sub-navigation, use a segmented control inside it.
- Mobile: horizontally scrollable, no wrap, 8px edge fade, active tab scrolled into view.

## 13.8 Modals
- Widths: sm 400 (confirm) · **default 520** · lg 560 (approval flow) · xl 680 (multi-field forms). Radius 10, `--surface`, modal shadow, backdrop `rgba(20,20,18,0.32)`.
- Header 64px: title `h3` 20/550 + optional 13px muted subtitle; `x` 32px icon button top-right at 16px inset; 1px `--border` bottom.
- Body 24px padding, max-height `calc(100vh - 200px)`, scrolls internally.
- Footer 72px: 1px `--border` top, 24px padding, actions right-aligned 8px gap (secondary then primary). Danger modals put the danger button in the primary slot.
- Behaviour: focus trapped, first field autofocused, `Esc` closes (blocked when a submit is in flight), backdrop click closes non-destructive modals only, `aria-modal` + labelled title.
- **Mobile <768:** full-screen sheet, 16px padding, header sticky top, footer sticky bottom with safe-area inset, primary button full width.
- Example confirm modal: title **"Revoke access for Northwind Health?"**, body *"They'll lose access to all 4 shared records immediately. This is recorded in your audit trail."*, `Cancel` / `Revoke access`.

## 13.9 Drawers
- Right-side, 480px (560 for detail-heavy content), full height, `--surface`, 1px `--border` left, modal shadow, slides 250ms.
- Header 64px with title + `x`; body 24px padding, scrolls; footer identical to the modal footer when actions exist.
- Used for: record quick-view from a table, notification list, filter panels on tablet. Mobile: becomes a bottom sheet at 90vh with a 4px 32px-wide grab handle centered at 12px from the top.

## 13.10 Empty states
- Centered in the container, 64px vertical padding, max text width 320px.
- Structure: 64px circle `--surface-sunken` containing a 24px Lucide icon in `--text-muted` → 16px → title `h3` 17/550 `--text` → 8px → body `small` 13/400 `--text-secondary` → 20px → one primary button (optional secondary text link beneath).
- Every table, tab, queue, and list requires one, written specifically. Never an empty card, a dash, or "No data".
- Examples: `list-checks` / **"Nothing to review yet."** / *"Request access from a professional by email — you'll see their approved records here."* / `Request access` · `key-round` / **"No access grants yet."** / *"When a company asks for records, the request appears here for you to approve."* · `users` / **"You're the only member."** / *"Invite reviewers so they can work the queue with you."* / `Invite member`

## 13.11 Error states

| Level | Treatment |
|---|---|
| **Field** | Border `--danger-text`, 13px message in `--danger-text` with a 14px `alert-circle`, replacing helper text. Says how to fix it. |
| **Form / section** | Strip above the fields: `--danger-tint` bg, 1px `#F0D4D4`, 8px radius, 12px/16px padding, 16px `alert-triangle`, 14/400 text, optional inline action link. |
| **Section load failure** | Inside the card: 24px `cloud-off` muted, title **"Couldn't load this."**, 13px body *"Something went wrong on our side."*, `Try again` secondary sm. |
| **Page** | Centered, 400px: 32px `alert-triangle` in `--danger-tint` circle, title `h1-app` **"Something went wrong."**, body *"We couldn't load this page. Try again, or head back to your dashboard."*, `Try again` (primary) + `Go to dashboard` (secondary), then 12px mono `--text-muted` reference id with a copy button. Never a stack trace. |
| **Permission** | 32px `lock`, **"You don't have access to this."**, *"Ask a workspace admin to change your role."*, `Go to dashboard` + `View members`. |
| **Blocked precondition** | Not an error — a `--surface-sunken` well: 16px `info` icon, *"Activate the pilot plan to send access requests."*, `Go to billing` link. |
| **404** | **"That page doesn't exist."** / *"The link may be old, or the record may have been removed."* / `Go to dashboard`. |

**Copy law:** never surface a raw Supabase/Postgres error, code, or table name. Map every known failure (invalid credentials, unverified email, rate limit, expired link, RLS denial, network) to a written sentence that says what happened and what to do.

## 13.12 Toasts
- Bottom-right desktop (24px inset), top-center mobile (16px, under the topbar). Width 360px max, `--surface`, 1px `--border`, 10px radius, popover shadow, 14px/16px padding.
- Layout: 16px status icon → 14/500 message → optional 13px muted second line → optional action link (`--primary-text` 13/550) → 24px `x` icon button.
- Variants: success (`circle-check` `--success-text`), error (`alert-triangle` `--danger-text`), info (`info` `--info-text`). No warning toast — warnings belong inline.
- Duration 5s (8s with an action); pauses on hover; max 3 stacked, 12px gap, oldest drops. Live region `polite`.
- **Examples:** **"4 records shared with Northwind Health"** + `Undo` · **"Request sent to amara.b@example.com"** · **"Password updated"** · **"Couldn't send the request. Try again."** + `Retry` · **"Export ready"** + `Download`

## 13.13 Stat tiles
- 96px tall, `--surface`, 1px `--border`, 10px radius, 20px padding, `min-width: 0`.
- Layout: `label` 12/550 uppercase `--text-muted` → 8px → value `stat` 28/500 tabular `--text` → 4px → one meta line `small` 13/400 `--text-muted`. Optional 4px progress bar (radius 2, `--primary` on `#EDEDEB`) instead of the meta line.
- Optional 16px icon top-right in `--text-muted`.
- Clickable variant: cursor pointer, hover border `--border-strong`, navigates to the filtered view. **Never more than one meta line, never a mini chart, never four values in one tile.**
- Grid: 4 across ≥1024, 2 across 640–1023, 2 across <640 (12px gap).
- Examples: `PASSPORT READINESS` / `68%` / bar + `4 of 6 complete` · `ROWS TO REVIEW` / `14` / `across 4 professionals` · `REVIEWERS` / `5` / `active in this workspace`

## 13.14 Page headers
- Content-area top, 24px bottom margin, 1px `--border` bottom when tabs are absent (tabs supply the rule when present).
- Rows: (1) optional breadcrumb — `← Parent` ghost link 13px muted; (2) title `h1-app` 24/550 + optional right-aligned action cluster (max one primary + one secondary + one `⋯`); (3) optional subtitle line `small` `--text-secondary` — entity metadata separated by ` · ` (e.g. `Northwind Health · You are a Reviewer`); (4) optional tabs.
- On detail pages the title may carry one inline status badge, 12px after the text, vertically centered.
- Mobile: action cluster moves below the title as a full-width primary button; breadcrumb becomes a 32px `chevron-left` icon button left of the title.

---

# 14. Concrete Screen List for Codex

Build in this order. Each screen ships with its empty, loading, and error states.

| # | Screen | Route | Priority | Purpose | Primary CTA | Components |
|---|---|---|---|---|---|---|
| 1 | **Public homepage** | `/` | P0 | Explain the product in 10 seconds; route the two audiences | `Create your Passport` | MarketingHeader, Hero, PreviewFrame, SplitCard, StepColumn, FeatureGrid, PricingCard, CtaBand, Footer, Button, Badge |
| 2 | **Login** | `/login` | P0 | Get an existing user in with zero friction | `Log in` | AuthShell, Card, Input, Button, Banner, Disclosure |
| 3 | **Register — professional** | `/register/professional` | P0 | Create a Passport owner in three fields | `Create account` | AuthShell, Input, Button, VerifyEmailState |
| 4 | **Register — corporate** | `/register/corporate` | P0 | Create account + workspace in two steps | `Continue` → `Create workspace` | AuthShell, StepIndicator, Input, Select, Button |
| 5 | **Recovery + verification** | `/recover` | P0 | Unblock every email/password failure in one place | `Send reset link` | AuthShell, Input, Button, Disclosure, Textarea, Banner |
| 6 | **App dashboard** | `/app` | P0 | One next action, four numbers, one queue | contextual (`Review request`) | AppShell, Sidebar, WorkspaceSwitcher, Topbar, AvatarMenu, PageHeader, NextBestActionCard, StatTile, Table, ActivityList |
| 7 | **Passport overview** | `/app/passport/overview` | P1 | Show readiness and the exact gaps | `Complete your Passport` | PageHeader, Tabs, ReadinessRing, ChecklistCard, Banner, Badge |
| 8 | **Passport records + detail** | `/app/passport/records`, `/:id` | P1 | The record system of truth | `Add record` | FilterBar, Table, Modal, DefinitionList, EvidenceList, Drawer |
| 9 | **Access grants + approval modal** | `/app/passport/grants` | P1 | The consent moment — the product's core promise | `Approve N records` | Tabs, Table, ApprovalModal, Checkbox, Segmented, Toast |
| 10 | **Corporate Verify queue** | `/app/verify/queue` | P1 | Let a reviewer finish their work | `Request access` | Banner, StatTile, FilterBar, Table, BulkBar, EmptyState |
| 11 | **Request access modal + scoped record view** | `/app/verify/requests`, `/professionals/:id` | P1 | Ask correctly; review only what's approved | `Send request` / `Mark reviewed` | Modal, Input, Textarea, Segmented, RecordGroupList, Card |
| 12 | **Company admin (overview, members, roles)** | `/app/company/*` | P2 | Make workspace + RBAC obvious | `Invite member` | ChecklistCard, Table, Modal, RbacMatrix, Badge |
| 13 | **Billing** | `/app/billing` | P2 | One company-level plan, quote history, no Stripe theatre | `Save quote` | Card, Table, EmptyState, Badge |
| 14 | **Settings** | `/app/settings/*` | P2 | Profile, security, notifications, data rights | `Save changes` | Tabs, Input, Toggle, Table, Button |
| 15 | **Admin / Release** | `/app/admin/*` | P3 | Home for all relocated proof machinery | contextual | Tabs, Table, CodeInline, Banner |
| 16 | Marketing sub-pages | `/professionals`, `/corporate`, `/pricing`, `/security`, `/how-it-works`, `/contact` | P3 | Depth for buyers | section CTAs | Reuse marketing components |

---

# 15. Before / After Direction

## 15.1 Disappears from the main experience (deleted from primary routes)
Every one of these is a duplicate of something that now exists exactly once:

**Public:** audience switchboard · portal front door · portal launch map · buyer decision board · portal decision matrix · account-type chooser · public access hub · access command center · entry sequence · route board · route shell · route cockpit · route answer bar · route confirmation · plan/portal chooser · login portal desk · account entry launchpad · access studio · access desk · conversion runway · V1 access runway · start strip · signup decision desk · signup answer bar · submit readiness strip · pre-submit checklist · registration route planner · registration outcome command · registration pricing gate · pricing path answer · pricing launch decision · pricing and access summary · seat estimator (public) · portal acceptance checkpoint · pre-signup acceptance gate · server freshness alert · current build server gate · manual VPS sync launcher · hosted build source contract · auth rescue checklist · auth help strip · email link verdict · hosted redirect decision · every `snake_case` marker string.

**App:** portal entry desk · portal command center · portal daily command center · portal daily navigator · portal launch matrix · portal route shell · portal UX command center · daily operating runway · launch console · V1 operating center · real-row acceptance gate · real data mission control · real database verdict · live data acceptance answer · live database run answer · live database proof commander · live row gap resolver · live rows checklist · completion cockpit/command center · registration handoff command · VPS saved portal command · server save commander/handoff/recovery center · VPS freshness checkpoint · Corporate Verify's ~20 overlapping hubs, cockpits, desks, runways, workbenches, front desks, studios, compasses, verdicts, and commanders · Company Admin's launch/operator/triage/onboarding/guide boards · Billing's decision center, package board, launch board, activation workbench, acceptance checkpoint, paid-launch bridge, choice rail, payment verdict.

## 15.2 Moves to Admin / Operations (`/app/admin`, internal role only)
- **Deployment tab:** GitHub source, Pages smoke, VPS release stamp, bundle marker, `/opt/trustgraph` command (in `CodeInline` with a copy button), required deploy secrets, VFIX boundary.
- **Readiness tab:** V1 track coverage, real-database completion state, pilot route run, live-row groups, seed/reconciliation actions.
- **Gates tab:** production gate decisions, human sign-offs (Stripe, security, legal, pilot owner, VPS cutover).
- **Security tab:** RLS review, open security items.
- **Receipts tab:** every persisted receipt type as one filterable table (kind, actor, scope, created, view).
- **Evidence archive:** the preserved legacy panels/packets that CI or export coverage still needs, listed as rows behind a disclosure — reachable, never in anyone's way.

## 15.3 Becomes a table
| Was | Becomes |
|---|---|
| Row-count / proof / ledger panels | Audit table with filters |
| Team & invitation boards | Members table · Invitations table |
| RBAC status panels | The RBAC matrix (§12.4) |
| Access grant proof chains | Access grants table (Requests / Active / History) |
| Evidence ledgers, rails, desks, action queues | Evidence table with row actions |
| Export packet panels (all of them) | `Exports` tab: available list + generated table |
| Pricing quote receipts, subscription ledger | Billing: one plan card ($149/month per company) + quote history table |
| Seed reconciliation, row-group status | Admin → Readiness table |

## 15.4 Becomes a hidden receipt / history
Silent write + toast + a row in the relevant history table: evidence access receipts · review attestations · visibility snapshots · database access receipts · export package receipts · quote receipts · billing decision receipts · onboarding wizard receipts · auth recovery receipts · registration completion receipts · pilot route run receipts · admin audit export receipts. **The write path is unchanged. Only the standing panel disappears.**

## 15.5 Must remain visible
1. `Log in` and `Get started` in the public header, at all times.
2. Pricing: `$0` / `$149` / `Custom`, on the homepage and `/pricing`.
3. The scope sentence — *"Companies never browse the user database…"* — once on the homepage (§5.4) and once as the Verify queue banner (§11.1).
4. Sign out — always two clicks from any app screen (avatar menu, last item).
5. Account recovery — reachable from `/login` without a password.
6. The professional's control surface: consent state, access grants, revoke.
7. Review-window expiry dates on every grant, both sides.
8. Evidence privacy statement, once per evidence surface, as one line.
9. Role and workspace identity, always in the sidebar switcher and Verify page header.
10. Seat and plan status in Company overview + sidebar footer.
11. Every next-best-action.
12. Export availability per module (with disabled-state reasons).

---

# 16. Implementation Handoff for Codex

Rule for every phase: **presentation only.** No migrations, no RPC signature changes, no RLS edits, no auth-flow reordering. Where CI asserts on a visible string, move the assertion to `data-testid` **in the same PR** that changes the copy.

## Phase A — Design tokens & primitives
**Build:** `src/styles/tokens.css` (every value in §2/§3/§4 — the only place a hex or px scale exists) · Tailwind theme mapping if Tailwind is present · self-hosted Geist Sans + Geist Mono · `src/lib/status.ts` (badge vocabulary → variant) · `src/lib/errors.ts` (error → user message) · `src/components/ui/*`: Button, IconButton, Input, Textarea, Select, Checkbox, Radio, Toggle, Segmented, Card, Badge, Table (+ FilterBar, BulkBar, Pagination, SkeletonRows), Tabs, Modal, Drawer, Sheet, Toast/Toaster, Tooltip, Popover, Disclosure, StatTile, PageHeader, SectionHeader, Banner, EmptyState, ErrorState, CodeInline, Avatar, ProgressBar, ReadinessRing, DefinitionList, PreviewFrame, StepIndicator.
**Ship:** a `/app/admin/_ui` component gallery page (internal) proving every state.
**Don't touch:** `src/supabase.ts`, `src/database.ts`, `supabase/migrations/*`, `scripts/*`, `tools/*`, `.github/workflows/*`.

## Phase B — Public site, header, auth
**Build/modify:** `app/(marketing)/page.*` (the eight sections of §5) · `MarketingHeader`, `Footer`, `CtaBand` · `app/(marketing)/{professionals,corporate,pricing,security,how-it-works,contact}` · `app/(auth)/{login,register/professional,register/corporate,recover}` on the `AuthShell` of §7 · `LinkRepairDisclosure`.
**Delete:** the current public-website component's ~40 panels; the current login/register mega-component's panels — keeping every Supabase call, in the same order, with the same arguments.
**Don't touch:** `signUp` / `signInWithPassword` / `resend` / `resetPasswordForEmail` / `updateUser` call sites' options (especially `emailRedirectTo`), the registration-intent write, the completion RPCs, `NEXT_PUBLIC_TRUSTGRAPH_AUTH_REDIRECT_URL` resolution, the link-repair logic (re-wrap the existing function, don't rewrite it).

## Phase C — App shell & dashboard
**Build:** `src/components/app-shell/*` (Sidebar, NavGroup, NavItem, WorkspaceSwitcher, Topbar, AvatarMenu, MobileDrawer, CollapseToggle) · `app/(app)/app/layout.*` · `app/(app)/app/page.*` (dashboard, §9) · `src/features/dashboard/next-best-action.ts` — a **pure, unit-tested** priority function per role · `ActivityList`.
**Move:** all release/server/gate/proof surfaces into `app/(app)/app/admin/release/*` (tabs per §15.2) — relocated, not rewritten.
**Don't touch:** the account-context RPC call and its ordering (role-gated nav must render only after it resolves — gate on loading state, never optimistic defaults); organization/membership read shapes (avoid new nested selects — `42P17` risk); RBAC authorisation checks (nav visibility is display-only, on top of existing enforcement).

## Phase D — Professional portal
**Build:** `app/(app)/app/passport/{overview,records,records/[id],evidence,consent,grants,requests,exports}` per §10 · `ReadinessRing`, `ChecklistCard`, `EvidenceList`, `ApprovalModal`, `RevokeModal`.
**Don't touch:** evidence signed-URL generation and expiry; private-bucket-only access; the no-persisted-signed-URL rule; `evidence_access_receipts` writes; access-grant approve/decline/revoke payload shape; `access_grant_records` sync; consent authorisation and sensitivity-flag writes; export packet generation and its receipt rows.

## Phase E — Corporate portal
**Build:** `app/(app)/app/verify/{queue,requests,professionals/[id],gaps,exports}` per §11 · `RequestAccessModal`, `MarkReviewedModal`, `RecordGroupList`, `ScopeBanner`.
**Don't touch:** the scoped-rows RPC (`list_corporate_visible_passport_rows`) — it stays the only source of visible rows: no client-side aggregation, no alternate query, no cache that could outlive a revoked grant, and `preview_data_accepted = false` stays honoured; review attestation writes; database-access receipts; visibility snapshots; the metadata-only export boundary; raw-file exclusion.

## Phase F — Admin, billing, settings
**Build:** `app/(app)/app/company/{overview,members,invitations,roles,audit}` (§12) · `RbacMatrix` · `app/(app)/app/billing` (single company-level plan card, quote history, payments empty state, admin-only seat *tracker* — count and roster, no quota and no per-seat maths) · `app/(app)/app/settings/{profile,security,notifications,data-rights}` · `app/(app)/app/admin/{operations,security,audit,release,connect,evidence-archive}`.
**Don't touch:** `organization_subscriptions` activation; `pricing_quote_receipts`; `billing_architecture_decision_receipts`; the Stripe-disabled boundary (no checkout, no card fields, no webhooks — it renders as an empty state and a disabled control, nothing more); member suspend/restore; invitation lifecycle; data-rights request workflow; production gate decisions; release ledger; `trustgraph-release.json` generation and the VPS/VFIX guards.

## Phase G — Responsive & polish
**Do:** mobile table→`RecordCard` conversions · drawer/sheet behaviour · the §4.4 overflow rules applied globally · **delete** the accumulated "overflow hardening", "clarity lock", "premium shell", and "simplification layer" CSS (now redundant) · focus order and traps · contrast audit · `aria` on tables, dialogs, live regions · `prefers-reduced-motion` · then the copy pass: every string in user language, zero `snake_case` in rendered output, every empty and error state written, badge vocabulary enforced.
**Finally:** screenshot the finished app at 2× and drop the real images into the homepage hero and preview band (§5.2, §5.5) — that is what closes "one product family".

**Definition of done, every phase:** build green · all existing checks green (`check:v1-pilot-route`, `check:live-database-repair`, `check:v1-demo-flow`, `check:v1-e2e-demo`, `smoke:live`, `check:server-env`, `check:vps-workflow`) · no visible marker strings · no server/deploy copy outside `/app/admin` · every table has empty/loading/error states · one primary button per screen region · no horizontal overflow at 375 / 768 / 1024 / 1440.

---

## The one rule
If a fact appears twice on a screen, delete one. Premium is what's left after you remove everything that isn't doing work.
