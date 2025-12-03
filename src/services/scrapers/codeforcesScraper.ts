// src/services/scrapers/codeforcesScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

interface CodeforcesSubmission {
  id: number;
  creationTimeSeconds: number;
  problem: {
    contestId: number;
    index: string;
    name: string;
  };
  verdict: string;
}

interface CodeforcesUser {
  handle: string;
  rating?: number;
  maxRating?: number;
  rank?: string;
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
      const userResponse = await this.get<{
        status: string;
        result: CodeforcesUser[];
      }>(`${this.baseUrl}/user.info`, { handles: handle });

      if (userResponse.status !== 'OK') {
        return this.failure('Failed to fetch user info from Codeforces');
      }

      const user = userResponse.result[0];

      // Fetch submissions
      const submissionsResponse = await this.get<{
        status: string;
        result: CodeforcesSubmission[];
      }>(`${this.baseUrl}/user.status`, {
        handle,
        from: 1,
        count: 1000,
      });

      if (submissionsResponse.status !== 'OK') {
        return this.failure('Failed to fetch submissions from Codeforces');
      }

      const submissions = submissionsResponse.result;
      const { start } = this.getDateRange(90);
      const sinceTimestamp = start.getTime() / 1000;

      // Filter accepted submissions from last 90 days
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
        rating: user.rating,
        rank: user.rank,
      });
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default CodeforcesScraper;