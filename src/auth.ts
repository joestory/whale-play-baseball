import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const username = credentials?.username as string | undefined
          const password = credentials?.password as string | undefined
          console.log('[auth] authorize called, username:', username)
          if (!username || !password) { console.log('[auth] missing credentials'); return null }

          const manager = await prisma.manager.findUnique({ where: { username } })
          console.log('[auth] manager found:', !!manager)
          if (!manager) return null

          const valid = await bcrypt.compare(password, manager.passwordHash)
          console.log('[auth] password valid:', valid)
          if (!valid) return null

          return { id: manager.id, name: manager.username, isAdmin: manager.isAdmin }
        } catch (err) {
          console.error('[auth] authorize error:', err)
          return null
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin ?? false
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.isAdmin = token.isAdmin as boolean
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  trustHost: true,
})
