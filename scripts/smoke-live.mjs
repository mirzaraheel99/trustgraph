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
  const [migrationFiles, readiness, runbook, evidenceMap, readme, packageText, pagesWorkflow] = await Promise.all([
    readdir(new URL("../supabase/migrations/", import.meta.url)),
    readFile(new URL("../V1_READINESS_CHECKLIST.md", import.meta.url), "utf8"),
    readFile(new URL("../PILOT_RUNBOOK.md", import.meta.url), "utf8"),
    readFile(new URL("../docs/current-implementation-evidence-map.md", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8")
  ]);
  const packageJson = JSON.parse(packageText);
  const sqlMigrations = migrationFiles.filter((file) => file.endsWith(".sql")).sort();

  assert(sqlMigrations.length >= 36, `Expected at least 36 Supabase migrations, found ${sqlMigrations.length}`);
  assert(sqlMigrations[0]?.startsWith("001_"), "Expected migration sequence to start at 001");
  assert(
    sqlMigrations.some((file) => file.startsWith("042_fix_operator_policy_self_reference")),
    "Expected migration sequence to include 034 organization policy recursion fix"
  );
  assert(
    sqlMigrations.some((file) => file.startsWith("035_revoke_issuer_credentials")),
    "Expected migration sequence to include 035 issuer credential revocation lifecycle"
  );
  assert(
    sqlMigrations.some((file) => file.startsWith("036_update_issuer_credential_expiry")),
    "Expected migration sequence to include 036 issuer credential update lifecycle"
  );
  assert(packageJson.scripts?.["check:pilot-acceptance"] === "node scripts/check-pilot-acceptance.mjs", "Expected package scripts to expose pilot acceptance check");
  assert(packageJson.scripts?.["check:v1-demo-flow"] === "node scripts/check-v1-demo-flow.mjs", "Expected package scripts to expose v1 demo-flow check");
  assert(pagesWorkflow.includes("pnpm check:pilot-acceptance"), "Expected Pages CI to run pilot acceptance check");
  assert(pagesWorkflow.includes("pnpm check:v1-demo-flow"), "Expected Pages CI to run v1 demo-flow check");
  assert(readiness.includes("13-Track Product Coverage"), "Expected v1 readiness checklist to include 13-track coverage");
  assert(readiness.includes("Stop Conditions"), "Expected v1 readiness checklist to include production stop conditions");
  assert(runbook.includes("Live Workflow Acceptance"), "Expected pilot runbook to include live workflow acceptance");
  assert(runbook.includes("Human Decisions Still Required"), "Expected pilot runbook to include human decision gates");
  assert(evidenceMap.includes("13-Track Evidence Map"), "Expected implementation evidence map to include 13-track coverage");
  assert(evidenceMap.includes("Live Database Proof Artifacts"), "Expected implementation evidence map to include live database proof artifacts");
  assert(evidenceMap.includes("end-to-end demo-flow gate"), "Expected implementation evidence map to include v1 demo-flow gate");
  assert(evidenceMap.includes("Remaining Human Gates"), "Expected implementation evidence map to include human gates");
  assert(evidenceMap.includes("https://trustgraph.5-75-224-110.sslip.io"), "Expected implementation evidence map to name the TrustGraph VPS pilot host");
  assert(evidenceMap.includes("https://5-75-224-110.sslip.io/CRM-client-demo/login"), "Expected implementation evidence map to preserve VFIX isolation");
  assert(evidenceMap.includes("contained professional/corporate auth access desk"), "Expected implementation evidence map to record the contained public auth layout");
  assert(evidenceMap.includes("no-rail dashboard command layout"), "Expected implementation evidence map to record the no-rail dashboard layout");
  assert(evidenceMap.includes("UI layout proof"), "Expected implementation evidence map to include UI layout proof");
  assert(readme.includes("contained professional/corporate access desk"), "Expected README to describe the contained public auth access desk");
  assert(readme.includes("top command system instead of a fixed left rail"), "Expected README to describe the no-rail dashboard layout");
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
assertIncludesAny(bundleText, ["Portal launch map"], "public hero portal launch map");
assertIncludesAny(bundleText, ["Start in the right portal before live database rows are created"], "portal launch map database guidance");
assertIncludesAny(bundleText, ["Company organization and admin membership"], "corporate portal launch first write");
assertIncludesAny(bundleText, ["Profile and personal organization"], "professional portal launch first write");
assertIncludesAny(bundleText, ["Corporate registration sequence"], "Corporate registration guided sequence");
assertIncludesAny(bundleText, ["Professional registration sequence"], "Professional registration guided sequence");
assertIncludesAny(bundleText, ["Provision live workspace"], "Corporate registration provisioning step");
assertIncludesAny(bundleText, ["Auth landing command"], "public auth landing command");
assertIncludesAny(bundleText, ["I already verified email"], "public auth verified-email shortcut");
assertIncludesAny(bundleText, ["Selected portal route"], "auth selected portal route summary");
assertIncludesAny(bundleText, ["Portal entry path"], "portal compact entry path");
assertIncludesAny(bundleText, ["1. Pick portal"], "portal first step copy");
assertIncludesAny(bundleText, ["auth-selected-route"], "auth selected route summary class");
assertIncludesAny(bundleText, ["portal_entry_path"], "registration packet portal entry field");
assertIncludesAny(bundleText, ["First live database write"], "auth first database write summary");
assertIncludesAny(bundleText, ["Portal decision matrix"], "portal registration decision matrix");
assertIncludesAny(bundleText, ["One login system, two clean registration paths"], "portal registration decision copy");
assertIncludesAny(bundleText, ["portal_decision_matrix"], "portal registration decision packet field");
assertIncludesAny(bundleText, ["Portal login switchboard"], "portal login switchboard panel");
assertIncludesAny(bundleText, ["Professional user login"], "professional login switchboard route");
assertIncludesAny(bundleText, ["Corporate company login"], "corporate login switchboard route");
assertIncludesAny(bundleText, ["portal_login_switchboard"], "portal login switchboard packet field");
assertIncludesAny(bundleText, ["Live database handoff"], "portal auth live database handoff card");
assertIncludesAny(bundleText, ["Corporate account path"], "corporate auth outcome path");
assertIncludesAny(bundleText, ["Professional Passport path"], "professional auth outcome path");
assertIncludesAny(bundleText, ["portal_auth_outcome_summary"], "portal auth outcome packet field");
assertIncludesAny(bundleText, ["Professional user portal"], "Professional database portal route");
assertIncludesAny(bundleText, ["Corporate company portal"], "Corporate database portal route");
assertIncludesAny(bundleText, ["Personal Passport", "Corporate Verify", "Company Admin"], "dashboard portal path strip");
assertIncludesAny(bundleText, ["Workspace command strip"], "signed-in workspace command strip");
assertIncludesAny(bundleText, ["Open next workspace"], "workspace command next action");
assertIncludesAny(bundleText, ["workspace_command_strip"], "authorized report workspace command strip field");
assertIncludesAny(bundleText, ["Session command bar"], "dashboard session command bar");
assertIncludesAny(bundleText, ["Portal home command center"], "signed-in portal home command center");
assertIncludesAny(bundleText, ["Start with login, then choose the right portal"], "signed-in portal home guidance");
assertIncludesAny(bundleText, ["Continue current portal"], "signed-in portal continuation action");
assertIncludesAny(bundleText, ["Account and recovery"], "signed-in portal account action");
assertIncludesAny(bundleText, ["Corporate setup"], "dashboard corporate setup action");
assertIncludesAny(bundleText, ["Sign out"], "dashboard sign out action");
assertIncludesAny(bundleText, ["Workspace picker"], "dashboard workspace start map");
assertIncludesAny(bundleText, ["Pick the right workspace for the job"], "dashboard start map guidance");
assertIncludesAny(bundleText, ["dashboard_start_map"], "authorized report dashboard start map field");
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
assertIncludesAny(bundleText, ["Corporate launch cockpit"], "corporate setup next-action cockpit");
assertIncludesAny(bundleText, ["corporate_launch_cockpit"], "corporate launch cockpit packet mode");
assertIncludesAny(bundleText, ["Export cockpit proof"], "corporate launch cockpit export");
assertIncludesAny(bundleText, ["Corporate operator status"], "corporate setup operator status band");
assertIncludesAny(bundleText, ["Next operator action"], "corporate setup next operator action");
assertIncludesAny(bundleText, ["Setup command bar"], "logged-in setup command bar");
assertIncludesAny(bundleText, ["Open next step"], "setup next step action");
assertIncludesAny(bundleText, ["Public registration"], "setup public registration action");
assertIncludesAny(bundleText, ["Corporate account operator path"], "corporate account operator path");
assertIncludesAny(bundleText, ["Corporate setup stepper"], "guided corporate account setup stepper");
assertIncludesAny(bundleText, ["corporate_setup_stepper"], "corporate setup stepper packet mode");
assertIncludesAny(bundleText, ["Export setup stepper"], "corporate setup stepper export");
assertIncludesAny(bundleText, ["Switch admin context"], "corporate account admin context step");
assertIncludesAny(bundleText, ["Team invitation operator path"], "team invitation operator path");
assertIncludesAny(bundleText, ["Invitee accepts"], "team invitation acceptance step");
assertIncludesAny(bundleText, ["Portal role"], "team invitation role field label");
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
assertIncludesAny(bundleText, ["042 organization RLS repair"], "corporate post migration live retest panel");
assertIncludesAny(bundleText, ["post_042_corporate_live_retest"], "corporate post migration live retest packet field");
assertIncludesAny(bundleText, ["Verify user data visible"], "corporate user data live retest step");
assertIncludesAny(bundleText, ["Corporate Verify live access test"], "corporate Verify live access test panel");
assertIncludesAny(bundleText, ["corporate_verify_live_access_test"], "corporate Verify live access packet field");
assertIncludesAny(bundleText, ["Corporate user-data request"], "corporate Verify guided request form");
assertIncludesAny(bundleText, ["Professional email"], "corporate Verify professional email field label");
assertIncludesAny(bundleText, ["Corporate user data proof"], "corporate Verify user data proof summary");
assertIncludesAny(bundleText, ["user_data_proof"], "corporate Verify user data proof packet field");
assertIncludesAny(bundleText, ["Corporate directory acceptance"], "corporate user database acceptance ledger");
assertIncludesAny(bundleText, ["corporate_directory_acceptance"], "corporate user database acceptance packet field");
assertIncludesAny(bundleText, ["live_corporate_rbac_context_loads_access_grants_shared_passport_rows_review_ready_people_and_review_attestations"], "corporate directory real database acceptance rule");
assertIncludesAny(bundleText, ["Corporate access blocker map"], "corporate Verify access blocker map");
assertIncludesAny(bundleText, ["corporate_access_blocker_map"], "corporate Verify blocker map packet field");
assertIncludesAny(bundleText, ["visibility blocked"], "corporate Verify blocked visibility state");
assertIncludesAny(bundleText, ["Visible user rows"], "corporate Verify visible user rows proof");
assertIncludesAny(bundleText, ["Request by professional email"], "corporate Verify professional email request step");
assertIncludesAny(bundleText, ["Shared user Passport rows"], "corporate Verify shared user Passport rows step");
assertIncludesAny(bundleText, ["Pending corporate workspace"], "pending Corporate setup continuation card");
assertIncludesAny(bundleText, ["Clear saved setup"], "pending Corporate setup reset control");
assertIncludesAny(bundleText, ["Fix localhost email link"], "hosted auth link repair control");
assertIncludesAny(bundleText, ["Copy hosted link"], "hosted auth link copy control");
assertIncludesAny(bundleText, ["Every portal connects to the live database foundation"], "live database registration outcome copy");
assertIncludesAny(bundleText, ["After registration"], "registration outcome section");
assertIncludesAny(bundleText, ["Set new password"], "password recovery update control");
assertIncludesAny(bundleText, ["Password recovery session ready"], "password recovery session ready state");
assertIncludesAny(bundleText, ["Recovery redirect"], "password recovery redirect guidance");
assertIncludesAny(bundleText, ["Auth recovery command center"], "visible auth recovery command center");
assertIncludesAny(bundleText, ["Copy hosted redirect"], "hosted auth redirect copy action");
assertIncludesAny(bundleText, ["Portal access command"], "professional and corporate auth access command");
assertIncludesAny(bundleText, ["One secure login, two clear portal paths"], "auth access command headline");
assertIncludesAny(bundleText, ["The role and workspace you create after login decide what database rows you can see"], "auth role database scope guidance");
assertIncludesAny(bundleText, ["Copy URL"], "auth redirect copy control");
assertIncludesAny(bundleText, ["Account recovery readiness"], "account recovery readiness label");
assertIncludesAny(bundleText, ["account_recovery_readiness"], "account recovery readiness packet field");
assertIncludesAny(bundleText, ["recovery_session_ready"], "account recovery packet session state");
assertIncludesAny(bundleText, ["Hosted callback acceptance proof"], "hosted callback proof label");
assertIncludesAny(bundleText, ["hosted_auth_callback_proof"], "hosted callback proof packet field");
assertIncludesAny(bundleText, ["tokens_redacted"], "hosted callback proof token redaction flag");
assertIncludesAny(bundleText, ["auth_request_redirect_transport"], "auth request redirect transport packet field");
assertIncludesAny(bundleText, ["redirect_to query parameter"], "password recovery redirect transport copy");
assertIncludesAny(bundleText, ["Data export and closure"], "account data-rights panel");
assertIncludesAny(bundleText, ["Request data export"], "data export request control");
assertIncludesAny(bundleText, ["Request account closure"], "account closure request control");
assertIncludesAny(bundleText, ["Export data-rights packet"], "data-rights packet export");
assertIncludesAny(bundleText, ["account_data_rights"], "data-rights packet mode");
assertIncludesAny(bundleText, ["Login or sign up"], "guided auth operator path");
assertIncludesAny(bundleText, ["Create workspace"], "post-verification workspace action");
assertIncludesAny(bundleText, ["2 emails per hour"], "Supabase built-in email rate limit guidance");
assertIncludesAny(bundleText, ["not localhost"], "hosted auth redirect localhost warning");
assertIncludesAny(bundleText, ["https://mirzaraheel99.github.io/trustgraph/"], "hosted auth redirect URL");
assertIncludesAny(bundleText, ["allowed_production_redirects"], "hosted auth production redirect list");
assertIncludesAny(bundleText, ["Hosted email verification accepted"], "hosted auth callback success status");
assertIncludesAny(bundleText, ["Signed evidence links"], "private evidence signed URL label");
assertIncludesAny(bundleText, ["Export evidence manifest"], "evidence manifest export control");
assertIncludesAny(bundleText, ["Passport record creation path"], "Passport record creation path label");
assertIncludesAny(bundleText, ["Save live row"], "Passport record creation save step");
assertIncludesAny(bundleText, ["Set sharing rules"], "Passport record creation sharing step");
assertIncludesAny(bundleText, ["Evidence preview/download proof"], "evidence preview/download proof label");
assertIncludesAny(bundleText, ["Evidence preview/download ledger"], "evidence preview/download ledger label");
assertIncludesAny(bundleText, ["evidence_preview_download_ledger"], "evidence preview/download ledger packet field");
assertIncludesAny(bundleText, ["Signed preview ready"], "evidence signed preview readiness label");
assertIncludesAny(bundleText, ["Last signed evidence link"], "last signed evidence link visible state");
assertIncludesAny(bundleText, ["last_signed_evidence_link"], "last signed evidence link packet field");
assertIncludesAny(bundleText, ["Evidence access chain"], "evidence access chain panel");
assertIncludesAny(bundleText, ["evidence_access_chain"], "evidence access chain packet field");
assertIncludesAny(bundleText, ["Audit expectation"], "evidence audit expectation step");
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
assertIncludesAny(bundleText, ["Record dispute and correction"], "professional dispute workflow panel");
assertIncludesAny(bundleText, ["Open dispute"], "professional dispute workflow submit control");
assertIncludesAny(bundleText, ["Export dispute packet"], "professional dispute packet export");
assertIncludesAny(bundleText, ["professional_record_dispute"], "professional dispute workflow packet mode");
assertIncludesAny(bundleText, ["record.dispute_opened"], "professional dispute audit event");
assertIncludesAny(bundleText, ["Live Supabase database mode"], "live database mode indicator");
assertIncludesAny(bundleText, ["Portal access evidence"], "portal access evidence packet label");
assertIncludesAny(bundleText, ["Export portal packet"], "portal access packet export control");
assertIncludesAny(bundleText, ["live_database_required_for_acceptance"], "portal access live database acceptance field");
assertIncludesAny(bundleText, ["preview_data_accepted_for_v1"], "portal access preview rejection field");
assertIncludesAny(bundleText, ["Preview data is not accepted for v1"], "dashboard preview boundary copy");
assertIncludesAny(bundleText, ["Supabase rows written"], "live pilot seed database evidence");
assertIncludesAny(bundleText, ["corporate_access_review_id"], "live pilot seed corporate review evidence");
assertIncludesAny(bundleText, ["Export live readiness"], "live database readiness export");
assertIncludesAny(bundleText, ["Product preview mode"], "preview mode indicator");
assertIncludesAny(bundleText, ["All actors"], "audit actor filter");
assertIncludesAny(bundleText, ["Last 7 days"], "audit timeframe filter");
assertIncludesAny(bundleText, ["All signal levels"], "audit signal filter");
assertIncludesAny(bundleText, ["Clear filters"], "audit clear filters control");
assertIncludesAny(bundleText, ["Export JSON"], "audit JSON export control");
assertIncludesAny(bundleText, ["Admin export readiness"], "admin export readiness packet label");
assertIncludesAny(bundleText, ["Audit filter receipt"], "admin audit filter receipt label");
assertIncludesAny(bundleText, ["audit_filter_receipt"], "admin audit filter receipt packet field");
assertIncludesAny(bundleText, ["Export admin readiness"], "admin export readiness export control");
assertIncludesAny(bundleText, ["admin_audit_export_readiness"], "admin export readiness packet mode");
assertIncludesAny(bundleText, ["Admin audit export matrix"], "admin audit export matrix label");
assertIncludesAny(bundleText, ["admin_audit_export_matrix"], "admin audit export matrix packet field");
assertIncludesAny(bundleText, ["Choose the right proof packet before sharing audit data"], "admin audit export matrix guidance");
assertIncludesAny(bundleText, ["Review attestations"], "admin audit review attestation filter");
assertIncludesAny(bundleText, ["corporate_access_reviews"], "admin audit and security corporate review table coverage");
assertIncludesAny(bundleText, ["Full audit and verification history packet"], "audit coverage packet label");
assertIncludesAny(bundleText, ["Export audit coverage packet"], "audit coverage packet export control");
assertIncludesAny(bundleText, ["filtered_audit_and_verification_history"], "audit coverage packet mode");
assertIncludesAny(bundleText, ["Workflow notification rows"], "notification database source label");
assertIncludesAny(bundleText, ["Export notifications"], "notification export control");
assertIncludesAny(bundleText, ["Export advisory packet"], "advisory packet export control");
assertIncludesAny(bundleText, ["Human approval required before production traffic"], "production human approval boundary");
assertIncludesAny(bundleText, ["human_decision_gate"], "security runbook human decision export rows");
assertIncludesAny(bundleText, ["Security review checklist"], "security review checklist label");
assertIncludesAny(bundleText, ["Security RLS signoff packet"], "security/RLS signoff packet");
assertIncludesAny(bundleText, ["security_rls_signoff_packet"], "security/RLS signoff packet mode");
assertIncludesAny(bundleText, ["Export signoff packet"], "security/RLS signoff export");
assertIncludesAny(bundleText, ["pilot_ready_not_unrestricted_production"], "security production boundary");
assertIncludesAny(bundleText, ["protected tables"], "RLS protected table coverage summary");
assertIncludesAny(bundleText, ["rls_protected_table"], "security runbook RLS table export rows");
assertIncludesAny(bundleText, ["13-track v1 alignment"], "v1 plan alignment register");
assertIncludesAny(bundleText, ["Human decision gates"], "production decision gate register");
assertIncludesAny(bundleText, ["Production gate decisions"], "production gate database source label");
assertIncludesAny(bundleText, ["Export production gates"], "production gate export control");
assertIncludesAny(bundleText, ["V1 completion audit packet"], "v1 completion audit packet label");
assertIncludesAny(bundleText, ["Export v1 completion packet"], "v1 completion audit export control");
assertIncludesAny(bundleText, ["pilot_ready_with_human_gates"], "v1 completion pilot mode");
assertIncludesAny(bundleText, ["V1 completion audit command"], "v1 completion audit command surface");
assertIncludesAny(bundleText, ["Know what is shipped, what needs live proof, and what needs human approval"], "v1 audit command headline");
assertIncludesAny(bundleText, ["v1_audit_command"], "v1 completion audit command packet field");
assertIncludesAny(bundleText, ["Completion audit open items"], "v1 completion open item summary");
assertIncludesAny(bundleText, ["completion_audit_requirements"], "v1 completion requirements packet field");
assertIncludesAny(bundleText, ["live_database_repair_queue"], "v1 completion evidence export repair queue field");
assertIncludesAny(bundleText, ["prepared_human_access_required"], "VPS deployment human access status");
assertIncludesAny(bundleText, ["Export launch gate packet"], "combined launch gate packet export control");
assertIncludesAny(bundleText, ["Record gate decision"], "production gate decision intake control");
assertIncludesAny(bundleText, ["Approved for production"], "production gate approved status option");
assertIncludesAny(bundleText, ["TrustGraph VPS cutover"], "TrustGraph VPS cutover production gate");
assertIncludesAny(bundleText, ["trustgraph_vps_cutover"], "TrustGraph VPS cutover gate key");
assertIncludesAny(bundleText, ["external sign-off required"], "external security gate status");
assertIncludesAny(bundleText, ["Professional Passport setup"], "13-step pilot acceptance script");
assertIncludesAny(bundleText, ["Guided onboarding wizard"], "guided onboarding wizard label");
assertIncludesAny(bundleText, ["Export setup evidence"], "guided onboarding export control");
assertIncludesAny(bundleText, ["Export wizard packet"], "guided onboarding wizard packet export");
assertIncludesAny(bundleText, ["Prepare live pilot workspace"], "guided onboarding live workspace control");
assertIncludesAny(bundleText, ["Login before live pilot seed"], "guided onboarding seed login handoff");
assertIncludesAny(bundleText, ["seed_login_handoff"], "guided onboarding seed login packet field");
assertIncludesAny(bundleText, ["Last browser seed evidence"], "persisted pilot seed evidence label");
assertIncludesAny(bundleText, ["Export seed evidence"], "pilot seed evidence export control");
assertIncludesAny(bundleText, ["Seed reconciliation"], "pilot seed reconciliation panel");
assertIncludesAny(bundleText, ["matched"], "pilot seed reconciliation matched count");
assertIncludesAny(bundleText, ["Corporate review attestation"], "pilot seed review attestation reconciliation row");
assertIncludesAny(bundleText, ["Working database proof"], "working database proof panel");
assertIncludesAny(bundleText, ["Live pilot row proof"], "top-level live pilot row proof panel");
assertIncludesAny(bundleText, ["required Supabase row groups loaded"], "top-level live pilot row proof counter");
assertIncludesAny(bundleText, ["live_pilot_row_proof"], "v1 completion live pilot row proof packet field");
assertIncludesAny(bundleText, ["Working database command center"], "working database command center panel");
assertIncludesAny(bundleText, ["working_database_command_center"], "working database command center packet field");
assertIncludesAny(bundleText, ["Working-data packet export"], "working database command packet export label");
assertIncludesAny(bundleText, ["Working database acceptance"], "working database acceptance summary");
assertIncludesAny(bundleText, ["Live account acceptance checklist"], "live account acceptance checklist");
assertIncludesAny(bundleText, ["live_account_acceptance_checklist"], "live account acceptance packet field");
assertIncludesAny(bundleText, ["human_or_live_data_action_required"], "live account acceptance human/live data action state");
assertIncludesAny(bundleText, ["Live Data Verdict"], "live data verdict panel");
assertIncludesAny(bundleText, ["Required row groups"], "live data verdict row-group metric");
assertIncludesAny(bundleText, ["working_database_accepted"], "working database acceptance packet status");
assertIncludesAny(bundleText, ["Real database only acceptance"], "real database acceptance policy label");
assertIncludesAny(bundleText, ["Preview data is not accepted for v1 database proof"], "real database acceptance visible guard");
assertIncludesAny(bundleText, ["real_database_acceptance_policy"], "real database acceptance packet field");
assertIncludesAny(bundleText, ["signed_in_supabase_repository_rows"], "real database accepted source field");
assertIncludesAny(bundleText, ["Organization RLS recursion repair"], "working database RLS repair proof card");
assertIncludesAny(bundleText, ["organization_rls_repair_evidence"], "working database RLS repair packet field");
assertIncludesAny(bundleText, ["Database policy repair guidance"], "working database policy repair guidance card");
assertIncludesAny(bundleText, ["database_policy_repair_guidance"], "working database policy repair guidance packet field");
assertIncludesAny(bundleText, ["42P17"], "working database policy recursion symptom");
assertIncludesAny(bundleText, ["042_fix_operator_policy_self_reference.sql"], "working database required RLS repair migration");
assertIncludesAny(bundleText, ["Live database repair queue"], "working database repair queue");
assertIncludesAny(bundleText, ["live_database_repair_queue"], "working database repair queue packet field");
assertIncludesAny(bundleText, ["Working database test runbook"], "working database test runbook panel");
assertIncludesAny(bundleText, ["Run seed, reload rows, export proof"], "working database test runbook operator path");
assertIncludesAny(bundleText, ["working_database_test_runbook"], "working database test runbook packet field");
assertIncludesAny(bundleText, ["not static preview data"], "working database test runbook real-data guard");
assertIncludesAny(bundleText, ["Export working-data packet"], "working database proof export");
assertIncludesAny(bundleText, ["Corporate review attestations"], "working database review attestation row");
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
assertIncludesAny(bundleText, ["Operator home"], "signed-in role-aware dashboard label");
assertIncludesAny(bundleText, ["signed_in_landing_actions"], "signed-in landing actions packet field");
assertIncludesAny(bundleText, ["Account and recovery"], "signed-in account recovery action");
assertIncludesAny(bundleText, ["Proof & exports", "Proof &amp; exports"], "proof and exports hub label");
assertIncludesAny(bundleText, ["proof_export_hub"], "proof and exports hub packet field");
assertIncludesAny(bundleText, ["Authorized workspace report"], "authorized workspace report export card");
assertIncludesAny(bundleText, ["Portal handoff checklist"], "portal handoff checklist label");
assertIncludesAny(bundleText, ["portal_handoff_checklist"], "portal handoff checklist packet field");
assertIncludesAny(bundleText, ["Provision workspace"], "corporate portal handoff provisioning step");
assertIncludesAny(bundleText, ["database_acceptance_requires_live_login"], "hosted login database live-login requirement");
assertIncludesAny(bundleText, ["vps_deployment_requires_human_access"], "hosted login VPS human-access requirement");
assertIncludesAny(bundleText, ["Corporate account setup path"], "corporate account setup path label");
assertIncludesAny(bundleText, ["corporate_account_rbac_path"], "corporate account RBAC path packet field");
assertIncludesAny(bundleText, ["Corporate launch command"], "corporate launch command surface");
assertIncludesAny(bundleText, ["Finish these steps to unlock the corporate portal"], "corporate launch next-step guidance");
assertIncludesAny(bundleText, ["live user database access"], "corporate launch database access guidance");
assertIncludesAny(bundleText, ["Activate RBAC role"], "corporate account RBAC role step");
assertIncludesAny(bundleText, ["Corporate provisioning evidence"], "Corporate account provisioning proof");
assertIncludesAny(bundleText, ["Export provisioning packet"], "Corporate provisioning export control");
assertIncludesAny(bundleText, ["Create pilot request"], "live pilot Access Grant request control");
assertIncludesAny(bundleText, ["Add Verify reviewer role"], "Corporate Verify reviewer role control");
assertIncludesAny(bundleText, ["Reviewer workflow"], "Corporate Verify reviewer workflow guide");
assertIncludesAny(bundleText, ["Export reviewer packet"], "Corporate Verify reviewer packet export");
assertIncludesAny(bundleText, ["live_verify_reviewer_flow"], "Corporate Verify reviewer live packet mode");
assertIncludesAny(bundleText, ["Corporate Verify access lane"], "Corporate Verify access lane label");
assertIncludesAny(bundleText, ["corporate_verify_access_lane"], "Corporate Verify access lane packet field");
assertIncludesAny(bundleText, ["Request access by email"], "Corporate Verify access lane request step");
assertIncludesAny(bundleText, ["Live corporate database"], "Corporate user database source label");
assertIncludesAny(bundleText, ["live_database_evidence"], "Corporate user database evidence flag");
assertIncludesAny(bundleText, ["real_database_policy"], "Corporate user database real data policy packet field");
assertIncludesAny(bundleText, ["signed_in_supabase_rows_visible_to_active_corporate_rbac_context"], "Corporate user database accepted source");
assertIncludesAny(bundleText, ["Professionals in view"], "Corporate user database professional count");
assertIncludesAny(bundleText, ["Approved Access Grants"], "Corporate user database approval count");
assertIncludesAny(bundleText, ["Ready to review"], "Corporate user database review-ready bucket");
assertIncludesAny(bundleText, ["Waiting for consent"], "Corporate user database waiting bucket");
assertIncludesAny(bundleText, ["Request access"], "corporate data access path request step");
assertIncludesAny(bundleText, ["Professional approval"], "corporate data access path approval step");
assertIncludesAny(bundleText, ["corporate_data_access_path"], "corporate data access path packet field");
assertIncludesAny(bundleText, ["Corporate access review queue"], "corporate access review queue panel");
assertIncludesAny(bundleText, ["corporate_access_review_queue"], "corporate access review queue packet field");
assertIncludesAny(bundleText, ["Corporate review attestations"], "corporate access review attestations panel");
assertIncludesAny(bundleText, ["corporate_review_attestation_ledger"], "corporate access review attestation packet field");
assertIncludesAny(bundleText, ["corporate_access.review_recorded"], "corporate access review audit event");
assertIncludesAny(bundleText, ["Mark reviewed"], "corporate access reviewed action");
assertIncludesAny(bundleText, ["Ready handoff"], "corporate access handoff action");
assertIncludesAny(bundleText, ["Corporate visibility ledger"], "corporate visibility ledger panel");
assertIncludesAny(bundleText, ["corporate_visibility_ledger"], "corporate visibility ledger packet field");
assertIncludesAny(bundleText, ["Visible user records"], "corporate visibility visible records count");
assertIncludesAny(bundleText, ["Request access by professional email"], "corporate access review queue empty action");
assertIncludesAny(bundleText, ["reviewer_scan_board"], "Corporate user database scan board packet field");
assertIncludesAny(bundleText, ["shared records"], "Corporate user database shared-record row detail");
assertIncludesAny(bundleText, ["shared responsibilities"], "Corporate user database structured responsibility proof");
assertIncludesAny(bundleText, ["Corporate user database packet"], "Corporate user database packet label");
assertIncludesAny(bundleText, ["per-professional shared records"], "Corporate user database per-professional shared record proof");
assertIncludesAny(bundleText, ["per_professional_shared_record_scope"], "Corporate user database per-professional packet field");
assertIncludesAny(bundleText, ["Export review queue"], "Corporate user database review queue CSV export");
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
assertIncludesAny(bundleText, ["Data rights review"], "admin data-rights review panel");
assertIncludesAny(bundleText, ["Export data-rights review"], "admin data-rights review export");
assertIncludesAny(bundleText, ["admin_data_rights_review"], "admin data-rights packet mode");
assertIncludesAny(bundleText, ["Mark data-rights ready"], "admin data-rights ready action");
assertIncludesAny(bundleText, ["Complete data-rights request"], "admin data-rights completion action");
assertIncludesAny(bundleText, ["data_rights.status_changed"], "admin data-rights status audit event");
assertIncludesAny(bundleText, ["Fraud signal review"], "fraud signal review-only panel");
assertIncludesAny(bundleText, ["fraud_signal_review_only"], "fraud signal review packet mode");
assertIncludesAny(bundleText, ["automated_hiring_decisions"], "fraud signal no automated decision field");
assertIncludesAny(bundleText, ["Export fraud packet"], "fraud signal review packet export");
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
assertIncludesAny(bundleText, ["Session command bar"], "persistent session controls");
assertIncludesAny(bundleText, ["Primary workspace routes"], "primary workspace route strip");
assertIncludesAny(bundleText, ["Corporate setup route"], "corporate setup route deck");
assertIncludesAny(bundleText, ["Account first"], "corporate setup account-first action");
assertIncludesAny(bundleText, ["Verify users"], "corporate setup verify-users action");
assertIncludesAny(bundleText, ["Guided access setup"], "permission gate guided setup state");
assertIncludesAny(bundleText, ["Open corporate setup"], "permission gate corporate setup action");
assertIncludesAny(bundleText, ["Auth redirect readiness packet"], "auth redirect readiness packet label");
assertIncludesAny(bundleText, ["Export auth packet"], "auth redirect readiness export control");
assertIncludesAny(bundleText, ["Registration auth readiness packet"], "registration auth readiness packet label");
assertIncludesAny(bundleText, ["Export registration auth packet"], "registration auth readiness export control");
assertIncludesAny(bundleText, ["Export lifecycle packet"], "issuer credential lifecycle export");
assertIncludesAny(bundleText, ["issuer_credential_lifecycle"], "issuer credential lifecycle packet mode");
assertIncludesAny(bundleText, ["revoke_issuer_credential"], "issuer credential revoke RPC evidence");
assertIncludesAny(bundleText, ["update_issuer_credential_expiry"], "issuer credential update RPC evidence");
assertIncludesAny(bundleText, ["Update expiry"], "issuer credential expiry update control");
assertIncludesAny(bundleText, ["Selected path"], "registration selected path proof");
assertIncludesAny(bundleText, ["selected_registration_path"], "registration path packet field");
assertIncludesAny(bundleText, ["Selected portal command"], "registration selected portal command strip");
assertIncludesAny(bundleText, ["selected_portal_command"], "registration selected portal command packet field");
assertIncludesAny(bundleText, ["Create company admin account"], "corporate registration command headline");
assertIncludesAny(bundleText, ["protected_vfix_host"], "auth packet VFIX isolation field");
assertIncludesAny(bundleText, ["trustgraph_vps_target"], "auth packet TrustGraph VPS field");
assertIncludesAny(bundleText, ["github_pages_redirect"], "auth packet GitHub Pages redirect field");
assertIncludesAny(bundleText, ["Allowed redirect URLs must include GitHub Pages and the VPS TrustGraph URL"], "hosted auth redirect guidance");
assertIncludesAny(bundleText, ["Reset password"], "public portal password recovery control");
assertIncludesAny(bundleText, ["Auth recovery decision path"], "public auth recovery decision panel");
assertIncludesAny(bundleText, ["auth_recovery_decision_path"], "registration auth recovery packet field");
assertIncludesAny(bundleText, ["New account verification"], "auth recovery verification guidance");
assertIncludesAny(bundleText, ["Migrations through 041"], "current database migration coverage copy");
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
assertIncludesAny(bundleText, ["Set up access"], "workspace locked route setup action");
assertIncludesAny(bundleText, ["Set up access in Account"], "workspace locked route setup guidance");
assertIncludesAny(bundleText, ["Public site"], "workspace public site return control");
assertIncludesAny(bundleText, ["Sign out"], "workspace sign out control");
assertIncludesAny(bundleText, ["Live database returned a policy or schema error"], "operator database error copy");
assertIncludesAny(bundleText, ["Export ledger"], "billing ledger export control");
assertIncludesAny(bundleText, ["Export gates"], "billing decision gate export control");
assertIncludesAny(bundleText, ["Export launch packet"], "billing launch packet export control");
assertIncludesAny(bundleText, ["Pricing structure packet"], "pricing structure packet label");
assertIncludesAny(bundleText, ["Export pricing packet"], "pricing structure packet export control");
assertIncludesAny(bundleText, ["Supabase ledger"], "public pricing live ledger decision");
assertIncludesAny(bundleText, ["Stripe checkout"], "public pricing human-gated Stripe decision");
assertIncludesAny(bundleText, ["pricing_decision_strip"], "registration packet pricing decision field");
assertIncludesAny(bundleText, ["Billing operator path"], "billing operator path label");
assertIncludesAny(bundleText, ["Activate pilot ledger"], "billing operator pilot ledger step");
assertIncludesAny(bundleText, ["billing_operator_path"], "billing operator path packet field");
assertIncludesAny(bundleText, ["Billing ledger acceptance"], "billing ledger acceptance proof");
assertIncludesAny(bundleText, ["billing_ledger_evidence"], "billing ledger acceptance packet field");
assertIncludesAny(bundleText, ["live_subscription_ledger"], "live billing ledger mode");
assertIncludesAny(bundleText, ["Pricing launch command"], "billing pricing launch command surface");
assertIncludesAny(bundleText, ["Use live pricing and ledger rows, keep payments gated"], "billing pricing launch command headline");
assertIncludesAny(bundleText, ["Real payment collection waits for the Stripe human gate"], "billing Stripe gate guidance");
assertIncludesAny(bundleText, ["Payment launch boundary"], "billing payment launch boundary");
assertIncludesAny(bundleText, ["Billing architecture decision packet"], "billing architecture decision packet label");
assertIncludesAny(bundleText, ["Export payment decision"], "billing architecture decision export control");
assertIncludesAny(bundleText, ["billing_architecture_decision"], "billing architecture packet mode");
assertIncludesAny(bundleText, ["supabase_subscription_ledger"], "billing architecture current system");
assertIncludesAny(bundleText, ["intentionally_disabled_until_human_gate"], "billing architecture disabled payment flows");
assertIncludesAny(bundleText, ["notes captured"], "pilot acceptance note capture");
assertIncludesAny(bundleText, ["Export runbook"], "pilot acceptance markdown runbook export control");

console.log(`TrustGraph live smoke passed: ${response.status} ${targetUrl} (${assetUrls.length} assets checked, repo artifacts, portal, recovery, and data-mode copy verified)`);
