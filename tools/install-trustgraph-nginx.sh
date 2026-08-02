#!/usr/bin/env bash
set -euo pipefail

TRUSTGRAPH_NGINX_SOURCE="${TRUSTGRAPH_NGINX_SOURCE:-tools/trustgraph-nginx.conf}"
TRUSTGRAPH_NGINX_TARGET="${TRUSTGRAPH_NGINX_TARGET:-/opt/fixflow-nginx/conf.d/trustgraph.conf}"
FIXFLOW_NGINX_CONTAINER="${FIXFLOW_NGINX_CONTAINER:-fixflow-nginx}"
TRUSTGRAPH_HOST="${TRUSTGRAPH_HOST:-trustgraph.5-75-224-110.sslip.io}"
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
grep -q "proxy_pass http://127.0.0.1:4180/trustgraph-release.json;" "$TRUSTGRAPH_NGINX_SOURCE" \
  || fail "nginx source must proxy release JSON to the TrustGraph local port"
if grep -q "$PROTECTED_VFIX_HOST" "$TRUSTGRAPH_NGINX_SOURCE" || grep -q "CRM-client-demo" "$TRUSTGRAPH_NGINX_SOURCE"; then
  fail "nginx source must not include the protected VFIX host or CRM-client-demo route"
fi

install -D -m 0644 "$TRUSTGRAPH_NGINX_SOURCE" "$TRUSTGRAPH_NGINX_TARGET"
docker exec "$FIXFLOW_NGINX_CONTAINER" nginx -t
docker exec "$FIXFLOW_NGINX_CONTAINER" nginx -s reload

curl --fail --location --silent --show-error "http://$TRUSTGRAPH_HOST/trustgraph-release.json" >/tmp/trustgraph-nginx-release-check.json \
  || fail "TrustGraph release JSON route is not reachable over the shared nginx edge"
if grep -qi '<!DOCTYPE html\|<html' /tmp/trustgraph-nginx-release-check.json; then
  fail "TrustGraph release JSON route still serves the app shell"
fi
grep -q "premium_workspace_responsive_guard" /tmp/trustgraph-nginx-release-check.json \
  || fail "TrustGraph release JSON route does not show the expected bundle marker"

curl --fail --location --silent --show-error --output /dev/null "https://$PROTECTED_VFIX_HOST$PROTECTED_VFIX_PATH" \
  || fail "protected VFIX route did not remain reachable after nginx reload"

echo "TrustGraph nginx repair installed."
echo "TrustGraph release stamp: https://$TRUSTGRAPH_HOST/trustgraph-release.json"
echo "Protected VFIX route: https://$PROTECTED_VFIX_HOST$PROTECTED_VFIX_PATH"
