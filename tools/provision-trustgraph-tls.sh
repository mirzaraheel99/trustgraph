#!/usr/bin/env bash
# Issues a Let's Encrypt certificate for the TrustGraph subdomain and installs
# the HTTPS nginx server block, without ever touching the VFIX host, route,
# or nginx config. Run this on the VPS after tools/install-trustgraph-nginx.sh
# has the plain-HTTP block working (https://trustgraph.5-75-224-110.sslip.io/
# is unreachable over HTTPS until this has run once successfully).
set -euo pipefail

TRUSTGRAPH_HOST="${TRUSTGRAPH_HOST:-trustgraph.5-75-224-110.sslip.io}"
PROTECTED_VFIX_HOST="${PROTECTED_VFIX_HOST:-5-75-224-110.sslip.io}"
PROTECTED_VFIX_PATH="${PROTECTED_VFIX_PATH:-/CRM-client-demo/login}"
FIXFLOW_NGINX_CONTAINER="${FIXFLOW_NGINX_CONTAINER:-fixflow-nginx}"
ACME_WEBROOT="${ACME_WEBROOT:-/var/www/trustgraph-acme}"
SSL_CONF_SOURCE="${SSL_CONF_SOURCE:-tools/trustgraph-nginx-ssl.conf}"
SSL_CONF_TARGET="${SSL_CONF_TARGET:-/opt/fixflow-nginx/conf.d/trustgraph.conf}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"

fail() {
  echo "TrustGraph TLS provisioning failed: $*" >&2
  exit 1
}

[[ "$TRUSTGRAPH_HOST" == "trustgraph.5-75-224-110.sslip.io" ]] \
  || fail "refusing unexpected TrustGraph host: $TRUSTGRAPH_HOST"
[[ "$PROTECTED_VFIX_HOST" == "5-75-224-110.sslip.io" ]] \
  || fail "protected VFIX host changed unexpectedly: $PROTECTED_VFIX_HOST"
[[ -f "$SSL_CONF_SOURCE" ]] || fail "missing $SSL_CONF_SOURCE"
grep -q "server_name $PROTECTED_VFIX_HOST;" "$SSL_CONF_SOURCE" \
  && fail "$SSL_CONF_SOURCE must not reference the protected VFIX host"
command -v certbot >/dev/null 2>&1 \
  || fail "certbot is not installed on this host (apt-get install certbot, or run in the certbot/certbot container against $ACME_WEBROOT)"

# Prove nginx is actually serving the webroot we're about to hand certbot,
# before certbot ever touches Let's Encrypt's real rate limits.
mkdir -p "$ACME_WEBROOT/.well-known/acme-challenge"
probe_token="trustgraph-acme-probe-$$"
echo -n "$probe_token" > "$ACME_WEBROOT/.well-known/acme-challenge/$probe_token"
probe_response="$(curl --fail --location --silent --show-error "http://$TRUSTGRAPH_HOST/.well-known/acme-challenge/$probe_token" || true)"
rm -f "$ACME_WEBROOT/.well-known/acme-challenge/$probe_token"
[[ "$probe_response" == "$probe_token" ]] \
  || fail "http://$TRUSTGRAPH_HOST/.well-known/acme-challenge/ is not serving $ACME_WEBROOT yet; confirm tools/install-trustgraph-nginx.sh ran and the shared nginx container mounts $ACME_WEBROOT at that path before retrying"

certbot_args=(certonly --webroot -w "$ACME_WEBROOT" -d "$TRUSTGRAPH_HOST" --non-interactive --agree-tos)
if [[ -n "$CERTBOT_EMAIL" ]]; then
  certbot_args+=(-m "$CERTBOT_EMAIL")
else
  certbot_args+=(--register-unsafely-without-email)
fi

certbot "${certbot_args[@]}"

[[ -f "/etc/letsencrypt/live/$TRUSTGRAPH_HOST/fullchain.pem" ]] \
  || fail "certbot reported success but /etc/letsencrypt/live/$TRUSTGRAPH_HOST/fullchain.pem is missing"

install -D -m 0644 "$SSL_CONF_SOURCE" "$SSL_CONF_TARGET"
docker exec "$FIXFLOW_NGINX_CONTAINER" nginx -t \
  || fail "nginx -t failed after installing the HTTPS server block; not reloading. Check that the certbot volume is mounted into $FIXFLOW_NGINX_CONTAINER at /etc/letsencrypt"
docker exec "$FIXFLOW_NGINX_CONTAINER" nginx -s reload

curl --fail --location --silent --show-error --output /dev/null "https://$TRUSTGRAPH_HOST/trustgraph-release.json" \
  || fail "https://$TRUSTGRAPH_HOST/trustgraph-release.json is still not reachable after reload"
curl --fail --location --silent --show-error --output /dev/null "https://$PROTECTED_VFIX_HOST$PROTECTED_VFIX_PATH" \
  || fail "protected VFIX route did not remain reachable after installing TrustGraph's HTTPS block"

echo "TrustGraph HTTPS is live: https://$TRUSTGRAPH_HOST/"
echo "Certificate renews automatically via certbot's system timer; re-run this script only if renewal breaks the nginx reload."
