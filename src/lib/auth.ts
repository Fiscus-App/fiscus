import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/totp'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id:    profile.sub,
          name:  profile.name,
          email: profile.email,
          image: profile.picture,
          role:  'USER',
          tier:  'FREE',
        }
      },
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
        totp:     { label: '2FA code', type: 'text'     },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // Select only long-standing columns so login keeps working even
        // before the 2FA columns are migrated (prisma db push).
        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          select: {
            id: true, email: true, name: true, image: true,
            role: true, tier: true, passwordHash: true,
          },
        })

        if (!user || !user.passwordHash) return null

        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null

        // ── Two-factor gate ───────────────────────────────────────────────
        // Loaded defensively: if the 2FA columns don't exist yet the query
        // throws and we simply treat the account as 2FA-disabled. Throwing a
        // recognisable message lets the login page render the 2FA step
        // (read from `result.error` when redirect:false).
        let tfa: { twoFactorEnabled: boolean; twoFactorSecret: string | null; twoFactorBackupCodes: string | null } | null = null
        try {
          tfa = await db.user.findUnique({
            where: { id: user.id },
            select: { twoFactorEnabled: true, twoFactorSecret: true, twoFactorBackupCodes: true },
          })
        } catch {
          tfa = null
        }

        if (tfa?.twoFactorEnabled && tfa.twoFactorSecret) {
          const code = credentials.totp?.trim()
          if (!code) throw new Error('2FA_REQUIRED')

          let ok = verifyToken(code, tfa.twoFactorSecret)

          // Fall back to single-use backup codes (consumed on success).
          if (!ok && tfa.twoFactorBackupCodes) {
            try {
              const hashes: string[] = JSON.parse(tfa.twoFactorBackupCodes)
              for (let i = 0; i < hashes.length; i++) {
                if (await bcrypt.compare(code, hashes[i])) {
                  ok = true
                  hashes.splice(i, 1)
                  await db.user.update({
                    where: { id: user.id },
                    data: { twoFactorBackupCodes: JSON.stringify(hashes) },
                  })
                  break
                }
              }
            } catch { /* ignore malformed backup codes */ }
          }

          if (!ok) throw new Error('2FA_INVALID')
        }

        return {
          id:    user.id,
          email: user.email,
          name:  user.name ?? undefined,
          image: user.image ?? undefined,
          role:  user.role,
          tier:  user.tier,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id
        token.role = (user as any).role
        token.tier = (user as any).tier
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id   = token.id
        session.user.role = token.role
        session.user.tier = token.tier
      }
      return session
    },
  },
}
