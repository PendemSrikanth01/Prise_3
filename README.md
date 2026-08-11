# PRISE 3.0 Incubation Tracker

A milestone-driven coordination workspace built from the supplied PRISE design direction and real cohort tracker data.

## Included

- Minimal indigo dashboard shell with green reserved for approved/on-track states
- Real 19-startup roster, onboarding values and 52 milestone templates imported through Prisma seed
- Secure opaque sessions, first-login password rotation and database-backed login throttling
- Role-based authorization with founder/assignment-aware startup scoping
- Startup editing plus reviewer-attributed onboarding decisions
- Curated 10-15 milestone plans, milestone reviews and execution tasks
- Payment installment and support-request CRUD
- Append-only, actor-attributed audit history
- Verified nightly PostgreSQL backup and guarded restore scripts
- Docker Compose stack isolated from the existing DSpace deployment

Startup-specific milestone plans start empty because the workbook does not contain those selections. A program lead or program-team member selects the 10-15 outcomes that matter for each startup.

## Local commands

```bash
pnpm install
pnpm db:generate
pnpm lint
pnpm typecheck
pnpm build
```

For a real database, copy `.env.example` to `.env`, generate unique secrets, start PostgreSQL, run `pnpm db:deploy`, then `pnpm db:seed`. The seeded administrator must replace the temporary password at first sign-in.

## Production

See `deploy/KVM4_DEPLOYMENT.md`. Keep PRISE behind HTTP Basic Authentication during private acceptance, while also testing every application role, and remove the outer gate only at launch.
