# Changelog

All notable changes to Whale Play Baseball will be documented in this file.

## [0.2.4] - 2026-04-05

### Added
- Draft order for a contest is now automatically set when the prior contest transitions to COMPLETED during a Savant poll, using the prior contest's final standings

### Fixed
- Managers not present in the prior contest's standings are now included at the end of the draft order when setting order from prior standings — all managers appear in every draft

### Changed
- Renamed `weekNumber` field to `contestNumber` throughout the codebase and database schema to align with the UI label

## [0.2.3] - 2026-04-01

### Fixed
- Contest status no longer transitions to COMPLETED on the end date itself — it waits until the following day (Eastern time), matching the days-remaining display logic and ensuring the final Baseball Savant poll is inclusive of the end date
- Admin contest date edits now automatically recompute and update contest status to reflect the new lifecycle position (including reverting from COMPLETED back to ACTIVE when an end date is extended)

## [0.2.2] - 2026-03-31

### Added
- Opposing team logos in standings accordion per-date rows, with fallback to MLB Stats API for opponents absent from team-date CSVs
- Support for group_by=team-date CSV format when detecting opponents (uses game_pk matching)

### Fixed
- Standings accordion delta column now correctly shows the increment from the last game date when off-days fall between game dates, instead of showing the full running cumulative
- Athletics team code updated from OAK to ATH (Sacramento), with legacy OAK alias preserved for Savant CSV normalization

## [0.2.1] - 2026-03-30

### Changed
- OG image redesigned: 3-column layout with ESPN PNG team logos, rank change indicator, metric value, trend caret, and days-remaining countdown
- Contest label in OG title now reads "Contest N" instead of "Week N"
- Trend caret is now suppressed for flat delta (delta === 0) instead of showing a misleading green up-arrow
- Rank number color now reflects movement vs. prior standings update (green = improved, rose = decreased, gray = neutral)

### Added
- Days remaining displayed below metric name, color-coded by urgency: red (1 day), orange (2 days), yellow (3 days), gray (4+ days)
- Day-over-day trend caret (▲/▼) displayed alongside metric value in green/rose
- OG image utility functions (`formatValue`, `espnLogoUrl`, `daysColor`, `metricDelta`, `buildPrevRankMap`) now exported and covered by 18 unit tests

### Fixed
- `formatValue` now returns "—" for NaN/Infinity instead of rendering the literal string in the OG image
- `buildPrevRankMap` tie-rank lookup now uses a null-safe fallback instead of a non-null assertion
- `daysRemaining` computation now safely handles invalid `endDate` values (guards against `NaN` from bad data)

## [0.2.0] - 2026-03-25

### Added
- Shareable contest standings pages with Open Graph metadata (title, description, siteName) for link previews when sharing in group chats
- Inline SVG sparklines on standings rows showing each manager's cumulative metric trajectory across contest dates, globally normalized for easy comparison
- Hourly client-side polling for ACTIVE contests, with `lastPolledAt` timestamp displayed in the standings header
- Manager icon (emoji) displayed in standings rows and OG metadata leader description
- Vitest test suite with 15 tests covering standings utilities, DIV metric accumulation, and sparkline normalization edge cases

### Fixed
- DIV-based metrics (K%, Whiff%, ERA, etc.) now show the correct cumulative ratio rather than the sum of per-day ratios — e.g. K% across 3 games now correctly reflects total Ks / total PAs, not day1% + day2% + day3%
- `contestDatesUpToToday` uses UTC date methods for cursor advancement, preventing stuck iteration in non-UTC server environments
- Restored `revalidate = 300` ISR on the contest standings page to prevent cold DB hits on every request
- Share button now falls back to `window.prompt` when the Clipboard API is unavailable (non-HTTPS, WebView)

### Changed
- Contest standings page is now a hybrid server+client component: server renders initial data with `React.cache()` for metadata/page dedup; client handles polling and interactivity
- Standings API endpoint (`/api/contests/[id]/standings`) now returns `{ standings, lastPolledAt }` and includes `manager.icon`
