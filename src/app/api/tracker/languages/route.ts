import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/apiResponse";

// GET /api/tracker/languages - Get all programming languages used in entries
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Get all entries with languages
    const entries = await prisma.trackerEntry.findMany({
      where: {
        userId: session.user.id,
        languages: { isEmpty: false },
      },
      select: {
        languages: true,
        date: true,
        category: true,
        platformId: true,
        problemsSolved: true,
        commits: true,
        timeSpent: true,
      },
    });

    // Extract and analyze languages
    const languageStats: Record<string, {
      count: number;
      lastUsed: Date;
      problemsSolved: number;
      commits: number;
      timeSpent: number;
      categories: Set<string>;
      platforms: Set<string>;
    }> = {};
    
    entries.forEach((entry) => {
      entry.languages.forEach((language) => {
        if (!languageStats[language]) {
          languageStats[language] = {
            count: 0,
            lastUsed: entry.date,
            problemsSolved: 0,
            commits: 0,
            timeSpent: 0,
            categories: new Set(),
            platforms: new Set(),
          };
        }
        languageStats[language].count++;
        languageStats[language].problemsSolved += entry.problemsSolved || 0;
        languageStats[language].commits += entry.commits || 0;
        languageStats[language].timeSpent += entry.timeSpent || 0;
        if (entry.date > languageStats[language].lastUsed) {
          languageStats[language].lastUsed = entry.date;
        }
        if (entry.category) {
          languageStats[language].categories.add(entry.category);
        }
        if (entry.platformId) {
          languageStats[language].platforms.add(entry.platformId);
        }
      });
    });

    // Convert to array and sort
    let languages = Object.entries(languageStats)
      .map(([name, data]) => ({
        name,
        count: data.count,
        lastUsed: data.lastUsed,
        problemsSolved: data.problemsSolved,
        commits: data.commits,
        timeSpent: data.timeSpent,
        categories: Array.from(data.categories),
        platformCount: data.platforms.size,
      }))
      .sort((a, b) => b.count - a.count);

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      languages = languages.filter((l) => l.name.toLowerCase().includes(searchLower));
    }

    // Limit results
    languages = languages.slice(0, limit);

    // Get language distribution by category
    const languageByCategory: Record<string, Record<string, number>> = {};
    entries.forEach((entry) => {
      const category = entry.category || "OTHER";
      if (!languageByCategory[category]) {
        languageByCategory[category] = {};
      }
      entry.languages.forEach((lang) => {
        languageByCategory[category][lang] = (languageByCategory[category][lang] || 0) + 1;
      });
    });

    // Get trending languages (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentEntries = entries.filter((e) => e.date >= thirtyDaysAgo);
    
    const trendingLanguages: Record<string, number> = {};
    recentEntries.forEach((entry) => {
      entry.languages.forEach((lang) => {
        trendingLanguages[lang] = (trendingLanguages[lang] || 0) + 1;
      });
    });

    const trending = Object.entries(trendingLanguages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return apiResponse({
      languages,
      trending,
      languageByCategory,
      totalLanguages: Object.keys(languageStats).length,
    });
  } catch (error) {
    console.error("Error fetching languages:", error);
    return apiError("Failed to fetch languages", 500);
  }
}

// POST /api/tracker/languages - Add languages to an entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401);
    }

    const body = await request.json();
    const { entryId, languages } = body;

    if (!entryId || !languages || !Array.isArray(languages)) {
      return apiError("entryId and languages array are required", 400);
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

    // Update languages
    const updatedEntry = await prisma.trackerEntry.update({
      where: { id: entryId },
      data: {
        languages: {
          set: languages,
        },
      },
    });

    return apiResponse(updatedEntry);
  } catch (error) {
    console.error("Error updating languages:", error);
    return apiError("Failed to update languages", 500);
  }
}
