#!/usr/bin/env bash
set -euo pipefail

TRUSTGRAPH_REPO_URL="${TRUSTGRAPH_REPO_URL:-https://github.com/mirzaraheel99/trustgraph.git}"
TRUSTGRAPH_REMOTE_PATH="${TRUSTGRAPH_REMOTE_PATH:-/opt/trustgraph}"
TRUSTGRAPH_HOST="${TRUSTGRAPH_HOST:-5-75-224-11.sslip.io}"

if [[ "$TRUSTGRAPH_REMOTE_PATH" != "/opt/trustgraph" ]]; then
  echo "Refusing to deploy outside /opt/trustgraph: $TRUSTGRAPH_REMOTE_PATH" >&2
  exit 1
fi

case "$TRUSTGRAPH_HOST" in
  5.75.224.110|5-75-224-110.sslip.io|*/CRM-client-demo*)
    echo "Refusing to deploy TrustGraph over the VFIX host or CRM-client-demo path." >&2
    exit 1
    ;;
esac

if [[ -d /opt/CRM-client-demo || -d /var/www/CRM-client-demo ]]; then
  echo "Detected VFIX app directory. Continuing only because TrustGraph target is /opt/trustgraph." >&2
fi

install_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    return
  fi

  sudo apt update
  sudo apt install -y ca-certificates curl git ufw
  sudo install -m 0755 -d /etc/apt/keyrings
  if [[ ! -f /etc/apt/keyrings/docker.asc ]]; then
    sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc
  fi
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt update
  sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker "$USER" || true
}

prepare_firewall() {
  sudo ufw allow OpenSSH
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw --force enable
}

prepare_checkout() {
  sudo mkdir -p "$TRUSTGRAPH_REMOTE_PATH"
  sudo chown "$USER":"$USER" "$TRUSTGRAPH_REMOTE_PATH"

  if [[ -d "$TRUSTGRAPH_REMOTE_PATH/.git" ]]; then
    cd "$TRUSTGRAPH_REMOTE_PATH"
    current_origin="$(git remote get-url origin)"
    if [[ "$current_origin" != "$TRUSTGRAPH_REPO_URL" ]]; then
      echo "Refusing to use checkout with unexpected origin: $current_origin" >&2
      exit 1
    fi
    git fetch origin main
    git pull --ff-only origin main
  else
    if [[ -n "$(find "$TRUSTGRAPH_REMOTE_PATH" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
      echo "Refusing to clone into non-empty non-git directory: $TRUSTGRAPH_REMOTE_PATH" >&2
      exit 1
    fi
    git clone "$TRUSTGRAPH_REPO_URL" "$TRUSTGRAPH_REMOTE_PATH"
    cd "$TRUSTGRAPH_REMOTE_PATH"
  fi

  test "$(pwd)" = "/opt/trustgraph"
  test -f docker-compose.server.yml
  test -f Caddyfile
}

prepare_env() {
  if [[ ! -f .env.server ]]; then
    cp .env.server.example .env.server
    if command -v openssl >/dev/null 2>&1; then
      generated_password="$(openssl rand -base64 36 | tr -d '\n')"
    else
      generated_password="trustgraph-$(date +%s)-change-this-password"
    fi
    sed -i "s/replace-with-a-long-random-password/$generated_password/" .env.server
    echo "Created .env.server with a generated Postgres password."
    echo "Edit NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before the first production auth test."
  fi
}

start_stack() {
  docker compose --env-file .env.server -f docker-compose.server.yml up -d --build
  docker compose --env-file .env.server -f docker-compose.server.yml ps
}

install_docker
prepare_firewall
prepare_checkout
prepare_env
start_stack

echo "TrustGraph VPS bootstrap finished."
echo "Open: https://$TRUSTGRAPH_HOST"
