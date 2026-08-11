# PRISE 3.0 Incubation Tracker

A milestone-driven coordination workspace built from the supplied PRISE design direction and real cohort tracker data.

## Included now

- Minimal indigo dashboard shell with green reserved for approved/on-track states
- Real 19-startup roster imported through Prisma seed
- Real onboarding statuses and fee values from the tracker
- 52 core milestone templates across seven phases
- Program/startup milestone scope separation
- Startup 360 onboarding and fee position
- Docker Compose stack isolated from the existing DSpace deployment

Startup-specific 10–15 milestone plans are intentionally empty because the workbook does not contain those selections.

## Local commands

```bash
pnpm install
pnpm db:generate
pnpm lint
pnpm typecheck
pnpm build
```

For a real database, copy `.env.example` to `.env`, start PostgreSQL, run `pnpm db:deploy`, then `pnpm db:seed`.

## Production

See `deploy/KVM4_DEPLOYMENT.md`. Keep PRISE behind an authenticated reverse proxy until application-level authentication and role-based authorization are complete.
