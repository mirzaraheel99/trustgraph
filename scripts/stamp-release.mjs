import fs from "node:fs";
import path from "node:path";

const targetPath = process.argv[2] || "out/trustgraph-release.json";
const absoluteTarget = path.resolve(targetPath);
const requiredContract =
  "trustgraph_release_stamp_static_asset_then_vps_updater_overwrites_with_current_git_commit_and_marker";
const requiredSource = "https://github.com/mirzaraheel99/trustgraph";

if (!fs.existsSync(absoluteTarget)) {
  throw new Error(`TrustGraph release stamp target does not exist: ${targetPath}`);
}

const stamp = JSON.parse(fs.readFileSync(absoluteTarget, "utf8"));
const commit =
  process.env.TRUSTGRAPH_RELEASE_COMMIT ||
  process.env.GITHUB_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  "";
const updatedAt =
  process.env.TRUSTGRAPH_RELEASE_UPDATED_AT ||
  process.env.GITHUB_EVENT_HEAD_COMMIT_TIMESTAMP ||
  new Date().toISOString();

if (!commit || commit === "build-time-placeholder") {
  throw new Error("TrustGraph release stamp needs a real commit SHA before deployment.");
}

if (stamp.app !== "TrustGraph") {
  throw new Error("TrustGraph release stamp has the wrong app name.");
}

if (stamp.source !== requiredSource) {
  throw new Error("TrustGraph release stamp has the wrong GitHub source.");
}

if (stamp.server_save_contract !== requiredContract) {
  throw new Error("TrustGraph release stamp is missing the server-save contract.");
}

const nextStamp = {
  ...stamp,
  commit,
  commit_short: commit.slice(0, 7),
  updated_at: updatedAt
};

fs.writeFileSync(absoluteTarget, `${JSON.stringify(nextStamp, null, 2)}\n`);
console.log(`Stamped ${targetPath} with ${nextStamp.commit_short}.`);
