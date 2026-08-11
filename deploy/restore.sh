#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="${PRISE_PROJECT_DIR:-/opt/prise3}"
BACKUP_DIR="${PRISE_BACKUP_DIR:-/var/backups/prise3}"
: "${RESTORE_FILE:?Set RESTORE_FILE to a verified .dump file inside the backup directory}"

resolved_backup_dir="$(realpath "$BACKUP_DIR")"
resolved_file="$(realpath "$RESTORE_FILE")"
case "$resolved_file" in "$resolved_backup_dir"/*) ;; *) echo "Restore file must be inside $resolved_backup_dir" >&2; exit 2 ;; esac
test "${CONFIRM_RESTORE:-}" = "RESTORE_PRISE" || { echo "Set CONFIRM_RESTORE=RESTORE_PRISE to acknowledge the destructive database restore." >&2; exit 2; }
sha256sum --check "$resolved_file.sha256"

cd "$PROJECT_DIR"
docker compose stop app
docker compose exec -T db sh -lc 'dropdb --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
docker compose exec -T db sh -lc 'pg_restore --exit-on-error --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$resolved_file"
docker compose run --rm migrate
docker compose up -d app
docker compose ps

