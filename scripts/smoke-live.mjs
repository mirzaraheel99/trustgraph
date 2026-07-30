import { readdir, readFile } from "node:fs/promises";

const targetUrl = process.env.TRUSTGRAPH_SMOKE_URL || "https://mirzaraheel99.github.io/trustgraph/";

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "trustgraph-smoke/1.0"
    }
  });

  const text = await response.text();
  return { response, text };
}

function uniqueAssetUrls(html, baseUrl) {
  const urls = new Set();
  const assetPattern = /(?:src|href)="([^"]*_next\/static\/[^"]+)"/g;
  let match = assetPattern.exec(html);

  while (match) {
    urls.add(new URL(match[1], baseUrl).toString());
    match = assetPattern.exec(html);
  }

  return [...urls];
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludesAny(source, expectedValues, label) {
  const found = expectedValues.some((value) => source.includes(value));
  assert(found, `Expected hosted build to include ${label}: ${expectedValues.join(" or ")}`);
}

async function assertRepoReadinessArtifacts() {
  const [migrationFiles, readiness, runbook, evidenceMap, packageText, pagesWorkflow] = await Promise.all([
    readdir(new URL("../supabase/migrations/", import.meta.url)),
    readFile(new URL("../V1_READINESS_CHECKLIST.md", import.meta.url), "utf8"),
    readFile(new URL("../PILOT_RUNBOOK.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/current-implementation-evidence-map.md", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8")
  ]);
  const packageJson = JSON.parse(packageText);
  const sqlMigrations = migrationFiles.filter((file) => file.endsWith(".sql")).sort();

  assert(sqlMigrations.length >= 34, `Expected at least 34 Supabase migrations, found ${sqlMigrations.length}`);
  assert(sqlMigrations[0]?.startsWith("001_"), "Expected migration sequence to start at 001");
  assert(
    sqlMigrations.some((file) => file.startsWith("034_fix_organization_policy_recursion")),
    "Expected migration sequence to include 034 organization policy recursion fix"
  );
  assert(packageJson.scripts?.["check:pilot-acceptance"] === "node scripts/check-pilot-acceptance.mjs", "Expected package scripts to expose pilot acceptance check");
  assert(pagesWorkflow.includes("pnpm check:pilot-acceptance"), "Expected Pages CI to run pilot acceptance check");
  assert(readiness.includes("13-Track Product Coverage"), "Expected v1 readiness checklist to include 13-track coverage");
  assert(readiness.includes("Stop Conditions"), "Expected v1 readiness checklist to include production stop conditions");
  assert(runbook.includes("Live Workflow Acceptance"), "Expected pilot runbook to include live workflow acceptance");
  assert(runbook.includes("Human Decisions Still Required"), "Expected pilot runbook to include human decision gates");
  assert(evidenceMap.includes("13-Track Evidence Map"), "Expected implementation evidence map to include 13-track coverage");
  assert(evidenceMap.includes("Live Database Proof Artifacts"), "Expected implementation evidence map to include live database proof artifacts");
  assert(evidenceMap.includes("Remaining Human Gates"), "Expected implementation evidence map to include human gates");
}

const pageUrl = `${targetUrl}?smoke=live-script`;
const { response, text } = await fetchText(pageUrl);

await assertRepoReadinessArtifacts();

assert(response.ok, `Expected 2xx response from ${targetUrl}, received ${response.status}`);
assert(text.includes("<!DOCTYPE html>"), "Expected an HTML document");
assert(text.includes("TrustGraph") || text.includes("_next/static"), "Expected TrustGraph app shell or bundled assets");

const assetUrls = uniqueAssetUrls(text, pageUrl).slice(0, 8);
assert(assetUrls.length > 0, "Expected static asset references in hosted HTML");

await Promise.all(
  assetUrls.map(async (assetUrl) => {
    const { response: assetResponse } = await fetchText(assetUrl);
    assert(assetResponse.ok, `Expected asset ${assetUrl} to return 2xx, received ${assetResponse.status}`);
  })
);

const bundleText = (
  await Promise.all(
    assetUrls
      .filter((assetUrl) => assetUrl.endsWith(".js"))
      .slice(0, 6)
      .map(async (assetUrl) => {
        const { text: assetText } = await fetchText(assetUrl);
        return assetText;
      })
  )
).join("\n");

assertIncludesAny(bundleText, ["Professional Passport"], "Professional portal copy");
assertIncludesAny(bundleText, ["Corporate Verify"], "Corporate portal copy");
assertIncludesAny(bundleText, ["Pilot monthly"], "Corporate pricing cadence");
assertIncludesAny(bundleText, ["$149"], "Corporate Verify pilot price");
assertIncludesAny(bundleText, ["Database path"], "pricing database path label");
assertIncludesAny(bundleText, ["Writes organization, admin membership, plan ledger"], "Corporate pricing database consequence copy");
assertIncludesAny(bundleText, ["gated production decisions"], "Scale pricing human gate copy");
assertIncludesAny(bundleText, ["Corporate portal access"], "Corporate portal registration/login entry");
assertIncludesAny(bundleText, ["Professional Passport access"], "Professional portal registration/login entry");
assertIncludesAny(bundleText, ["Corporate registration sequence"], "Corporate registration guided sequence");
assertIncludesAny(bundleText, ["Professional registration sequence"], "Professional registration guided sequence");
assertIncludesAny(bundleText, ["Provision live workspace"], "Corporate registration provisioning step");
assertIncludesAny(bundleText, ["Selected portal route"], "auth selected portal route summary");
assertIncludesAny(bundleText, ["First live database write"], "auth first database write summary");
assertIncludesAny(bundleText, ["Portal decision matrix"], "portal registration decision matrix");
assertIncludesAny(bundleText, ["One login system, two clean registration paths"], "portal registration decision copy");
assertIncludesAny(bundleText, ["portal_decision_matrix"], "portal registration decision packet field");
assertIncludesAny(bundleText, ["Live database handoff"], "portal auth live database handoff card");
assertIncludesAny(bundleText, ["Corporate account path"], "corporate auth outcome path");
assertIncludesAny(bundleText, ["Professional Passport path"], "professional auth outcome path");
assertIncludesAny(bundleText, ["portal_auth_outcome_summary"], "portal auth outcome packet field");
assertIncludesAny(bundleText, ["Professional user portal"], "Professional database portal route");
assertIncludesAny(bundleText, ["Corporate company portal"], "Corporate database portal route");
assertIncludesAny(bundleText, ["Personal Passport", "Corporate Verify", "Company Admin"], "dashboard portal path strip");
assertIncludesAny(bundleText, ["Request access by professional email and review shared rows"], "corporate Verify path guidance");
assertIncludesAny(bundleText, ["Corporate Verify review"], "premium command center hero");
assertIncludesAny(bundleText, ["Verified TrustGraph record graph"], "premium TrustGraph record graph visual");
assertIncludesAny(bundleText, ["Professional", "Passport", "Evidence", "Consent"], "TrustGraph visual record nodes");
assertIncludesAny(bundleText, ["Already signed in"], "public signed-in session handoff");
assertIncludesAny(bundleText, ["Open dashboard"], "public signed-in dashboard action");
assertIncludesAny(bundleText, ["Organization name"], "Corporate registration organization field");
assertIncludesAny(bundleText, ["Selected portal login path"], "public auth portal choice switchboard");
assertIncludesAny(bundleText, ["Corporate company", "Professional user"], "public auth professional and corporate selectors");
assertIncludesAny(bundleText, ["Corporate launch path"], "guided corporate setup path");
assertIncludesAny(bundleText, ["Setup command bar"], "logged-in setup command bar");
assertIncludesAny(bundleText, ["Open next step"], "setup next step action");
assertIncludesAny(bundleText, ["Public registration"], "setup public registration action");
assertIncludesAny(bundleText, ["Create workspace"], "corporate setup workspace step");
assertIncludesAny(bundleText, ["Confirm RBAC"], "corporate setup RBAC step");
assertIncludesAny(bundleText, ["Select plan"], "corporate setup billing step");
assertIncludesAny(bundleText, ["Corporate daily task hub"], "corporate dashboard task hub");
assertIncludesAny(bundleText, ["Export task packet"], "corporate dashboard task packet export");
assertIncludesAny(bundleText, ["live_corporate_task_hub"], "corporate dashboard live task packet mode");
assertIncludesAny(bundleText, ["Corporate operating plan"], "corporate operating plan guidance");
assertIncludesAny(bundleText, ["Prove company context"], "corporate operating company context step");
assertIncludesAny(bundleText, ["Only signed-in Supabase rows visible to this corporate RBAC context"], "corporate operating real data policy");
assertIncludesAny(bundleText, ["corporate_operating_plan"], "corporate operating packet field");
assertIncludesAny(bundleText, ["Post-034 live retest"], "corporate post migration live retest panel");
assertIncludesAny(bundleText, ["post_034_corporate_live_retest"], "corporate post migration live retest packet field");
assertIncludesAny(bundleText, ["Verify user data visible"], "corporate user data live retest step");
assertIncludesAny(bundleText, ["Corporate Verify live access test"], "corporate Verify live access test panel");
assertIncludesAny(bundleText, ["corporate_verify_live_access_test"], "corporate Verify live access packet field");
assertIncludesAny(bundleText, ["Corporate user-data request"], "corporate Verify guided request form");
assertIncludesAny(bundleText, ["Professional email"], "corporate Verify professional email field label");
assertIncludesAny(bundleText, ["Request by professional email"], "corporate Verify professional email request step");
assertIncludesAny(bundleText, ["Shared user Passport rows"], "corporate Verify shared user Passport rows step");
assertIncludesAny(bundleText, ["Pending corporate workspace"], "pending Corporate setup continuation card");
assertIncludesAny(bundleText, ["Clear saved setup"], "pending Corporate setup reset control");
assertIncludesAny(bundleText, ["Fix localhost email link"], "hosted auth link repair control");
assertIncludesAny(bundleText, ["Copy hosted link"], "hosted auth link copy control");
assertIncludesAny(bundleText, ["Every portal connects to the live database foundation"], "live database registration outcome copy");
assertIncludesAny(bundleText, ["After registration"], "registration outcome section");
assertIncludesAny(bundleText, ["Set new password"], "password recovery update control");
assertIncludesAny(bundleText, ["Recovery redirect"], "password recovery redirect guidance");
assertIncludesAny(bundleText, ["Copy URL"], "auth redirect copy control");
assertIncludesAny(bundleText, ["Account recovery readiness"], "account recovery readiness label");
assertIncludesAny(bundleText, ["account_recovery_readiness"], "account recovery readiness packet field");
assertIncludesAny(bundleText, ["2 emails per hour"], "Supabase built-in email rate limit guidance");
assertIncludesAny(bundleText, ["not localhost"], "hosted auth redirect localhost warning");
assertIncludesAny(bundleText, ["https://mirzaraheel99.github.io/trustgraph/"], "hosted auth redirect URL");
assertIncludesAny(bundleText, ["allowed_production_redirects"], "hosted auth production redirect list");
assertIncludesAny(bundleText, ["Hosted email verification accepted"], "hosted auth callback success status");
assertIncludesAny(bundleText, ["Signed evidence links"], "private evidence signed URL label");
assertIncludesAny(bundleText, ["Export evidence manifest"], "evidence manifest export control");
assertIncludesAny(bundleText, ["Evidence preview/download proof"], "evidence preview/download proof label");
assertIncludesAny(bundleText, ["Export access packet"], "evidence access packet export control");
assertIncludesAny(bundleText, ["selected_record_evidence_preview_download"], "evidence access packet mode");
assertIncludesAny(bundleText, ["short_lived_signed_url_only"], "evidence signed URL policy");
assertIncludesAny(bundleText, ["Responsibilities and skills"], "structured responsibilities detail section");
assertIncludesAny(bundleText, ["Responsibilities, separated by commas"], "structured responsibilities intake");
assertIncludesAny(bundleText, ["Credential renewal readiness"], "credential renewal readiness panel");
assertIncludesAny(bundleText, ["Export renewal packet"], "credential renewal packet export");
assertIncludesAny(bundleText, ["renewal_window_days"], "credential renewal packet window field");
assertIncludesAny(bundleText, ["Confidentiality review packet"], "performance/reference confidentiality review panel");
assertIncludesAny(bundleText, ["Export confidentiality packet"], "confidentiality packet export control");
assertIncludesAny(bundleText, ["visible_scope_only"], "confidentiality packet scoped mode");
assertIncludesAny(bundleText, ["Skills evidence packet"], "skills evidence packet panel");
assertIncludesAny(bundleText, ["Export skills packet"], "skills evidence packet export control");
assertIncludesAny(bundleText, ["visible_skill_evidence"], "skills evidence packet scoped mode");
assertIncludesAny(bundleText, ["Live Supabase database mode"], "live database mode indicator");
assertIncludesAny(bundleText, ["Portal access evidence"], "portal access evidence packet label");
assertIncludesAny(bundleText, ["Export portal packet"], "portal access packet export control");
assertIncludesAny(bundleText, ["Supabase rows written"], "live pilot seed database evidence");
assertIncludesAny(bundleText, ["Export live readiness"], "live database readiness export");
assertIncludesAny(bundleText, ["Product preview mode"], "preview mode indicator");
assertIncludesAny(bundleText, ["All actors"], "audit actor filter");
assertIncludesAny(bundleText, ["Last 7 days"], "audit timeframe filter");
assertIncludesAny(bundleText, ["All signal levels"], "audit signal filter");
assertIncludesAny(bundleText, ["Clear filters"], "audit clear filters control");
assertIncludesAny(bundleText, ["Export JSON"], "audit JSON export control");
assertIncludesAny(bundleText, ["Admin export readiness"], "admin export readiness packet label");
assertIncludesAny(bundleText, ["Export admin readiness"], "admin export readiness export control");
assertIncludesAny(bundleText, ["admin_audit_export_readiness"], "admin export readiness packet mode");
assertIncludesAny(bundleText, ["Full audit and verification history packet"], "audit coverage packet label");
assertIncludesAny(bundleText, ["Export audit coverage packet"], "audit coverage packet export control");
assertIncludesAny(bundleText, ["filtered_audit_and_verification_history"], "audit coverage packet mode");
assertIncludesAny(bundleText, ["Workflow notification rows"], "notification database source label");
assertIncludesAny(bundleText, ["Export notifications"], "notification export control");
assertIncludesAny(bundleText, ["Export advisory packet"], "advisory packet export control");
assertIncludesAny(bundleText, ["Human approval required before production traffic"], "production human approval boundary");
assertIncludesAny(bundleText, ["human_decision_gate"], "security runbook human decision export rows");
assertIncludesAny(bundleText, ["Security review checklist"], "security review checklist label");
assertIncludesAny(bundleText, ["protected tables"], "RLS protected table coverage summary");
assertIncludesAny(bundleText, ["rls_protected_table"], "security runbook RLS table export rows");
assertIncludesAny(bundleText, ["13-track v1 alignment"], "v1 plan alignment register");
assertIncludesAny(bundleText, ["Human decision gates"], "production decision gate register");
assertIncludesAny(bundleText, ["Production gate decisions"], "production gate database source label");
assertIncludesAny(bundleText, ["Export production gates"], "production gate export control");
assertIncludesAny(bundleText, ["V1 completion audit packet"], "v1 completion audit packet label");
assertIncludesAny(bundleText, ["Export v1 completion packet"], "v1 completion audit export control");
assertIncludesAny(bundleText, ["pilot_ready_with_human_gates"], "v1 completion pilot mode");
assertIncludesAny(bundleText, ["Completion audit open items"], "v1 completion open item summary");
assertIncludesAny(bundleText, ["completion_audit_requirements"], "v1 completion requirements packet field");
assertIncludesAny(bundleText, ["live_database_repair_queue"], "v1 completion evidence export repair queue field");
assertIncludesAny(bundleText, ["prepared_human_access_required"], "VPS deployment human access status");
assertIncludesAny(bundleText, ["Export launch gate packet"], "combined launch gate packet export control");
assertIncludesAny(bundleText, ["Record gate decision"], "production gate decision intake control");
assertIncludesAny(bundleText, ["Approved for production"], "production gate approved status option");
assertIncludesAny(bundleText, ["external sign-off required"], "external security gate status");
assertIncludesAny(bundleText, ["Professional Passport setup"], "13-step pilot acceptance script");
assertIncludesAny(bundleText, ["Guided onboarding wizard"], "guided onboarding wizard label");
assertIncludesAny(bundleText, ["Export setup evidence"], "guided onboarding export control");
assertIncludesAny(bundleText, ["Export wizard packet"], "guided onboarding wizard packet export");
assertIncludesAny(bundleText, ["Prepare live pilot workspace"], "guided onboarding live workspace control");
assertIncludesAny(bundleText, ["Last browser seed evidence"], "persisted pilot seed evidence label");
assertIncludesAny(bundleText, ["Export seed evidence"], "pilot seed evidence export control");
assertIncludesAny(bundleText, ["Seed reconciliation"], "pilot seed reconciliation panel");
assertIncludesAny(bundleText, ["matched"], "pilot seed reconciliation matched count");
assertIncludesAny(bundleText, ["Working database proof"], "working database proof panel");
assertIncludesAny(bundleText, ["Working database acceptance"], "working database acceptance summary");
assertIncludesAny(bundleText, ["working_database_accepted"], "working database acceptance packet status");
assertIncludesAny(bundleText, ["Real database only acceptance"], "real database acceptance policy label");
assertIncludesAny(bundleText, ["Preview data is not accepted for v1 database proof"], "real database acceptance visible guard");
assertIncludesAny(bundleText, ["real_database_acceptance_policy"], "real database acceptance packet field");
assertIncludesAny(bundleText, ["signed_in_supabase_repository_rows"], "real database accepted source field");
assertIncludesAny(bundleText, ["Organization RLS recursion repair"], "working database RLS repair proof card");
assertIncludesAny(bundleText, ["organization_rls_repair_evidence"], "working database RLS repair packet field");
assertIncludesAny(bundleText, ["034_fix_organization_policy_recursion.sql"], "working database required RLS repair migration");
assertIncludesAny(bundleText, ["Live database repair queue"], "working database repair queue");
assertIncludesAny(bundleText, ["live_database_repair_queue"], "working database repair queue packet field");
assertIncludesAny(bundleText, ["Export working-data packet"], "working database proof export");
assertIncludesAny(bundleText, ["Live rows currently loaded"], "working database live-count copy");
assertIncludesAny(bundleText, ["Live database connected"], "database status strip live label");
assertIncludesAny(bundleText, ["Preview data only"], "database status strip preview label");
assertIncludesAny(bundleText, ["Review database proof"], "database status strip readiness action");
assertIncludesAny(bundleText, ["Real database acceptance matrix"], "real database acceptance matrix label");
assertIncludesAny(bundleText, ["live_database_acceptance"], "real database acceptance packet field");
assertIncludesAny(bundleText, ["unmet_requirements"], "real database unmet requirements packet field");
assertIncludesAny(bundleText, ["Hosted login and database handoff"], "hosted login database handoff label");
assertIncludesAny(bundleText, ["Export login handoff"], "hosted login database handoff export");
assertIncludesAny(bundleText, ["hosted_login_database_handoff"], "hosted login database handoff packet field");
assertIncludesAny(bundleText, ["database_acceptance_requires_live_login"], "hosted login database live-login requirement");
assertIncludesAny(bundleText, ["vps_deployment_requires_human_access"], "hosted login VPS human-access requirement");
assertIncludesAny(bundleText, ["Corporate provisioning evidence"], "Corporate account provisioning proof");
assertIncludesAny(bundleText, ["Export provisioning packet"], "Corporate provisioning export control");
assertIncludesAny(bundleText, ["Create pilot request"], "live pilot Access Grant request control");
assertIncludesAny(bundleText, ["Add Verify reviewer role"], "Corporate Verify reviewer role control");
assertIncludesAny(bundleText, ["Reviewer workflow"], "Corporate Verify reviewer workflow guide");
assertIncludesAny(bundleText, ["Export reviewer packet"], "Corporate Verify reviewer packet export");
assertIncludesAny(bundleText, ["live_verify_reviewer_flow"], "Corporate Verify reviewer live packet mode");
assertIncludesAny(bundleText, ["Live corporate database"], "Corporate user database source label");
assertIncludesAny(bundleText, ["live_database_evidence"], "Corporate user database evidence flag");
assertIncludesAny(bundleText, ["real_database_policy"], "Corporate user database real data policy packet field");
assertIncludesAny(bundleText, ["signed_in_supabase_rows_visible_to_active_corporate_rbac_context"], "Corporate user database accepted source");
assertIncludesAny(bundleText, ["Professionals in view"], "Corporate user database professional count");
assertIncludesAny(bundleText, ["Approved Access Grants"], "Corporate user database approval count");
assertIncludesAny(bundleText, ["Ready to review"], "Corporate user database review-ready bucket");
assertIncludesAny(bundleText, ["Waiting for consent"], "Corporate user database waiting bucket");
assertIncludesAny(bundleText, ["reviewer_scan_board"], "Corporate user database scan board packet field");
assertIncludesAny(bundleText, ["shared records"], "Corporate user database shared-record row detail");
assertIncludesAny(bundleText, ["shared responsibilities"], "Corporate user database structured responsibility proof");
assertIncludesAny(bundleText, ["Corporate user database packet"], "Corporate user database packet label");
assertIncludesAny(bundleText, ["per-professional shared records"], "Corporate user database per-professional shared record proof");
assertIncludesAny(bundleText, ["per_professional_shared_record_scope"], "Corporate user database per-professional packet field");
assertIncludesAny(bundleText, ["Export user packet"], "Corporate user database packet export");
assertIncludesAny(bundleText, ["Export gap packet"], "missing-record gap packet export control");
assertIncludesAny(bundleText, ["No near-term due gaps"], "missing-record due-soon queue signal");
assertIncludesAny(bundleText, ["Membership database"], "Corporate team member source label");
assertIncludesAny(bundleText, ["Admins"], "Corporate member roster admin count");
assertIncludesAny(bundleText, ["membership rows"], "Corporate member roster row count");
assertIncludesAny(bundleText, ["Profile"], "Corporate member roster profile id detail");
assertIncludesAny(bundleText, ["Corporate roster packet"], "Corporate member roster packet label");
assertIncludesAny(bundleText, ["Export roster packet"], "Corporate member roster packet export");
assertIncludesAny(bundleText, ["live_membership_database"], "Corporate member roster packet mode");
assertIncludesAny(bundleText, ["Team operations cockpit"], "Corporate member roster operations cockpit");
assertIncludesAny(bundleText, ["Current user protected"], "Corporate member roster self-protection label");
assertIncludesAny(bundleText, ["team_operations_cockpit"], "Corporate member roster operations packet field");
assertIncludesAny(bundleText, ["Invitation database"], "Corporate team invitation source label");
assertIncludesAny(bundleText, ["Export invites"], "Corporate team invitation export control");
assertIncludesAny(bundleText, ["Invitation handoff"], "personal invitation handoff source label");
assertIncludesAny(bundleText, ["Export my invites"], "personal invitation export control");
assertIncludesAny(bundleText, ["Invitee handoff packet"], "personal invitation handoff packet label");
assertIncludesAny(bundleText, ["Export handoff packet"], "personal invitation handoff packet export");
assertIncludesAny(bundleText, ["invitee_membership_handoff"], "personal invitation handoff packet mode");
assertIncludesAny(bundleText, ["Requested Passport records"], "Professional missing-record request inbox");
assertIncludesAny(bundleText, ["workflow-notifications"], "topbar notification target");
assertIncludesAny(bundleText, ["Reference database"], "structured reference source label");
assertIncludesAny(bundleText, ["Export references"], "structured reference export control");
assertIncludesAny(bundleText, ["Issuer database"], "credential issuer source label");
assertIncludesAny(bundleText, ["Export credentials"], "credential issuer export control");
assertIncludesAny(bundleText, ["Connect database"], "Connect source label");
assertIncludesAny(bundleText, ["Export clients"], "Connect client export control");
assertIncludesAny(bundleText, ["Export webhooks"], "Connect webhook export control");
assertIncludesAny(bundleText, ["Operations database"], "operations case source label");
assertIncludesAny(bundleText, ["Export cases"], "operations case export control");
assertIncludesAny(bundleText, ["Release database"], "release ledger source label");
assertIncludesAny(bundleText, ["Export releases"], "release ledger export control");
assertIncludesAny(bundleText, ["TrustGraph VPS launch guard"], "TrustGraph-only VPS launch guard panel");
assertIncludesAny(bundleText, ["Export VPS packet"], "VPS launch packet export");
assertIncludesAny(bundleText, ["tools/preflight-vps.sh"], "VPS preflight command");
assertIncludesAny(bundleText, ["tools/validate-server-env.sh"], "VPS env validation command");
assertIncludesAny(bundleText, ["github_workflow_inputs"], "VPS deploy workflow input packet");
assertIncludesAny(bundleText, ["public_url"], "VPS deploy public URL input");
assertIncludesAny(bundleText, ["trustgraph.5-75-224-110.sslip.io"], "TrustGraph VPS target host");
assertIncludesAny(bundleText, ["5-75-224-110.sslip.io"], "VFIX protected host copy");
assertIncludesAny(bundleText, ["Supabase email rate limit is active"], "auth rate-limit recovery guidance");
assertIncludesAny(bundleText, ["Auth redirect needs the hosted TrustGraph URL"], "hosted auth redirect repair guidance");
assertIncludesAny(bundleText, ["Hosted Supabase Auth is configured"], "hosted Supabase Auth configured status");
assertIncludesAny(bundleText, ["Session controls"], "persistent session controls");
assertIncludesAny(bundleText, ["Primary workspace routes"], "primary workspace route strip");
assertIncludesAny(bundleText, ["Role required"], "workspace route disabled-state copy");
assertIncludesAny(bundleText, ["Auth redirect readiness packet"], "auth redirect readiness packet label");
assertIncludesAny(bundleText, ["Export auth packet"], "auth redirect readiness export control");
assertIncludesAny(bundleText, ["Registration auth readiness packet"], "registration auth readiness packet label");
assertIncludesAny(bundleText, ["Export registration auth packet"], "registration auth readiness export control");
assertIncludesAny(bundleText, ["Selected path"], "registration selected path proof");
assertIncludesAny(bundleText, ["selected_registration_path"], "registration path packet field");
assertIncludesAny(bundleText, ["protected_vfix_host"], "auth packet VFIX isolation field");
assertIncludesAny(bundleText, ["trustgraph_vps_target"], "auth packet TrustGraph VPS field");
assertIncludesAny(bundleText, ["Reset password"], "public portal password recovery control");
assertIncludesAny(bundleText, ["Migrations through 034"], "current database migration coverage copy");
assertIncludesAny(bundleText, ["034 RLS repair expected"], "organization RLS recursion repair marker");
assertIncludesAny(bundleText, ["RLS repair"], "database strip RLS repair proof");
assertIncludesAny(bundleText, ["Pilot launch contacts"], "pilot launch contact register");
assertIncludesAny(bundleText, ["Record pilot contact"], "pilot launch contact intake");
assertIncludesAny(bundleText, ["Stop conditions"], "production stop condition summary");
assertIncludesAny(bundleText, ["Allowed mode"], "production allowed-mode summary");
assertIncludesAny(bundleText, ["Preview context only"], "signed-out preview context label");
assertIncludesAny(bundleText, ["Product preview role"], "signed-out preview role label");
assertIncludesAny(bundleText, ["Preview account context"], "signed-out account context label");
assertIncludesAny(bundleText, ["Preview shared access"], "workspace context navigation action");
assertIncludesAny(bundleText, ["Export ledger"], "billing ledger export control");
assertIncludesAny(bundleText, ["Export gates"], "billing decision gate export control");
assertIncludesAny(bundleText, ["Export launch packet"], "billing launch packet export control");
assertIncludesAny(bundleText, ["Pricing structure packet"], "pricing structure packet label");
assertIncludesAny(bundleText, ["Export pricing packet"], "pricing structure packet export control");
assertIncludesAny(bundleText, ["Billing ledger acceptance"], "billing ledger acceptance proof");
assertIncludesAny(bundleText, ["billing_ledger_evidence"], "billing ledger acceptance packet field");
assertIncludesAny(bundleText, ["live_subscription_ledger"], "live billing ledger mode");
assertIncludesAny(bundleText, ["Payment launch boundary"], "billing payment launch boundary");
assertIncludesAny(bundleText, ["Billing architecture decision packet"], "billing architecture decision packet label");
assertIncludesAny(bundleText, ["Export payment decision"], "billing architecture decision export control");
assertIncludesAny(bundleText, ["billing_architecture_decision"], "billing architecture packet mode");
assertIncludesAny(bundleText, ["supabase_subscription_ledger"], "billing architecture current system");
assertIncludesAny(bundleText, ["intentionally_disabled_until_human_gate"], "billing architecture disabled payment flows");
assertIncludesAny(bundleText, ["notes captured"], "pilot acceptance note capture");
assertIncludesAny(bundleText, ["Export runbook"], "pilot acceptance markdown runbook export control");

console.log(`TrustGraph live smoke passed: ${response.status} ${targetUrl} (${assetUrls.length} assets checked, repo artifacts, portal, recovery, and data-mode copy verified)`);
