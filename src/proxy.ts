import { withAuth } from "next-auth/middleware";
import { NextResponse, NextRequest } from "next/server";
import { Redis } from "@upstash/redis";

// -------------------
// Security Headers
// -------------------
const securityHeaders = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-XSS-Protection': '1; mode=block',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
};

// -------------------
// Rate Limiting Setup
// -------------------
const RATE_LIMIT_WINDOW = 60; // seconds
const RATE_LIMIT_MAX = 100;

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = (redisUrl && redisToken && !redisUrl.includes("your-upstash"))
  ? new Redis({ url: redisUrl, token: redisToken })
  : null;

async function rateLimit(request: NextRequest) {
  if (!redis) return { success: true, limit: RATE_LIMIT_MAX, remaining: RATE_LIMIT_MAX, reset: 0 };

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const key = `ratelimit:global:${ip}`;

  try {
    const [count] = await redis.pipeline()
      .incr(key)
      .expire(key, RATE_LIMIT_WINDOW)
      .exec() as [number, unknown];

    const currentUsage = count;
    const isRateLimited = currentUsage > RATE_LIMIT_MAX;

    return {
      success: !isRateLimited,
      limit: RATE_LIMIT_MAX,
      remaining: Math.max(0, RATE_LIMIT_MAX - currentUsage),
      reset: Date.now() + RATE_LIMIT_WINDOW * 1000,
    };
  } catch (err) {
    console.error("Rate limit error:", err);
    return { success: true, limit: RATE_LIMIT_MAX, remaining: RATE_LIMIT_MAX, reset: 0 };
  }
}

// -------------------
// Merged Proxy Middleware
// -------------------
export default withAuth(
  async function middleware(req: NextRequest) {
    const response = NextResponse.next();

    // Add security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Rate limiting only for API
    if (req.nextUrl.pathname.startsWith("/api")) {
      const { success, limit, remaining, reset } = await rateLimit(req);
      response.headers.set("X-RateLimit-Limit", limit.toString());
      response.headers.set("X-RateLimit-Remaining", remaining.toString());
      response.headers.set("X-RateLimit-Reset", reset.toString());

      if (!success) {
        return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
          status: 429,
          headers: { "Content-Type": "application/json", ...securityHeaders },
        });
      }
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        // Public paths
        if (
          path.startsWith("/login") ||
          path.startsWith("/register") ||
          path.startsWith("/api/auth") ||
          path.startsWith("/api/platforms") ||
          path.startsWith("/api/leaderboard") ||
          path.startsWith("/api/achievements") ||
          path.startsWith("/verify-email") ||
          path.startsWith("/reset-password") ||
          path === "/"
        ) return true;

        // Admin routes
        if (path.startsWith("/admin")) return token?.role === "admin" || token?.isAdmin === true;

        // All other routes require login
        return !!token;
      },
    },
  }
);

// -------------------
// Matcher
// -------------------
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|images|icons).*)",
  ],
};