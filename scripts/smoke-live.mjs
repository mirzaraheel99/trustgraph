import { readdir, readFile } from "node:fs/promises";

const targetUrl = process.env.TRUSTGRAPH_SMOKE_URL || "https://mirzaraheel99.github.io/trustgraph/";

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "trustgraph-smoke/1.0"
    }
  });

  const text = await response.text();
  return { response, text };
}

async function fetchTextWithRetry(url, attempts = 4) {
  let latest;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    latest = await fetchText(url);
    if (latest.response.ok || attempt === attempts) {
      return latest;
    }

    await wait(750 * attempt);
  }

  return latest;
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
  assert(evidenceMap.includes("046_registration_intent_professional_status.sql"), "Expected implementation evidence map to record migration 046 registration completion coverage");
  assert(evidenceMap.includes("passport_initialized"), "Expected implementation evidence map to record Professional registration completion status");
  assert(readiness.includes("workspace_created") && readiness.includes("passport_initialized"), "Expected readiness checklist to require registration intent completion states");
  assert(readme.includes("046_registration_intent_professional_status.sql"), "Expected README to list migration 046");
  assert(readme.includes("contained professional/corporate access desk"), "Expected README to describe the contained public auth access desk");
  assert(readme.includes("top command system instead of a fixed left rail"), "Expected README to describe the no-rail dashboard layout");
}

const pageUrl = `${targetUrl}?smoke=live-script`;
const { response, text } = await fetchTextWithRetry(pageUrl);

await assertRepoReadinessArtifacts();

assert(response.ok, `Expected 2xx response from ${targetUrl}, received ${response.status}`);
assert(text.includes("<!DOCTYPE html>"), "Expected an HTML document");
assert(text.includes("TrustGraph") || text.includes("_next/static"), "Expected TrustGraph app shell or bundled assets");

const assetUrls = uniqueAssetUrls(text, pageUrl).slice(0, 8);
assert(assetUrls.length > 0, "Expected static asset references in hosted HTML");

await Promise.all(
  assetUrls.map(async (assetUrl) => {
    const { response: assetResponse } = await fetchTextWithRetry(assetUrl);
    assert(assetResponse.ok, `Expected asset ${assetUrl} to return 2xx, received ${assetResponse.status}`);
  })
);

