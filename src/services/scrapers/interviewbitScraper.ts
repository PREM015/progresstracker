// src/services/scrapers/interviewbitScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class InterviewBitScraper extends BaseScraper {
  platformName = 'InterviewBit';
  platformSlug = 'interviewbit';
  protected baseUrl = 'https://www.interviewbit.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // Try unofficial API
      try {
        const response = await this.get<{
          problemsSolved?: number;
          score?: number;
          rank?: number;
          streak?: number;
          error?: string;
        }>(`https://interviewbit-api.vercel.app/user/${username}`);

        if (response && !response.error) {
          const entries =
            response.problemsSolved && response.problemsSolved > 0
              ? [
                  {
                    date: new Date(),
                    problems: response.problemsSolved,
                    notes: `InterviewBit: ${response.problemsSolved} problems solved, Score: ${response.score || 0}`,
                  },
                ]
              : [];

          return this.success(entries, {
            username,
            profileUrl: `${this.baseUrl}/profile/${username}`,
            totalProblems: response.problemsSolved,
            rank: response.rank?.toString(),
            streak: response.streak,
          });
        }
      } catch {
        // Fall through
      }

      return this.notSupported('InterviewBit requires web scraping. Please use manual tracking.');
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default InterviewBitScraper;