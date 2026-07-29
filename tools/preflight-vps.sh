#!/usr/bin/env bash
set -euo pipefail

TRUSTGRAPH_REMOTE_PATH="${TRUSTGRAPH_REMOTE_PATH:-/opt/trustgraph}"
TRUSTGRAPH_HOST="${TRUSTGRAPH_HOST:-5-75-224-11.sslip.io}"
PROTECTED_VFIX_HOST="5-75-224-110.sslip.io"
PROTECTED_VFIX_IP="5.75.224.110"

fail() {
  echo "TrustGraph VPS preflight failed: $*" >&2
  exit 1
}

warn() {
  echo "TrustGraph VPS preflight warning: $*" >&2
}

case "$TRUSTGRAPH_HOST" in
  "$PROTECTED_VFIX_HOST"|"$PROTECTED_VFIX_IP"|*/CRM-client-demo*)
    fail "refusing protected VFIX host or CRM-client-demo route: $TRUSTGRAPH_HOST"
    ;;
esac

[[ "$TRUSTGRAPH_REMOTE_PATH" == "/opt/trustgraph" ]] || fail "remote path must be /opt/trustgraph, got $TRUSTGRAPH_REMOTE_PATH"
[[ -d "$TRUSTGRAPH_REMOTE_PATH" ]] || fail "missing TrustGraph checkout directory: $TRUSTGRAPH_REMOTE_PATH"

cd "$TRUSTGRAPH_REMOTE_PATH"
[[ "$(pwd)" == "/opt/trustgraph" ]] || fail "unexpected working directory: $(pwd)"
[[ -d .git ]] || fail "missing Git checkout"
[[ -f docker-compose.server.yml ]] || fail "missing docker-compose.server.yml"
[[ -f Caddyfile ]] || fail "missing Caddyfile"
[[ -f .env.server ]] || fail "missing .env.server"
[[ -f tools/validate-server-env.sh ]] || fail "missing tools/validate-server-env.sh"

origin="$(git remote get-url origin)"
[[ "$origin" == "https://github.com/mirzaraheel99/trustgraph.git" || "$origin" == "git@github.com:mirzaraheel99/trustgraph.git" ]] || fail "unexpected Git origin: $origin"

command -v docker >/dev/null 2>&1 || fail "Docker is not installed"
docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin is not available"

bash tools/validate-server-env.sh .env.server

read_env() {
  local key="$1"
  local line=""
  local value=""
  while IFS= read -r line || [[ -n "$line" ]]; do
    case "$line" in
      "$key="*)
        value="${line#*=}"
        ;;
    esac
  done < .env.server
  printf '%s' "$value"
}

http_port="$(read_env TRUSTGRAPH_HTTP_PORT)"
https_port="$(read_env TRUSTGRAPH_HTTPS_PORT)"
http_bind="$(read_env TRUSTGRAPH_HTTP_BIND)"
https_bind="$(read_env TRUSTGRAPH_HTTPS_BIND)"

http_port="${http_port:-80}"
https_port="${https_port:-443}"
http_bind="${http_bind:-0.0.0.0}"
https_bind="${https_bind:-0.0.0.0}"

if [[ "$http_port" == "80" || "$https_port" == "443" ]]; then
  if command -v ss >/dev/null 2>&1 && ss -ltn "( sport = :80 or sport = :443 )" | awk 'NR > 1 { found = 1 } END { exit found ? 0 : 1 }'; then
    warn "port 80 or 443 already has a listener; use internal ports if VFIX or another reverse proxy owns the public edge"
  fi
fi

[[ -n "$(read_env NEXT_PUBLIC_SUPABASE_URL)" ]] || warn "NEXT_PUBLIC_SUPABASE_URL is empty; auth will run in preview/local adapter mode"
[[ -n "$(read_env NEXT_PUBLIC_SUPABASE_ANON_KEY)" ]] || warn "NEXT_PUBLIC_SUPABASE_ANON_KEY is empty; auth will run in preview/local adapter mode"

echo "TrustGraph VPS preflight passed"
echo "Host: $TRUSTGRAPH_HOST"
echo "Path: $TRUSTGRAPH_REMOTE_PATH"
echo "HTTP: $http_bind:$http_port"
echo "HTTPS: $https_bind:$https_port"
