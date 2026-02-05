// /* eslint-disable @typescript-eslint/no-explicit-any */
// // src/app/api/auth/logout/route.ts
// // Logout user and invalidate sessions

// import { NextRequest, NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth';
// import crypto from 'crypto';

// import { authOptions } from '@/lib/auth';
// import { prisma } from '@/lib/prisma';
// import { logger } from '@/lib/logger';

// // =============================================================================
// // CONFIGURATION
// // =============================================================================

// const CONSTANT_TIME_MS = 200;

// // =============================================================================
// // HELPERS
// // =============================================================================

// function generateRequestId(): string {
//   return `req_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`;
// }

// function getClientIP(req: NextRequest): string {
//   return (
//     req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
//     req.headers.get('x-real-ip') ??
//     'unknown'
//   );
// }

// async function constantTimeDelay(start: number): Promise<void> {
//   const elapsed = Date.now() - start;
//   const remaining = Math.max(0, CONSTANT_TIME_MS - elapsed);
//   if (remaining > 0) {
//     await new Promise((r) => setTimeout(r, remaining));
//   }
// }

// function secureResponse(body: object, status: number, requestId: string): NextResponse {
//   const res = NextResponse.json(body, { status });
//   res.headers.set('X-Request-ID', requestId);
//   res.headers.set('X-Content-Type-Options', 'nosniff');
//   res.headers.set('X-Frame-Options', 'DENY');
//   res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
//   res.headers.set('Pragma', 'no-cache');
//   return res;
// }

// // =============================================================================
// // POST - Logout
// // =============================================================================

// export async function POST(req: NextRequest): Promise<NextResponse> {
//   const start = Date.now();
//   const requestId = generateRequestId();
//   const clientIP = getClientIP(req);

//   try {
//     const session = await getServerSession(authOptions);

//     if (!session?.user?.id) {
//       await constantTimeDelay(start);
//       return secureResponse(
//         { success: true, message: 'Already logged out' },
//         200,
//         requestId
//       );
//     }

//     const userId = session.user.id;

//     // Get current session token from cookies
//     const currentSessionToken =
//       req.cookies.get('next-auth.session-token')?.value ||
//       req.cookies.get('__Secure-next-auth.session-token')?.value;

//     // Parse request body for options
//     let revokeAll = false;
//     try {
//       const body = await req.json();
//       revokeAll = body?.revokeAll === true;
//     } catch {
//       // No body or invalid JSON - continue with default behavior
//     }

//     await prisma.$transaction(async (tx: { activeSession: { updateMany: (arg0: { where: { userId: string; } | { userId: string; token: string; }; data: { isValid: boolean; revokedAt: Date; revokedReason: string; } | { isValid: boolean; revokedAt: Date; revokedReason: string; }; }) => any; }; refreshToken: { updateMany: (arg0: { where: { userId: string; isValid: boolean; }; data: { isValid: boolean; revokedAt: Date; revokedReason: string; }; }) => any; }; session: { deleteMany: (arg0: { where: { userId: string; }; }) => any; }; auditLog: { create: (arg0: { data: { userId: string; action: string; category: string; entityType: string; description: string; ipAddress: string; userAgent: string | undefined; status: string; }; }) => any; }; }) => {
//       if (revokeAll) {
//         // Revoke all sessions
//         await tx.activeSession.updateMany({
//           where: { userId },
//           data: {
//             isValid: false,
//             revokedAt: new Date(),
//             revokedReason: 'logout_all',
//           },
//         });

//         // Revoke all refresh tokens
//         await tx.refreshToken.updateMany({
//           where: { userId, isValid: true },
//           data: {
//             isValid: false,
//             revokedAt: new Date(),
//             revokedReason: 'logout_all',
//           },
//         });

//         // Delete NextAuth sessions
//         await tx.session.deleteMany({ where: { userId } });
//       } else if (currentSessionToken) {
//         // Revoke only current session
//         await tx.activeSession.updateMany({
//           where: {
//             userId,
//             token: currentSessionToken,
//           },
//           data: {
//             isValid: false,
//             revokedAt: new Date(),
//             revokedReason: 'user_logout',
//           },
//         });
//       }

//       // Create audit log
//       await tx.auditLog.create({
//         data: {
//           userId,
//           action: 'LOGOUT',
//           category: 'auth',
//           entityType: 'session',
//           description: revokeAll ? 'User logged out from all devices' : 'User logged out',
//           ipAddress: clientIP,
//           userAgent: req.headers.get('user-agent')?.slice(0, 255),
//           status: 'success',
//         },
//       });
//     });

//     logger.info('User logged out', {
//       userId,
//       revokeAll,
//       ip: clientIP,
//       requestId,
//     });

//     await constantTimeDelay(start);

//     // Create response with cookie clearing
//     const response = secureResponse(
//       {
//         success: true,
//         message: revokeAll ? 'Logged out from all devices' : 'Logged out successfully',
//       },
//       200,
//       requestId
//     );

//     // Clear auth cookies
//     response.cookies.set('next-auth.session-token', '', {
//       expires: new Date(0),
//       path: '/',
//     });
//     response.cookies.set('__Secure-next-auth.session-token', '', {
//       expires: new Date(0),
//       path: '/',
//       secure: true,
//     });

//     return response;

//   } catch (error) {
//     logger.error('Logout error', { ip: clientIP, requestId }, error);
//     await constantTimeDelay(start);
//     return secureResponse(
//       { success: false, error: 'Logout failed', code: 'INTERNAL_ERROR' },
//       500,
//       requestId
//     );
//   }
// }

// // =============================================================================
// // OTHER METHODS
// // =============================================================================

// export async function GET(): Promise<NextResponse> {
//   return secureResponse(
//     { error: 'Method not allowed. Use POST to logout.', code: 'METHOD_NOT_ALLOWED' },
//     405,
//     generateRequestId()
//   );
// }

// export async function PUT(): Promise<NextResponse> {
//   return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
// }

// export async function PATCH(): Promise<NextResponse> {
//   return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
// }

// export async function DELETE(): Promise<NextResponse> {
//   return secureResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405, generateRequestId());
// }

// export async function OPTIONS(): Promise<NextResponse> {
//   const res = new NextResponse(null, { status: 204 });
//   res.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
//   res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
//   res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//   return res;
// }

// export async function HEAD(): Promise<NextResponse> {
//   return new NextResponse(null, { status: 200 });
// }

// export const dynamic = 'force-dynamic';
// export const runtime = 'nodejs';

// app/api/auth/logout-custom/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Not authenticated' 
      }, { status: 401 });
    }

    const userId = session.user.id;

    // Clear all active sessions
    await prisma.activeSession.updateMany({
      where: { 
        userId,
        isValid: true 
      },
      data: { 
        isValid: false,
        revokedAt: new Date(),
        revokedReason: 'user_logout'
      }
    });

    // Clear all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { 
        userId,
        isValid: true 
      },
      data: { 
        isValid: false,
        revokedAt: new Date(),
        revokedReason: 'user_logout'
      }
    });

    // Update last active timestamp
    await prisma.user.update({
      where: { id: userId },
      data: { 
        lastActiveAt: new Date()
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'LOGOUT',
        category: 'auth',
        entityType: 'session',
        description: 'User logged out',
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown',
        userAgent: req.headers.get('user-agent')?.slice(0, 255),
        status: 'success'
      }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Logged out successfully' 
    });

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Logout failed' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    error: 'Method not allowed' 
  }, { status: 405 });
}
