// src/services/scrapers/interviewbitScraper.ts

import { BaseScraper, ScraperCredentials, ScraperResult } from './baseScraper';

export class InterviewBitScraper extends BaseScraper {
  platformName = 'InterviewBit';
  platformSlug = 'interviewbit';
  protected baseUrl = 'https://www.interviewbit.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // InterviewBit doesn't have a public API
      // Try to get public profile data
      try {
        const response = await this.get<any>(
          `https://interviewbit-api.vercel.app/user/${username}`
        );

        if (response && !response.error) {
          const entries = [{
            date: new Date(),
            problems: response.problemsSolved || 0,
            notes: `InterviewBit: ${response.problemsSolved || 0} problems solved, Score: ${response.score || 0}`,
          }];

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

      return this.notSupported(
        'InterviewBit requires web scraping. Please use manual tracking.'
      );
    } catch (error: any) {
      return this.handleError(error);
    }
  }
}

export default InterviewBitScraper;