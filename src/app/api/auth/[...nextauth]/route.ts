export const runtime = "nodejs"

import NextAuth, { NextAuthOptions } from "next-auth"
import type { DefaultSession } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",

  session: {
    strategy: "jwt",
    maxAge: 30 * 60, // 30 min
    updateAge: 0, // no sliding
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({ where: { email: credentials.email } })
        if (!user?.password) return null
        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null
        return user
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_AUTH_CLIENT_ID!,
      clientSecret: process.env.GITHUB_AUTH_CLIENT_SECRET!,
    }),
  ],

  pages: {
    signIn: "/login",
    error: "/login",
  },

  useSecureCookies: false,
  cookies: {
    sessionToken: { name: "next-auth.session-token", options: { httpOnly: true, sameSite: "lax", path: "/", secure: false } },
    state: { name: "next-auth.state", options: { httpOnly: true, sameSite: "lax", path: "/", secure: false } },
  },

  callbacks: {
    async jwt({ token, user }) {
      // When a user signs in, attach id/email and fresh expiration
      if (user) {
        const u = user as { id?: string; email?: string }
        token = {
          ...token,
          id: u.id ?? '',
          email: u.email ?? '',
          exp: Math.floor(Date.now() / 1000) + 30 * 60,
        }
      }

      // If exp exists and token is expired, keep token shape but remove user-specific claims
      if (typeof token.exp === 'number' && Date.now() / 1000 > token.exp) {
        const expiredToken = { ...token } as JWT & Record<string, unknown>
        delete (expiredToken as unknown as Record<string, unknown>)['id']
        delete (expiredToken as unknown as Record<string, unknown>)['email']
        return expiredToken as typeof token
      }

      return token
    },
    async session({ session, token }) {
      // Always return a session object — attach user.id/email when present
      const userObj: DefaultSession['user'] & { id: string } = {
        id: typeof token?.id === 'string' ? token.id : '',
        name: session.user?.name ?? null,
        email: token?.email ?? session.user?.email ?? null,
        image: session.user?.image ?? null,
      }
      session.user = userObj as typeof session.user
      return session
    },
    async redirect({ baseUrl }) {
      return baseUrl + "/dashboard"
    }
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
