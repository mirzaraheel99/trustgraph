#!/usr/bin/env bash
set -euo pipefail

TRUSTGRAPH_REMOTE_PATH="${TRUSTGRAPH_REMOTE_PATH:-/opt/trustgraph}"
TRUSTGRAPH_HOST="${TRUSTGRAPH_HOST:-trustgraph.5-75-224-110.sslip.io}"
PUBLIC_URL="${PUBLIC_URL:-https://trustgraph.5-75-224-110.sslip.io/}"
EXPECTED_ORIGIN="${EXPECTED_ORIGIN:-https://github.com/mirzaraheel99/trustgraph.git}"
EXPECTED_BUNDLE_MARKER="${EXPECTED_BUNDLE_MARKER:-registration_handoff_command}"

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

fetch_public_bundle() {
  local page_url="$1"
  local output_file="$2"
  local asset_list_file
  local asset_url

  asset_list_file="$(mktemp)"
  curl --fail --location --silent --show-error "$page_url" >"$output_file"
  grep -Eo '(src|href)="[^"]*_next/static/[^"]+"' "$output_file" \
    | sed -E 's/^(src|href)="([^"]+)"/\2/' \
    | sort -u >"$asset_list_file" || true

  while IFS= read -r asset_url; do
    [[ -n "$asset_url" ]] || continue
    case "$asset_url" in
      http://*|https://*)
        curl --fail --location --silent --show-error "$asset_url" >>"$output_file"
        ;;
      /*)
        curl --fail --location --silent --show-error "${page_url%/}$asset_url" >>"$output_file"
        ;;
      *)
        curl --fail --location --silent --show-error "${page_url%/}/$asset_url" >>"$output_file"
        ;;
    esac
  done <"$asset_list_file"

  rm -f "$asset_list_file"
}

git fetch origin main
git checkout main
git pull --ff-only origin main
commit_sha="$(git rev-parse HEAD)"
commit_short="$(git rev-parse --short HEAD)"
updated_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

export TRUSTGRAPH_HOST
bash tools/preflight-vps.sh

docker compose --env-file .env.server -f docker-compose.server.yml up -d --build --remove-orphans
docker compose --env-file .env.server -f docker-compose.server.yml ps

web_container="$(docker compose --env-file .env.server -f docker-compose.server.yml ps -q trustgraph-web)"
[[ -n "$web_container" ]] || fail "could not find running trustgraph-web container"
docker exec "$web_container" sh -c "cat > /srv/trustgraph/trustgraph-release.json" <<JSON
{
  "app": "TrustGraph",
  "source": "https://github.com/mirzaraheel99/trustgraph",
  "branch": "main",
  "commit": "$commit_sha",
  "commit_short": "$commit_short",
  "updated_at": "$updated_at",
  "bundle_marker": "$EXPECTED_BUNDLE_MARKER",
  "public_url": "$PUBLIC_URL",
  "protected_vfix_host": "https://5-75-224-110.sslip.io"
}
JSON

fetch_public_bundle "$PUBLIC_URL" /tmp/trustgraph-vps-smoke.html
grep -q "TrustGraph" /tmp/trustgraph-vps-smoke.html || fail "public smoke did not contain TrustGraph"
grep -q "$EXPECTED_BUNDLE_MARKER" /tmp/trustgraph-vps-smoke.html || fail "public smoke assets did not contain latest bundle marker: $EXPECTED_BUNDLE_MARKER"
curl --fail --location --silent --show-error "${PUBLIC_URL%/}/trustgraph-release.json" >/tmp/trustgraph-vps-release.json
grep -q "$commit_short" /tmp/trustgraph-vps-release.json || fail "release stamp does not match current commit"

echo "TrustGraph VPS updated from GitHub."
echo "Commit: $commit_short"
echo "Bundle marker: $EXPECTED_BUNDLE_MARKER"
echo "Release stamp: ${PUBLIC_URL%/}/trustgraph-release.json"
echo "Open: $PUBLIC_URL"
