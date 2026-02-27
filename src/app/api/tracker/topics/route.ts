import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

// GET /api/tracker/topics - Get all topics used in entries
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Get all entries with topics
    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId: session.user.id,
        topics: { isEmpty: false },
      },
      select: {
        topics: true,
        date: true,
        category: true,
      },
    });

    // Extract and count topics
    const topicCounts: Record<string, { count: number; lastUsed: Date; categories: Set<string> }> = {};

    entries.forEach((entry) => {
      entry.topics.forEach((topic) => {
        if (!topicCounts[topic]) {
          topicCounts[topic] = {
            count: 0,
            lastUsed: entry.date,
            categories: new Set(),
          };
        }
        topicCounts[topic].count++;
        if (entry.date > topicCounts[topic].lastUsed) {
          topicCounts[topic].lastUsed = entry.date;
        }
        if (entry.category) {
          topicCounts[topic].categories.add(entry.category);
        }
      });
    });

    // Convert to array and sort
    let topics = Object.entries(topicCounts)
      .map(([name, data]) => ({
        name,
        count: data.count,
        lastUsed: data.lastUsed,
        categories: Array.from(data.categories),
      }))
      .sort((a, b) => b.count - a.count);

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      topics = topics.filter((t) => t.name.toLowerCase().includes(searchLower));
    }

    // Limit results
    topics = topics.slice(0, limit);

    // Get topic trends (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentEntries = await prisma.trackerEntry.findMany({
      where: {
        userId: session.user.id,
        topics: { isEmpty: false },
        date: { gte: thirtyDaysAgo },
      },
      select: {
        topics: true,
        date: true,
      },
    });

    const trendingTopics: Record<string, number> = {};
    recentEntries.forEach((entry) => {
      entry.topics.forEach((topic) => {
        trendingTopics[topic] = (trendingTopics[topic] || 0) + 1;
      });
    });

    const trending = Object.entries(trendingTopics)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return apiResponse.success({
      topics,
      trending,
      totalTopics: Object.keys(topicCounts).length,
    });
  } catch (error) {
    console.error("Error fetching topics:", error);
    return apiError("Failed to fetch topics", 500);
  }
}

// POST /api/tracker/topics - Add topics to an entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { entryId, topics } = body;

    if (!entryId || !topics || !Array.isArray(topics)) {
      return apiError("entryId and topics array are required", 400);
    }

    // Verify entry belongs to user
    const entry = await prisma.trackerEntry.findFirst({
      where: {
        id: entryId,
        userId: session.user.id,
      },
    });

    if (!entry) {
      return apiError("Entry not found", 404);
    }

    // Update topics
    const updatedEntry = await prisma.trackerEntry.update({
      where: { id: entryId },
      data: {
        topics: {
          set: topics,
        },
      },
    });

    return apiResponse.success(updatedEntry);
  } catch (error) {
    console.error("Error updating topics:", error);
    return apiError("Failed to update topics", 500);
  }
}
