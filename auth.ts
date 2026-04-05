import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { verifyPin } from '@/lib/crypto'
import { queryOne } from '@/lib/db'
import type { Role } from '@/types'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        name: { label: '이름', type: 'text' },
        pin:  { label: 'PIN',  type: 'password' },
      },
      async authorize(credentials) {
        const name = credentials?.name as string
        const pin  = credentials?.pin  as string

        if (!name || !pin) return null

        const user = await queryOne<{ id: string; name: string; pin_hash: string; role: Role }>(
          'SELECT id, name, pin_hash, role FROM users WHERE name = ?',
          [name]
        )

        if (!user) return null

        const valid = await verifyPin(pin, user.pin_hash)
        if (!valid) return null

        return { id: user.id, name: user.name, role: user.role as Role }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id   = user.id
        token.role = (user as { role: Role }).role
      }
      return token
    },
    session({ session, token }) {
      session.user.id   = token.id as string
      session.user.role = token.role as Role
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
})
