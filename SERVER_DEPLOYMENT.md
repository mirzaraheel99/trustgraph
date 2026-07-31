# TrustGraph VPS Deployment

GitHub remains the primary source of truth. The server should pull from `mirzaraheel99/trustgraph`, build the Docker image, and host the static Next.js export behind HTTPS.

Target host:

```text
https://trustgraph.5-75-224-110.sslip.io
```

`sslip.io` resolves the hostname to `5.75.224.110`, so no DNS account is required for the first production VPS test.

Do not deploy TrustGraph over the existing VFIX app. VFIX is separate and should remain on:

```text
https://5-75-224-110.sslip.io/CRM-client-demo/login
```

This runbook uses `/opt/trustgraph`, the `trustgraph.5-75-224-110.sslip.io` hostname, and TrustGraph-specific Docker service names only.

The GitHub Actions VPS workflow also refuses the VFIX host `5.75.224.110`.

## 1. Prepare Server

Run these from the SSH session on `5.75.224.110`:

```bash
curl -fsSL https://raw.githubusercontent.com/mirzaraheel99/trustgraph/main/tools/bootstrap-vps.sh -o /tmp/trustgraph-bootstrap-vps.sh
bash /tmp/trustgraph-bootstrap-vps.sh
```

The bootstrap script installs Docker if needed, opens ports 80/443, clones or updates `/opt/trustgraph`, creates `.env.server` from the example if missing, and starts the TrustGraph Compose stack. It refuses the VFIX host and any target path outside `/opt/trustgraph`.

If another service already owns public ports 80/443, edit `/opt/trustgraph/.env.server` before the first start and set `TRUSTGRAPH_HTTP_PORT` and `TRUSTGRAPH_HTTPS_PORT` to unused local ports. Then point the existing reverse proxy at those TrustGraph ports. This keeps VFIX or any shared HTTPS edge in control of its current routes.

After the first checkout exists, run the read-only preflight before any update:

```bash
cd /opt/trustgraph
bash tools/validate-server-env.sh .env.server
bash tools/preflight-vps.sh
```

If you prefer manual setup, use the commands below.

```bash
sudo apt update
sudo apt install -y ca-certificates curl git ufw
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
```

Log out and back into SSH after adding the Docker group.

## 2. Open Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

## 3. Pull Repo

```bash
sudo mkdir -p /opt/trustgraph
sudo chown "$USER":"$USER" /opt/trustgraph
git clone https://github.com/mirzaraheel99/trustgraph.git /opt/trustgraph
cd /opt/trustgraph
```

For later updates:

```bash
cd /opt/trustgraph
bash tools/validate-server-env.sh .env.server
bash tools/preflight-vps.sh
bash tools/update-vps-from-github.sh
```

The update script pulls GitHub `main`, rebuilds Docker, writes `/trustgraph-release.json`, and refuses a 200 OK page that does not contain the current bundle marker `corporate_database_visibility_snapshot`.

From the repo, run the freshness check after every server update:

```bash
npm run check:vps-freshness
```

It passes only when GitHub Pages contains the current bundle marker, the VPS page contains the same marker, and `/trustgraph-release.json` reports the current GitHub commit.

## 4. Configure Server Env

```bash
cp .env.server.example .env.server
nano .env.server
```

Set a long random `POSTGRES_PASSWORD`.

TrustGraph's bundled Postgres is exposed only on localhost for maintenance. It defaults to `15432` so it does not collide with an existing VPS Postgres on `5432`:

```text
POSTGRES_HOST_PORT=15432
```

Leave these defaults only when TrustGraph should own ports 80/443 directly:

```text
TRUSTGRAPH_HTTP_BIND=0.0.0.0
TRUSTGRAPH_HTTP_PORT=80
TRUSTGRAPH_HTTPS_BIND=0.0.0.0
TRUSTGRAPH_HTTPS_PORT=443
```

For a shared server or existing reverse proxy, use unused internal ports instead:

```text
TRUSTGRAPH_HTTP_BIND=127.0.0.1
TRUSTGRAPH_HTTP_PORT=4180
TRUSTGRAPH_HTTPS_BIND=127.0.0.1
TRUSTGRAPH_HTTPS_PORT=4443
```

Set these to the hosted Supabase values while Supabase remains the live auth/database backend. They are passed as Docker build arguments because the current app is a static Next.js export:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Validate the environment before the first build:

```bash
bash tools/validate-server-env.sh .env.server
```

The bundled Postgres service is installed for the VPS database phase. Do not move production data from Supabase into this Postgres container until the app has a server-side API and migration plan for auth, RLS, storage, and backups.

## 5. Start Site

```bash
docker compose --env-file .env.server -f docker-compose.server.yml up -d --build
docker compose --env-file .env.server -f docker-compose.server.yml ps
```

Caddy will request HTTPS certificates automatically for this host when TrustGraph owns public 80/443:

```text
https://trustgraph.5-75-224-110.sslip.io
```

## 6. Verify

```bash
curl -I https://trustgraph.5-75-224-110.sslip.io
curl -L https://trustgraph.5-75-224-110.sslip.io | head
docker compose --env-file .env.server -f docker-compose.server.yml exec trustgraph-postgres pg_isready -U trustgraph -d trustgraph
```

If running behind an existing reverse proxy, smoke-check the configured internal port from the server first:

```bash
curl -I http://127.0.0.1:4180
```

If `curl -I https://trustgraph.5-75-224-110.sslip.io` reports a certificate hostname mismatch, another HTTPS service is answering for the host. Keep VFIX running, set TrustGraph to internal ports in `.env.server`, and add a route for `trustgraph.5-75-224-110.sslip.io` in the existing reverse proxy.

## 7. Optional GitHub VPS Deploy Button

After the first manual server setup works, add these GitHub repository secrets:

```text
TRUSTGRAPH_VPS_USER=
TRUSTGRAPH_VPS_SSH_KEY=
```

Then run **Deploy TrustGraph to VPS** from GitHub Actions.

Use these workflow inputs:

```text
target_host=5.75.224.110
public_url=https://trustgraph.5-75-224-110.sslip.io
remote_path=/opt/trustgraph
```

The workflow is manual-only. It connects to the VPS by `target_host`, pulls `origin/main` inside `/opt/trustgraph`, runs `docker compose --env-file .env.server -f docker-compose.server.yml up -d --build`, and smoke-checks the validated `public_url`.

The workflow runs `tools/validate-server-env.sh` through `tools/preflight-vps.sh` before pulling or rebuilding.

It will refuse:

```text
target_host=5.75.224.110
target_host=5-75-224-110.sslip.io
public_url=https://5-75-224-110.sslip.io
public_url=https://5-75-224-110.sslip.io/CRM-client-demo/login
```

## 8. Supabase Auth Redirect

If using the VPS URL for login tests, add this to Supabase Authentication URL settings:

```text
https://trustgraph.5-75-224-110.sslip.io
```

Keep the GitHub Pages URL too:

```text
https://mirzaraheel99.github.io/trustgraph/
```

## 9. Production Notes

- GitHub remains the source repo.
- Server updates should be `git pull --ff-only origin main` followed by Docker Compose rebuild.
- Caddy owns HTTPS certificates in the `caddy_data` Docker volume.
- Postgres data lives in the `trustgraph_postgres_data` Docker volume.
- Back up Postgres before any database migration.
- Current app auth/RLS/storage is Supabase-backed; VPS Postgres is provisioned but not yet wired as the app database.
