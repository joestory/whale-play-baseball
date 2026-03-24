import { prisma } from '@/lib/db'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const [contests, managers] = await Promise.all([
    prisma.contest.findMany({
      orderBy: [{ season: 'desc' }, { weekNumber: 'desc' }],
      take: 20,
    }),
    prisma.manager.findMany({ orderBy: { username: 'asc' } }),
  ])

  const statusColors: Record<string, string> = {
    UPCOMING: 'bg-slate-100 text-slate-600',
    DRAFTING: 'bg-amber-100 text-amber-700',
    ACTIVE: 'bg-green-100 text-green-700',
    COMPLETED: 'bg-blue-100 text-blue-700',
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </div>

      {/* Contests */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Contests</h2>
          <Link
            href="/admin/contests/new"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Contest
          </Link>
        </div>
        <div className="space-y-2">
          {contests.map((c) => (
            <Link
              key={c.id}
              href={`/admin/contests/${c.id}`}
              className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-slate-500">
                  Week {c.weekNumber} · {c.season} · {c.metricName}
                </p>
                {c.lastPolledAt && (
                  <p className="text-xs text-slate-400">
                    Polled {new Date(c.lastPolledAt).toLocaleString()}
                  </p>
                )}
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[c.status]}`}>
                {c.status}
              </span>
            </Link>
          ))}
          {contests.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-6">
              No contests yet. Create your first one!
            </p>
          )}
        </div>
      </section>

      {/* Managers */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Managers ({managers.length})</h2>
          <Link
            href="/admin/managers"
            className="text-sm text-blue-600 font-medium"
          >
            Manage →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {managers.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-xl border border-slate-200 px-3 py-2 flex items-center gap-2"
            >
              <span className="text-slate-400 text-sm">{m.isAdmin ? '👑' : '👤'}</span>
              <span className="font-medium text-sm truncate">{m.username}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
