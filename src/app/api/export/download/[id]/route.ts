import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { applyRateLimit } from '@/lib/server/redis-rate-limit';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CacheService } from '@/services/cacheService';

export async function GET(
  request: NextRequest, { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    // Strict rate limit for data export downloads
    const rateLimitResult = await applyRateLimit('export', userId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many export requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter || 60) } }
      );
    }

    const { id } = await params;

    const exportJob = await prisma.exportJob.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!exportJob || exportJob.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Export not found or not ready' }, { status: 404 });
    }

    const cacheKey = `export:file:${id}`;
    const cachedFile = await CacheService.get(cacheKey);

    if (!cachedFile) {
      return NextResponse.json({ error: "Export file has expired or doesn't exist" }, { status: 410 });
    }

    // Audit log the export download
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'EXPORT_DATA',
          category: 'security',
          description: `Downloaded data export: ${exportJob.fileName || id}`,
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip'),
          metadata: { exportId: id, format: exportJob.format },
        }
      });
    } catch (e) {
      // Non-blocking failure
    }

    const body = typeof cachedFile === 'string' 
      ? new Uint8Array(Buffer.from(cachedFile, 'base64')) 
      : new Uint8Array(cachedFile as Buffer | Uint8Array);

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="${exportJob.fileName || `export-${exportJob.format.toLowerCase()}`}"`,
        'Content-Type': exportJob.fileMimeType || 'application/octet-stream',
        'Cache-Control': 'private, no-cache, no-store, max-age=0',
      }
    });

  } catch (error) {
    console.error('[EXPORT_DOWNLOAD_ID_GET]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
