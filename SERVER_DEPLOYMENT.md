# TrustGraph VPS Deployment

GitHub remains the primary source of truth. The server should pull from `mirzaraheel99/trustgraph`, build the Docker image, and host the static Next.js export behind HTTPS.

Target host:

```text
https://5-75-224-11.sslip.io
```

`sslip.io` resolves the hostname to `5.75.224.11`, so no DNS account is required for the first production VPS test.

Do not deploy TrustGraph over the existing VFIX app. VFIX is separate and should remain on:

```text
https://5-75-224-110.sslip.io/CRM-client-demo/login
```

This runbook uses `/opt/trustgraph`, the `5-75-224-11.sslip.io` hostname, and TrustGraph-specific Docker service names only.

The GitHub Actions VPS workflow also refuses the VFIX host `5.75.224.110`.

## 1. Prepare Server

Run these from the SSH session on `5.75.224.11`:

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
git pull --ff-only origin main
docker compose --env-file .env.server -f docker-compose.server.yml up -d --build
```

## 4. Configure Server Env

```bash
cp .env.server.example .env.server
nano .env.server
```

Set a long random `POSTGRES_PASSWORD`.

Set these to the hosted Supabase values while Supabase remains the live auth/database backend. They are passed as Docker build arguments because the current app is a static Next.js export:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

The bundled Postgres service is installed for the VPS database phase. Do not move production data from Supabase into this Postgres container until the app has a server-side API and migration plan for auth, RLS, storage, and backups.

## 5. Start Site

```bash
docker compose --env-file .env.server -f docker-compose.server.yml up -d --build
docker compose --env-file .env.server -f docker-compose.server.yml ps
```

Caddy will request HTTPS certificates automatically for:

```text
https://5-75-224-11.sslip.io
```

## 6. Verify

```bash
curl -I https://5-75-224-11.sslip.io
curl -L https://5-75-224-11.sslip.io | head
docker compose --env-file .env.server -f docker-compose.server.yml exec trustgraph-postgres pg_isready -U trustgraph -d trustgraph
```

## 7. Optional GitHub VPS Deploy Button

After the first manual server setup works, add these GitHub repository secrets:

```text
TRUSTGRAPH_VPS_USER=
TRUSTGRAPH_VPS_SSH_KEY=
```

Then run **Deploy TrustGraph to VPS** from GitHub Actions.

Use these workflow inputs:

```text
target_host=5.75.224.11
remote_path=/opt/trustgraph
```

The workflow is manual-only. It pulls `origin/main` inside `/opt/trustgraph`, runs `docker compose --env-file .env.server -f docker-compose.server.yml up -d --build`, and smoke-checks `https://5-75-224-11.sslip.io`.

It will refuse:

```text
target_host=5.75.224.110
target_host=5-75-224-110.sslip.io
```

## 8. Supabase Auth Redirect

If using the VPS URL for login tests, add this to Supabase Authentication URL settings:

```text
https://5-75-224-11.sslip.io
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
