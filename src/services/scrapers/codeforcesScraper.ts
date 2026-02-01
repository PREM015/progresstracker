// src/services/scrapers/codeforcesScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

interface CodeforcesSubmission {
  id: number;
  creationTimeSeconds: number;
  problem: {
    contestId: number;
    index: string;
    name: string;
    rating?: number;
  };
  verdict: string;
}

interface CodeforcesUser {
  handle: string;
  rating?: number;
  maxRating?: number;
  rank?: string;
  maxRank?: string;
  contribution?: number;
  friendOfCount?: number;
  avatar?: string;
  titlePhoto?: string;
}

interface CodeforcesResponse<T> {
  status: string;
  result: T;
  comment?: string;
}

export class CodeforcesScraper extends BaseScraper {
  platformName = 'Codeforces';
  platformSlug = 'codeforces';
  protected baseUrl = 'https://codeforces.com/api';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const handle = credentials.username!;

      // Fetch user info
      const userResponse = await this.get<CodeforcesResponse<CodeforcesUser[]>>(
        `${this.baseUrl}/user.info`,
        { handles: handle }
      );

      if (userResponse.status !== 'OK' || !userResponse.result?.[0]) {
        return this.failure(`Codeforces user "${handle}" not found`);
      }

      const user = userResponse.result[0];

      // Fetch submissions
      const { start } = this.getDateRange(90);
      const submissionsResponse = await this.get<CodeforcesResponse<CodeforcesSubmission[]>>(
        `${this.baseUrl}/user.status`,
        { handle, from: 1, count: 1000 }
      );

      if (submissionsResponse.status !== 'OK') {
        return this.failure('Failed to fetch submissions from Codeforces');
      }

      const submissions = submissionsResponse.result || [];
      const sinceTimestamp = start.getTime() / 1000;

      // Filter accepted submissions from date range
      const acceptedSubmissions = submissions.filter(
        (sub) => sub.verdict === 'OK' && sub.creationTimeSeconds >= sinceTimestamp
      );

      // Count unique problems by date
      const counts = this.countByDate(
        acceptedSubmissions,
        (s) => this.parseDate(s.creationTimeSeconds),
        (s) => `${s.problem.contestId}-${s.problem.index}`
      );

      const entries = this.countsToEntries(
        counts,
        (count) => `Solved ${count} problem${count > 1 ? 's' : ''} on Codeforces`
      );

      return this.success(entries, {
        username: handle,
        profileUrl: `https://codeforces.com/profile/${handle}`,
        avatarUrl: user.titlePhoto || user.avatar,
        rating: user.rating,
        maxRating: user.maxRating,
        rank: user.rank,
        contributions: user.contribution,
        followers: user.friendOfCount,
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default CodeforcesScraper;