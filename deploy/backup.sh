#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

PROJECT_DIR="${PRISE_PROJECT_DIR:-/opt/prise3}"
BACKUP_DIR="${PRISE_BACKUP_DIR:-/var/backups/prise3}"
RETENTION_DAYS="${PRISE_BACKUP_RETENTION_DAYS:-14}"

cd "$PROJECT_DIR"
mkdir -p "$BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
final="$BACKUP_DIR/prise3-$timestamp.dump"
temporary="$final.partial"

cleanup() { rm -f "$temporary"; }
trap cleanup EXIT

docker compose exec -T db sh -lc 'pg_dump --format=custom --no-owner --no-privileges -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$temporary"
test -s "$temporary"
docker compose exec -T db pg_restore --list < "$temporary" > /dev/null
mv "$temporary" "$final"
sha256sum "$final" > "$final.sha256"
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'prise3-*.dump*' -mtime "+$RETENTION_DAYS" -delete
echo "Verified backup: $final"

