import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import SessionProvider from '@/components/layout/SessionProvider'
import MobileNav from '@/components/layout/MobileNav'

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <SessionProvider>
      <div className="min-h-screen pb-20">
        {children}
        <MobileNav />
      </div>
    </SessionProvider>
  )
}
