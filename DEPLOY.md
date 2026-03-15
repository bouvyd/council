# Council Deployment Guide

# Council Deployment Guide

This document tracks the intended production deployment for Council on `council.bvy.be`.

## Target Architecture

- Host Nginx handles public HTTP and HTTPS.
- Host Certbot manages TLS certificates.
- A dedicated `council` user owns the app files under `/opt/council`.
- The frontend is built into static files and served directly by host Nginx from `/opt/council/www`.
- The backend runs in Docker Compose as the `council` user.
- Future internal services such as Redis or PostgreSQL can be added to the same Compose stack.

## Directory Layout

Planned server layout:

```text
/opt/council
├── app/                # Git checkout of this repository
├── www/                # Built frontend files served by host Nginx
├── env/                # Runtime environment files for Compose
└── data/               # Optional future persistent service data
```

Recommended ownership:

- owner: `council:council`
- Nginx reads static files from `/opt/council/www`
- backend Docker containers are started by the `council` user

## Traffic Flow

Public traffic:

- browser -> `https://council.bvy.be` -> host `nginx`

Host Nginx responsibilities:

- serve static frontend files from `/opt/council/www`
- serve `/.well-known/acme-challenge/` for Certbot
- proxy `/socket.io/` to the backend on `127.0.0.1:3001`
- proxy `/health` to the backend on `127.0.0.1:3001`
- send all SPA routes to `/index.html`

Backend exposure model:

- Docker publishes backend as `127.0.0.1:3001:3001`
- backend is not exposed directly on the public network

## App-Specific Constraints

These matter for deployment:

- The backend currently serves API and Socket.IO only; it does not serve the frontend bundle.
- The frontend is a separate Vite build and should be deployed as static files.
- Client-side routing requires SPA fallback to `index.html`.
- Voice chat requires HTTPS outside localhost.
- Voice currently uses STUN by default. That is enough to get started, but not enough for consistently reliable voice on all networks.
- Room state is in-memory only. Restarting the backend will drop active rooms and users.

## Environment Values

### Backend runtime

Expected production values:

```env
NODE_ENV=production
PORT=3001
CLIENT_ORIGIN=https://council.bvy.be
```

Notes:

- `PORT=3001` is the container port.
- The host should bind it only on loopback.

### Frontend build values

Expected production values:

```env
VITE_SERVER_URL=https://council.bvy.be
VITE_ICE_SERVERS_JSON=[{"urls":["stun:stun.l.google.com:19302"]}]
```

Notes:

- `VITE_SERVER_URL` is baked into the built frontend.
- `VITE_ICE_SERVERS_JSON` can later be expanded to include TURN.

## Deployment Artifacts To Add

These files are expected to be added to the repository:

- `docker-compose.yml`
- `docker/backend.Dockerfile`
- `deploy/nginx.council.conf`
- optional deploy scripts for frontend build and sync

Status:

- These files have not been added yet.

## Local Preparation

Before touching the VPS:

1. Add the backend Docker deployment files.
2. Add the host Nginx site config template to the repository.
3. Build the frontend locally or confirm it builds cleanly.
4. Build and run the backend container locally.
5. Confirm `/health` works.
6. Confirm Socket.IO connects through a reverse proxy.

Typical local commands:

```bash
npm ci
npm run build
docker compose build
docker compose up
```

Things to verify locally:

- backend container starts cleanly
- `/health` returns `{ "ok": true }`
- Socket.IO connections succeed through the chosen proxy layout
- frontend build output is valid

Voice validation is limited locally unless the app is also tested over HTTPS.

## VPS Preparation

### 1. DNS

Create a DNS record for `council.bvy.be` pointing at the VPS.

Check propagation:

```bash
dig +short council.bvy.be
```

### 2. Firewall

Allow inbound HTTP and HTTPS.

Example with UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

### 3. Host Packages

Install required host packages if they are not already present:

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

Docker and Docker Compose should already be installed.

## Server Bootstrap

### 1. Create The Dedicated User

Create a system user with `/opt/council` as home:

```bash
sudo useradd -m -d /opt/council -s /bin/bash council
```

