// src/services/scrapers/leetcodeScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult, ScraperEntry } from './types';

interface LeetCodeUserStats {
  matchedUser: {
    username: string;
    profile: {
      ranking: number;
      userAvatar: string;
      realName: string;
    };
    submitStats: {
      acSubmissionNum: Array<{
        difficulty: string;
        count: number;
      }>;
    };
    submissionCalendar: string;
  } | null;
}

interface LeetCodeRecentSubmissions {
  recentAcSubmissionList: Array<{
    id: string;
    title: string;
    titleSlug: string;
    timestamp: string;
  }>;
}

export class LeetCodeScraper extends BaseScraper {
  platformName = 'LeetCode';
  platformSlug = 'leetcode';
  protected baseUrl = 'https://leetcode.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // Fetch user profile and stats
      const statsQuery = `
        query getUserProfile($username: String!) {
          matchedUser(username: $username) {
            username
            profile {
              ranking
              userAvatar
              realName
            }
            submitStats {
              acSubmissionNum {
                difficulty
                count
              }
            }
            submissionCalendar
          }
        }
      `;

      const statsData = await this.graphql<LeetCodeUserStats>(
        `${this.baseUrl}/graphql`,
        statsQuery,
        { username },
        { Referer: this.baseUrl, Origin: this.baseUrl }
      );

      if (!statsData.matchedUser) {
        return this.failure(`LeetCode user "${username}" not found`);
      }

      const user = statsData.matchedUser;

      // Parse submission calendar
      let entries: ScraperEntry[] = [];
      try {
        const calendar = JSON.parse(user.submissionCalendar || '{}') as Record<string, number>;
        entries = Object.entries(calendar)
          .filter(([, count]) => count > 0)
          .map(([timestamp, count]) => ({
            date: this.parseDate(parseInt(timestamp)),
            problems: count,
            notes: `Solved ${count} problem${count > 1 ? 's' : ''} on LeetCode`,
          }));
      } catch {
        // If calendar parsing fails, try to fetch recent submissions
        try {
          const recentQuery = `
            query recentAcSubmissions($username: String!, $limit: Int!) {
              recentAcSubmissionList(username: $username, limit: $limit) {
                id
                title
                titleSlug
                timestamp
              }
            }
          `;

          const recentData = await this.graphql<LeetCodeRecentSubmissions>(
            `${this.baseUrl}/graphql`,
            recentQuery,
            { username, limit: 100 },
            { Referer: this.baseUrl, Origin: this.baseUrl }
          );

          const submissions = recentData.recentAcSubmissionList || [];
          const counts = this.countByDate(
            submissions,
            (s) => this.parseDate(parseInt(s.timestamp)),
            (s) => s.titleSlug
          );

          entries = this.countsToEntries(
            counts,
            (count) => `Solved ${count} problem${count > 1 ? 's' : ''} on LeetCode`
          );
        } catch {
          // Silent fail for recent submissions
        }
      }

      // Calculate totals
      const stats = user.submitStats.acSubmissionNum;
      const easy = stats.find((s) => s.difficulty === 'Easy')?.count || 0;
      const medium = stats.find((s) => s.difficulty === 'Medium')?.count || 0;
      const hard = stats.find((s) => s.difficulty === 'Hard')?.count || 0;
      const total = easy + medium + hard;

      return this.success(entries, {
        username,
        displayName: user.profile.realName || username,
        profileUrl: `${this.baseUrl}/u/${username}`,
        avatarUrl: user.profile.userAvatar,
        totalProblems: total,
        rank: user.profile.ranking?.toString(),
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default LeetCodeScraper;