// src/app/api/tracker/route.ts
// Complete tracker API with all fields and proper validation

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { PlatformCategory, Prisma } from '@prisma/client';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createEntrySchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  platformId: z.string().optional().nullable(),
  customPlatformId: z.string().optional().nullable(),
  category: z.nativeEnum(PlatformCategory).optional().nullable(),
  subcategory: z.string().optional().nullable(),

  // Primary Metrics
  problemsSolved: z.number().int().min(0).default(0),
  problemsAttempted: z.number().int().min(0).default(0),
  easyProblems: z.number().int().min(0).default(0),
  mediumProblems: z.number().int().min(0).default(0),
  hardProblems: z.number().int().min(0).default(0),

  // Code & Development
  commits: z.number().int().min(0).default(0),
  pullRequests: z.number().int().min(0).default(0),
  pullRequestsMerged: z.number().int().min(0).default(0),
  issuesOpened: z.number().int().min(0).default(0),
  issuesClosed: z.number().int().min(0).default(0),
  codeReviews: z.number().int().min(0).default(0),
  linesOfCode: z.number().int().min(0).default(0),

  // Projects
  projectsStarted: z.number().int().min(0).default(0),
  projectsCompleted: z.number().int().min(0).default(0),

  // Learning
  coursesStarted: z.number().int().min(0).default(0),
  coursesCompleted: z.number().int().min(0).default(0),
  lessonsCompleted: z.number().int().min(0).default(0),
  modulesCompleted: z.number().int().min(0).default(0),
  certificationsEarned: z.number().int().min(0).default(0),
  quizzesTaken: z.number().int().min(0).default(0),
  quizzesPassed: z.number().int().min(0).default(0),

  // Reading & Research
  articlesRead: z.number().int().min(0).default(0),
  tutorialsCompleted: z.number().int().min(0).default(0),
  documentationPages: z.number().int().min(0).default(0),

  // Jobs & Applications
  applicationsSubmitted: z.number().int().min(0).default(0),
  applicationsViewed: z.number().int().min(0).default(0),
  interviewsScheduled: z.number().int().min(0).default(0),
  interviewsCompleted: z.number().int().min(0).default(0),
  offersReceived: z.number().int().min(0).default(0),

  // Competitions
  contestsParticipated: z.number().int().min(0).default(0),
  contestsCompleted: z.number().int().min(0).default(0),
  hackathonsJoined: z.number().int().min(0).default(0),
  hackathonsCompleted: z.number().int().min(0).default(0),

  // Community
  mentoringSessions: z.number().int().min(0).default(0),
  helpGiven: z.number().int().min(0).default(0),
  helpReceived: z.number().int().min(0).default(0),
  postsWritten: z.number().int().min(0).default(0),
  commentsWritten: z.number().int().min(0).default(0),

  // Time Tracking
  timeSpent: z.number().int().min(0).default(0),
  focusTime: z.number().int().min(0).default(0),

  // Quality Metrics
  averageDifficulty: z.number().min(0).max(10).optional().nullable(),
  accuracyRate: z.number().min(0).max(100).optional().nullable(),
  completionRate: z.number().min(0).max(100).optional().nullable(),

  // Platform-specific
  rating: z.number().int().optional().nullable(),
  ratingChange: z.number().int().optional().nullable(),
  rank: z.number().int().optional().nullable(),
  rankChange: z.number().int().optional().nullable(),
  points: z.number().int().optional().nullable(),
  pointsEarned: z.number().int().optional().nullable(),
  streak: z.number().int().optional().nullable(),
  xpEarned: z.number().int().optional().nullable(),

  // Mood & Notes
  mood: z.string().optional().nullable(),
  energyLevel: z.number().int().min(1).max(5).optional().nullable(),
  productivityRating: z.number().int().min(1).max(5).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),

  // Tags
  tags: z.array(z.string()).default([]),
  topics: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),

  // Custom fields
  customFields: z.record(z.unknown()).optional().nullable(),
});