If the user already exists, inspect it instead:

```bash
getent passwd council
```

Add the user to the Docker group:

```bash
sudo usermod -aG docker council
```

### 2. Create Base Directories

Create the expected directory layout:

```bash
sudo mkdir -p /opt/council/app
sudo mkdir -p /opt/council/www
sudo mkdir -p /opt/council/env
sudo mkdir -p /opt/council/data
sudo chown -R council:council /opt/council
```

Recommended permissions:

```bash
sudo find /opt/council -type d -exec chmod 755 {} \;
sudo find /opt/council -type f -exec chmod 644 {} \;
```

### 3. Prepare Certbot Webroot

Create a persistent webroot directory for ACME challenges:

```bash
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www/certbot
sudo chmod -R 755 /var/www/certbot
```

### 4. Clone The App As `council`

Example:

```bash
sudo -u council -H bash -lc 'cd /opt/council/app && git clone <repo-url> .'
```

Update later with:

```bash
sudo -u council -H bash -lc 'cd /opt/council/app && git pull'
```

## Frontend Deployment Model

The frontend is deployed as static files on the host.

Recommended flow:

1. build the frontend as the `council` user
2. copy `frontend/dist/` into `/opt/council/www`
3. keep `/opt/council/www` readable by Nginx

Example build command:

```bash
sudo -u council -H bash -lc '
  cd /opt/council/app && \
  npm ci && \
  VITE_SERVER_URL=https://council.bvy.be \
  VITE_ICE_SERVERS_JSON='"'"'[{"urls":["stun:stun.l.google.com:19302"]}]'"'"' \
  npm run build --workspace @council/frontend && \
  rm -rf /opt/council/www/* && \
  cp -R frontend/dist/. /opt/council/www/
'
```

## Backend Deployment Model

The backend is deployed with Docker Compose under the `council` user.

Expected behavior:

- backend container listens on port `3001`
- host publishes it only on `127.0.0.1:3001`
- future services such as Redis or PostgreSQL stay inside the Compose network unless explicitly published

Recommended port mapping:

```yaml
ports:
  - "127.0.0.1:3001:3001"
```

Recommended environment file path:

- `/opt/council/env/backend.env`

## Host Nginx Responsibilities

The host Nginx site should:

- listen on `80` and `443`
- serve `/.well-known/acme-challenge/` from `/var/www/certbot`
- redirect HTTP to HTTPS except for ACME challenges
- serve static files from `/opt/council/www`
- route unknown frontend paths to `/index.html`
- proxy `/socket.io/` to `http://127.0.0.1:3001`
- proxy `/health` to `http://127.0.0.1:3001`
- preserve websocket upgrade headers for Socket.IO

## Initial TLS Sequence

The safest first deployment is:

1. create an HTTP-only Nginx site with ACME challenge support
2. reload host Nginx
3. issue the certificate with Certbot on the host
4. switch the site config to HTTPS
5. reload host Nginx again

This avoids referencing certificate files before they exist.

Issue the certificate:

```bash
sudo certbot certonly \
  --webroot \
  -w /var/www/certbot \
  -d council.bvy.be
```

Expected certificate path:

- `/etc/letsencrypt/live/council.bvy.be/fullchain.pem`
- `/etc/letsencrypt/live/council.bvy.be/privkey.pem`

## Post-Deploy Checks

After TLS is enabled, verify:

1. `https://council.bvy.be` loads in the browser.
2. `https://council.bvy.be/health` returns a healthy response.
3. Room creation works.
4. Joining the same room from two tabs works.
5. Messages propagate in real time.
6. Socket.IO remains connected through host Nginx.
7. Voice prompts for microphone access over HTTPS.

