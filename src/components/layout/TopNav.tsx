import Link from 'next/link'

export default function TopNav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#0a0a0a] border-b border-[#1f1f1f]">
      <div className="max-w-lg mx-auto px-4 h-full flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-semibold text-[#fafafa] hover:text-white tracking-tight transition-colors"
        >
          Whale Play
        </Link>
      </div>
    </header>
  )
}