const updateEntrySchema = createEntrySchema.partial().extend({
  id: z.string(),
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function updateUserTotals(userId: string): Promise<void> {
  const aggregates = await prisma.trackerEntry.aggregate({
    where: { userId },
    _sum: {
      problemsSolved: true,
      commits: true,
      projectsCompleted: true,
      certificationsEarned: true,
      points: true,
      pointsEarned: true,
    },
  });

  // Calculate streak
  const entries = await prisma.trackerEntry.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    select: { date: true },
    distinct: ['date'],
    take: 366,
  });

  let currentStreak = 0;
  let longestStreak = 0;
  let lastActivityDate: Date | null = null;

  if (entries.length > 0) {
    lastActivityDate = entries[0].date;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < entries.length; i++) {
      const entryDate = new Date(entries[i].date);
      entryDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - currentStreak);

      const diffDays = Math.floor(
        (expectedDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (i === 0 && diffDays > 1) {
        break;
      }

      if (diffDays === 0 || (i === 0 && diffDays === 1)) {
        currentStreak++;
      } else {
        break;
      }
    }

    longestStreak = currentStreak;
    let tempStreak = 1;
    for (let i = 1; i < entries.length; i++) {
      const prevDate = new Date(entries[i - 1].date);
      const currDate = new Date(entries[i].date);
      prevDate.setHours(0, 0, 0, 0);
      currDate.setHours(0, 0, 0, 0);

      const diff = (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24);

      if (diff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      totalProblems: aggregates._sum.problemsSolved || 0,
      totalCommits: aggregates._sum.commits || 0,
      totalProjects: aggregates._sum.projectsCompleted || 0,
      totalCertifications: aggregates._sum.certificationsEarned || 0,
      totalPoints: (aggregates._sum.points || 0) + (aggregates._sum.pointsEarned || 0),
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      lastActivityDate,
      lastActiveAt: new Date(),
    },
  });
}

function normalizeDate(dateString: string): Date {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date;
}

