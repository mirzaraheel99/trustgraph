#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env.server}"

fail() {
  echo "TrustGraph server env validation failed: $*" >&2
  exit 1
}

warn() {
  echo "TrustGraph server env validation warning: $*" >&2
}

[[ -f "$ENV_FILE" ]] || fail "missing env file: $ENV_FILE"

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
  done < "$ENV_FILE"
  printf '%s' "$value"
}

trustgraph_host="$(read_env TRUSTGRAPH_HOST)"
postgres_password="$(read_env POSTGRES_PASSWORD)"
supabase_url="$(read_env NEXT_PUBLIC_SUPABASE_URL)"
supabase_key="$(read_env NEXT_PUBLIC_SUPABASE_ANON_KEY)"
auth_provider="$(read_env NEXT_PUBLIC_AUTH_PROVIDER)"

trustgraph_host="${trustgraph_host:-trustgraph.5-75-224-110.sslip.io}"
auth_provider="${auth_provider:-supabase}"

case "$trustgraph_host" in
  trustgraph.5-75-224-110.sslip.io)
    ;;
  5-75-224-110.sslip.io|5.75.224.110|*/CRM-client-demo*)
    fail "TRUSTGRAPH_HOST points at protected VFIX target: $trustgraph_host"
    ;;
  *)
    fail "TRUSTGRAPH_HOST must be trustgraph.5-75-224-110.sslip.io for this VPS launch, got $trustgraph_host"
    ;;
esac

[[ -n "$postgres_password" ]] || fail "POSTGRES_PASSWORD is required"
[[ "$postgres_password" != "replace-with-a-long-random-password" ]] || fail "POSTGRES_PASSWORD still uses the example placeholder"
[[ ${#postgres_password} -ge 20 ]] || fail "POSTGRES_PASSWORD must be at least 20 characters"

[[ "$auth_provider" == "supabase" || "$auth_provider" == "postgres" ]] || fail "NEXT_PUBLIC_AUTH_PROVIDER must be supabase or postgres"

if [[ "$auth_provider" == "postgres" ]]; then
  warn "NEXT_PUBLIC_AUTH_PROVIDER=postgres; static app signup/login will use the VPS Postgres auth API"
elif [[ -z "$supabase_url" || -z "$supabase_key" ]]; then
  warn "Supabase public env is incomplete; static app will use preview/local adapter mode"
else
  [[ "$supabase_url" == https://*.supabase.co ]] || fail "NEXT_PUBLIC_SUPABASE_URL must be a Supabase HTTPS project URL"
  [[ "$supabase_key" == sb_publishable_* || "$supabase_key" == eyJ* ]] || fail "NEXT_PUBLIC_SUPABASE_ANON_KEY must look like a Supabase publishable or anon key"
fi

echo "TrustGraph server env validation passed"
