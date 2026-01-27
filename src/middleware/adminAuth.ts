import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * adminAuth
 * 
 * @description Middleware for authentication/authorization
 * @created 2026-01-26
 */

export async function adminAuth(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Check if user is authenticated
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // TODO: Add additional authorization checks

  return NextResponse.next();
}

export default adminAuth;
