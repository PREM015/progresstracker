import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  try {
    const code = (await params).code;
    const { searchParams } = request.nextUrl;

    if (!code || code.length < 4) {
      return new NextResponse('Invalid share code', { status: 400 });
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
      },
    });

    if (!shareLink) {
      return new NextResponse('Share code not found', { status: 404 });
    }

    // Check if expired
    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
      return new NextResponse('Share code has expired', { status: 410 });
    }

    // Get customization options from query
    const theme = searchParams.get('theme') || 'light';
    const width = searchParams.get('width') || '100%';
    const height = searchParams.get('height') || '400';
    const showHeader = searchParams.get('header') !== 'false';

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://progresstracker.app';
    const iframeUrl = `${appUrl}/shared/${code}?theme=${theme}${showHeader ? '&header=true' : ''}`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shared Progress Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif; }
    .embed-container { width: 100%; height: 100%; }
    iframe { display: block; border: none; }
  </style>
</head>
<body>
  <div class="embed-container">
    <iframe
      src="${iframeUrl}"
      width="${width}"
      height="${height}"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen=""
      loading="lazy">
    </iframe>
  </div>
</body>
</html>
    `;

    // Log the embed view
    await prisma.shareViewLog.create({
      data: {
        shareLinkId: shareLink.id,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    }).catch(() => {
      // Ignore logging errors
    });

    logger.info('Share embed requested', { code, theme, entityType: shareLink.entityType });

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    logger.error('Share embed failed', {}, error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204 });
}
