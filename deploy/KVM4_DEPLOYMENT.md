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
docker compose build
docker compose up -d db migrate app
docker compose --profile tools run --rm seed
docker compose ps
curl --fail http://127.0.0.1:3010/api/health
```

The seed command is idempotent, but it synchronizes the imported tracker values. Do not run it after users begin editing the same startup/onboarding records unless you intend to restore those source values.

## Publish safely

Use a dedicated subdomain and the existing server reverse proxy. Start from `deploy/nginx-prise.conf.example`. Keep HTTP Basic Authentication enabled until application authentication and assignment-aware RBAC are implemented. Add TLS with the same certificate workflow already used for the DSpace host.

Do not expose port 3010 publicly and do not publish PostgreSQL port 5432.

## Backup

Back up the PRISE database separately from DSpace:

```bash
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "prise-$(date +%F).sql.gz"
```

Store backups outside the VPS as well. Test restore before production usage.

## Update

```bash
cd /opt/prise3
git pull --ff-only
docker compose build
docker compose up -d migrate app
docker image prune -f
```

Never use `docker compose down -v` in production; `-v` deletes the PRISE database volume.
