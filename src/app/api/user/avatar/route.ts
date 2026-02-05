// src/app/api/user/avatar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

/* eslint-disable @typescript-eslint/no-unused-vars */

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// GET - Get current avatar
export async function GET(request: NextRequest) {
  try {
    console.log('Fetching avatar...${request.url}  ');

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        avatar: user?.image,
      },
    });
  } catch (error) {
    console.error('Error fetching avatar:', error);
    return NextResponse.json(
      { error: 'Failed to fetch avatar' },
      { status: 500 }
    );
  }
}

// POST - Upload new avatar
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const extension = file.name.split('.').pop();
    const filename = `${session.user.id}-${uuidv4()}.${extension}`;
    
    // For production, you'd use cloud storage (S3, Cloudinary, etc.)
    // This is a simple local file storage example
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'avatars');
    const filepath = join(uploadDir, filename);
    
    await writeFile(filepath, buffer);

    const avatarUrl = `/uploads/avatars/${filename}`;

    // Delete old avatar if exists
    const oldUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    });

    if (oldUser?.image?.startsWith('/uploads/avatars/')) {
      const oldFilename = oldUser.image.split('/').pop();
      if (oldFilename) {
        try {
          await unlink(join(uploadDir, oldFilename));
        } catch {
          // Ignore if file doesn't exist
        }
      }
    }

    // Update user avatar
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        image: avatarUrl,
        updatedAt: new Date(),
      },
      select: { image: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        avatar: updatedUser.image,
      },
      message: 'Avatar uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    );
  }
}

// DELETE - Remove avatar
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true },
    });

    // Delete file if it's a local upload
    if (user?.image?.startsWith('/uploads/avatars/')) {
      const filename = user.image.split('/').pop();
      if (filename) {
        try {
          const filepath = join(process.cwd(), 'public', 'uploads', 'avatars', filename);
          await unlink(filepath);
        } catch {
          // Ignore if file doesn't exist
        }
      }
    }

    // Update user to remove avatar
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        image: null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Avatar removed successfully',
    });
  } catch (error) {
    console.error('Error removing avatar:', error);
    return NextResponse.json(
      { error: 'Failed to remove avatar' },
      { status: 500 }
    );
  }
}