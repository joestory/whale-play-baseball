# Changelog

All notable changes to Whale Play Baseball will be documented in this file.

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
