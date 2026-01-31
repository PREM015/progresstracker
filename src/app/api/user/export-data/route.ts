// src/app/api/user/export-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ExportFormat, ExportStatus } from '@prisma/client';

// GET - List export jobs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');

    const [exports, total] = await Promise.all([
      prisma.exportJob.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.exportJob.count({ where: { userId: session.user.id } }),
    ]);

    return NextResponse.json({
      success: true,
      data: exports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching exports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exports' },
      { status: 500 }
    );
  }
}

// POST - Create new export job
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      format = 'JSON',
      dateFrom,
      dateTo,
      platforms = [],
      categories = [],
      includeNotes = true,
      includeStats = true,
    } = body;

    // Validate format
    if (!Object.values(ExportFormat).includes(format)) {
      return NextResponse.json(
        { error: 'Invalid export format' },
        { status: 400 }
      );
    }

    // Check subscription limits
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const exportsThisMonth = await prisma.exportJob.count({
      where: {
        userId: session.user.id,
        createdAt: { gte: monthStart },
      },
    });

    const exportLimit = subscription?.exportLimitMonthly || 3;
    if (exportsThisMonth >= exportLimit) {
      return NextResponse.json(
        { error: `Export limit reached. You can export ${exportLimit} times per month.` },
        { status: 429 }
      );
    }

    // Create export job
    const exportJob = await prisma.exportJob.create({
      data: {
        userId: session.user.id,
        format: format as ExportFormat,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
        platforms,
        categories,
        includeNotes,
        includeStats,
        status: ExportStatus.QUEUED,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // In production, you'd queue this job for async processing
    // For now, we'll process it synchronously
    await processExportJob(exportJob.id, session.user.id);

    // Fetch updated job
    const updatedJob = await prisma.exportJob.findUnique({
      where: { id: exportJob.id },
    });

    return NextResponse.json({
      success: true,
      data: updatedJob,
      message: 'Export job created successfully',
    });
  } catch (error) {
    console.error('Error creating export:', error);
    return NextResponse.json(
      { error: 'Failed to create export' },
      { status: 500 }
    );
  }
}

async function processExportJob(jobId: string, userId: string) {
  try {
    // Update status to processing
    await prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: ExportStatus.PROCESSING,
        startedAt: new Date(),
      },
    });

    const job = await prisma.exportJob.findUnique({ where: { id: jobId } });
    if (!job) return;

    // Build query conditions
    const whereClause: any = { userId };
    if (job.dateFrom || job.dateTo) {
      whereClause.date = {};
      if (job.dateFrom) whereClause.date.gte = job.dateFrom;
      if (job.dateTo) whereClause.date.lte = job.dateTo;
    }
    if (job.platforms.length > 0) {
      whereClause.platformId = { in: job.platforms };
    }
    if (job.categories.length > 0) {
      whereClause.category = { in: job.categories };
    }

    // Fetch data
    const [entries, goals, achievements, platforms] = await Promise.all([
      prisma.trackerEntry.findMany({
        where: whereClause,
        include: {
          platform: { select: { name: true, slug: true } },
        },
        orderBy: { date: 'desc' },
      }),
      job.includeStats
        ? prisma.goal.findMany({
            where: { userId },
            select: {
              title: true,
              description: true,
              target: true,
              progress: true,
              status: true,
              startDate: true,
              endDate: true,
            },
          })
        : [],
      job.includeStats
        ? prisma.userAchievement.findMany({
            where: { userId },
            include: {
              achievement: { select: { title: true, description: true, tier: true } },
            },
          })
        : [],
      prisma.userPlatform.findMany({
        where: { userId, isActive: true },
        include: {
          platform: { select: { name: true, slug: true } },
        },
      }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: { id: userId },
      entries: entries.map((e) => ({
        ...e,
        notes: job.includeNotes ? e.notes : undefined,
      })),
      goals,
      achievements,
      platforms: platforms.map((p) => ({
        platform: p.platform.name,
        username: p.username,
        connectedAt: p.createdAt,
      })),
    };

    // Generate file based on format
    let fileContent: string;
    let mimeType: string;
    let extension: string;

    switch (job.format) {
      case 'JSON':
        fileContent = JSON.stringify(exportData, null, 2);
        mimeType = 'application/json';
        extension = 'json';
        break;
      case 'CSV':
        fileContent = convertToCSV(entries);
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      default:
        fileContent = JSON.stringify(exportData, null, 2);
        mimeType = 'application/json';
        extension = 'json';
    }

    // In production, save to cloud storage
    const fileName = `export-${userId}-${Date.now()}.${extension}`;
    const fileUrl = `/api/exports/${jobId}/download`; // Placeholder

    await prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: ExportStatus.COMPLETED,
        completedAt: new Date(),
        totalRecords: entries.length,
        exportedRecords: entries.length,
        fileUrl,
        fileName,
        fileSize: Buffer.byteLength(fileContent, 'utf8'),
        fileMimeType: mimeType,
      },
    });
  } catch (error) {
    await prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: ExportStatus.FAILED,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}

function convertToCSV(entries: any[]): string {
  if (entries.length === 0) return '';
  
  const headers = [
    'date',
    'platform',
    'problemsSolved',
    'commits',
    'timeSpent',
    'notes',
  ];
  
  const rows = entries.map((e) => [
    e.date.toISOString().split('T')[0],
    e.platform?.name || '',
    e.problemsSolved,
    e.commits,
    e.timeSpent,
    `"${(e.notes || '').replace(/"/g, '""')}"`,
  ]);
  
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}