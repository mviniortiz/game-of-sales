#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Evolution API → Cloudflare R2 backup
# -----------------------------------------------------------------------------
# Dumps the Evolution Postgres database and uploads to R2.
# Retention: 7 daily backups, 4 weekly (Sunday).
#
# Required env vars (set in /etc/vyzon-backup.env):
#   PG_HOST, PG_PORT, PG_DB, PG_USER, PG_PASSWORD
#   R2_REMOTE         rclone remote name (e.g. "r2")
#   R2_BUCKET         Cloudflare R2 bucket name
#   WEBHOOK_URL       (optional) Discord/Slack/custom webhook for failure alerts
# -----------------------------------------------------------------------------
set -euo pipefail

ENV_FILE="${ENV_FILE:-/etc/vyzon-backup.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

: "${PG_HOST:?PG_HOST is required}"
: "${PG_PORT:=5432}"
: "${PG_DB:?PG_DB is required}"
: "${PG_USER:?PG_USER is required}"
: "${PG_PASSWORD:?PG_PASSWORD is required}"
: "${R2_REMOTE:?R2_REMOTE is required}"
: "${R2_BUCKET:?R2_BUCKET is required}"
WEBHOOK_URL="${WEBHOOK_URL:-}"

TS="$(date +%Y-%m-%d_%H%M%S)"
DAY_OF_WEEK="$(date +%u)"    # 1=Mon ... 7=Sun
LOCAL_DIR="/tmp/vyzon-backup"
FILE="evolution-${TS}.dump"
LOCAL_PATH="${LOCAL_DIR}/${FILE}"

mkdir -p "$LOCAL_DIR"

log() { printf "[%s] %s\n" "$(date -Iseconds)" "$*"; }

notify_failure() {
  local msg="$1"
  log "FAILURE: $msg"
  if [[ -n "$WEBHOOK_URL" ]]; then
    curl -fsSL -X POST -H 'Content-Type: application/json' \
      -d "{\"content\": \"🚨 Vyzon backup FAILED: ${msg}\"}" \
      "$WEBHOOK_URL" || true
  fi
}

trap 'notify_failure "script exited unexpectedly on line $LINENO"' ERR

# ----- 1. Dump database -------------------------------------------------------
log "Dumping ${PG_DB} from ${PG_HOST}..."
PGPASSWORD="$PG_PASSWORD" pg_dump \
  --host="$PG_HOST" \
  --port="$PG_PORT" \
  --username="$PG_USER" \
  --dbname="$PG_DB" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="$LOCAL_PATH"

SIZE="$(du -h "$LOCAL_PATH" | cut -f1)"
log "Dump complete: ${FILE} (${SIZE})"

# ----- 2. Upload to R2 (daily) ------------------------------------------------
log "Uploading to R2 daily/..."
rclone copyto "$LOCAL_PATH" "${R2_REMOTE}:${R2_BUCKET}/daily/${FILE}" \
  --s3-no-check-bucket --quiet

# ----- 3. On Sundays, also copy to weekly -------------------------------------
if [[ "$DAY_OF_WEEK" == "7" ]]; then
  log "Sunday detected — uploading to R2 weekly/..."
  rclone copyto "$LOCAL_PATH" "${R2_REMOTE}:${R2_BUCKET}/weekly/${FILE}" \
    --s3-no-check-bucket --quiet
fi

# ----- 4. Rotate old backups --------------------------------------------------
log "Rotating old backups..."
# Keep only 7 most recent dailies
rclone delete "${R2_REMOTE}:${R2_BUCKET}/daily/" \
  --min-age 7d --quiet || true

# Keep only 4 most recent weeklies (28d)
rclone delete "${R2_REMOTE}:${R2_BUCKET}/weekly/" \
  --min-age 28d --quiet || true

# ----- 5. Cleanup local -------------------------------------------------------
rm -f "$LOCAL_PATH"

log "Backup completed successfully: ${FILE} (${SIZE})"
