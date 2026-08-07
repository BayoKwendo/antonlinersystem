#!/usr/bin/env bash
# =============================================================================
#  Apply ALL SMART Drill migrations to the target DB, in dependency order.
#  Every migration is idempotent (information_schema-guarded / IF NOT EXISTS),
#  so this is safe to run repeatedly and on partially-migrated databases.
#
#  Reads DB_* from the environment (or waterdril_back/.env if present):
#    DB_USER, DB_PASSWORD, DB_NAME, DB_HOST (default 127.0.0.1), DB_PORT (3306)
#
#  Usage:
#    cd waterdril_back && ./db/migrate_all.sh
#    # or: DB_USER=root DB_PASSWORD=*** DB_NAME=waterdril ./db/migrate_all.sh
# =============================================================================
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"

# Load .env (waterdril_back/.env) if the DB vars aren't already set.
ENV_FILE="$DIR/../.env"
if [ -z "${DB_NAME:-}" ] && [ -f "$ENV_FILE" ]; then
  set -a; . "$ENV_FILE"; set +a
fi

: "${DB_USER:?set DB_USER}"
: "${DB_NAME:?set DB_NAME}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"

MYSQL=(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER")
[ -n "${DB_PASSWORD:-}" ] && MYSQL+=("-p${DB_PASSWORD}")
MYSQL+=("$DB_NAME")

# Order matters: catalogue columns + provider-code column first, then the
# journey/escrow/provider tables, then prefix corrections, then ratings/declines.
MIGRATIONS=(
  migrate_service_catalog.sql              # price/icon/accent/... on service_categories  ← fixes GET /services
  migrate_provider_codes.sql               # service_categories.code_prefix + provider_profiles.code
  migrate_device_tokens.sql
  migrate_smartdrill_journey.sql
  migrate_smartdrill_escrow.sql
  migrate_smartdrill_provider.sql
  migrate_smartdrill_provider_code_prefixes.sql   # SDGEO/SDBD/... prefixes (needs code_prefix)
  migrate_smartdrill_provider_availability.sql
  migrate_smartdrill_ratings_declines.sql
  migrate_smartdrill_live_tracking.sql            # bookings.provider_lat/lng/loc_at (live tracking snapshot)
)

for f in "${MIGRATIONS[@]}"; do
  echo ">> applying $f"
  "${MYSQL[@]}" < "$DIR/$f"
done

echo "✓ All migrations applied to ${DB_NAME}@${DB_HOST}:${DB_PORT}"
