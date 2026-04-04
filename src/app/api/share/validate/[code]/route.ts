import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import apiResponse from "@/lib/apiResponse";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  try {
    const code = (await params).code;
    
    if (!code || code.length < 4) {
      return apiResponse.validationError('Invalid share code format', undefined);
    }

    // Find share link
    const shareLink = await prisma.shareLink.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        entityId: true,
        entityType: true,
        expiresAt: true,
        createdAt: true,
        _count: {
          select: { viewLogs: true },
        },
      },
    });

    if (!shareLink) {
      return apiResponse.notFound('Share code not found');
    }

    // Check if expired
    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
      return apiResponse.validationError('Share code has expired', undefined);
    }

    // Get shared entity details
    let entityDetails = null;
    const {entityId, entityType} = shareLink;

    if ((entityType as string) === 'report' && entityId) {
      entityDetails = await prisma.report.findUnique({
        where: { id: entityId },
        select: { id: true, title: true, type: true, summary: true },
      });
    } else if ((entityType as string) === 'goal' && entityId) {
      entityDetails = await prisma.goal.findUnique({
        where: { id: entityId },
        select: { id: true, title: true, status: true, progress: true, target: true },
      });
    }

    // Log the view
    await prisma.shareViewLog.create({
      data: {
        shareLinkId: shareLink.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      } as any,
    }).catch(() => {
      // Ignore logging errors
    });

    logger.info('Share code validated', { code, entityType, viewCount: (shareLink as any)._count?.viewLogs });

    return apiResponse.success({
      code: shareLink.code,
      type: shareLink.entityType,
      entity: entityDetails,
      expiresAt: shareLink.expiresAt,
      viewCount: (shareLink as any)._count?.viewLogs,
      isValid: true,
    });
  } catch (error) {
    logger.error('Share validation failed', {}, error);
    return apiResponse.internalError('Failed to validate share code');
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}
