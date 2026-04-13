import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// ============================================================================
// SECURITY HEADERS
// Applied to all routes. CSP nonces are handled per-request in middleware.ts.
// ============================================================================
const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Prevent clickjacking
  { key: "X-Frame-Options", value: "DENY" },
  // Enable browser XSS filtering (legacy browsers)
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // HSTS: force HTTPS for 1 year including subdomains
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  // Strict referrer policy
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable browser features we don't use
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=()",
  },
  // DNS prefetch for performance while keeping security
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Content Security Policy
  // Note: 'unsafe-inline' for scripts is NOT set; use nonces in middleware for strict CSP.
  // 'unsafe-inline' for styles is required for many CSS-in-JS libraries.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Allow scripts from self + nonce-based inline (nonce injected by middleware)
      // Sentry CDN + tunnelRoute monitoring allowed
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://*.sentry.io",
      // Styles: self + inline needed for Tailwind/shadcn
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Images: self, data URIs (avatars), all HTTPS (external platform avatars/badges)
      "img-src 'self' data: blob: https:",
      // Fonts: self + Google Fonts
      "font-src 'self' https://fonts.gstatic.com",
      // Fetch/XHR/WebSocket: self + SSE + Stripe + Sentry
      "connect-src 'self' wss: https://api.stripe.com https://*.sentry.io https://o4510561499873280.ingest.sentry.io",
      // Frames: Stripe payment elements only
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      // Workers: self only (service worker)
      "worker-src 'self' blob:",
      // No external form actions
      "form-action 'self'",
      // Block embedding in iframes entirely
      "frame-ancestors 'none'",
      // Upgrade HTTP to HTTPS
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["ioredis", "bullmq", "puppeteer", "fs", "path", "crypto"],

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent fs/path modules from being bundled client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },

  // Explicitly define output file tracing exclusions
  outputFileTracingExcludes: {
    '*': [
      './node_modules/@swc/core-linux-x64-gnu',
      './node_modules/@swc/core-linux-x64-musl',
      './node_modules/@esbuild/**/*',
    ],
  },

  // Scope file tracing to prevent whole-project tracing
  outputFileTracingRoot: process.cwd(),

  // Hide "X-Powered-By: Next.js" header — prevents fingerprinting
  poweredByHeader: false,
  
  // Better error reporting
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  async headers() {
    return [
      // ── Security headers on all routes ───────────────────────────────
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      // ── Static asset caching ─────────────────────────────────────────
      {
        source: "/:all*(svg|jpg|png|webp|avif|ico)",
        locale: false,
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // ── SSE endpoints: disable buffering ─────────────────────────────
      {
        source: "/api/sse/:path*",
        headers: [
          { key: "X-Accel-Buffering", value: "no" },
          { key: "Cache-Control", value: "no-cache, no-transform" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "premraj",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
