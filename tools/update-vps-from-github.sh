#!/usr/bin/env bash
set -euo pipefail

TRUSTGRAPH_REMOTE_PATH="${TRUSTGRAPH_REMOTE_PATH:-/opt/trustgraph}"
TRUSTGRAPH_HOST="${TRUSTGRAPH_HOST:-trustgraph.5-75-224-110.sslip.io}"
PUBLIC_URL="${PUBLIC_URL:-https://trustgraph.5-75-224-110.sslip.io/}"
EXPECTED_ORIGIN="${EXPECTED_ORIGIN:-https://github.com/mirzaraheel99/trustgraph.git}"
EXPECTED_BUNDLE_MARKER="${EXPECTED_BUNDLE_MARKER:-premium_workspace_responsive_guard}"
RELEASE_STAMP_CONTRACT="trustgraph_release_stamp_static_asset_then_vps_updater_overwrites_with_current_git_commit_and_marker"
PROTECTED_VFIX_ROUTE="https://5-75-224-110.sslip.io/CRM-client-demo/login"

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
  "server_save_contract": "$RELEASE_STAMP_CONTRACT",
  "public_url": "$PUBLIC_URL",
  "protected_vfix_host": "https://5-75-224-110.sslip.io"
}
JSON
docker exec "$web_container" sh -c "test -s /srv/trustgraph/trustgraph-release.json && grep -q '\"commit_short\": \"$commit_short\"' /srv/trustgraph/trustgraph-release.json" \
  || fail "release stamp was not written inside the TrustGraph web container"
docker exec "$web_container" sh -c "grep -q '\"server_save_contract\": \"$RELEASE_STAMP_CONTRACT\"' /srv/trustgraph/trustgraph-release.json" \
  || fail "release stamp was written without the required server-save contract"
docker exec "$web_container" sh -c "wget -qO- http://127.0.0.1/trustgraph-release.json | grep -q '\"commit_short\": \"$commit_short\"'" \
  || fail "local TrustGraph container route did not serve release stamp JSON; check Caddy /trustgraph-release.json before nginx proxy debugging"

fetch_public_bundle "$PUBLIC_URL" /tmp/trustgraph-vps-smoke.html
grep -q "TrustGraph" /tmp/trustgraph-vps-smoke.html || fail "public smoke did not contain TrustGraph"
grep -q "$EXPECTED_BUNDLE_MARKER" /tmp/trustgraph-vps-smoke.html || fail "public smoke assets did not contain latest bundle marker: $EXPECTED_BUNDLE_MARKER"
release_headers="$(mktemp)"
curl --fail --location --silent --show-error --dump-header "$release_headers" "${PUBLIC_URL%/}/trustgraph-release.json" >/tmp/trustgraph-vps-release.json
grep -qi '^content-type: application/json' "$release_headers" \
  || fail "public release stamp did not return application/json; check the nginx TrustGraph host proxy and Caddy /trustgraph-release.json route"
if grep -qi '<!DOCTYPE html\|<html' /tmp/trustgraph-vps-release.json; then
  docker exec "$web_container" sh -c "wget -qO- http://127.0.0.1/trustgraph-release.json" >/tmp/trustgraph-local-release.json || true
  if grep -q "$commit_short" /tmp/trustgraph-local-release.json; then
    fail "public release stamp served the app shell instead of trustgraph-release.json, but the local container route is correct; reload the shared nginx trustgraph host proxy to 127.0.0.1:4180 and keep VFIX separate"
  fi
  fail "public release stamp served the app shell instead of trustgraph-release.json and the local container route was not proven; check Caddy /trustgraph-release.json before nginx proxy debugging"
fi
grep -q "$commit_short" /tmp/trustgraph-vps-release.json || fail "release stamp does not match current commit"
grep -q "$EXPECTED_BUNDLE_MARKER" /tmp/trustgraph-vps-release.json || fail "release stamp does not contain expected bundle marker: $EXPECTED_BUNDLE_MARKER"
grep -q "$RELEASE_STAMP_CONTRACT" /tmp/trustgraph-vps-release.json || fail "release stamp does not contain the server-save contract"
rm -f "$release_headers"

vfix_status="$(curl --location --silent --show-error --output /tmp/trustgraph-vfix-smoke.html --write-out "%{http_code}" "$PROTECTED_VFIX_ROUTE" || true)"
case "$vfix_status" in
  200|301|302|401|403)
    ;;
  *)
    fail "protected VFIX route did not remain reachable after TrustGraph update: $PROTECTED_VFIX_ROUTE returned $vfix_status"
    ;;
esac

echo "TrustGraph VPS updated from GitHub."
echo "Commit: $commit_short"
echo "Bundle marker: $EXPECTED_BUNDLE_MARKER"
echo "Release stamp: ${PUBLIC_URL%/}/trustgraph-release.json"
echo "VFIX route checked: $PROTECTED_VFIX_ROUTE returned $vfix_status"
echo "Open: $PUBLIC_URL"
