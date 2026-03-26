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
