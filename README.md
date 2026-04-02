# Whale Play Baseball

A fantasy baseball weekly contest platform where managers draft MLB teams and compete on weekly metrics like home runs, strikeout percentage, and ERA. Built for group play with shareable standings and link previews.

**Current version:** 0.2.3

## Features

- **Weekly Contests** — Admins create contests with custom metrics, date ranges, and draft windows. Contests move through a lifecycle: Upcoming → Drafting → Active → Completed.
- **Draft System** — Cascade-based turn structure with configurable windows. Draft order can be auto-generated from prior contest standings.
- **Live Standings** — Automatic daily scoring from [Baseball Savant](https://baseballsavant.mlb.com/) data with cumulative metrics, day-over-day deltas, and rank tracking.
- **Shareable Contest Pages** — Public standings pages with Open Graph metadata for link previews in group chats. Includes inline SVG sparklines, trend indicators, opposing team logos, and a days-remaining countdown.
- **Flexible Metric Engine** — Supports SUM, COUNT, and DIV aggregation operations. Handles ratio metrics (K%, ERA) correctly using cumulative totals, not averaged ratios.
- **Manager Dashboard** — Personal contest tracking, draft eligibility, pick history, and standings.
- **Admin Panel** — Contest creation, metric config builder, manual standings management, CSV preview, and polling controls.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js](https://nextjs.org) 16 (App Router) |
| Language | TypeScript 5 (strict mode) |
| UI | React 19, Tailwind CSS 4 |
| Database | PostgreSQL via [Prisma](https://www.prisma.io/) 7 |
| Auth | NextAuth v5 with bcrypt credentials |
| Data Source | Baseball Savant CSV API |
| Testing | Vitest |
| Deployment | Fly.io (Docker) |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL (local or Docker)

### Setup

```bash
git clone <repo-url>
cd whale-play-baseball
npm install
cp .env.example .env.local
# Edit .env.local — see Environment Variables below
npx prisma migrate dev
npx tsx prisma/seed.ts
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Admin panel at [http://localhost:3000/admin](http://localhost:3000/admin).

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Random 32+ char string for NextAuth |
| `AUTH_URL` | App URL (`http://localhost:3000` locally) |
| `CRON_SECRET` | Secret for the daily polling endpoint |

## Scripts

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # ESLint
npm run test      # Run Vitest suite
npm run seed      # Seed database
```

## Polling

Active contests poll Baseball Savant hourly on the client. A nightly cron job runs at 2 AM Pacific via `/api/cron/poll`:

```bash
curl -X POST http://localhost:3000/api/cron/poll \
  -H "x-cron-secret: your-cron-secret"
```

## Deployment

Deployed on [Fly.io](https://fly.io). Prisma migrations run automatically on deploy via `release_command` in `fly.toml`.

```bash
flyctl deploy
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup details, branch strategy, and PR process.

## Roadmap

See [TODOS.md](TODOS.md) for planned features including E2E tests, a metric explainer field, and a bump chart visualization.
