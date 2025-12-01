import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter"; // ✅ FIXED: Use @auth/prisma-adapter
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  
  providers: [
    // ===== EMAIL/PASSWORD PROVIDER =====
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // ✅ FIXED: Direct Prisma query instead of authService
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

        // Verify password
        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email!,
          name: user.name,
          image: user.image,
        };
      },
    }),

    // ===== GITHUB OAUTH PROVIDER =====
    GitHubProvider({
      clientId: process.env.GITHUB_ID!, // ✅ FIXED: Use GITHUB_ID not GITHUB_CLIENT_ID
      clientSecret: process.env.GITHUB_SECRET!, // ✅ FIXED: Use GITHUB_SECRET
      allowDangerousEmailAccountLinking: true, // ✅ ADDED: Allow linking accounts
    }),

    // ===== GOOGLE OAUTH PROVIDER =====
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!, // ✅ FIXED: Use GOOGLE_ID
      clientSecret: process.env.GOOGLE_SECRET!, // ✅ FIXED: Use GOOGLE_SECRET
      allowDangerousEmailAccountLinking: true, // ✅ ADDED
    }),
  ],

  // ===== SESSION CONFIGURATION =====
  session: {
    strategy: "jwt",
    maxAge: 30 * 60, // ✅ FIXED: 30 minutes (not 30 days)
  },

  // ===== CUSTOM PAGES =====
  pages: {
    signIn: "/login",
    error: "/login",
    newUser: "/dashboard",
  },

  // ===== CALLBACKS =====
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }

      // Store OAuth access token
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }
      return session;
    },

    async signIn({ user, account, profile }) {
      // ✅ ADDED: Always allow sign in
      return true;
    },
  },

  // ===== EVENTS =====
  events: {
    async signIn({ user, account, isNewUser }) {
      console.log(`✅ User signed in: ${user.email} (${account?.provider})`);

      // Create default settings for new users
      if (isNewUser) {
        try {
          await prisma.userSettings.create({
            data: {
              userId: user.id,
              theme: "dark",
              autoSync: true,
              syncFrequency: "daily",
            },
          });

          await prisma.notificationPreferences.create({
            data: {
              userId: user.id,
              emailReminders: true,
              weeklySummary: true,
              achievementAlerts: true,
            },
          });
        } catch (error) {
          console.error("Failed to create user settings:", error);
        }
      }
    },
    async signOut({ token }) {
      console.log(`🚪 User signed out: ${token?.email}`);
    },
  },

  // ===== DEBUG MODE =====
  debug: process.env.NODE_ENV === "development",

  // ===== SECRET =====
  secret: process.env.NEXTAUTH_SECRET,
};