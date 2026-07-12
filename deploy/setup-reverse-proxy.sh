#!/usr/bin/env bash
#
# AntonLiner — Apache2 reverse-proxy setup (Ubuntu 24.04 / Apache 2.4)
#
# Wires an ALREADY-INSTALLED Apache2 to front the app:
#     /       -> static portal (WEB_ROOT)
#     /api/   -> Deno backend on BACKEND_HOST:BACKEND_PORT (prefix /api/v1)
#     /ws     -> WebSocket (live tracking) on ws://BACKEND_HOST:BACKEND_PORT/ws
#
# Does NOT install Apache, MySQL, Deno, or build the portal — proxy only.
#
# Usage:
#   sudo DOMAIN=api.affordit.co.ke ./deploy/setup-reverse-proxy.sh
#
#   # with automatic Let's Encrypt TLS:
#   sudo DOMAIN=api.affordit.co.ke TLS=1 EMAIL=you@example.com ./deploy/setup-reverse-proxy.sh
#
# Re-runnable: overwrites the vhost and reloads; never touches other sites.

set -euo pipefail

# ---- config (override via environment) ------------------------------------
DOMAIN="${DOMAIN:?set DOMAIN, e.g. DOMAIN=api.affordit.co.ke}"
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-5002}"
WEB_ROOT="${WEB_ROOT:-/var/www/antoliner}"
SITE="${SITE:-antoliner}"
TLS="${TLS:-0}"
EMAIL="${EMAIL:-}"
DISABLE_DEFAULT="${DISABLE_DEFAULT:-0}"   # set 1 to disable Apache's 000-default site

VHOST="/etc/apache2/sites-available/${SITE}.conf"

if [[ $EUID -ne 0 ]]; then echo "Run with sudo."; exit 1; fi
if ! command -v apache2ctl >/dev/null 2>&1; then
  echo "Apache2 not found. Install it first: sudo apt install -y apache2"; exit 1
fi

echo "==> Enabling proxy modules (incl. proxy_wstunnel for the /ws socket)"
a2enmod proxy proxy_http proxy_wstunnel headers rewrite ssl >/dev/null

echo "==> Ensuring web root exists: ${WEB_ROOT}"
mkdir -p "${WEB_ROOT}"
[[ -f "${WEB_ROOT}/index.html" ]] || \
  echo "    (note: ${WEB_ROOT} has no index.html yet — build & copy portal/dist there)"

echo "==> Writing vhost: ${VHOST}"
cat > "${VHOST}" <<EOF
# Managed by deploy/setup-reverse-proxy.sh — re-run the script to regenerate.
<VirtualHost *:80>
    ServerName ${DOMAIN}
    DocumentRoot ${WEB_ROOT}

    RewriteEngine On

    # --- WebSocket upgrade (live tracking, GET /ws) MUST match before /api ---
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule ^/ws(.*)\$ ws://${BACKEND_HOST}:${BACKEND_PORT}/ws\$1 [P,L]

    # --- REST API -> Deno backend ---
    ProxyPreserveHost On
    ProxyPass        /api/  http://${BACKEND_HOST}:${BACKEND_PORT}/api/
    ProxyPassReverse /api/  http://${BACKEND_HOST}:${BACKEND_PORT}/api/
    RequestHeader set X-Forwarded-Proto "http"

    # --- Vite SPA: static assets, fall back to index.html ---
    <Directory ${WEB_ROOT}>
        Options -Indexes
        AllowOverride None
        Require all granted
        FallbackResource /index.html
    </Directory>
    <Location /api>
        FallbackResource disabled
    </Location>

    ErrorLog  \${APACHE_LOG_DIR}/${SITE}_error.log
    CustomLog \${APACHE_LOG_DIR}/${SITE}_access.log combined
</VirtualHost>
EOF

echo "==> Enabling site"
a2ensite "${SITE}.conf" >/dev/null
if [[ "${DISABLE_DEFAULT}" == "1" ]]; then
  a2dissite 000-default.conf >/dev/null 2>&1 || true
fi

echo "==> Testing config + reloading Apache"
apache2ctl configtest
systemctl reload apache2

if [[ "${TLS}" == "1" ]]; then
  echo "==> Obtaining TLS certificate via certbot"
  if ! command -v certbot >/dev/null 2>&1; then
    apt-get update -y && apt-get install -y certbot python3-certbot-apache
  fi
  if [[ -n "${EMAIL}" ]]; then
    certbot --apache -d "${DOMAIN}" --non-interactive --agree-tos -m "${EMAIL}" --redirect
  else
    certbot --apache -d "${DOMAIN}"   # interactive prompts
  fi
fi

echo
echo "Done. Reverse proxy for ${DOMAIN} is live."
echo "Verify:"
echo "  curl -I  http://${DOMAIN}/                  # portal (200 once dist is deployed)"
echo "  curl -si http://${DOMAIN}/api/v1/services   # API via proxy (needs antoliner-api running)"
echo "  sudo tail -f /var/log/apache2/${SITE}_error.log"
