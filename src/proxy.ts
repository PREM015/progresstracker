import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        // Public paths that don't need auth (even if in matcher)
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
        ) {
          return true;
        }

        // Admin routes
        if (path.startsWith("/admin")) {
          return token?.role === "admin" || token?.isAdmin === true;
        }

        // Protected routes (Dashboard, Settings, API)
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|images|icons).*)",
  ],
};