// =============================================================================
// GET - Fetch entries
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const platformId = searchParams.get('platformId');
    const customPlatformId = searchParams.get('customPlatformId');
    const category = searchParams.get('category');
    const source = searchParams.get('source');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    const where: Prisma.TrackerEntryWhereInput = {
      userId: session.user.id,
    };

    // Date range filter
    if (startDate && endDate) {
      where.date = {
        gte: normalizeDate(startDate),
        lte: normalizeDate(endDate),
      };
    } else if (startDate) {
      where.date = { gte: normalizeDate(startDate) };
    } else if (endDate) {
      where.date = { lte: normalizeDate(endDate) };
    }

    // Platform filter
    if (platformId) {
      where.platformId = platformId;
    }

    if (customPlatformId) {
      where.customPlatformId = customPlatformId;
    }

    // Category filter
    if (category && Object.values(PlatformCategory).includes(category as PlatformCategory)) {
      where.category = category as PlatformCategory;
    }

    // Source filter
    if (source) {
      where.source = source;
    }

    const [entries, total] = await Promise.all([
      prisma.trackerEntry.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          platform: {
            select: {
              id: true,
              name: true,
              slug: true,
              icon: true,
              color: true,
              category: true,
            },
          },
          customPlatform: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
              category: true,
            },
          },
        },
      }),
      prisma.trackerEntry.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching tracker entries:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch entries' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Create entry
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = createEntrySchema.parse(body);

    const entryDate = normalizeDate(validated.date);

    // Check for duplicate entry
    if (validated.platformId) {
      const existing = await prisma.trackerEntry.findFirst({
        where: {
          userId: session.user.id,
          date: entryDate,
          platformId: validated.platformId,
        },
      });

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: 'Entry already exists for this date and platform',
            code: 'DUPLICATE_ENTRY',
            existingId: existing.id,
          },
          { status: 409 }
        );
      }
    }

    // Get category from platform if not provided
    let category = validated.category;
    if (!category && validated.platformId) {
      const platform = await prisma.platform.findUnique({
        where: { id: validated.platformId },
        select: { category: true },
      });
      category = platform?.category || null;
    }
    if (!category && validated.customPlatformId) {
      const customPlatform = await prisma.customPlatform.findUnique({
        where: { id: validated.customPlatformId },
        select: { category: true },
      });
      category = customPlatform?.category || null;
    }

    // Create the entry
    const entry = await prisma.trackerEntry.create({
      data: {
        userId: session.user.id,
        date: entryDate,
        platformId: validated.platformId || null,
        customPlatformId: validated.customPlatformId || null,
        category,
        subcategory: validated.subcategory || null,

        // Primary Metrics
        problemsSolved: validated.problemsSolved,
        problemsAttempted: validated.problemsAttempted,
        easyProblems: validated.easyProblems,
        mediumProblems: validated.mediumProblems,
        hardProblems: validated.hardProblems,

        // Code & Development
        commits: validated.commits,
        pullRequests: validated.pullRequests,
        pullRequestsMerged: validated.pullRequestsMerged,
        issuesOpened: validated.issuesOpened,
        issuesClosed: validated.issuesClosed,
        codeReviews: validated.codeReviews,
        linesOfCode: validated.linesOfCode,

        // Projects
        projectsStarted: validated.projectsStarted,
        projectsCompleted: validated.projectsCompleted,

        // Learning
        coursesStarted: validated.coursesStarted,
        coursesCompleted: validated.coursesCompleted,
        lessonsCompleted: validated.lessonsCompleted,
        modulesCompleted: validated.modulesCompleted,
        certificationsEarned: validated.certificationsEarned,
        quizzesTaken: validated.quizzesTaken,
        quizzesPassed: validated.quizzesPassed,

        // Reading
        articlesRead: validated.articlesRead,
        tutorialsCompleted: validated.tutorialsCompleted,
        documentationPages: validated.documentationPages,

        // Jobs
        applicationsSubmitted: validated.applicationsSubmitted,
        applicationsViewed: validated.applicationsViewed,
        interviewsScheduled: validated.interviewsScheduled,
        interviewsCompleted: validated.interviewsCompleted,
        offersReceived: validated.offersReceived,

        // Competitions
        contestsParticipated: validated.contestsParticipated,
        contestsCompleted: validated.contestsCompleted,
        hackathonsJoined: validated.hackathonsJoined,
        hackathonsCompleted: validated.hackathonsCompleted,

        // Community
        mentoringSessions: validated.mentoringSessions,
        helpGiven: validated.helpGiven,
        helpReceived: validated.helpReceived,
        postsWritten: validated.postsWritten,
        commentsWritten: validated.commentsWritten,

        // Time
        timeSpent: validated.timeSpent,
        focusTime: validated.focusTime,

        // Quality Metrics
        averageDifficulty: validated.averageDifficulty ?? null,
        accuracyRate: validated.accuracyRate ?? null,
        completionRate: validated.completionRate ?? null,

        // Platform-specific
        rating: validated.rating ?? null,
        ratingChange: validated.ratingChange ?? null,
        rank: validated.rank ?? null,
        rankChange: validated.rankChange ?? null,
        points: validated.points ?? null,
        pointsEarned: validated.pointsEarned ?? null,
        streak: validated.streak ?? null,
        xpEarned: validated.xpEarned ?? null,

        // Mood & Notes
        mood: validated.mood || null,
        energyLevel: validated.energyLevel ?? null,
        productivityRating: validated.productivityRating ?? null,
        notes: validated.notes || null,

        // Tags
        tags: validated.tags,
        topics: validated.topics,
        languages: validated.languages,

        // Source
        source: 'manual',
        isAutoGenerated: false,
        isVerified: false,

        // Custom fields
        customFields: validated.customFields
          ? (validated.customFields as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
          },
        },
        customPlatform: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    // Update user totals in background
    updateUserTotals(session.user.id).catch(console.error);

    return NextResponse.json(
      { success: true, data: entry },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error('Error creating tracker entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create entry' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT - Update entry
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = updateEntrySchema.parse(body);

    // Verify ownership
    const existing = await prisma.trackerEntry.findFirst({
      where: {
        id: validated.id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Entry not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Prisma.TrackerEntryUpdateInput = {
      updatedAt: new Date(),
    };

    // Only include fields that were provided
    const fields = [
      'platformId', 'customPlatformId', 'category', 'subcategory',
      'problemsSolved', 'problemsAttempted', 'easyProblems', 'mediumProblems', 'hardProblems',
      'commits', 'pullRequests', 'pullRequestsMerged', 'issuesOpened', 'issuesClosed',
      'codeReviews', 'linesOfCode', 'projectsStarted', 'projectsCompleted',
      'coursesStarted', 'coursesCompleted', 'lessonsCompleted', 'modulesCompleted',
      'certificationsEarned', 'quizzesTaken', 'quizzesPassed',
      'articlesRead', 'tutorialsCompleted', 'documentationPages',
      'applicationsSubmitted', 'applicationsViewed', 'interviewsScheduled',
      'interviewsCompleted', 'offersReceived',
      'contestsParticipated', 'contestsCompleted', 'hackathonsJoined', 'hackathonsCompleted',
      'mentoringSessions', 'helpGiven', 'helpReceived', 'postsWritten', 'commentsWritten',
      'timeSpent', 'focusTime', 'averageDifficulty', 'accuracyRate', 'completionRate',
      'rating', 'ratingChange', 'rank', 'rankChange', 'points', 'pointsEarned',
      'streak', 'xpEarned', 'mood', 'energyLevel', 'productivityRating', 'notes',
      'tags', 'topics', 'languages',
    ];

    for (const field of fields) {
      if ((validated as Record<string, unknown>)[field] !== undefined) {
        (updateData as Record<string, unknown>)[field] = (validated as Record<string, unknown>)[field];
      }
    }

    if (validated.date) {
      updateData.date = normalizeDate(validated.date);
    }

    if (validated.customFields !== undefined) {
      updateData.customFields = validated.customFields
        ? (validated.customFields as Prisma.InputJsonValue)
        : Prisma.JsonNull;
    }

    const entry = await prisma.trackerEntry.update({
      where: { id: validated.id },
      data: updateData,
      include: {
        platform: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            color: true,
          },
        },
        customPlatform: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    // Update user totals in background
    updateUserTotals(session.user.id).catch(console.error);

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error('Error updating tracker entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update entry' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Delete entry
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ids = searchParams.get('ids'); // For bulk delete

    if (!id && !ids) {
      return NextResponse.json(
        { success: false, error: 'Entry ID required' },
        { status: 400 }
      );
    }

    if (ids) {
      // Bulk delete
      const idArray = ids.split(',').map((s) => s.trim()).filter(Boolean);

      if (idArray.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No valid IDs provided' },
          { status: 400 }
        );
      }

      // Verify ownership of all entries
      const entries = await prisma.trackerEntry.findMany({
        where: {
          id: { in: idArray },
          userId: session.user.id,
        },
        select: { id: true },
      });

      if (entries.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No entries found' },
          { status: 404 }
        );
      }

      const deleteResult = await prisma.trackerEntry.deleteMany({
        where: {
          id: { in: entries.map((e) => e.id) },
          userId: session.user.id,
        },
      });

      // Update user totals
      updateUserTotals(session.user.id).catch(console.error);

      return NextResponse.json({
        success: true,
        deleted: deleteResult.count,
        message: `Deleted ${deleteResult.count} entries`,
      });
    }

    // Single delete
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Entry ID required' },
        { status: 400 }
      );
    }

    const existing = await prisma.trackerEntry.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Entry not found' },
        { status: 404 }
      );
    }

    await prisma.trackerEntry.delete({
      where: { id },
    });

    // Update user totals
    updateUserTotals(session.user.id).catch(console.error);

    return NextResponse.json({
      success: true,
      deleted: 1,
      message: 'Entry deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting tracker entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete entry' },
      { status: 500 }
    );
  }
}