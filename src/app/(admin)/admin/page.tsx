import { prisma } from '@/lib/db'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const contests = await prisma.contest.findMany({
    orderBy: [{ season: 'desc' }, { contestNumber: 'desc' }],
    take: 20,
  })

  const statusColors: Record<string, string> = {
    UPCOMING: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    DRAFTING: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    ACTIVE: 'bg-green-500/10 text-green-400 border border-green-500/20',
    COMPLETED: 'bg-zinc-800 text-zinc-500 border border-zinc-700',
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Contests</h1>
        <Link
          href="/admin/contests/new"
          className="bg-green-500 hover:bg-green-400 text-black text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + New Contest
        </Link>
      </div>

      <div className="space-y-2">
        {contests.map((c) => (
          <Link
            key={c.id}
            href={`/admin/contests/${c.id}`}
            className="flex items-center justify-between bg-[#111111] rounded-xl border border-[#1f1f1f] px-4 py-3 hover:bg-[#1a1a1a] transition-colors"
          >
            <div>
              <p className="font-medium text-zinc-100">{c.name}</p>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[c.status]}`}>
              {c.status}
            </span>
          </Link>
        ))}
        {contests.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-6">
            No contests yet. Create your first one!
          </p>
        )}
      </div>
    </div>
  )
}
