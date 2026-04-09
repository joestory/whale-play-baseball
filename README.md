# Whale Play Baseball

A fantasy baseball weekly draft league platform. Each week, managers draft an MLB team based on a chosen performance metric. Standings update nightly from Baseball Savant data, and the manager whose team ranks highest wins the week.

## How It Works

1. An admin creates a **contest** tied to a Baseball Savant metric (e.g., ERA, WHIP, xBA)
2. Managers **draft** one MLB team each week in snake-draft order — earlier picks unlock immediately, later slots cascade open on a configurable delay (default 60 min)
3. A nightly cron job fetches the latest CSV export from Baseball Savant, computes each team's metric value, and updates standings
4. The contest ends at the configured close date; standings are archived as **completed**

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router), React 19 |
| Language | TypeScript (strict) |
| Database | PostgreSQL via Prisma ORM |
| Auth | NextAuth v5 (credentials provider) |
| Styling | Tailwind CSS v4 |
| Testing | Vitest |
| Hosting | Fly.io (Docker, Node 20-alpine) |
| Polling | GitHub Actions cron (9–14 UTC daily) |

## Features

**Public**
- Contest listing with live standings
- Daily cumulative metric values with trend arrows
- Related metrics and daily opponent context per standing

**Manager (authenticated)**
- Interactive draft UI with real-time slot eligibility
- Dashboard with all contest picks and standings
- Profile/icon settings

**Admin**
- Create and configure contests (metric, draft window, cascade delay, Savant URL)
- Preview Baseball Savant CSV columns before publishing
- Manage manager accounts
- Set/override draft order and individual picks
- Manually trigger standings polls

## Project Structure

```
src/
  app/                  Next.js App Router pages and API routes
    (public)/           Public contest and standings pages
    admin/              Admin dashboard (protected)
    api/                REST API endpoints
      admin/            Admin-only mutations
      cron/             Nightly polling endpoint
      draft/            Pick submission
      manager/          Profile endpoints
  components/           Shared React components
  lib/                  Server-side utilities (auth, db, polling logic)
  utils/                Shared helpers
prisma/
  schema.prisma         Database schema
  migrations/           Migration history
  seed.ts               Demo data seeder
.github/workflows/      CI and nightly cron via GitHub Actions
fly.toml                Fly.io deployment config
Dockerfile              Multi-stage Docker build
```

## Local Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for full setup instructions.

**Quick start:**

```bash
npm install
cp .env.example .env.local
# Edit .env.local — set DATABASE_URL and secrets
npx prisma migrate dev
npm run seed
npm run dev
```

App runs at `http://localhost:3000`.
Admin panel at `http://localhost:3000/admin` (default credentials after seeding: `admin` / `changeme123`).

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Random 32+ char secret for NextAuth (use `openssl rand -hex 32`) |
| `AUTH_URL` | Full app URL (`http://localhost:3000` locally) |
| `CRON_SECRET` | Secret sent in `x-cron-secret` header to authorize polling |

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run start      # Run production server
npm run lint       # ESLint
npm run test       # Vitest
npm run seed       # Seed demo data
```

## Deployment

The app deploys to Fly.io via GitHub Actions on push to `main`. Prisma migrations run automatically as a `release_command` before the new version starts. The nightly standings poll runs from a separate GitHub Actions cron workflow (9–14 UTC).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