Useful commands:

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log
sudo -u council -H bash -lc 'cd /opt/council/app && docker compose logs -f backend'
curl https://council.bvy.be/health
```

## Renewal Strategy

Keep the ACME challenge location enabled on port `80` permanently so Certbot can renew certificates without stopping the site.

Test renewal:

```bash
sudo certbot renew --dry-run
```

Because Nginx runs on the host, a normal host reload is enough after renewal.

One practical approach is a Certbot deploy hook that reloads Nginx after successful renewal.

Example hook file:

```bash
sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-council-nginx.sh >/dev/null <<'EOF'
#!/bin/sh
systemctl reload nginx
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-council-nginx.sh
```

## Known Follow-Up Work

These are not blockers for first deployment, but they matter:

- Add the actual backend Docker deployment files.
- Add the host Nginx site config template.
- Add a repeatable frontend build and sync script.
- Decide whether to make the frontend default to same-origin Socket.IO in production.
- Add TURN for reliable voice support on restrictive networks.
- Consider persistence if room continuity across deploys becomes important.

## Open Questions

These still need a decision during implementation:

- whether frontend builds happen on the VPS or in CI before upload
- where future persistent service volumes should live under `/opt/council/data`
- whether TURN will be self-hosted or managed externally

- Docker Compose for application services
- Nginx as the public reverse proxy
- Certbot running on the VPS host
- TLS certificates mounted from the host into the Nginx container

## Current Deployment Shape

The planned production topology is:

- `frontend`: serves the built Vite app
- `backend`: runs the Node + Socket.IO server on internal port `3001`
- `nginx`: listens on `80` and `443`, serves ACME challenges, proxies app traffic

Traffic flow:

- browser -> `https://council.bvy.be` -> `nginx`
- `nginx` -> `frontend` for normal web traffic
- `nginx` -> `backend` for `/health` and `/socket.io/`

## App-Specific Constraints

These matter for deployment:

- The backend currently serves API and Socket.IO only; it does not serve the frontend bundle.
- The frontend is a separate Vite build and should be deployed as static files.
- Client-side routing requires SPA fallback to `index.html`.
- Voice chat requires HTTPS outside localhost.
- Voice currently uses STUN by default. That is enough to get started, but not enough for consistently reliable voice on all networks.
- Room state is in-memory only. Restarting the backend will drop active rooms and users.

## Environment Values

### Backend runtime

Expected production values:

```env
NODE_ENV=production
PORT=3001
CLIENT_ORIGIN=https://council.bvy.be
```

Notes:

- `PORT=3001` is internal to Docker.
- The backend should usually not publish `3001` directly to the internet.

### Frontend build args

Expected production values:

```env
VITE_SERVER_URL=https://council.bvy.be
VITE_ICE_SERVERS_JSON=[{"urls":["stun:stun.l.google.com:19302"]}]
```

Notes:

- `VITE_SERVER_URL` should point to the public origin that Nginx exposes.
- `VITE_ICE_SERVERS_JSON` can later be expanded to include TURN.

## Files To Add

These deployment artifacts are expected to exist in the repository:

- `docker-compose.yml`
- `docker/backend.Dockerfile`
- `docker/frontend.Dockerfile`
- `deploy/nginx.conf`
- `deploy/frontend-nginx.conf`

Status:

- These files have not been added yet.

## Local Preparation

Before touching the VPS:

1. Add the Docker and Nginx deployment files listed above.
2. Build the stack locally.
3. Confirm the frontend loads through Nginx.
4. Confirm `/health` proxies to the backend.
5. Confirm Socket.IO connects through Nginx.
6. Confirm room creation and room joining work in two tabs.

Typical local commands:

```bash
docker compose build
docker compose up
```

Things to verify locally:

- frontend HTML loads successfully
- direct navigation to a room URL works
- websocket connection stays open
- `/health` returns `{ "ok": true }`

Voice validation is limited locally unless the app is also tested over HTTPS.

## VPS Preparation

### 1. DNS

Create a DNS record for `council.bvy.be` pointing at the VPS.

Check propagation:

```bash
dig +short council.bvy.be
```

### 2. Firewall

Allow inbound HTTP and HTTPS.

Example with UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

### 3. Host Packages

Install Docker and Certbot if they are not already present.

