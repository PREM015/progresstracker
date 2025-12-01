import { NextRequest, NextResponse } from "next/server";

/**
 * GitHub OAuth Callback Handler
 * NextAuth handles this automatically, but you can add custom logic here
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    console.error("GitHub OAuth error:", error);
    return NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  // NextAuth will handle the rest
  return NextResponse.redirect(new URL("/api/auth/callback/github", request.url));
}