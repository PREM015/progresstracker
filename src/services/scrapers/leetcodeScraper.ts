// src/services/scrapers/leetcodeScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

interface LeetCodeSubmission {
  id: string;
  title: string;
  titleSlug: string;
  timestamp: string;
}

export class LeetCodeScraper extends BaseScraper {
  platformName = 'LeetCode';
  platformSlug = 'leetcode';
  protected baseUrl = 'https://leetcode.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // GraphQL query for recent submissions
      const query = `
        query recentAcSubmissions($username: String!, $limit: Int!) {
          recentAcSubmissionList(username: $username, limit: $limit) {
            id
            title
            titleSlug
            timestamp
          }
        }
      `;

      const response = await this.post<any>(
        `${this.baseUrl}/graphql`,
        {
          query,
          variables: { username, limit: 100 },
        },
        {
          'Content-Type': 'application/json',
          'Referer': this.baseUrl,
        }
      );

      const submissions: LeetCodeSubmission[] = 
        response.data?.recentAcSubmissionList || [];

      if (!Array.isArray(submissions)) {
        return this.failure('Invalid response from LeetCode');
      }

      // Get user stats
      const statsQuery = `
        query userPublicProfile($username: String!) {
          matchedUser(username: $username) {
            submitStats {
              acSubmissionNum {
                difficulty
                count
              }
            }
            profile {
              ranking
            }
          }
        }
      `;

      const statsResponse = await this.post<any>(
        `${this.baseUrl}/graphql`,
        {
          query: statsQuery,
          variables: { username },
        },
        {
          'Content-Type': 'application/json',
          'Referer': this.baseUrl,
        }
      );

      const userStats = statsResponse.data?.matchedUser;

      // Group by date (unique problems only)
      const counts = this.countByDate(
        submissions,
        (s) => this.parseDate(parseInt(s.timestamp)),
        (s) => s.titleSlug
      );

      const entries = this.countsToEntries(
        counts,
        (count) => `Solved ${count} problem${count > 1 ? 's' : ''} on LeetCode`
      );

      // Calculate total
      const totalSolved = userStats?.submitStats?.acSubmissionNum?.reduce(
        (sum: number, item: any) => sum + (item.count || 0),
        0
      ) || submissions.length;

      return this.success(entries, {
        username,
        profileUrl: `${this.baseUrl}/u/${username}`,
        totalProblems: totalSolved,
        rank: userStats?.profile?.ranking?.toString(),
      });
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default LeetCodeScraper;