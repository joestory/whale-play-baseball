import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Lightweight in-memory rate limiter + suspicious-activity detector.
//
// Goals (non-mission-critical app):
//   1. Block individual IPs that exceed a reasonable request rate.
//   2. Detect global traffic spikes that signal a DDoS or scraping attack
//      and return 503 to shed load so Fly.io auto-stop can kick in.
//   3. Stricter limits on auth endpoints to prevent brute-force.
// ---------------------------------------------------------------------------

interface RateEntry {
  /** Request count in the current window */
  count: number
  /** Start of the current window (ms since epoch) */
  windowStart: number
  /** Number of times this IP has been rate-limited */
  strikes: number
  /** If set, IP is blocked until this timestamp */
  blockedUntil: number
}

// Per-IP tracking (reset naturally via TTL eviction below)
const ipMap = new Map<string, RateEntry>()

// Global request counter for spike detection
let globalWindowStart = Date.now()
let globalCount = 0

// --- Tuning knobs --------------------------------------------------------

/** General rate limit: max requests per IP per window */
const RATE_LIMIT = 60
/** Window duration in ms (1 minute) */
const WINDOW_MS = 60_000
/** Auth endpoint rate limit (stricter) */
const AUTH_RATE_LIMIT = 10
/** After this many strikes, block the IP for BLOCK_DURATION_MS */
const MAX_STRIKES = 3
/** Block duration (15 minutes) */
const BLOCK_DURATION_MS = 15 * 60_000
/** Global spike threshold: if total requests in a window exceed this, start shedding */
const GLOBAL_SPIKE_THRESHOLD = 500
/** Max entries in ipMap before we prune stale entries */
const MAX_IP_ENTRIES = 5_000

// --- Helpers -------------------------------------------------------------

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('fly-client-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

function pruneStaleEntries() {
  if (ipMap.size < MAX_IP_ENTRIES) return
  const now = Date.now()
  for (const [ip, entry] of ipMap) {
    // Remove entries whose window expired and who aren't blocked
    if (now - entry.windowStart > WINDOW_MS * 2 && entry.blockedUntil < now) {
      ipMap.delete(ip)
    }
  }
}

function isAuthPath(pathname: string): boolean {
  return pathname.startsWith('/api/auth')
}

// --- Middleware -----------------------------------------------------------

export function middleware(req: NextRequest) {
  const now = Date.now()
  const ip = clientIp(req)
  const pathname = req.nextUrl.pathname

  // 1. Global spike detection — shed load when the app is being hammered
  if (now - globalWindowStart > WINDOW_MS) {
    globalWindowStart = now
    globalCount = 0
  }
  globalCount++
  if (globalCount > GLOBAL_SPIKE_THRESHOLD) {
    return new NextResponse('Service temporarily unavailable', {
      status: 503,
      headers: { 'Retry-After': '60' },
    })
  }

  // 2. Per-IP rate limiting
  pruneStaleEntries()

  let entry = ipMap.get(ip)
  if (!entry) {
    entry = { count: 0, windowStart: now, strikes: 0, blockedUntil: 0 }
    ipMap.set(ip, entry)
  }

  // Check if IP is currently blocked
  if (entry.blockedUntil > now) {
    const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000)
    return NextResponse.json(
      { error: 'Too many requests — temporarily blocked' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      }
    )
  }

  // Roll the window forward if expired
  if (now - entry.windowStart > WINDOW_MS) {
    entry.count = 0
    entry.windowStart = now
  }

  entry.count++

  const limit = isAuthPath(pathname) ? AUTH_RATE_LIMIT : RATE_LIMIT

  if (entry.count > limit) {
    entry.strikes++
    if (entry.strikes >= MAX_STRIKES) {
      entry.blockedUntil = now + BLOCK_DURATION_MS
    }
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: { 'Retry-After': '60' },
      }
    )
  }

  return NextResponse.next()
}

// Apply to all API routes and pages (exclude static assets and _next internals)
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
