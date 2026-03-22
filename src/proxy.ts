import { withAuth } from "next-auth/middleware";
import { NextResponse, NextRequest } from "next/server";
import { Redis } from "@upstash/redis";

// ─── Routes that DON'T require authentication ───────────────
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/signup',
  '/magic-link',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth/error',
  '/about',
  '/privacy',
  '/terms',
  '/contact',
  '/blog',
  '/changelog',
  '/pricing',
  '/features',
  '/maintenance',
  '/offline',
  '/newsletter',
  '/api/auth',
  '/api/cron',
  '/api/platforms',
  '/api/leaderboard',
  '/api/achievements'
];

// ─── Routes that authenticated users should be REDIRECTED from ──
const AUTH_ONLY_PATHS = [
  '/login',
  '/register',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/magic-link',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isAuthOnlyPath(pathname: string): boolean {
  return AUTH_ONLY_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

// -------------------
// Security Headers
// -------------------
const securityHeaders = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-XSS-Protection': '1; mode=block',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
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

// ✅ Helper function - Static files ko check karo
function isStaticFile(pathname: string): boolean {
  const staticExtensions = [
    '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.webmanifest',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.mp4', '.webm', '.mp3', '.wav',
  ];

  return staticExtensions.some(ext => pathname.endsWith(ext));
}

// -------------------
// Merged Proxy Middleware
// -------------------
export default withAuth(
  async function middleware(req: any) {
    const { pathname } = req.nextUrl;

    // ✅ Static files ko directly pass karo (middleware execute na ho)
    if (isStaticFile(pathname)) {
      return NextResponse.next();
    }

    const token = req.nextauth?.token;
    const isAuthenticated = !!token;

    // ── Redirect authenticated users away from auth pages ──────
    if (isAuthenticated && isAuthOnlyPath(pathname)) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    const response = NextResponse.next();

    // Add security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Rate limiting only for API
    if (pathname.startsWith("/api") && !pathname.startsWith('/api/auth') && !pathname.startsWith('/api/cron')) {
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
        const pathname = req.nextUrl.pathname;

        // ✅ Static files ko skip karo
        if (isStaticFile(pathname)) {
          return true;
        }

        // Public paths
        if (isPublicPath(pathname)) {
          return true;
        }

        // Admin routes
        if (pathname.startsWith("/admin")) return token?.role === "admin" || token?.isAdmin === true;

        // All other routes require login
        return !!token;
      },
    },
  }
);

// -------------------
// Matcher - More Specific
// -------------------
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|icon-.*|manifest\\.webmanifest|sitemap\\.xml|robots\\.txt|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.webp$|.*\\.ico$|.*\\.css$|.*\\.js$|.*\\.woff2?$|.*\\.ttf$|.*\\.map$|api/auth|api/cron).*)',
  ],
};