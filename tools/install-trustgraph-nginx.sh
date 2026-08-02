#!/usr/bin/env bash
set -euo pipefail

TRUSTGRAPH_NGINX_SOURCE="${TRUSTGRAPH_NGINX_SOURCE:-tools/trustgraph-nginx.conf}"
TRUSTGRAPH_NGINX_TARGET="${TRUSTGRAPH_NGINX_TARGET:-/opt/fixflow-nginx/conf.d/trustgraph.conf}"
FIXFLOW_NGINX_CONTAINER="${FIXFLOW_NGINX_CONTAINER:-fixflow-nginx}"
TRUSTGRAPH_HOST="${TRUSTGRAPH_HOST:-trustgraph.5-75-224-110.sslip.io}"
TRUSTGRAPH_EDGE_UPSTREAM="${TRUSTGRAPH_EDGE_UPSTREAM:-172.17.0.1:4180}"
TRUSTGRAPH_LOCAL_RELEASE_URL="${TRUSTGRAPH_LOCAL_RELEASE_URL:-http://$TRUSTGRAPH_EDGE_UPSTREAM/trustgraph-release.json}"
PROTECTED_VFIX_HOST="${PROTECTED_VFIX_HOST:-5-75-224-110.sslip.io}"
PROTECTED_VFIX_PATH="${PROTECTED_VFIX_PATH:-/CRM-client-demo/login}"

fail() {
  echo "TrustGraph nginx repair failed: $*" >&2
  exit 1
}

[[ "$TRUSTGRAPH_HOST" == "trustgraph.5-75-224-110.sslip.io" ]] \
  || fail "refusing unexpected TrustGraph host: $TRUSTGRAPH_HOST"
[[ "$PROTECTED_VFIX_HOST" == "5-75-224-110.sslip.io" ]] \
  || fail "protected VFIX host changed unexpectedly: $PROTECTED_VFIX_HOST"
[[ "$TRUSTGRAPH_NGINX_TARGET" == "/opt/fixflow-nginx/conf.d/trustgraph.conf" ]] \
  || fail "target must be /opt/fixflow-nginx/conf.d/trustgraph.conf"
[[ -f "$TRUSTGRAPH_NGINX_SOURCE" ]] || fail "missing nginx source file: $TRUSTGRAPH_NGINX_SOURCE"

grep -q "server_name $TRUSTGRAPH_HOST;" "$TRUSTGRAPH_NGINX_SOURCE" \
  || fail "nginx source does not target the TrustGraph subdomain"
grep -q "location = /trustgraph-release.json" "$TRUSTGRAPH_NGINX_SOURCE" \
  || fail "nginx source must include the exact release JSON route"
grep -q "proxy_pass http://$TRUSTGRAPH_EDGE_UPSTREAM/trustgraph-release.json;" "$TRUSTGRAPH_NGINX_SOURCE" \
  || fail "nginx source must proxy release JSON to the TrustGraph bridge upstream"
if grep -q "$PROTECTED_VFIX_HOST" "$TRUSTGRAPH_NGINX_SOURCE" || grep -q "CRM-client-demo" "$TRUSTGRAPH_NGINX_SOURCE"; then
  fail "nginx source must not include the protected VFIX host or CRM-client-demo route"
fi

if [[ -f .env.server ]]; then
  grep -q '^TRUSTGRAPH_HTTP_BIND=172\.17\.0\.1$' .env.server \
    || fail ".env.server must set TRUSTGRAPH_HTTP_BIND=172.17.0.1 so the shared nginx container can reach TrustGraph without using public ports"
  grep -q '^TRUSTGRAPH_HTTP_PORT=4180$' .env.server \
    || fail ".env.server must set TRUSTGRAPH_HTTP_PORT=4180 for the shared nginx TrustGraph upstream"
fi

curl --fail --location --silent --show-error "$TRUSTGRAPH_LOCAL_RELEASE_URL" >/tmp/trustgraph-local-release-check.json \
  || fail "local TrustGraph release JSON is not reachable at $TRUSTGRAPH_LOCAL_RELEASE_URL; run tools/update-vps-from-github.sh before nginx repair"
if grep -qi '<!DOCTYPE html\|<html' /tmp/trustgraph-local-release-check.json; then
  fail "local TrustGraph release JSON still serves the app shell; repair the TrustGraph web container/Caddy before changing shared nginx"
fi
grep -q "premium_workspace_responsive_guard" /tmp/trustgraph-local-release-check.json \
  || fail "local TrustGraph release JSON does not show the expected bundle marker"

install -D -m 0644 "$TRUSTGRAPH_NGINX_SOURCE" "$TRUSTGRAPH_NGINX_TARGET"
docker exec "$FIXFLOW_NGINX_CONTAINER" sh -c "test -f /etc/nginx/conf.d/trustgraph.conf && grep -q 'server_name $TRUSTGRAPH_HOST;' /etc/nginx/conf.d/trustgraph.conf" \
  || fail "shared nginx container does not see the installed TrustGraph server block"
docker exec "$FIXFLOW_NGINX_CONTAINER" sh -c "grep -q 'location = /trustgraph-release.json' /etc/nginx/conf.d/trustgraph.conf && grep -q 'proxy_pass http://$TRUSTGRAPH_EDGE_UPSTREAM/trustgraph-release.json;' /etc/nginx/conf.d/trustgraph.conf" \
  || fail "shared nginx container does not see the exact TrustGraph release JSON proxy route"
docker exec "$FIXFLOW_NGINX_CONTAINER" nginx -t
docker exec "$FIXFLOW_NGINX_CONTAINER" nginx -s reload

release_headers="$(mktemp)"
curl --fail --location --silent --show-error --dump-header "$release_headers" "http://$TRUSTGRAPH_HOST/trustgraph-release.json" >/tmp/trustgraph-nginx-release-check.json \
  || fail "TrustGraph release JSON route is not reachable over the shared nginx edge"
grep -qi '^content-type: application/json' "$release_headers" \
  || fail "TrustGraph release JSON route did not return application/json; shared nginx is still routing the release stamp incorrectly"
if grep -qi '<!DOCTYPE html\|<html' /tmp/trustgraph-nginx-release-check.json; then
  fail "TrustGraph release JSON route still serves the app shell even though local Caddy JSON works; confirm /opt/fixflow-nginx/conf.d/trustgraph.conf is mounted into fixflow-nginx and no earlier server block captures $TRUSTGRAPH_HOST"
fi
grep -q "premium_workspace_responsive_guard" /tmp/trustgraph-nginx-release-check.json \
  || fail "TrustGraph release JSON route does not show the expected bundle marker"
rm -f "$release_headers"

curl --fail --location --silent --show-error --output /dev/null "https://$PROTECTED_VFIX_HOST$PROTECTED_VFIX_PATH" \
  || fail "protected VFIX route did not remain reachable after nginx reload"

echo "TrustGraph nginx repair installed."
echo "TrustGraph release stamp: https://$TRUSTGRAPH_HOST/trustgraph-release.json"
echo "Protected VFIX route: https://$PROTECTED_VFIX_HOST$PROTECTED_VFIX_PATH"
