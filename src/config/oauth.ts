// ===== FILE: src/config/oauth.ts =====
/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * Validate OAuth environment variables at startup
 */
export function validateOAuthProviders() {
  const required = {
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    const errorMsg = `Missing OAuth credentials: ${missing.join(", ")}. Please set these in your .env file.`;
    if (process.env.NODE_ENV === "production") {
      throw new Error(errorMsg);
    } else {
      console.warn(`⚠️  ${errorMsg}`);
    }
  }
}

// Validate on module load (server-side only)
if (typeof window === "undefined") {
  validateOAuthProviders();
}

export const OAUTH_PROVIDERS = {
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    scope: "read:user user:email",
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    scope: "openid email profile",
  },
} as const; 