# Deploy — Apache2 reverse proxy + MySQL (Ubuntu 24.04 LTS)

Fronts the **Deno/Oak backend** (`waterdril_back`, port `5002`) and the **Vite
portal** (`portal/dist`) behind Apache2 with TLS, backed by **MySQL**.

```
Internet :80/:443
   │  Apache2 (TLS + reverse proxy)
   │    /       -> /var/www/antoliner   (portal SPA, static)
   │    /api/   -> 127.0.0.1:5002        (Deno, v1 router prefix /api/v1)
   │    /ws     -> ws://127.0.0.1:5002/ws (WebSocket, live tracking)
   │
   ├─ Deno backend  127.0.0.1:5002   (systemd: antoliner-api)
   └─ MySQL         127.0.0.1:3306   (db: waterdril)
```

## Files
| File | Purpose |
|------|---------|
| `provision.sh` | One-shot installer for all of the above |
| `apache/antoliner.conf` | Apache vhost (`:80`; certbot adds `:443`) |
| `systemd/antoliner-api.service` | Runs the Deno backend, restarts on boot/crash |

## Quick start

```bash
# 1. Build the portal locally (or on the server) first:
cd portal && npm ci && npm run build && cd ..

# 2. Provision (from the repo root on the Ubuntu server):
sudo DOMAIN=api.affordit.co.ke DB_PASSWORD='a-strong-password' ./deploy/provision.sh

# 3. Fill in the backend .env, then restart:
sudo nano /opt/antoliner/waterdril_back/.env
sudo systemctl restart antoliner-api

# 4. Load DB schema/migrations into the `waterdril` database.

# 5. TLS:
sudo apt install -y certbot python3-certbot-apache
sudo certbot --apache -d api.affordit.co.ke

# 6. Firewall — expose only web + SSH:
sudo ufw allow 'Apache Full' && sudo ufw allow OpenSSH && sudo ufw enable
```

## `.env` values that MUST change for production
Copy `waterdril_back/.env.example` → `.env` and set:

```
PORT=5002
DB_HOST=127.0.0.1
DB_USER=waterdril
DB_PASSWORD=<the password you passed to provision.sh>
DB_NAME=waterdril
JWT_SECRET=<long random string>
CORS_ORIGINS=https://api.affordit.co.ke
MPESA_CALLBACK_URL=https://api.affordit.co.ke/api/v1/payments/mpesa/stk-callback
```

## Manual steps (if not using provision.sh)
```bash
# Apache
sudo apt install -y apache2
sudo a2enmod proxy proxy_http proxy_wstunnel headers rewrite ssl
sudo cp deploy/apache/antoliner.conf /etc/apache2/sites-available/
sudo sed -i 's/SERVER_NAME_PLACEHOLDER/api.affordit.co.ke/' \
     /etc/apache2/sites-available/antoliner.conf
sudo a2dissite 000-default.conf && sudo a2ensite antoliner.conf
sudo apache2ctl configtest && sudo systemctl reload apache2

# MySQL
sudo apt install -y mysql-server && sudo mysql_secure_installation

# Deno (system-wide)
curl -fsSL https://deno.land/install.sh | sudo DENO_INSTALL=/usr/local sh

# Service
sudo cp deploy/systemd/antoliner-api.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now antoliner-api
```

## Verify
```bash
curl -I  https://api.affordit.co.ke/                 # portal (200)
curl -si https://api.affordit.co.ke/api/v1/services  # public API via proxy (JSON)
sudo journalctl -u antoliner-api -f                  # backend logs
sudo tail -f /var/log/apache2/antoliner_error.log    # proxy errors
```

## Gotchas
- **WS rule ordering** — the `/ws` rewrite must precede the `/api/` proxy in the
  vhost, or the WebSocket Upgrade gets proxied as plain HTTP and live tracking
  fails silently.
- **Health route** lives at the backend root (`GET /`), which Apache serves as the
  static portal — so it isn't reachable through the proxy. Use `/api/v1/services`
  to health-check the backend end to end.
- **Ports** — keep `5002` and `3306` bound to `127.0.0.1` only; expose just 80/443.
- **`.env` is gitignored and untracked** — it never ships via git; `provision.sh`
  seeds it from `.env.example` if missing, but you must fill in real secrets.
