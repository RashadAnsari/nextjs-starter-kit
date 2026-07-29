#!/bin/sh
# Periodic logical backup of the application database to S3-compatible storage.
#
# Runs as a sidecar in the infra stack (deploy/tmpls/infra-compose.yml.j2) on
# the same image as the server, so pg_dump always matches the server major
# version.
#
# Connection settings use the POSTGRES_* names the server itself takes, so both
# services read the same variables. pg_dump only picks up the libpq PG* names
# implicitly, so host, user, and database are passed as flags below and the
# password is exported under the name libpq expects.
#
# Retention is not handled here: set a lifecycle rule on the backups bucket.
set -eu

INTERVAL_HOURS="${BACKUP_INTERVAL_HOURS:-24}"
DUMP_FILE=/tmp/app.dump
STAMP_FILE=/tmp/last-success

log() {
  echo "[backup] $(date -u +%Y-%m-%dT%H:%M:%SZ) $*"
}

# Compose calls this to tell whether a backup has succeeded recently. Two hours
# of slack past the interval so a slow dump does not flap the healthcheck.
if [ "${1:-}" = "healthcheck" ]; then
  [ -f "$STAMP_FILE" ] || exit 1
  age=$(($(date +%s) - $(cat "$STAMP_FILE")))
  [ "$age" -lt $(((INTERVAL_HOURS + 2) * 3600)) ] || exit 1
  exit 0
fi

PGPASSWORD="$POSTGRES_PASSWORD"
export PGPASSWORD

if ! command -v aws >/dev/null 2>&1; then
  log "installing aws-cli"
  if ! apk add --no-cache aws-cli >/dev/null 2>&1; then
    log "FATAL could not install aws-cli, backups cannot run"
    exit 1
  fi
fi

while true; do
  key="$(date -u +%Y/%m/%d/app-%Y%m%dT%H%M%SZ.dump)"

  if ! pg_dump \
    --host="$POSTGRES_HOST" \
    --username="$POSTGRES_USER" \
    --dbname="$POSTGRES_DB" \
    --format=custom \
    --no-owner \
    --file="$DUMP_FILE"; then
    log "ERROR pg_dump failed, skipping this cycle"
  else
    size=$(wc -c <"$DUMP_FILE")
    # A dump of an empty or half-written database is worse than no dump,
    # because it would age out the good ones under the lifecycle rule.
    if [ "$size" -lt 1024 ]; then
      log "ERROR dump is only ${size} bytes, refusing to upload"
    elif ! aws s3 cp "$DUMP_FILE" "s3://${S3_BUCKET_BACKUPS}/${key}" \
      --endpoint-url "$S3_ENDPOINT" >/dev/null; then
      log "ERROR upload failed for ${key}"
    else
      date +%s >"$STAMP_FILE"
      log "uploaded ${key} (${size} bytes)"
    fi
  fi

  rm -f "$DUMP_FILE"
  sleep "$((INTERVAL_HOURS * 3600))"
done