Example on Debian or Ubuntu:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin certbot
sudo systemctl enable --now docker
```

Optional Docker group setup:

```bash
sudo usermod -aG docker "$USER"
newgrp docker
```

### 4. Certbot Webroot

Create a persistent webroot directory for ACME challenges:

```bash
sudo mkdir -p /var/www/certbot
sudo chown -R "$USER":"$USER" /var/www/certbot
```

## Initial Deploy Sequence

The safest first deployment is a two-step Nginx rollout:

1. Start with an HTTP-only Nginx config so Certbot can validate the domain.
2. Issue the certificate with host Certbot.
3. Switch to the full TLS Nginx config.

This avoids trying to boot Nginx with certificate files that do not exist yet.

### 1. Upload The App

Example:

```bash
mkdir -p ~/apps
cd ~/apps
git clone <repo-url> council
cd council
```

Update later with:

```bash
git pull
```

### 2. Start The Stack With HTTP Only

Use an initial `deploy/nginx.conf` that:

- listens on port `80`
- serves `/.well-known/acme-challenge/` from `/var/www/certbot`
- proxies normal app traffic as needed or redirects later

Start the containers:

```bash
docker compose up -d --build
```

Quick checks:

```bash
docker compose ps
docker compose logs -f nginx
curl http://council.bvy.be/health
```

### 3. Issue The Certificate On The Host

Run Certbot on the VPS host:

```bash
sudo certbot certonly \
  --webroot \
  -w /var/www/certbot \
  -d council.bvy.be
```

Expected certificate path:

- `/etc/letsencrypt/live/council.bvy.be/fullchain.pem`
- `/etc/letsencrypt/live/council.bvy.be/privkey.pem`

### 4. Switch To TLS Config

Update Nginx to the final TLS-enabled config and restart the proxy:

```bash
docker compose restart nginx
```

Verify:

```bash
curl -I https://council.bvy.be/health
```

## Expected Nginx Responsibilities

The public Nginx container should:

- expose `80` and `443`
- serve `/.well-known/acme-challenge/` from `/var/www/certbot`
- proxy `/socket.io/` to `backend:3001`
- proxy `/health` to `backend:3001`
- proxy `/` to `frontend:80`
- preserve websocket upgrade headers for Socket.IO

The frontend Nginx container should:

- serve the built frontend files
- return `index.html` for unknown routes

## Container Volume Mounts

The public Nginx service is expected to mount these host paths:

- `/etc/letsencrypt:/etc/letsencrypt:ro`
- `/var/www/certbot:/var/www/certbot:ro`

This allows:

- host Certbot to manage certificates
- the Nginx container to read certificates and ACME challenge files

## Post-Deploy Checks

After TLS is enabled, verify:

1. `https://council.bvy.be` loads in the browser.
2. `https://council.bvy.be/health` returns a healthy response.
3. Room creation works.
4. Joining the same room from two tabs works.
5. Messages propagate in real time.
6. Socket.IO remains connected over Nginx.
7. Voice prompts for microphone access over HTTPS.

Useful commands:

```bash
docker compose logs -f nginx
docker compose logs -f backend
docker compose logs -f frontend
curl https://council.bvy.be/health
```

## Renewal Strategy

Keep the ACME challenge location enabled on port `80` permanently so Certbot can renew certificates without stopping containers.

Test renewal:

```bash
sudo certbot renew --dry-run
```

Because Nginx runs in Docker, the proxy should be restarted or reloaded after renewal.

One practical approach is a Certbot deploy hook that restarts the Nginx container after successful renewal.

Example hook file:

```bash
sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-council-nginx.sh >/dev/null <<'EOF'
#!/bin/sh
cd /home/damien/apps/council || exit 1
/usr/bin/docker compose restart nginx
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-council-nginx.sh
```

Adjust the repository path if the app lives elsewhere on the VPS.

## Known Follow-Up Work

These are not blockers for first deployment, but they matter:

- Add the actual Docker and Nginx deployment files.
- Decide whether to make the frontend default to same-origin Socket.IO in production.
- Add TURN for reliable voice support on restrictive networks.
- Consider persistence if room continuity across deploys becomes important.

## Open Questions

These still need a decision during implementation:

- Whether the public Nginx config should start with a separate temporary HTTP-only file or a split include-based setup.
- Whether frontend and public proxy should use separate Nginx containers or whether the frontend should use a smaller static file server.
- Whether TURN will be self-hosted or managed externally.