// src/app/api/user/username/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;
const RESERVED_USERNAMES = [
  'admin', 'api', 'www', 'mail', 'support', 'help', 'about',
  'privacy', 'terms', 'settings', 'profile', 'user', 'users',
  'dashboard', 'login', 'logout', 'signup', 'register', 'auth',
  'null', 'undefined', 'system', 'root', 'administrator',
];

// GET - Check username availability
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    const validation = validateUsername(username);
    if (!validation.valid) {
      return NextResponse.json({
        success: true,
        data: {
          available: false,
          reason: validation.reason,
        },
      });
    }

    // Check if username is taken
    const existingUser = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        available: !existingUser,
        reason: existingUser ? 'Username is already taken' : null,
      },
    });
  } catch (error) {
    console.error('Error checking username:', error);
    return NextResponse.json(
      { error: 'Failed to check username availability' },
      { status: 500 }
    );
  }
}

// PUT - Update username
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Validate username format
    const validation = validateUsername(username);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.reason },
        { status: 400 }
      );
    }

    const normalizedUsername = username.toLowerCase();

    // Check if username is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        username: normalizedUsername,
        NOT: { id: session.user.id },
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      );
    }

    // Get current username for audit log
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { username: true },
    });

    // Update username
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        username: normalizedUsername,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        username: true,
        updatedAt: true,
      },
    });

    // Log the change
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        category: 'user',
        entityType: 'username',
        entityId: session.user.id,
        description: 'Username changed',
        oldValue: { username: currentUser?.username },
        newValue: { username: normalizedUsername },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'Username updated successfully',
    });
  } catch (error) {
    console.error('Error updating username:', error);
    return NextResponse.json(
      { error: 'Failed to update username' },
      { status: 500 }
    );
  }
}

// POST - Generate username suggestions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { base } = body;

    if (!base) {
      return NextResponse.json(
        { error: 'Base name is required' },
        { status: 400 }
      );
    }

    // Clean base name
    const cleanBase = base.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);

    if (cleanBase.length < 3) {
      return NextResponse.json(
        { error: 'Base name too short' },
        { status: 400 }
      );
    }

    // Generate suggestions
    const suggestions: string[] = [];
    const variations = [
      cleanBase,
      `${cleanBase}_dev`,
      `${cleanBase}${Math.floor(Math.random() * 1000)}`,
      `the_${cleanBase}`,
      `${cleanBase}_codes`,
      `${cleanBase}${new Date().getFullYear() % 100}`,
    ];

    for (const variation of variations) {
      if (suggestions.length >= 5) break;

      if (!USERNAME_REGEX.test(variation)) continue;
      if (RESERVED_USERNAMES.includes(variation)) continue;

      const exists = await prisma.user.findUnique({
        where: { username: variation },
        select: { id: true },
      });

      if (!exists) {
        suggestions.push(variation);
      }
    }

    // If we don't have enough, generate random ones
    let attempts = 0;
    while (suggestions.length < 5 && attempts < 10) {
      const random = `${cleanBase}${Math.floor(Math.random() * 10000)}`;
      if (!suggestions.includes(random)) {
        const exists = await prisma.user.findUnique({
          where: { username: random },
          select: { id: true },
        });
        if (!exists) {
          suggestions.push(random);
        }
      }
      attempts++;
    }

    return NextResponse.json({
      success: true,
      data: { suggestions },
    });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

function validateUsername(username: string): { valid: boolean; reason?: string } {
  if (!username) {
    return { valid: false, reason: 'Username is required' };
  }

  if (username.length < 3) {
    return { valid: false, reason: 'Username must be at least 3 characters' };
  }

  if (username.length > 30) {
    return { valid: false, reason: 'Username must be 30 characters or less' };
  }

  if (!USERNAME_REGEX.test(username)) {
    return {
      valid: false,
      reason: 'Username can only contain letters, numbers, underscores, and hyphens',
    };
  }

  if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
    return { valid: false, reason: 'This username is reserved' };
  }

  return { valid: true };
}