# TODOs

## E2E Tests — Group-Chat Share Flow
**What:** Add Playwright (or similar) E2E tests covering the shareable contest page.
**Why:** The share flow is the primary UX goal of the standings upgrade. Unit tests cover utilities, but no test verifies the full browser experience.
**How to apply:** When E2E infrastructure is added, first flow to cover: (1) open /contest/[id] while ACTIVE, (2) standings render, (3) share button copies URL, (4) OG tags present in head.
**Depends on:** Playwright setup (none exists yet).

---

## Metric Explainer — Admin-Authored Contest Story
**What:** Add a per-contest `metricExplainerHtml` (or markdown) field to the Contest model. Surface it on the public contest page below the standings.
**Why:** The "metric IS the game" design philosophy — the explainer tells the story of why this week's metric is interesting, what to watch for, which teams are positioned well. Turns the page from a scoreboard into editorial content.
**How to apply:** (1) Add `metricExplainer String?` to `Contest` in schema.prisma, (2) add textarea to admin contest form, (3) render on public contest page above or below standings, (4) make it optional (no explainer = no section rendered).
**Depends on:** Nothing — can be done independently.

---

## Bump Chart — Rank-Over-Time for Final Standings
**What:** A bump chart showing each team's rank position across contest dates, for display on completed contests.
**Why:** The original intent behind sparklines — visualizing the movement story of the week, not just a metric trendline. A bump chart (rank on Y axis, date on X, one colored line per team) tells who led early, who surged late, and who held on.
**How to apply:** Add a `BumpChart` component using SVG. Each team gets a line connecting their rank on each `contestDate`. Ranks come from `dailyValues` (re-rank teams per date by that date's cumulative value). Show on the final standings page only (status = COMPLETED) or as a collapsible section.
**Depends on:** No new data needed — `dailyValues` already contains the cumulative metric per date. Re-ranking client-side is the same approach used by the trend indicator.
