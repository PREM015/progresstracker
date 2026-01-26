// src/app/api/user/delete/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { UserService } from '@/services/userService';

/**
 * DELETE /api/user/delete - Soft delete user account
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { password, confirmation } = body;

    if (confirmation !== 'DELETE') {
      return NextResponse.json(
        { error: 'Invalid confirmation' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    await UserService.deleteAccount(session.user.id, password);

    return NextResponse.json({
      message: 'Account deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    logger.error('Delete account error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}