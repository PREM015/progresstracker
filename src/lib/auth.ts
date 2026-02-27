// ===== FILE: src/lib/auth.ts =====

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/* -------------------------------------------------------------------------- */
/*                               TYPE EXTENSIONS                               */
/* -------------------------------------------------------------------------- */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      username?: string | null;
      role: "admin" | "user";
      isAdmin: boolean;
      isVerified: boolean;
      isPublic: boolean;
    };
  }

  interface User {
    id: string;
    role: "admin" | "user";
    isAdmin: boolean;
    username?: string | null;
    isVerified: boolean;
    isPublic: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    username?: string | null;
    image?: string | null;
    role: "admin" | "user";
    isAdmin: boolean;
    isVerified: boolean;
    provider?: string;
  }
}

/* -------------------------------------------------------------------------- */
/*                               ENV VALIDATION                                */
/* -------------------------------------------------------------------------- */

if (!process.env.NEXTAUTH_SECRET) {
  const msg =
    "NEXTAUTH_SECRET environment variable is not set. Generate one with: openssl rand -base64 32";

  if (process.env.NODE_ENV === "production") {
    throw new Error(msg);
  } else {
    console.warn("⚠️ WARNING:", msg);
  }
}

/* -------------------------------------------------------------------------- */
/*                               AUTH OPTIONS                                  */
/* -------------------------------------------------------------------------- */

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV === "development",

  session: {
    strategy: "jwt",
    maxAge: parseInt(process.env.SESSION_MAX_AGE || "2592000"),
  },

  /* -------------------------------- COOKIES -------------------------------- */
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

  /* -------------------------------- PROVIDERS ------------------------------- */
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (
          !user ||
          !user.password ||
          !user.isActive ||
          user.isBanned
        ) {
          throw new Error("Invalid credentials");
        }

        const valid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!valid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email!,
          emailVerified: user.emailVerified,
          name: user.name,
          image: user.image,
          username: user.username,
          role: user.role as "admin" | "user",
          isAdmin: user.isAdmin,

          permissions: user.permissions,
          isActive: user.isActive,
          isVerified: user.isVerified,
          isBanned: user.isBanned,
          banReason: user.banReason,
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
          streakStartDate: user.streakStartDate,
          streakFreezeCount: user.streakFreezeCount,
          streakFreezeUsedAt: user.streakFreezeUsedAt,
          totalProblems: user.totalProblems,
          totalCommits: user.totalCommits,
          totalProjects: user.totalProjects,
          totalCertifications: user.totalCertifications,
          totalAchievements: user.totalAchievements,
          totalPoints: user.totalPoints,
          preferredLanguage: user.preferredLanguage,
          timezone: user.timezone,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          isPublic: user.isPublic ?? true,
          showEmail: user.showEmail ?? false,
          showLocation: user.showLocation ?? false,
          showActivity: user.showActivity ?? true,
          showAchievements: user.showAchievements ?? true,
          showGoals: user.showGoals ?? true,
          showPlatforms: user.showPlatforms ?? true,
          showStreak: user.showStreak ?? true,
          // Optional fields can be null/undefined if not set
          bio: user.bio,
          location: user.location,
          website: user.website,
          company: user.company,
          jobTitle: user.jobTitle,
          githubUsername: user.githubUsername,
          linkedinUrl: user.linkedinUrl,
          twitterHandle: user.twitterHandle,
          discordUsername: user.discordUsername,
          lastActivityDate: user.lastActivityDate,

          lastLoginAt: user.lastLoginAt,
          lastActiveAt: user.lastActiveAt,
          passwordChangedAt: user.passwordChangedAt,
          deletedAt: user.deletedAt,
          referralCode: user.referralCode,
          referredBy: user.referredBy,
          signupSource: user.signupSource,
          rank: user.rank,
        };

      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),

    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  /* -------------------------------- PAGES ---------------------------------- */
  pages: {
    signIn: "/login",
    error: "/login",
  },

  /* -------------------------------- CALLBACKS ------------------------------ */
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      // Initial login
      if (user) {
        token.id = user.id;
        token.email = user.email!;
        token.username = user.username;
        token.image = user.image;
        token.role = user.role;
        token.isAdmin = user.isAdmin;
        token.isVerified = user.isVerified;
      }

      // Handle updates
      if (trigger === "update" && session?.user) {
        token.name = session.user.name;
        token.image = session.user.image;
        token.username = session.user.username;
      }

      if (account) {
        token.provider = account.provider;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email ?? null;
        session.user.name = token.name;
        session.user.image = token.image;
        session.user.username = token.username;
        session.user.role = token.role;
        session.user.isAdmin = token.isAdmin;
        session.user.isVerified = token.isVerified;
      }
      return session;
    },

    async signIn() {
      return true;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      return `${baseUrl}/dashboard`;
    },
  },

  /* -------------------------------- EVENTS --------------------------------- */
  events: {
    async signIn({ user, account, isNewUser }) {
      console.log(`✅ User signed in: ${user.email} via ${account?.provider}`);

      if (isNewUser && user.id) {
        try {
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

          await prisma.notificationPreferences.upsert({
            where: { userId: user.id },
            update: {},
            create: {
              userId: user.id,
              enabled: true,
              emailEnabled: true,
              pushEnabled: false,
              inAppEnabled: true,
              smsEnabled: false,

              goalReminders: true,
              goalCompleted: true,

              streakAlerts: true,
              syncComplete: false,
              syncFailed: true,

              weeklyReport: true,
              monthlyReport: false,

              securityAlerts: true,
              billingAlerts: true,

              newFeatures: true,
              tips: true,
              communityUpdates: false,
              marketingEmails: false,

              quietHoursEnabled: false,
              quietHoursStart: "22:00",
              quietHoursEnd: "08:00",
              quietHoursTimezone: "UTC",

              digestEnabled: false,
              digestFrequency: "daily",
              digestTime: "09:00",
              digestDay: 1,

              dndEnabled: false,
              dndUntil: null,
            },
          });

          console.log(`✅ Default settings created for user ${user.id}`);
        } catch (err) {
          console.error("❌ Failed to create user defaults:", err);
        }
      }
    },

    async signOut({ token }) {
      console.log(`🚪 User signed out: ${token?.email}`);
    },
  },
};