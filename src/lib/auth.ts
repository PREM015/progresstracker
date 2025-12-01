import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
// import LinkedInProvider from "next-auth/providers/linkedin"; // Uncomment when you have LinkedIn OAuth setup
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authService } from "@/services/authService";

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

        // Verify user credentials
        const user = await authService.verifyCredentials(
          credentials.email,
          credentials.password
        );

        if (!user) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),

    // ===== GITHUB OAUTH PROVIDER =====
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email repo", // Request repo access for GitHub sync
        },
      },
    }),

    // ===== GOOGLE OAUTH PROVIDER =====
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),

    // ===== LINKEDIN OAUTH PROVIDER (OPTIONAL) =====
    // Uncomment when you have LinkedIn OAuth credentials
    // LinkedInProvider({
    //   clientId: process.env.LINKEDIN_CLIENT_ID!,
    //   clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
    //   authorization: {
    //     params: {
    //       scope: "openid profile email w_member_social",
    //     },
    //   },
    // }),
  ],

  // ===== SESSION CONFIGURATION =====
  session: {
    strategy: "jwt", // Use JWT for stateless sessions
     maxAge: 30 * 60,  // 30 days
  },

  // ===== JWT CONFIGURATION =====
  jwt: {
    maxAge: 30 * 60,  // 30 days
  },

  // ===== CUSTOM PAGES =====
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login", // Error code passed in query string as ?error=
    newUser: "/dashboard", // Redirect new users here after first sign in
  },

  // ===== CALLBACKS =====
  callbacks: {
    // Called whenever a JWT is created or updated
    async jwt({ token, user, account, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }

      // Store OAuth access token for platform syncing
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;

        // Save OAuth tokens to database for future sync
        if (account.access_token) {
          await authService.saveOAuthToken(
            user.id,
            account.provider,
            account.access_token,
            account.refresh_token,
            account.expires_at
          );
        }
      }

      // Update token when session is updated (e.g., profile change)
      if (trigger === "update" && session) {
        token.name = session.user.name;
        token.picture = session.user.image;
      }

      return token;
    },

    // Called whenever session is checked
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }
      return session;
    },

    // Called when user is redirected to a callback URL
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  // ===== EVENTS =====
  events: {
    async signIn({ user, account, isNewUser }) {
      console.log(`✅ User signed in: ${user.email} (${account?.provider})`);

      // Create default settings for new users
      if (isNewUser) {
        await authService.createDefaultUserSettings(user.id);
      }
    },
    async signOut({ token }) {
      console.log(`🚪 User signed out: ${token.email}`);
    },
  },

  // ===== DEBUG MODE (Disable in production) =====
  debug: process.env.NODE_ENV === "development",

  // ===== SECRET =====
  secret: process.env.NEXTAUTH_SECRET,
};