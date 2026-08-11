# PRISE 3.0 on Hostinger KVM4

PRISE is intentionally isolated from DSpace:

- Compose project name: `prise3`
- Application bind: `127.0.0.1:3010` by default
- PostgreSQL: internal Docker network only; no host port
- Dedicated named volume: `prise3_prise-db-data`
- Explicit CPU and memory ceilings
- Separate reverse-proxy virtual host/subdomain

## Preflight — do not change DSpace

Run these read-only commands first and record the output:

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
docker compose ls
ss -ltnp
df -h
free -h
```

Confirm that host port `3010` is free. If it is occupied, change only `PRISE_PORT` in `.env`.

## Deploy

```bash
sudo mkdir -p /opt/prise3
cd /opt/prise3
# Copy or clone this project here.
cp .env.example .env
# Edit .env with unique generated secrets before continuing.
# Generate SESSION_SECRET with: openssl rand -base64 48
docker compose build
docker compose up -d db migrate app
docker compose --profile tools run --rm seed
docker compose ps
curl --fail http://127.0.0.1:3010/api/health
```

The seed command is idempotent, but it synchronizes the imported tracker values. Do not run it after users begin editing the same startup/onboarding records unless you intend to restore those source values.

## Publish safely

Use a dedicated subdomain and the existing server reverse proxy. Start from `deploy/nginx-prise.conf.example`. Application authentication and assignment-aware RBAC are enabled; keep HTTP Basic Authentication during the private acceptance period, then remove only the Basic Auth directives after role testing. Add TLS with the same certificate workflow already used for the DSpace host.

Do not expose port 3010 publicly and do not publish PostgreSQL port 5432.

## Backup

Install the verified nightly backup job separately from DSpace:

```bash
sudo install -d -m 700 /var/backups/prise3
sudo chmod 700 deploy/backup.sh deploy/restore.sh
sudo cp deploy/systemd/prise-backup.service deploy/systemd/prise-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now prise-backup.timer
sudo systemctl start prise-backup.service
sudo journalctl -u prise-backup.service --no-pager -n 50
```

`backup.sh` creates a custom-format dump, verifies its table of contents, writes a SHA-256 checksum, and retains 14 days by default. Copy encrypted backups off the VPS as well. Test `restore.sh` on a non-production database before launch; it requires both an in-directory backup and `CONFIRM_RESTORE=RESTORE_PRISE`.

The application audit ledger is append-only at the PostgreSQL layer: ordinary `UPDATE` and `DELETE` operations against `ActivityLog` are rejected. Backups remain the recovery source for the ledger and operational data.

## Launch acceptance

Before removing the private outer gate:

1. Rotate `ADMIN_INITIAL_PASSWORD` after the seed and remove it from `.env` once no reseed is needed.
2. Sign in as each real role and confirm startup visibility and permitted actions.
3. Complete one onboarding decision, 10-outcome plan, task, review, installment and support request in an acceptance startup.
4. Run a backup, copy it off-server and restore it into a disposable PostgreSQL database.
5. Confirm TLS, health checks, weekly Hostinger snapshots and the nightly systemd timer.
6. Record the rollback commit and keep the previous application image until acceptance is signed off.

## Update

```bash
cd /opt/prise3
git pull --ff-only
docker compose build
docker compose up -d migrate app
docker image prune -f
```

Never use `docker compose down -v` in production; `-v` deletes the PRISE database volume.