const bundleText = (
  await Promise.all(
    assetUrls
      .filter((assetUrl) => assetUrl.endsWith(".js"))
      .slice(0, 6)
      .map(async (assetUrl) => {
        const { text: assetText } = await fetchTextWithRetry(assetUrl);
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
assertIncludesAny(bundleText, ["Public portal launchpad"], "public first-screen portal launchpad");
assertIncludesAny(bundleText, ["Choose your path"], "public portal launchpad chooser");
assertIncludesAny(bundleText, ["Review price and database path before signup"], "public launchpad pricing and database proof");
assertIncludesAny(bundleText, ["Portal launch map"], "public hero portal launch map");
assertIncludesAny(bundleText, ["Start in the right portal before live database rows are created"], "portal launch map database guidance");
assertIncludesAny(bundleText, ["Company organization and admin membership"], "corporate portal launch first write");
assertIncludesAny(bundleText, ["Profile and personal organization"], "professional portal launch first write");
assertIncludesAny(bundleText, ["Corporate registration sequence"], "Corporate registration guided sequence");
assertIncludesAny(bundleText, ["Professional registration sequence"], "Professional registration guided sequence");
assertIncludesAny(bundleText, ["Provision live workspace"], "Corporate registration provisioning step");
assertIncludesAny(bundleText, ["Auth landing command"], "public auth landing command");
assertIncludesAny(bundleText, ["Account type chooser"], "public account type chooser");
assertIncludesAny(bundleText, ["Choose who is signing up before database rows are created"], "account type chooser headline");
assertIncludesAny(bundleText, ["Register new account"], "account type chooser registration action");
assertIncludesAny(bundleText, ["Login existing account"], "account type chooser login action");
assertIncludesAny(bundleText, ["account_type_chooser"], "registration packet account type chooser field");
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
assertIncludesAny(bundleText, ["Portal launch decision strip"], "portal launch decision strip");
assertIncludesAny(bundleText, ["portal_launch_decision_strip"], "portal launch decision packet field");
assertIncludesAny(bundleText, ["Choose this when"], "portal decision plain-language selector");
assertIncludesAny(bundleText, ["You review others"], "corporate portal plain-language decision copy");
assertIncludesAny(bundleText, ["Live onboarding acceptance contract"], "live onboarding acceptance contract");
assertIncludesAny(bundleText, ["live_onboarding_acceptance_contract"], "live onboarding acceptance contract packet field");
assertIncludesAny(bundleText, ["preview_data_accepted"], "live onboarding rejects preview data");
assertIncludesAny(bundleText, ["localhost_redirect_accepted"], "live onboarding rejects localhost redirects");
assertIncludesAny(bundleText, ["approved_shared_rows_visible"], "corporate live onboarding access proof step");
assertIncludesAny(bundleText, ["Portal login switchboard"], "portal login switchboard panel");
assertIncludesAny(bundleText, ["Professional user login"], "professional login switchboard route");
assertIncludesAny(bundleText, ["Corporate company login"], "corporate login switchboard route");
assertIncludesAny(bundleText, ["portal_login_switchboard"], "portal login switchboard packet field");
assertIncludesAny(bundleText, ["Live database handoff"], "portal auth live database handoff card");
assertIncludesAny(bundleText, ["Corporate account path"], "corporate auth outcome path");
assertIncludesAny(bundleText, ["Professional Passport path"], "professional auth outcome path");
assertIncludesAny(bundleText, ["portal_auth_outcome_summary"], "portal auth outcome packet field");
assertIncludesAny(bundleText, ["Public auth flow command"], "public auth flow command");
assertIncludesAny(bundleText, ["Portal access cockpit"], "public auth portal access cockpit");
assertIncludesAny(bundleText, ["portal_access_cockpit"], "public auth portal access cockpit packet");
assertIncludesAny(bundleText, ["Create the company account first, then Verify users by permission"], "corporate login/register cockpit guidance");
assertIncludesAny(bundleText, ["Auth path summary"], "public auth selected path summary");
assertIncludesAny(bundleText, ["auth_path_summary"], "public auth path summary packet field");
assertIncludesAny(bundleText, ["login_register_card_shows_account_type_pricing_first_database_write_landing_and_required_fields_before_user_types"], "auth path summary acceptance rule");
assertIncludesAny(bundleText, ["Portal start desk"], "public auth portal start desk");
assertIncludesAny(bundleText, ["portal_start_desk"], "public auth portal start desk packet");
assertIncludesAny(bundleText, ["public_auth_flow_command"], "public auth flow command packet field");
assertIncludesAny(bundleText, ["Professional user portal"], "Professional database portal route");
assertIncludesAny(bundleText, ["Corporate company portal"], "Corporate database portal route");
assertIncludesAny(bundleText, ["Personal Passport", "Corporate Verify", "Company Admin"], "dashboard portal path strip");
assertIncludesAny(bundleText, ["Workspace command strip"], "signed-in workspace command strip");
assertIncludesAny(bundleText, ["Open next workspace"], "workspace command next action");
assertIncludesAny(bundleText, ["workspace_command_strip"], "authorized report workspace command strip field");
assertIncludesAny(bundleText, ["Dashboard next action"], "signed-in dashboard next-action command");
assertIncludesAny(bundleText, ["dashboard_next_action"], "authorized report dashboard next-action field");
assertIncludesAny(bundleText, ["Login or register before live database work"], "dashboard next-action login state");
assertIncludesAny(bundleText, ["Request approved user access for Corporate Verify"], "dashboard next-action corporate Verify state");
assertIncludesAny(bundleText, ["V1 portal launchpad"], "signed-in first-screen portal launchpad");
assertIncludesAny(bundleText, ["Today command center"], "signed-in first-screen daily command center");
assertIncludesAny(bundleText, ["today_command_center"], "today command center packet field");
assertIncludesAny(bundleText, ["first_screen_daily_command_center_separates_professional_corporate_company_setup_account_logout_pricing_and_database_proof_without_overflow"], "today command center acceptance rule");
assertIncludesAny(bundleText, ["V1 command cockpit"], "signed-in first-screen V1 command cockpit");
assertIncludesAny(bundleText, ["v1_command_cockpit"], "V1 command cockpit packet field");
assertIncludesAny(bundleText, ["Website, login, Professional Passport, Corporate Verify, pricing"], "V1 command cockpit plain-language launch path");
assertIncludesAny(bundleText, ["Portal action dock"], "signed-in portal action dock");
assertIncludesAny(bundleText, ["portal_action_dock"], "signed-in portal action dock packet field");
assertIncludesAny(bundleText, ["passport_verify_company_pricing_and_account_are_visible_clickable_and_mobile_stacked_from_the_first_dashboard_screen"], "portal action dock acceptance rule");
assertIncludesAny(bundleText, ["Portal welcome path"], "signed-in portal welcome path");
assertIncludesAny(bundleText, ["portal_welcome_path"], "signed-in portal welcome packet field");
assertIncludesAny(bundleText, ["Professional, Corporate admin, Corporate reviewer, pricing, and server save"], "portal welcome path role separation");
assertIncludesAny(bundleText, ["first_dashboard_view_clearly_separates_professional_user_corporate_admin_corporate_reviewer_pricing_and_server_save_paths"], "portal welcome path acceptance rule");
assertIncludesAny(bundleText, ["Portal readiness board"], "signed-in portal readiness board");
assertIncludesAny(bundleText, ["portal_readiness_board"], "portal readiness board packet field");
assertIncludesAny(bundleText, ["login_professional_passport_corporate_workspace_pricing_ledger_scoped_user_database_and_vps_release_stamp"], "portal readiness board acceptance rule");
assertIncludesAny(bundleText, ["Export board"], "portal readiness board export action");
assertIncludesAny(bundleText, ["Start here"], "portal launchpad start marker");
assertIncludesAny(bundleText, ["Session command bar"], "dashboard session command bar");
assertIncludesAny(bundleText, ["Portal command deck"], "signed-in portal command deck");
assertIncludesAny(bundleText, ["Start with the right workspace"], "portal command deck headline");
assertIncludesAny(bundleText, ["Console layout"], "signed-in console layout receipt");
assertIncludesAny(bundleText, ["signed_in_console_layout_receipt"], "signed-in console layout receipt packet field");
assertIncludesAny(
  bundleText,
  ["top_command_bar_routes_account_logout_corporate_setup_and_workspace_routes_are_bounded_mobile_stacked_and_never_horizontal_scrollers"],
  "signed-in console layout acceptance rule"
);
assertIncludesAny(bundleText, ["stacked_grid_no_horizontal_scroll"], "signed-in console mobile route behavior");
assertIncludesAny(bundleText, ["Stacked routes"], "signed-in console stacked route copy");
assertIncludesAny(bundleText, ["Signed-in portal flow contract"], "signed-in portal flow contract");
assertIncludesAny(bundleText, ["signed_in_portal_flow_contract"], "authorized report signed-in portal flow field");
assertIncludesAny(bundleText, ["signed_in_user_can_identify_personal_passport_corporate_verify_company_admin_next_action_and_database_boundary_without_guessing"], "signed-in portal flow acceptance rule");
assertIncludesAny(bundleText, ["Portal home command center"], "signed-in portal home command center");
assertIncludesAny(bundleText, ["Start with login, then choose the right portal"], "signed-in portal home guidance");
assertIncludesAny(bundleText, ["Continue current portal"], "signed-in portal continuation action");
assertIncludesAny(bundleText, ["Account and recovery"], "signed-in portal account action");
assertIncludesAny(bundleText, ["Portal choice guide"], "signed-in portal choice guide");
assertIncludesAny(bundleText, ["Choose the right workspace before acting"], "portal choice guide headline");
assertIncludesAny(bundleText, ["portal_choice_guide"], "authorized report portal choice guide field");
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
assertIncludesAny(bundleText, ["Login decision path"], "live auth login decision path");
assertIncludesAny(bundleText, ["Professional account path selected"], "professional login path selection");
assertIncludesAny(bundleText, ["Export login path"], "login decision path export control");
assertIncludesAny(bundleText, ["login_decision_path"], "login decision path packet field");
assertIncludesAny(bundleText, ["Corporate launch path"], "guided corporate setup path");
assertIncludesAny(bundleText, ["Corporate launch cockpit"], "corporate setup next-action cockpit");
assertIncludesAny(bundleText, ["corporate_launch_cockpit"], "corporate launch cockpit packet mode");
assertIncludesAny(bundleText, ["Export cockpit proof"], "corporate launch cockpit export");
assertIncludesAny(bundleText, ["Corporate onboarding pricing cockpit"], "corporate onboarding pricing cockpit");
assertIncludesAny(bundleText, ["corporate_onboarding_pricing_cockpit"], "corporate onboarding pricing cockpit packet mode");
assertIncludesAny(bundleText, ["workspace, RBAC, team, pilot ledger, and scoped database access"], "corporate onboarding pricing flow guidance");
assertIncludesAny(bundleText, ["Export onboarding proof"], "corporate onboarding pricing proof export");
assertIncludesAny(bundleText, ["Team and billing handoff"], "team billing Verify handoff panel");
assertIncludesAny(bundleText, ["team_billing_handoff"], "team billing handoff packet mode");
assertIncludesAny(bundleText, ["Export handoff proof"], "team billing handoff export");
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
assertIncludesAny(bundleText, ["Request scope receipt"], "corporate access request scope receipt");
assertIncludesAny(bundleText, ["one professional, one business purpose"], "corporate access request scope boundary");
assertIncludesAny(bundleText, ["request_scope_receipt"], "corporate reviewer packet request scope receipt field");
assertIncludesAny(bundleText, ["Professional email"], "corporate Verify professional email field label");
assertIncludesAny(bundleText, ["Corporate user data proof"], "corporate Verify user data proof summary");
assertIncludesAny(bundleText, ["user_data_proof"], "corporate Verify user data proof packet field");
assertIncludesAny(bundleText, ["Corporate directory acceptance"], "corporate user database acceptance ledger");
assertIncludesAny(bundleText, ["corporate_directory_acceptance"], "corporate user database acceptance packet field");
assertIncludesAny(bundleText, ["Directory filter receipt"], "corporate directory filter receipt");
assertIncludesAny(bundleText, ["filter_receipt"], "corporate directory filter receipt packet field");
assertIncludesAny(bundleText, ["All readiness"], "corporate directory readiness filter");
assertIncludesAny(bundleText, ["Review ready", "Needs gap follow-up"], "corporate directory readiness filter options");
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
assertIncludesAny(bundleText, ["Login issue resolver"], "public login issue resolver");
assertIncludesAny(bundleText, ["Fix verification, recovery, or rate-limit problems without guessing"], "login issue resolver headline");
assertIncludesAny(bundleText, ["login_issue_resolver"], "registration auth packet login issue resolver field");
assertIncludesAny(bundleText, ["Every portal connects to the live database foundation"], "live database registration outcome copy");
assertIncludesAny(bundleText, ["After registration"], "registration outcome section");
assertIncludesAny(bundleText, ["Set new password"], "password recovery update control");
assertIncludesAny(bundleText, ["Password recovery session ready"], "password recovery session ready state");
assertIncludesAny(bundleText, ["Recovery redirect"], "password recovery redirect guidance");
assertIncludesAny(bundleText, ["Auth recovery command center"], "visible auth recovery command center");
assertIncludesAny(bundleText, ["Signed-in recovery route"], "signed-in logout and recovery route");
assertIncludesAny(bundleText, ["signed_in_recovery_route"], "signed-in recovery route packet field");
assertIncludesAny(bundleText, ["Export recovery route"], "signed-in recovery route export");
assertIncludesAny(bundleText, ["signed_in_account_shows_logout_password_update_recovery_state_and_hosted_redirect_without_hidden_controls"], "signed-in recovery route acceptance rule");
assertIncludesAny(bundleText, ["Copy hosted redirect"], "hosted auth redirect copy action");
assertIncludesAny(bundleText, ["Portal access command"], "professional and corporate auth access command");
assertIncludesAny(bundleText, ["Registration outcome command"], "registration outcome command");
assertIncludesAny(bundleText, ["registration_outcome_command"], "registration outcome packet field");
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
assertIncludesAny(bundleText, ["Data-rights review path"], "data-rights review lane panel");
assertIncludesAny(bundleText, ["review_lanes"], "data-rights packet review lanes field");
assertIncludesAny(bundleText, ["Closure never deletes automatically"], "data-rights closure safety copy");
assertIncludesAny(bundleText, ["Login or sign up"], "guided auth operator path");
assertIncludesAny(bundleText, ["Create workspace"], "post-verification workspace action");
assertIncludesAny(bundleText, ["2 emails per hour"], "Supabase built-in email rate limit guidance");
assertIncludesAny(bundleText, ["not localhost"], "hosted auth redirect localhost warning");
assertIncludesAny(bundleText, ["https://mirzaraheel99.github.io/trustgraph/"], "hosted auth redirect URL");
assertIncludesAny(bundleText, ["allowed_production_redirects"], "hosted auth production redirect list");
assertIncludesAny(bundleText, ["Hosted email verification accepted"], "hosted auth callback success status");
assertIncludesAny(bundleText, ["Hosted corporate retest"], "hosted corporate retest checklist");
assertIncludesAny(bundleText, ["hosted_corporate_retest"], "hosted corporate retest packet");
assertIncludesAny(bundleText, ["Export hosted retest"], "hosted corporate retest export");
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
assertIncludesAny(bundleText, ["Signed evidence access audit"], "signed evidence access audit receipt");
assertIncludesAny(bundleText, ["signed_evidence_access_audit_receipt"], "signed evidence access audit packet field");
assertIncludesAny(
  bundleText,
  ["evidence_file_access_uses_short_lived_signed_urls_metadata_only_rows_do_not_expose_files_and_last_preview_or_download_state_is_exportable"],
  "signed evidence access audit acceptance rule"
);
assertIncludesAny(bundleText, ["Evidence access chain"], "evidence access chain panel");
assertIncludesAny(bundleText, ["evidence_access_chain"], "evidence access chain packet field");
assertIncludesAny(bundleText, ["Audit expectation"], "evidence audit expectation step");
assertIncludesAny(bundleText, ["Export access packet"], "evidence access packet export control");
assertIncludesAny(bundleText, ["selected_record_evidence_preview_download"], "evidence access packet mode");
assertIncludesAny(bundleText, ["short_lived_signed_url_only"], "evidence signed URL policy");
assertIncludesAny(bundleText, ["Claim trust taxonomy"], "claim trust taxonomy panel");
assertIncludesAny(bundleText, ["claim_trust_taxonomy"], "claim trust taxonomy packet field");
assertIncludesAny(bundleText, ["Record provenance matrix"], "record provenance matrix receipt");
assertIncludesAny(bundleText, ["record_provenance_matrix"], "record provenance matrix packet mode");
assertIncludesAny(
  bundleText,
  ["record_claims_show_source_verifier_verification_time_current_status_and_visibility_scope"],
  "claim provenance acceptance rule"
);
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
assertIncludesAny(bundleText, ["Live seed reload receipt"], "live seed reload receipt");
assertIncludesAny(bundleText, ["live_seed_reload_receipt"], "live seed reload receipt packet field");
assertIncludesAny(bundleText, ["seed_ids_reconcile_with_reloaded_signed_in_supabase_repository_rows"], "live seed reload acceptance rule");
assertIncludesAny(bundleText, ["Export live readiness"], "live database readiness export");
assertIncludesAny(bundleText, ["Product preview mode"], "preview mode indicator");
assertIncludesAny(bundleText, ["All actors"], "audit actor filter");
assertIncludesAny(bundleText, ["Last 7 days"], "audit timeframe filter");
assertIncludesAny(bundleText, ["All signal levels"], "audit signal filter");
assertIncludesAny(bundleText, ["Clear filters"], "audit clear filters control");
assertIncludesAny(bundleText, ["Export JSON"], "audit JSON export control");
assertIncludesAny(bundleText, ["Admin export readiness"], "admin export readiness packet label");
assertIncludesAny(bundleText, ["Admin audit export command"], "admin audit export command label");
assertIncludesAny(bundleText, ["admin_audit_export_command"], "admin audit export command packet field");
assertIncludesAny(bundleText, ["Export recommended CSV"], "admin audit recommended CSV export action");
assertIncludesAny(bundleText, ["Filtered audit events and metadata only"], "admin audit raw evidence exclusion command copy");
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
assertIncludesAny(bundleText, ["V1 security/RLS review checklist"], "V1 security/RLS review checklist receipt");
assertIncludesAny(bundleText, ["v1_security_rls_review_checklist_receipt"], "V1 security/RLS review checklist packet field");
assertIncludesAny(bundleText, ["Export review receipt"], "V1 security/RLS review receipt export");
assertIncludesAny(
  bundleText,
  ["ci_rls_guard_passes_private_evidence_signed_url_flow_is_reviewed_rbac_membership_rows_are_loaded_audit_exports_are_available_and_external_security_signoff_is_recorded_before_production_traffic"],
  "V1 security/RLS review acceptance rule"
);
assertIncludesAny(bundleText, ["pilot_ready_not_unrestricted_production"], "security production boundary");
assertIncludesAny(bundleText, ["protected tables"], "RLS protected table coverage summary");
assertIncludesAny(bundleText, ["rls_protected_table"], "security runbook RLS table export rows");
assertIncludesAny(bundleText, ["13-track v1 alignment"], "v1 plan alignment register");
assertIncludesAny(bundleText, ["Human decision gates"], "production decision gate register");
assertIncludesAny(bundleText, ["Production gate cockpit"], "production gate cockpit");
assertIncludesAny(bundleText, ["production_gate_cockpit"], "production gate cockpit packet field");
assertIncludesAny(bundleText, ["Export gate cockpit"], "production gate cockpit export control");
assertIncludesAny(bundleText, ["production_gate_cockpit_requires_stripe_security_storage_legal_pilot_owner_and_vps_cutover_approval"], "production gate cockpit acceptance rule");
assertIncludesAny(bundleText, ["Pilot-only until every human gate is recorded"], "production gate cockpit pilot-only copy");
assertIncludesAny(bundleText, ["Production gate decisions"], "production gate database source label");
assertIncludesAny(bundleText, ["Export production gates"], "production gate export control");
assertIncludesAny(bundleText, ["V1 completion audit packet"], "v1 completion audit packet label");
assertIncludesAny(bundleText, ["Export v1 completion packet"], "v1 completion audit export control");
assertIncludesAny(bundleText, ["pilot_ready_with_human_gates"], "v1 completion pilot mode");
assertIncludesAny(bundleText, ["V1 completion audit command"], "v1 completion audit command surface");
assertIncludesAny(bundleText, ["Know what is shipped, what needs live proof, and what needs human approval"], "v1 audit command headline");
assertIncludesAny(bundleText, ["v1_audit_command"], "v1 completion audit command packet field");
assertIncludesAny(bundleText, ["Release sync command"], "release sync command surface");
assertIncludesAny(bundleText, ["Export release sync packet"], "release sync export control");
assertIncludesAny(bundleText, ["release_sync_command"], "release sync command packet field");
assertIncludesAny(bundleText, ["tools/update-vps-from-github.sh"], "vps update command in release sync packet");
assertIncludesAny(bundleText, ["Stale VPS recovery runbook"], "stale VPS recovery runbook");
assertIncludesAny(bundleText, ["stale_vps_recovery_runbook"], "stale VPS recovery packet field");
assertIncludesAny(bundleText, ["vps_can_return_200_while_serving_an_older_trustgraph_bundle"], "stale VPS 200-but-old warning");
assertIncludesAny(bundleText, ["vps_release_stamp_returns_commit_json_and_contains_latest_green_main_commit"], "stale VPS acceptance rule");
assertIncludesAny(bundleText, ["trustgraph-release.json"], "server release stamp URL");
assertIncludesAny(bundleText, ["release_stamp_command"], "server release stamp command field");
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
assertIncludesAny(bundleText, ["onboarding_wizard_receipts"], "onboarding wizard receipt table");
assertIncludesAny(bundleText, ["record_onboarding_wizard_receipt"], "onboarding wizard receipt RPC");
assertIncludesAny(bundleText, ["Onboarding wizard database receipt"], "onboarding wizard database receipt label");
assertIncludesAny(bundleText, ["Record onboarding receipt"], "onboarding wizard receipt record action");
assertIncludesAny(
  bundleText,
  ["onboarding_wizard_receipt_requires_hosted_login_account_context_registration_corporate_setup_pricing_user_database_and_preview_data_rejected"],
  "onboarding wizard receipt acceptance rule"
);
assertIncludesAny(bundleText, ["auth_recovery_receipts"], "auth recovery receipt table");
assertIncludesAny(bundleText, ["record_auth_recovery_receipt"], "auth recovery receipt RPC");
assertIncludesAny(bundleText, ["Auth recovery database receipt"], "auth recovery database receipt label");
assertIncludesAny(bundleText, ["Record recovery proof"], "auth recovery receipt record action");
assertIncludesAny(
  bundleText,
  ["auth_recovery_receipt_requires_hosted_redirect_email_rate_limit_guidance_localhost_link_repair_and_signed_in_owner_scope"],
  "auth recovery receipt acceptance rule"
);
assertIncludesAny(bundleText, ["security_rls_review_receipts"], "security RLS review receipt table");
assertIncludesAny(bundleText, ["record_security_rls_review_receipt"], "security RLS review receipt RPC");
assertIncludesAny(bundleText, ["Security RLS database receipt"], "security RLS database receipt label");
assertIncludesAny(bundleText, ["Record security receipt"], "security RLS review receipt record action");
assertIncludesAny(
  bundleText,
  ["security_rls_review_receipt_requires_ci_rls_guard_private_evidence_signed_url_review_rbac_audit_exports_and_external_signoff_before_production_traffic"],
  "security RLS review receipt acceptance rule"
);
assertIncludesAny(bundleText, ["pilot_owner_readiness_receipts"], "pilot owner readiness receipt table");
assertIncludesAny(bundleText, ["record_pilot_owner_readiness_receipt"], "pilot owner readiness receipt RPC");
assertIncludesAny(bundleText, ["Pilot owner database receipt"], "pilot owner readiness database receipt label");
assertIncludesAny(bundleText, ["Record pilot owner receipt"], "pilot owner readiness receipt record action");
assertIncludesAny(
  bundleText,
  ["pilot_owner_readiness_receipt_requires_named_pilot_customer_onboarding_support_incident_owner_live_contacts_and_no_production_traffic_without_human_signoff"],
  "pilot owner readiness database receipt acceptance rule"
);
assertIncludesAny(bundleText, ["Onboarding handoff"], "top-level onboarding handoff command");
assertIncludesAny(bundleText, ["onboarding_handoff_command"], "top-level onboarding handoff packet field");
assertIncludesAny(bundleText, ["new_user_can_move_from_login_to_corporate_setup_live_row_completion_guided_seed_reconciliation_and_exported_proof_without_searching_the_dashboard"], "top-level onboarding handoff acceptance rule");
assertIncludesAny(bundleText, ["Export handoff"], "top-level onboarding handoff export");
assertIncludesAny(bundleText, ["Export setup evidence"], "guided onboarding export control");
assertIncludesAny(bundleText, ["Export wizard packet"], "guided onboarding wizard packet export");
assertIncludesAny(bundleText, ["Prepare live pilot workspace"], "guided onboarding live workspace control");
assertIncludesAny(bundleText, ["Live seed preflight"], "live seed preflight panel");
assertIncludesAny(bundleText, ["Export seed preflight"], "live seed preflight export control");
assertIncludesAny(bundleText, ["live_seed_preflight"], "live seed preflight packet field");
assertIncludesAny(bundleText, ["repository_rows_reload"], "live seed accepted-after condition");
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
assertIncludesAny(bundleText, ["V1 live database readiness receipt"], "V1 live database readiness receipt");
assertIncludesAny(bundleText, ["v1_live_database_readiness_receipt"], "V1 live database readiness packet field");
assertIncludesAny(bundleText, ["v1_live_database_readiness_receipts"], "V1 live database readiness receipt table");
assertIncludesAny(bundleText, ["record_v1_live_database_readiness_receipt"], "V1 live database readiness receipt RPC");
assertIncludesAny(bundleText, ["Record live receipt"], "V1 live database readiness record action");
assertIncludesAny(bundleText, ["corporate_database_access_receipts"], "corporate database access receipt table");
assertIncludesAny(bundleText, ["record_corporate_database_access_receipt"], "corporate database access receipt RPC");
assertIncludesAny(bundleText, ["Record database receipt"], "corporate database access receipt action");
assertIncludesAny(bundleText, ["corporate_database_visibility_snapshots"], "corporate database visibility snapshot table");
assertIncludesAny(bundleText, ["record_corporate_database_visibility_snapshot"], "corporate database visibility snapshot RPC");
assertIncludesAny(bundleText, ["seed_pilot_visibility_snapshot"], "pilot visibility snapshot seed RPC");
assertIncludesAny(bundleText, ["Corporate database visibility snapshot"], "corporate database visibility snapshot panel");
assertIncludesAny(bundleText, ["Record visibility snapshot"], "corporate database visibility snapshot action");
assertIncludesAny(
  bundleText,
  ["corporate_database_visibility_snapshot_requires_active_corporate_rbac_filtered_live_rows_readiness_buckets_review_attestation_and_no_raw_private_files"],
  "corporate database visibility snapshot acceptance rule"
);
assertIncludesAny(bundleText, ["evidence_access_receipts"], "evidence access receipt table");
assertIncludesAny(bundleText, ["record_evidence_access_receipt"], "evidence access receipt RPC");
assertIncludesAny(bundleText, ["evidence_access_receipt_requires_private_storage_short_lived_signed_url_no_raw_url_storage_owner_or_approved_scope_and_audit_event"], "evidence access receipt acceptance rule");
assertIncludesAny(bundleText, ["data_export_package_receipts"], "data export package receipt table");
assertIncludesAny(bundleText, ["record_data_export_package_receipt"], "data export package receipt RPC");
assertIncludesAny(bundleText, ["Data export package receipt"], "data export package receipt panel");
assertIncludesAny(
  bundleText,
  ["data_export_package_receipt_requires_signed_in_owner_live_rows_review_request_metadata_only_raw_private_files_excluded_and_no_preview_data"],
  "data export package receipt acceptance rule"
);
assertIncludesAny(bundleText, ["data_export_packages"], "data export package table");
assertIncludesAny(bundleText, ["generate_data_export_package"], "data export package generation RPC");
assertIncludesAny(bundleText, ["mark_data_export_package_downloaded"], "data export package download marker RPC");
assertIncludesAny(bundleText, ["Data export package manifest"], "data export package manifest panel");
assertIncludesAny(bundleText, ["Generate package"], "data export package generate action");
assertIncludesAny(bundleText, ["Download manifest"], "data export package download action");
assertIncludesAny(
  bundleText,
  ["data_export_package_manifest_requires_owner_data_export_request_metadata_only_no_raw_private_files_no_download_url_storage_and_audit_event"],
  "data export package manifest acceptance rule"
);
assertIncludesAny(
  bundleText,
  ["v1_live_database_readiness_requires_signed_in_supabase_rows_for_professional_corporate_access_evidence_consent_billing_team_review_registration_release_and_no_preview_data"],
  "V1 live database readiness acceptance rule"
);
assertIncludesAny(bundleText, ["Registration intent handoff"], "live pilot row proof registration intent group");
assertIncludesAny(bundleText, ["Registration intent review"], "registration intent review panel");
assertIncludesAny(bundleText, ["registration_intent_review_packet"], "registration intent review packet field");
assertIncludesAny(bundleText, ["mark_registration_intent_workspace_created"], "registration intent workspace-created RPC marker");
assertIncludesAny(bundleText, ["workspace_created"], "registration intent completed status marker");
assertIncludesAny(bundleText, ["mark_registration_intent_passport_initialized"], "registration intent passport-initialized RPC marker");
assertIncludesAny(bundleText, ["passport_initialized"], "registration intent professional completed status marker");
assertIncludesAny(bundleText, ["registration_intents_are_written_after_hosted_auth_loaded_from_supabase_and_visible_in_live_row_proof_before_pilot_acceptance"], "registration intent review acceptance rule");
assertIncludesAny(bundleText, ["Export intent review"], "registration intent review export control");
assertIncludesAny(bundleText, ["Working database command center"], "working database command center panel");
assertIncludesAny(bundleText, ["working_database_command_center"], "working database command center packet field");
assertIncludesAny(bundleText, ["Real database proof cockpit"], "real database proof cockpit panel");
assertIncludesAny(bundleText, ["real_database_proof_cockpit"], "real database proof cockpit packet field");
assertIncludesAny(bundleText, ["No preview data"], "real database proof rejects preview data");
assertIncludesAny(bundleText, ["Working-data packet export"], "working database command packet export label");
assertIncludesAny(bundleText, ["Working database acceptance"], "working database acceptance summary");
assertIncludesAny(bundleText, ["Live account acceptance checklist"], "live account acceptance checklist");
assertIncludesAny(bundleText, ["live_account_acceptance_checklist"], "live account acceptance packet field");
assertIncludesAny(bundleText, ["Live row source receipt"], "working database live row source receipt");
assertIncludesAny(bundleText, ["live_row_source_receipt"], "working database live row source receipt packet field");
assertIncludesAny(bundleText, ["Live database repair command"], "working database live repair command");
assertIncludesAny(bundleText, ["live_database_repair_command"], "working database live repair command packet field");
assertIncludesAny(bundleText, ["Export repair packet"], "working database repair packet export");
assertIncludesAny(bundleText, ["Live database reload verification"], "working database reload verification");
assertIncludesAny(bundleText, ["live_database_reload_verification"], "working database reload verification packet field");
assertIncludesAny(bundleText, ["seeded_rows_are_reloaded_from_supabase_repositories_seed_ids_reconcile_corporate_rows_are_visible_and_working_data_packet_is_exported"], "working database reload verification acceptance rule");
assertIncludesAny(bundleText, ["signed_in_supabase_repository_rows"], "working database accepted row source");
assertIncludesAny(bundleText, ["missing_live_supabase_row"], "working database missing row source state");
assertIncludesAny(bundleText, ["human_or_live_data_action_required"], "live account acceptance human/live data action state");
assertIncludesAny(bundleText, ["Live database acceptance lanes"], "live database acceptance lanes panel");
assertIncludesAny(bundleText, ["live_database_acceptance_lanes"], "live database acceptance lanes packet field");
assertIncludesAny(bundleText, ["Professional Passport", "Corporate Verify", "Pilot ledger"], "live database acceptance lane labels");
assertIncludesAny(bundleText, ["V1 completion cockpit"], "v1 completion cockpit");
assertIncludesAny(bundleText, ["v1_completion_cockpit"], "v1 completion packet field");
assertIncludesAny(bundleText, ["Export V1 cockpit"], "v1 completion export control");
assertIncludesAny(bundleText, ["Finish the missing live database lane"], "live database lane next-action copy");
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
assertIncludesAny(bundleText, ["Real data acceptance ledger"], "real data acceptance ledger label");
assertIncludesAny(bundleText, ["real_data_acceptance_ledger"], "real data acceptance ledger packet field");
assertIncludesAny(bundleText, ["hosted_auth_account_context_passport_evidence_corporate_access_consent_team_billing_review_and_release_rows_are_loaded_from_supabase_not_preview_data"], "real data acceptance ledger rule");
assertIncludesAny(bundleText, ["Export ledger"], "real data acceptance ledger export");
assertIncludesAny(bundleText, ["Hosted login and database handoff"], "hosted login database handoff label");
assertIncludesAny(bundleText, ["Export login handoff"], "hosted login database handoff export");
assertIncludesAny(bundleText, ["hosted_login_database_handoff"], "hosted login database handoff packet field");
assertIncludesAny(bundleText, ["Hosted version receipt"], "hosted version receipt label");
assertIncludesAny(bundleText, ["hosted_version_receipt"], "hosted version receipt packet field");
assertIncludesAny(bundleText, ["server_head_matches_latest_green_main_commit"], "hosted version receipt acceptance rule");
assertIncludesAny(bundleText, ["git -C /opt/trustgraph rev-parse --short HEAD"], "hosted version receipt server HEAD command");
assertIncludesAny(bundleText, ["VPS saved update verification"], "VPS saved update verification label");
assertIncludesAny(bundleText, ["vps_saved_update_verification"], "VPS saved update verification packet field");
assertIncludesAny(bundleText, ["vps_saved_update_requires_latest_main_server_head_vps_200_and_trustgraph_release_json_commit_match"], "VPS saved update acceptance rule");
assertIncludesAny(bundleText, ["VPS deploy secrets checklist"], "VPS deploy secrets checklist label");
assertIncludesAny(bundleText, ["vps_deploy_secrets_checklist"], "VPS deploy secrets checklist packet field");
assertIncludesAny(bundleText, ["TRUSTGRAPH_VPS_USER"], "VPS SSH user secret requirement");
assertIncludesAny(bundleText, ["Server sync monitor"], "server sync monitor label");
assertIncludesAny(bundleText, ["server_sync_monitor"], "server sync monitor packet field");
assertIncludesAny(bundleText, ["vps_release_stamp_returns_commit_json"], "server sync monitor acceptance rule");
assertIncludesAny(bundleText, ["The host is alive, but the release stamp returned the app shell"], "server sync stale-host guidance");
assertIncludesAny(bundleText, ["Public server sync receipt"], "public server sync receipt");
assertIncludesAny(bundleText, ["Saved build"], "public saved build label");
assertIncludesAny(bundleText, ["Release stamp commit"], "public release stamp commit proof");
assertIncludesAny(bundleText, ["Public server update receipt"], "public saved-build update command receipt");
assertIncludesAny(bundleText, ["public_server_update_receipt"], "public server update receipt packet field");
assertIncludesAny(bundleText, ["tools/update-vps-from-github.sh"], "public VPS update command");
assertIncludesAny(bundleText, ["Public saved build verification"], "public saved build verification");
assertIncludesAny(bundleText, ["public_saved_build_verification"], "public saved build verification packet field");
assertIncludesAny(bundleText, ["GitHub must match the server bundle"], "public saved build verification headline");
assertIncludesAny(
  bundleText,
  ["github_pages_smoke_passes_vps_release_stamp_returns_json_server_head_matches_latest_green_main_and_vfix_route_still_serves_vfix"],
  "public saved build verification acceptance rule"
);
assertIncludesAny(bundleText, ["Operator home"], "signed-in role-aware dashboard label");
assertIncludesAny(bundleText, ["signed_in_landing_actions"], "signed-in landing actions packet field");
assertIncludesAny(bundleText, ["Account and recovery"], "signed-in account recovery action");
assertIncludesAny(bundleText, ["V1 launch flow"], "signed-in V1 launch flow command");
assertIncludesAny(bundleText, ["v1_launch_flow_command"], "signed-in V1 launch flow packet field");
assertIncludesAny(bundleText, ["website_login_professional_passport_corporate_setup_pricing_scoped_database_proof_export_and_vps_save_path_are_visible_from_the_first_console_screen"], "signed-in V1 launch flow acceptance rule");
assertIncludesAny(bundleText, ["Proof & exports", "Proof &amp; exports"], "proof and exports hub label");
assertIncludesAny(bundleText, ["proof_export_hub"], "proof and exports hub packet field");
assertIncludesAny(bundleText, ["V1 proof collection command"], "V1 proof collection command");
assertIncludesAny(bundleText, ["v1_proof_collection_command"], "V1 proof collection packet field");
assertIncludesAny(bundleText, ["Collect proof packets in order before calling the build accepted"], "V1 proof collection guidance");
assertIncludesAny(bundleText, ["Live row completion command"], "live row completion command");
assertIncludesAny(bundleText, ["live_row_completion_command"], "live row completion packet field");
assertIncludesAny(bundleText, ["all_required_signed_in_supabase_row_groups_are_loaded"], "live row completion acceptance rule");
assertIncludesAny(bundleText, ["Real database completion plan"], "real database completion plan label");
assertIncludesAny(bundleText, ["real_database_completion_plan"], "real database completion packet field");
assertIncludesAny(bundleText, ["real_database_completion_receipts"], "real database completion receipt table");
assertIncludesAny(bundleText, ["record_real_database_completion_receipt"], "real database completion receipt RPC");
assertIncludesAny(bundleText, ["Record database receipt"], "real database completion receipt record action");
assertIncludesAny(
  bundleText,
  ["real_database_completion_receipt_requires_hosted_login_registration_corporate_workspace_pricing_user_database_access_evidence_consent_team_review_release_owner_receipts_and_no_preview_data"],
  "real database completion plan acceptance rule"
);
assertIncludesAny(bundleText, ["Live data load receipt"], "live data load receipt");
assertIncludesAny(bundleText, ["live_data_load_receipt"], "live data load receipt packet field");
assertIncludesAny(bundleText, ["hosted_session_row_groups_loaded_seed_ids_reconciled_and_no_preview_or_fixture_rows_are_used_for_acceptance"], "live data load receipt acceptance rule");
assertIncludesAny(bundleText, ["Live data operator strip"], "live data operator strip");
assertIncludesAny(bundleText, ["live_data_operator_strip"], "live data operator strip packet field");
assertIncludesAny(
  bundleText,
  ["live_data_operator_strip_shows_login_seed_reload_reconcile_export_and_rejects_preview_or_fixture_data_before_live_database_panels"],
  "live data operator strip acceptance rule"
);
assertIncludesAny(bundleText, ["Authorized workspace report"], "authorized workspace report export card");
assertIncludesAny(bundleText, ["Portal handoff checklist"], "portal handoff checklist label");
assertIncludesAny(bundleText, ["portal_handoff_checklist"], "portal handoff checklist packet field");
assertIncludesAny(bundleText, ["Registration focus strip"], "registration focus strip");
assertIncludesAny(bundleText, ["First live write"], "registration focus first write");
assertIncludesAny(bundleText, ["Company setup"], "registration focus corporate landing");
assertIncludesAny(bundleText, ["Server save checkpoint"], "public auth server save checkpoint");
assertIncludesAny(bundleText, ["public_auth_server_save_checkpoint"], "public auth server checkpoint packet field");
assertIncludesAny(
  bundleText,
  ["login_registration_form_shows_github_source_pages_smoke_vps_release_stamp_and_vfix_boundary_before_user_or_corporate_signup"],
  "public auth server checkpoint acceptance rule"
);
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
assertIncludesAny(bundleText, ["Corporate Verify first-use wizard"], "Corporate Verify first-use wizard label");
assertIncludesAny(bundleText, ["corporate_verify_first_use_wizard"], "Corporate Verify first-use packet mode");
assertIncludesAny(bundleText, ["Export first-use proof"], "Corporate Verify first-use proof export");
assertIncludesAny(bundleText, ["Corporate Verify live access command"], "Corporate Verify live access command");
assertIncludesAny(bundleText, ["corporate_verify_live_access_command"], "Corporate Verify live access command packet field");
assertIncludesAny(bundleText, ["Export access command"], "Corporate Verify live access command export");
assertIncludesAny(bundleText, ["Corporate portal quick start"], "Corporate portal quick-start surface");
assertIncludesAny(bundleText, ["corporate_portal_quick_start"], "Corporate portal quick-start packet field");
assertIncludesAny(bundleText, ["Corporate cannot browse all users"], "Corporate portal quick-start database boundary");
assertIncludesAny(bundleText, ["corporate_user_knows_next_click_role_state_request_approval_visible_rows_and_export_path"], "Corporate portal quick-start acceptance rule");
assertIncludesAny(bundleText, ["Empty Corporate Verify state command"], "Corporate Verify empty-state command");
assertIncludesAny(bundleText, ["empty_verify_state_command"], "Corporate Verify empty-state packet field");
assertIncludesAny(bundleText, ["Export empty-state proof"], "Corporate Verify empty-state export");
assertIncludesAny(bundleText, ["Review visible user rows"], "Corporate Verify first-use review step");
assertIncludesAny(bundleText, ["tokens_redacted"], "Corporate Verify first-use proof redacts tokens");
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
assertIncludesAny(bundleText, ["Corporate database action cockpit"], "Corporate user database action cockpit");
assertIncludesAny(bundleText, ["corporate_database_action_cockpit"], "Corporate user database action cockpit packet field");
assertIncludesAny(bundleText, ["no open user browsing"], "Corporate user database no-open-browsing boundary");
assertIncludesAny(bundleText, ["Reviewer database readiness board"], "Corporate reviewer database readiness board");
assertIncludesAny(bundleText, ["reviewer_database_readiness_board"], "Corporate reviewer database readiness packet field");
assertIncludesAny(bundleText, ["corporate_reviewer_can_see_request_grant_scoped_rows_review_attestation_visibility_snapshot_and_export_readiness_before_filtering_user_rows"], "Corporate reviewer database readiness acceptance rule");
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
assertIncludesAny(bundleText, ["Classification handling contract"], "corporate classification handling contract panel");
assertIncludesAny(bundleText, ["corporate_classification_handling_contract"], "corporate classification handling contract packet field");
assertIncludesAny(bundleText, ["status_visibility_can_differ_from_evidence_visibility"], "corporate classification status/evidence boundary");
assertIncludesAny(bundleText, ["corporate_verify_rows_show_classification_access_consent_retention_export_deletion_and_audit_boundaries"], "corporate classification acceptance rule");
assertIncludesAny(bundleText, ["No raw files"], "corporate classification raw file exclusion");
assertIncludesAny(bundleText, ["Corporate scope review command"], "corporate scope review command panel");
assertIncludesAny(bundleText, ["corporate_scope_review_command"], "corporate scope review packet field");
assertIncludesAny(bundleText, ["every visible user row must be live, approved, scoped, gap-reviewed, and attested"], "corporate scope review boundary copy");
assertIncludesAny(bundleText, ["Corporate access next action"], "corporate access next action command");
assertIncludesAny(bundleText, ["corporate_access_next_action_command"], "corporate access next action packet field");
assertIncludesAny(bundleText, ["corporate_access_next_action_is_complete_only_when_live_rbac_context"], "corporate access next action acceptance rule");
assertIncludesAny(bundleText, ["Corporate user database export receipt"], "Corporate user database export receipt");
assertIncludesAny(bundleText, ["corporate_user_database_export_receipt"], "Corporate user database export receipt packet field");
assertIncludesAny(bundleText, ["corporate_user_database_export_receipt_requires_live_rbac_rows_filters_scope_review_attestation_and_no_preview_data"], "Corporate user database export receipt acceptance rule");
assertIncludesAny(bundleText, ["corporate_database_access_receipt_requires_active_corporate_rbac_approved_access_grants_shared_rows_review_attestation_export_and_no_preview_data"], "corporate database access persisted receipt acceptance rule");
assertIncludesAny(bundleText, ["Corporate review handoff receipt"], "corporate review handoff receipt");
assertIncludesAny(bundleText, ["corporate_review_handoff_receipt"], "corporate review handoff packet field");
assertIncludesAny(bundleText, ["corporate_review_handoff_requires_request_approved_grant_scoped_rows_gap_resolution_attestation_and_export"], "corporate review handoff acceptance rule");
assertIncludesAny(bundleText, ["Corporate database access decision board"], "corporate database access decision board");
assertIncludesAny(bundleText, ["corporate_database_access_decision_board"], "corporate database access decision packet field");
assertIncludesAny(
  bundleText,
  ["corporate_database_access_decision_board_confirms_request_path_approved_rows_attestation_and_export_boundary"],
  "corporate database access decision acceptance rule"
);
assertIncludesAny(bundleText, ["Corporate database path"], "corporate database path strip");
assertIncludesAny(bundleText, ["corporate_database_path_strip"], "corporate database path strip packet field");
assertIncludesAny(bundleText, ["corporate_database_path_strip_shows_request_by_email_approval_scoped_rows_review_snapshot_export_and_no_open_user_browse_before_controls"], "corporate database path strip acceptance rule");
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
assertIncludesAny(bundleText, ["Missing record lifecycle"], "missing record lifecycle receipt");
assertIncludesAny(bundleText, ["missing_record_lifecycle_receipt"], "missing record lifecycle packet field");
assertIncludesAny(
  bundleText,
  ["corporate_gap_requests_are_created_from_live_verify_context_professional_owner_can_start_or_fulfill_and_gap_packet_exports_current_status"],
  "missing record lifecycle acceptance rule"
);
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
assertIncludesAny(bundleText, ["Passport missing-record handoff"], "passport missing record handoff receipt");
assertIncludesAny(bundleText, ["passport_missing_record_handoff_receipt"], "passport missing record handoff packet field");
assertIncludesAny(
  bundleText,
  ["professional_can_see_corporate_gap_requests_start_work_mark_fulfilled_or_declined_and_return_status_to_corporate_verify"],
  "passport missing record handoff acceptance rule"
);
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
assertIncludesAny(bundleText, ["Regulated employment boundary"], "regulated employment legal boundary panel");
assertIncludesAny(bundleText, ["regulated_employment_boundary"], "regulated employment boundary packet mode");
assertIncludesAny(bundleText, ["adverse_action_workflows_enabled"], "regulated employment adverse action disabled field");
assertIncludesAny(bundleText, ["Export legal boundary"], "regulated employment boundary export");
assertIncludesAny(
  bundleText,
  ["regulated_employment_boundary_requires_legal_review_authorization_disclosure_dispute_retention_and_no_automated_adverse_action"],
  "regulated employment boundary acceptance rule"
);
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
assertIncludesAny(bundleText, ["Issuer provenance receipt"], "issuer provenance receipt panel");
assertIncludesAny(bundleText, ["issuer_provenance_receipt"], "issuer provenance receipt packet mode");
assertIncludesAny(bundleText, ["Export provenance receipt"], "issuer provenance receipt export");
assertIncludesAny(bundleText, ["universal_trust_score_enabled"], "issuer provenance avoids universal trust score");
assertIncludesAny(
  bundleText,
  ["issuer_credentials_show_owner_source_issuer_organization_status_expiration_revocation_and_audit_workflow_before_corporate_review"],
  "issuer provenance acceptance rule"
);
assertIncludesAny(bundleText, ["revoke_issuer_credential"], "issuer credential revoke RPC evidence");
assertIncludesAny(bundleText, ["update_issuer_credential_expiry"], "issuer credential update RPC evidence");
assertIncludesAny(bundleText, ["Update expiry"], "issuer credential expiry update control");
assertIncludesAny(bundleText, ["Selected path"], "registration selected path proof");
assertIncludesAny(bundleText, ["selected_registration_path"], "registration path packet field");
assertIncludesAny(bundleText, ["Selected portal command"], "registration selected portal command strip");
assertIncludesAny(bundleText, ["selected_portal_command"], "registration selected portal command packet field");
assertIncludesAny(bundleText, ["Create company admin account"], "corporate registration command headline");
assertIncludesAny(bundleText, ["Portal submit receipt"], "portal submit receipt");
assertIncludesAny(bundleText, ["portal_submit_receipt"], "portal submit receipt packet field");
assertIncludesAny(bundleText, ["Corporate visibility is accepted only after RBAC loads approved shared user rows"], "corporate portal submit acceptance boundary");
assertIncludesAny(bundleText, ["protected_vfix_host"], "auth packet VFIX isolation field");
assertIncludesAny(bundleText, ["trustgraph_vps_target"], "auth packet TrustGraph VPS field");
assertIncludesAny(bundleText, ["github_pages_redirect"], "auth packet GitHub Pages redirect field");
assertIncludesAny(bundleText, ["Allowed redirect URLs must include GitHub Pages and the VPS TrustGraph URL"], "hosted auth redirect guidance");
assertIncludesAny(bundleText, ["Reset password"], "public portal password recovery control");
assertIncludesAny(bundleText, ["Auth recovery decision path"], "public auth recovery decision panel");
assertIncludesAny(bundleText, ["auth_recovery_decision_path"], "registration auth recovery packet field");
assertIncludesAny(bundleText, ["New account verification"], "auth recovery verification guidance");
assertIncludesAny(bundleText, ["Hosted auth redirect verification receipt"], "hosted auth redirect verification receipt");
assertIncludesAny(bundleText, ["hosted_auth_redirect_verification_receipt"], "hosted auth redirect verification packet field");
assertIncludesAny(bundleText, ["Email verification delivery receipt"], "email verification delivery receipt");
assertIncludesAny(bundleText, ["email_verification_delivery_receipt"], "email verification delivery packet field");
assertIncludesAny(bundleText, ["Use one hosted email path before asking Supabase for another link"], "email verification delivery guidance");
assertIncludesAny(
  bundleText,
  ["verification_and_recovery_emails_use_hosted_redirect_rate_limit_is_visible_localhost_links_can_be_repaired_and_after_verification_user_returns_to_the_selected_portal"],
  "email verification delivery acceptance rule"
);
assertIncludesAny(
  bundleText,
  ["supabase_site_url_and_redirect_urls_include_github_pages_and_trustgraph_vps_and_email_links_return_to_hosted_app_not_localhost"],
  "hosted auth redirect acceptance contract"
);
assertIncludesAny(bundleText, ["Open hosted TrustGraph before requesting another verification email"], "localhost auth redirect next action");
assertIncludesAny(bundleText, ["Migrations through 043"], "current database migration coverage copy");
assertIncludesAny(bundleText, ["042 RLS repair expected"], "organization RLS recursion repair marker");
assertIncludesAny(bundleText, ["migration 043 account context RPC"], "account context RPC migration marker");
assertIncludesAny(bundleText, ["RLS repair"], "database strip RLS repair proof");
assertIncludesAny(bundleText, ["Pilot launch contacts"], "pilot launch contact register");
assertIncludesAny(bundleText, ["Record pilot contact"], "pilot launch contact intake");
assertIncludesAny(bundleText, ["Pilot owner readiness"], "pilot owner readiness receipt");
assertIncludesAny(bundleText, ["pilot_owner_readiness_receipt"], "pilot owner readiness packet field");
assertIncludesAny(
  bundleText,
  ["pilot_owner_readiness_receipt_requires_named_pilot_customer_onboarding_support_incident_owner_live_contacts_and_no_production_traffic_without_human_signoff"],
  "pilot owner readiness acceptance rule"
);
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
assertIncludesAny(bundleText, ["Pilot pricing estimator"], "public pilot pricing estimator");
assertIncludesAny(bundleText, ["Estimate Corporate Verify seats before signup"], "public pricing estimator headline");
assertIncludesAny(bundleText, ["public_pricing_pilot_estimator"], "public pricing estimator packet mode");
assertIncludesAny(bundleText, ["stripe_checkout_disabled_until_human_gate"], "public pricing estimator Stripe gate field");
assertIncludesAny(bundleText, ["Export pricing estimate"], "public pricing estimate export control");
assertIncludesAny(bundleText, ["Supabase ledger"], "public pricing live ledger decision");
assertIncludesAny(bundleText, ["Stripe checkout"], "public pricing human-gated Stripe decision");
assertIncludesAny(bundleText, ["pricing_decision_strip"], "registration packet pricing decision field");
assertIncludesAny(bundleText, ["Portal database access contract"], "public portal database access contract label");
assertIncludesAny(bundleText, ["public_portal_database_access_contract"], "public portal database access contract packet field");
assertIncludesAny(bundleText, ["professional_registration_corporate_registration_pricing_ledger_and_scoped_user_database_access_are_visible_before_signup"], "public portal database access contract acceptance rule");
assertIncludesAny(bundleText, ["Public buyer launch path"], "public buyer launch path");
assertIncludesAny(bundleText, ["public_buyer_launch_path"], "public buyer launch path packet field");
assertIncludesAny(bundleText, ["public_buyer_can_follow_account_choice_hosted_verification_portal_landing_pricing_scoped_database_access_proof_export_and_server_save_before_signup"], "public buyer launch path acceptance rule");
assertIncludesAny(bundleText, ["Registration database launch order"], "registration database launch order");
assertIncludesAny(bundleText, ["registration_database_launch_order"], "registration database launch order packet field");
assertIncludesAny(bundleText, ["registration_intents"], "registration intent table marker");
assertIncludesAny(bundleText, ["record_registration_intent"], "registration intent RPC marker");
assertIncludesAny(bundleText, ["mark_registration_intent_passport_initialized"], "registration intent professional completion RPC marker");
assertIncludesAny(bundleText, ["Apply migration 044 to record registration intent rows"], "registration intent migration guidance");
assertIncludesAny(bundleText, ["registration_shows_account_choice_price_first_database_write_portal_landing_required_proof_and_server_save_before_submit"], "registration database launch order acceptance rule");
assertIncludesAny(bundleText, ["Export registration order"], "registration database launch order export");
assertIncludesAny(bundleText, ["Pre-submit checklist"], "registration pre-submit checklist");
assertIncludesAny(bundleText, ["registration_pre_submit_checklist"], "registration pre-submit checklist packet field");
assertIncludesAny(bundleText, ["registration_form_shows_required_fields_first_database_write_pricing_next_dashboard_and_preview_rejection_before_submit"], "registration pre-submit checklist acceptance rule");
assertIncludesAny(bundleText, ["Export checklist"], "registration pre-submit checklist export");
assertIncludesAny(bundleText, ["Public portal launch checklist"], "public portal launch checklist");
assertIncludesAny(bundleText, ["public_portal_launch_checklist"], "public portal launch checklist packet field");
assertIncludesAny(bundleText, ["public_website_login_registration_pricing_corporate_database_path_hosted_auth_and_server_release_are_all_clear_before_v1_launch"], "public portal launch checklist acceptance rule");
assertIncludesAny(bundleText, ["Billing operator path"], "billing operator path label");
assertIncludesAny(bundleText, ["Activate pilot ledger"], "billing operator pilot ledger step");
assertIncludesAny(bundleText, ["billing_operator_path"], "billing operator path packet field");
assertIncludesAny(bundleText, ["Billing ledger acceptance"], "billing ledger acceptance proof");
assertIncludesAny(bundleText, ["billing_ledger_evidence"], "billing ledger acceptance packet field");
assertIncludesAny(bundleText, ["live_subscription_ledger"], "live billing ledger mode");
assertIncludesAny(bundleText, ["Billing activation receipt"], "billing activation receipt label");
assertIncludesAny(bundleText, ["billing_activation_receipt"], "billing activation receipt packet field");
assertIncludesAny(bundleText, ["billing_activation_receipt_requires_live_subscription_ledger_selected_seats_pricing_packet_and_stripe_human_gate"], "billing activation receipt acceptance rule");
assertIncludesAny(bundleText, ["Pricing launch command"], "billing pricing launch command surface");
assertIncludesAny(bundleText, ["Use live pricing and ledger rows, keep payments gated"], "billing pricing launch command headline");
assertIncludesAny(bundleText, ["Real payment collection waits for the Stripe human gate"], "billing Stripe gate guidance");
assertIncludesAny(bundleText, ["Stripe checkout decision receipt"], "billing Stripe checkout decision receipt");
assertIncludesAny(bundleText, ["stripe_checkout_decision_receipt"], "billing Stripe checkout decision receipt packet field");
assertIncludesAny(bundleText, ["Export checkout decision"], "billing Stripe checkout decision export");
assertIncludesAny(bundleText, ["live_supabase_subscription_ledger"], "billing Stripe decision ledger mode");
assertIncludesAny(bundleText, ["Payment launch boundary"], "billing payment launch boundary");
assertIncludesAny(bundleText, ["Billing architecture decision packet"], "billing architecture decision packet label");
assertIncludesAny(bundleText, ["Export payment decision"], "billing architecture decision export control");
assertIncludesAny(bundleText, ["billing_architecture_decision"], "billing architecture packet mode");
assertIncludesAny(bundleText, ["supabase_subscription_ledger"], "billing architecture current system");
assertIncludesAny(bundleText, ["intentionally_disabled_until_human_gate"], "billing architecture disabled payment flows");
assertIncludesAny(bundleText, ["billing_architecture_decision_receipts"], "billing architecture decision receipt table");
assertIncludesAny(bundleText, ["record_billing_architecture_decision_receipt"], "billing architecture decision receipt RPC");
assertIncludesAny(bundleText, ["Billing decision database receipt"], "billing architecture decision database receipt label");
assertIncludesAny(bundleText, ["Record payment decision"], "billing architecture decision record action");
assertIncludesAny(bundleText, ["pricing_quote_receipts"], "pricing quote receipt table");
assertIncludesAny(bundleText, ["record_pricing_quote_receipt"], "pricing quote receipt RPC");
assertIncludesAny(bundleText, ["Pricing quote database receipt"], "pricing quote database receipt label");
assertIncludesAny(bundleText, ["Record pricing quote"], "pricing quote record action");
assertIncludesAny(bundleText, ["Pricing decision board"], "pricing decision board label");
assertIncludesAny(bundleText, ["pricing_decision_board"], "pricing decision board packet field");
assertIncludesAny(bundleText, ["pilot_ledger_now_stripe_checkout_later_database_receipt_required_before_paid_launch"], "pricing decision board acceptance rule");
assertIncludesAny(bundleText, ["Export pricing decision"], "pricing decision board export");
assertIncludesAny(
  bundleText,
  ["pricing_quote_receipt_requires_live_pricing_catalog_selected_seats_projected_total_corporate_admin_rbac_and_stripe_checkout_disabled"],
  "pricing quote receipt acceptance rule"
);
assertIncludesAny(
  bundleText,
  ["billing_architecture_decision_receipt_requires_live_pricing_or_subscription_ledger_checkout_customer_portal_invoice_tax_refund_dunning_and_payment_webhooks_disabled_until_human_gate"],
  "billing architecture decision receipt acceptance rule"
);
assertIncludesAny(bundleText, ["notes captured"], "pilot acceptance note capture");
assertIncludesAny(bundleText, ["Export runbook"], "pilot acceptance markdown runbook export control");

console.log(`TrustGraph live smoke passed: ${response.status} ${targetUrl} (${assetUrls.length} assets checked, repo artifacts, portal, recovery, and data-mode copy verified)`);
