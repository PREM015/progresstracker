// ===== FILE: src/lib/auth.ts (REPLACE COMPLETELY) =====

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Extend types for session
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email?: string;
    provider?: string;
  }
}

// Validate NextAuth secret on app startup
if (!process.env.NEXTAUTH_SECRET) {
  const errorMsg =
    "NEXTAUTH_SECRET environment variable is not set. " +
    "This is required for session encryption. " +
    "Generate one with: openssl rand -base64 32";

  if (process.env.NODE_ENV === "production") {
    throw new Error(errorMsg);
  } else {
    console.warn(`⚠️ WARNING: ${errorMsg}`);
  }
}

export const authOptions: NextAuthOptions = {
  // ===== ADAPTER =====
  adapter: PrismaAdapter(prisma),

  // ===== SECRET =====
  secret: process.env.NEXTAUTH_SECRET,

  // ===== DEBUG =====
  debug: process.env.NODE_ENV === "development",

  // ===== SESSION =====
  session: {
    strategy: "jwt",
    maxAge: parseInt(process.env.SESSION_MAX_AGE || "2592000"),
  },

  // ===== PROVIDERS =====
  providers: [
    // Email/Password
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

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

    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),

    // GitHub OAuth
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  // ===== PAGES =====
  pages: {
    signIn: "/login",
    error: "/login",
  },

  // ===== COOKIES =====
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  // ===== CALLBACKS =====
  callbacks: {
    jwt: async ({ token, user, account }) => {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email ?? undefined;
      }

      // Store provider info
      if (account) {
        token.provider = account.provider;
      }

      return token;
    },

    session: async ({ session, token }) => {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = (token.email as string) ?? null;
      }
      return session;
    },

    signIn: async () => {
      return true;
    },

    redirect: async ({ url, baseUrl }) => {
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      return `${baseUrl}/dashboard`;
    },
  },

  // ===== EVENTS =====
  events: {
    async signIn({ user, account, isNewUser }) {
      console.log(`✅ User signed in: ${user.email} via ${account?.provider}`);

      // Create default settings for new users
      if (isNewUser && user.id) {
        try {
          // Create UserSettings
          await prisma.userSettings.upsert({
            where: { userId: user.id },
            update: {},
            create: {
              userId: user.id,
              theme: "system",
              autoSync: true,
              syncFrequency: "daily",
            },
          });

          // Create NotificationPreferences with CORRECT field names from schema
          await prisma.notificationPreferences.upsert({
            where: { userId: user.id },
            update: {},
            create: {
              userId: user.id,
              // Core settings
              enabled: true,
              emailEnabled: true,
              pushEnabled: false,
              inAppEnabled: true,
              smsEnabled: false,
              
              // Goal notifications
              goalReminders: true,
              goalCompleted: true,
              
              // Streak & sync notifications
              streakAlerts: true,
              syncComplete: false,
              syncFailed: true,
              
              // Report notifications
              weeklyReport: true,
              monthlyReport: false,
              
              // Security & system
              securityAlerts: true,
              billingAlerts: true,
              
              // Marketing & updates
              newFeatures: true,
              tips: true,
              communityUpdates: false,
              marketingEmails: false,
              
              // Quiet hours (disabled by default)
              quietHoursEnabled: false,
              quietHoursStart: "22:00",
              quietHoursEnd: "08:00",
              quietHoursTimezone: "UTC",
              
              // Digest settings
              digestEnabled: false,
              digestFrequency: "daily",
              digestTime: "09:00",
              digestDay: 1, // Monday
              
              // Do not disturb
              dndEnabled: false,
              dndUntil: null,
            },
          });

          console.log(`✅ Created default settings for user: ${user.id}`);
        } catch (error) {
          console.error("Failed to create user settings:", error);
          // Don't throw - allow sign in to continue even if settings creation fails
        }
      }
    },

    async signOut({ token }) {
      console.log(`🚪 User signed out: ${token?.email}`);
    },
  },
};