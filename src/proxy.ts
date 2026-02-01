import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
/* eslint-disable @typescript-eslint/no-unused-vars */

export default withAuth(
  function middleware(req) {
    // Additional custom logic can go here
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // Require token for protected routes
    },
    pages: {
      signIn: "/login", // Redirect here if unauthorized
    },
  }
);

// Protect these routes
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/connections/:path*",
    "/tracker/:path*",
    "/analytics/:path*",
    "/goals/:path*",
    "/settings/:path*",
  ],
};