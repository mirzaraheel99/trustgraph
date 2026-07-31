#!/usr/bin/env bash
set -euo pipefail

TRUSTGRAPH_REMOTE_PATH="${TRUSTGRAPH_REMOTE_PATH:-/opt/trustgraph}"
TRUSTGRAPH_HOST="${TRUSTGRAPH_HOST:-trustgraph.5-75-224-110.sslip.io}"
PUBLIC_URL="${PUBLIC_URL:-https://trustgraph.5-75-224-110.sslip.io/}"
EXPECTED_ORIGIN="${EXPECTED_ORIGIN:-https://github.com/mirzaraheel99/trustgraph.git}"

fail() {
  echo "TrustGraph VPS update failed: $*" >&2
  exit 1
}

case "$TRUSTGRAPH_HOST" in
  5-75-224-110.sslip.io|5.75.224.110|*/CRM-client-demo*)
    fail "refusing to deploy over protected VFIX host or CRM-client-demo route: $TRUSTGRAPH_HOST"
    ;;
esac

[[ "$TRUSTGRAPH_REMOTE_PATH" == "/opt/trustgraph" ]] || fail "remote path must be /opt/trustgraph"
[[ -d "$TRUSTGRAPH_REMOTE_PATH/.git" ]] || fail "missing TrustGraph Git checkout at $TRUSTGRAPH_REMOTE_PATH"

cd "$TRUSTGRAPH_REMOTE_PATH"
[[ "$(pwd)" == "/opt/trustgraph" ]] || fail "unexpected working directory: $(pwd)"

origin="$(git remote get-url origin)"
[[ "$origin" == "$EXPECTED_ORIGIN" || "$origin" == "git@github.com:mirzaraheel99/trustgraph.git" ]] || fail "unexpected Git origin: $origin"

git fetch origin main
git checkout main
git pull --ff-only origin main

export TRUSTGRAPH_HOST
bash tools/preflight-vps.sh

docker compose --env-file .env.server -f docker-compose.server.yml up -d --build --remove-orphans
docker compose --env-file .env.server -f docker-compose.server.yml ps

curl --fail --location --silent --show-error "$PUBLIC_URL" >/tmp/trustgraph-vps-smoke.html
grep -q "TrustGraph" /tmp/trustgraph-vps-smoke.html || fail "public smoke did not contain TrustGraph"

echo "TrustGraph VPS updated from GitHub."
echo "Commit: $(git rev-parse --short HEAD)"
echo "Open: $PUBLIC_URL"
