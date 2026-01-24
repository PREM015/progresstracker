import { NextRequest, NextResponse } from "next/server";import { logger } from '@/lib/logger';
/**
 * Google OAuth Callback Handler
 * NextAuth handles this automatically
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    console.error("Google OAuth error:", error);
    return NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  // NextAuth will handle the rest
  return NextResponse.redirect(new URL("/api/auth/callback/google", request.url));
}