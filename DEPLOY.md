# Deployment (Docker)

Containerised **backend** (Deno API) + **portal** (Vite/React). **MySQL is external** (installed on the server / managed) — not containerised. The portal's nginx serves the SPA and reverse-proxies `/api` and `/ws` to the backend, so everything is one origin (no CORS).

```
browser ──▶ portal (nginx :80)
               ├── /            → static SPA (dist/)
               ├── /api/…       → proxy → backend (Deno :5002) ──▶ external MySQL
               └── /ws          → proxy → backend (WebSocket)
```

## Files
| File | Purpose |
|---|---|
| `docker-compose.yml` | orchestrates backend + portal (external DB) |
| `waterdril_back/Dockerfile` | Deno API image |
| `portal/Dockerfile` + `portal/nginx.conf` | build SPA → serve via nginx + proxy |

## Prerequisites
- Docker Engine + Docker Compose v2
- A reachable **MySQL 8** with the `waterdril` schema loaded (see *Database* below)
- `waterdril_back/.env` — from `waterdril_back/.env.example` (**gitignored, real secrets**): `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, plus M-Pesa / SMS / AWS values
- `waterdril_back/secrets/waterdril-firebase-adminsdk.json` — FCM key (only if push is used; mounted read-only)

## Point the backend at the external MySQL
In `docker-compose.yml` the backend `environment` sets the DB host:
- **MySQL on the same server (host):** keep `DB_HOST: host.docker.internal` (resolved via the `extra_hosts: host-gateway` line).
- **MySQL on a separate host / RDS:** set `DB_HOST` to its hostname/IP and delete the `extra_hosts` line.

The host MySQL must accept the container's connection:
```sql
-- allow the app user from outside localhost (scope to the docker subnet in prod)
CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY '<DB_PASSWORD>';
GRANT ALL PRIVILEGES ON waterdril.* TO 'root'@'%';
FLUSH PRIVILEGES;
```
- `bind-address = 0.0.0.0` (or the docker bridge) in `my.cnf`, and open port 3306 to the docker bridge (`172.16.0.0/12`) in the firewall.

## Load the schema (fresh DB)
```bash
mysql -h <DB_HOST> -P 3306 -u root -p waterdril < waterdril_back/db/schema.sql
# then any idempotent migrations:
mysql -h <DB_HOST> -P 3306 -u root -p waterdril < waterdril_back/db/migrate_provider_codes.sql
```

## Run
```bash
cd /home/bayo/Work/AntoLinerSystem
docker compose --env-file waterdril_back/.env up -d --build
```
- Portal → **http://localhost:8080** (change with `PORTAL_PORT`)
- For a real domain, bake the public API URL: `VITE_API_URL=https://your-domain/api/v1 docker compose --env-file waterdril_back/.env up -d --build`

## First admin
The schema seeds roles/categories but **no users**. Bootstrap one admin, then onboard the rest from the portal:
```bash
HASH=$(deno eval 'import b from "npm:bcryptjs"; console.log(await b.hash("YourPassword", 10))')
mysql -h <DB_HOST> -P 3306 -u root -p waterdril -e "
  INSERT INTO users (uuid, phone, display_name, password_hash, phone_verified_at)
    VALUES (UUID(), '2547XXXXXXXX', 'Owner', '$HASH', NOW());
  INSERT INTO user_roles (user_id, role_id)
    SELECT u.id, r.id FROM users u, roles r WHERE u.phone='2547XXXXXXXX' AND r.\`key\`='admin';"
```

## Database — dump & restore
Move the current data to the remote server (or take a backup). Run where you can reach the **source** MySQL:
```bash
# full dump (schema + data + routines/triggers), consistent, no table locks (InnoDB)
mysqldump -h 127.0.0.1 -P 3344 -u root -p \
  --single-transaction --quick --routines --triggers --events \
  --default-character-set=utf8mb4 --databases waterdril \
  > waterdril_$(date +%F_%H%M).sql
```
Import into the **remote** server (`--databases` above bakes in `CREATE DATABASE`/`USE`, so no name needed here):
```bash
mysql -h <REMOTE_HOST> -P 3306 -u root -p < waterdril_YYYY-MM-DD_HHMM.sql
```
Variants:
```bash
# compressed (large DBs)
mysqldump … --databases waterdril | gzip > waterdril.sql.gz
gunzip < waterdril.sql.gz | mysql -h <REMOTE_HOST> -u root -p

# structure only  → add   --no-data
# data only       → add   --no-create-info --skip-triggers
# no local mysql client → run the tool from a throwaway container:
docker run --rm mysql:8.0 mysqldump -h <SRC_HOST> -P <SRC_PORT> -u root -p \
  --single-transaction --databases waterdril > waterdril.sql
```
Notes: the generated `provider_profiles.location` POINT column is recomputed from `lat`/`lng` on import (mysqldump omits stored generated columns) — no special handling needed. Back up the remote before importing over existing data.

## Production hardening (not handled by these files)
- **TLS**: terminate HTTPS at an outer proxy (nginx/Caddy/Traefik/ALB) in front of the portal container.
- **M-Pesa**: set `MPESA_CALLBACK_URL=https://<domain>/api/v1/payments/mpesa/stk-callback`; point Daraja **C2B** at `https://<domain>/api/v1/payments/mpesa/c2b`; restrict those paths to Safaricom IPs at the proxy.
- **Rate limiting** on auth/OTP/SMS/payment routes (see the security review).

## Ops cheatsheet
```bash
docker compose --env-file waterdril_back/.env logs -f backend
docker compose --env-file waterdril_back/.env ps
docker compose --env-file waterdril_back/.env up -d --build backend   # rebuild one service
docker compose --env-file waterdril_back/.env down                    # stop
```
