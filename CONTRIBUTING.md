# Contributing to Whale Play Baseball

## Local Setup

### Prerequisites
- Node.js 20+
- PostgreSQL (local install or Docker)

### Quick Start

```bash
git clone <repo-url>
cd whale-play-baseball
npm install
cp .env.example .env.local
# Edit .env.local with your local DATABASE_URL and secrets
npx prisma migrate dev
npx tsx prisma/seed.ts
npm run dev
```

The app runs at http://localhost:3000.
Admin panel at http://localhost:3000/admin (login with `admin` / `changeme123` after seeding).

### Local Database Options

**Option A — Homebrew Postgres (macOS):**
```bash
brew install postgresql@16
brew services start postgresql@16
createdb whaleplay
# DATABASE_URL=postgresql://localhost:5432/whaleplay
```

**Option B — Docker:**
```bash
docker run -d \
  -e POSTGRES_USER=whale \
  -e POSTGRES_PASSWORD=whale \
  -e POSTGRES_DB=whaleplay \
  -p 5432:5432 \
  postgres:16
# DATABASE_URL=postgresql://whale:whale@localhost:5432/whaleplay
```

## Environment Variables

See `.env.example` for all required variables.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Random 32+ char string for NextAuth |
| `AUTH_URL` | App URL (http://localhost:3000 locally) |
| `CRON_SECRET` | Secret for the daily polling endpoint |

## Testing the Cron Locally

```bash
curl -X POST http://localhost:3000/api/cron/poll \
  -H "x-cron-secret: your-local-cron-secret"
```

## Code Style

- TypeScript strict mode
- ESLint enforced via CI (`npm run lint`)
- Components: PascalCase. Everything else: camelCase
- Server components by default; only use `'use client'` when needed for interactivity

## Branch Strategy

```
main                    Production — protected, CI required
feature/<short-name>    New features
fix/<short-name>        Bug fixes
chore/<short-name>      Config, deps, non-code changes
```

- All changes via Pull Request to `main`
- CI must pass before merge
- Squash merge preferred

## Pull Request Process

1. Branch from `main`
2. Write a clear PR description: what changed and why
3. Ensure `npm run lint` and `npx tsc --noEmit` pass locally
4. Request review if working with other contributors
5. Merge when CI is green

## Database Migrations

After changing `prisma/schema.prisma`:
```bash
npx prisma migrate dev --name describe-your-change
```

Migrations run automatically on Fly.io deploy via the `release_command` in `fly.toml`.
