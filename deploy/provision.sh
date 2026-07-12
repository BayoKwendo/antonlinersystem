#!/usr/bin/env bash
#
# AntonLiner — one-shot provisioning for Ubuntu 24.04 LTS
# Installs Apache2 (reverse proxy + TLS-ready), MySQL, Deno, deploys the
# Deno backend as a systemd service, and serves the built Vite portal.
#
# Usage:
#   sudo DOMAIN=api.affordit.co.ke DB_PASSWORD='...' ./deploy/provision.sh
#
# Then run certbot manually (see README) to obtain the TLS cert.
#
# Re-runnable: steps are guarded so a second run won't clobber existing data.

set -euo pipefail

# ---------------------------------------------------------------------------
# Config (override via environment)
# ---------------------------------------------------------------------------
DOMAIN="${DOMAIN:?set DOMAIN, e.g. DOMAIN=api.affordit.co.ke}"
DB_NAME="${DB_NAME:-waterdril}"
DB_USER="${DB_USER:-waterdril}"
DB_PASSWORD="${DB_PASSWORD:?set DB_PASSWORD to a strong value}"
APP_ROOT="${APP_ROOT:-/opt/antoliner}"          # where the repo lives on the server
WEB_ROOT="${WEB_ROOT:-/var/www/antoliner}"      # where the portal dist is served from
# Directory of THIS script's repo (source of config files + app code)
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ $EUID -ne 0 ]]; then echo "Run with sudo."; exit 1; fi

echo "==> [1/7] Apache2"
apt-get update -y
apt-get install -y apache2
a2enmod proxy proxy_http proxy_wstunnel headers rewrite ssl >/dev/null
systemctl enable --now apache2

echo "==> [2/7] MySQL"
apt-get install -y mysql-server
systemctl enable --now mysql
mysql <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
echo "    DB '${DB_NAME}' + user '${DB_USER}'@127.0.0.1 ready."

echo "==> [3/7] Deno (system-wide at /usr/local/bin/deno)"
if ! command -v deno >/dev/null 2>&1; then
  apt-get install -y unzip curl
  curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh
fi
/usr/local/bin/deno --version | head -1

echo "==> [4/7] Deploy backend to ${APP_ROOT}/waterdril_back"
mkdir -p "${APP_ROOT}"
rsync -a --delete \
  --exclude '.git' --exclude 'node_modules' \
  "${REPO_DIR}/waterdril_back/" "${APP_ROOT}/waterdril_back/"
if [[ ! -f "${APP_ROOT}/waterdril_back/.env" ]]; then
  echo "    !! No .env at ${APP_ROOT}/waterdril_back/.env — copy .env.example and fill it in."
  cp "${APP_ROOT}/waterdril_back/.env.example" "${APP_ROOT}/waterdril_back/.env" 2>/dev/null || true
fi
chown -R www-data:www-data "${APP_ROOT}"

echo "==> [5/7] Build & deploy portal to ${WEB_ROOT}"
if [[ -d "${REPO_DIR}/portal/dist" ]]; then
  mkdir -p "${WEB_ROOT}"
  rsync -a --delete "${REPO_DIR}/portal/dist/" "${WEB_ROOT}/"
  chown -R www-data:www-data "${WEB_ROOT}"
else
  echo "    !! portal/dist not found. Build it first:  cd portal && npm ci && npm run build"
fi

echo "==> [6/7] Apache vhost"
install -m 0644 "${REPO_DIR}/deploy/apache/antoliner.conf" /etc/apache2/sites-available/antoliner.conf
sed -i "s/SERVER_NAME_PLACEHOLDER/${DOMAIN}/" /etc/apache2/sites-available/antoliner.conf
a2dissite 000-default.conf >/dev/null 2>&1 || true
a2ensite antoliner.conf >/dev/null
apache2ctl configtest
systemctl reload apache2

echo "==> [7/7] systemd service"
install -m 0644 "${REPO_DIR}/deploy/systemd/antoliner-api.service" /etc/systemd/system/antoliner-api.service
systemctl daemon-reload
systemctl enable --now antoliner-api
sleep 2
systemctl --no-pager --lines=0 status antoliner-api || true

cat <<DONE

============================================================
 Provisioning complete.

 Next steps:
   1. Edit ${APP_ROOT}/waterdril_back/.env — set:
        DB_USER=${DB_USER}
        DB_PASSWORD=${DB_PASSWORD}
        DB_NAME=${DB_NAME}
        CORS_ORIGINS=https://${DOMAIN}
        MPESA_CALLBACK_URL=https://${DOMAIN}/api/v1/payments/mpesa/stk-callback
      then:  sudo systemctl restart antoliner-api

   2. Load your DB schema/migrations into '${DB_NAME}'.

   3. TLS:
        sudo apt install -y certbot python3-certbot-apache
        sudo certbot --apache -d ${DOMAIN}

   4. Firewall (expose only web):
        sudo ufw allow 'Apache Full' && sudo ufw allow OpenSSH && sudo ufw enable

 Verify:
   curl -I  http://${DOMAIN}/                    # portal SPA (200)
   curl -si http://${DOMAIN}/api/v1/services     # public API via proxy (JSON)
   sudo journalctl -u antoliner-api -f
============================================================
DONE
