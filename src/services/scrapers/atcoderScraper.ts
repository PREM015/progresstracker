// src/services/scrapers/atcoderScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

interface AtCoderSubmission {
  id: number;
  epoch_second: number;
  problem_id: string;
  contest_id: string;
  result: string;
}

export class AtCoderScraper extends BaseScraper {
  platformName = 'AtCoder';
  platformSlug = 'atcoder';
  protected baseUrl = 'https://kenkoooo.com/atcoder';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      const { start } = this.getDateRange(90);
      const fromSecond = Math.floor(start.getTime() / 1000);

      // Use Kenkoooo's API (official community API)
      const submissions = await this.get<AtCoderSubmission[]>(
        `${this.baseUrl}/atcoder-api/v3/user/submissions`,
        { user: username, from_second: fromSecond }
      );

      if (!Array.isArray(submissions)) {
        return this.failure('Invalid response from AtCoder API');
      }

      // Filter accepted submissions and count by date
      const accepted = submissions.filter((s) => s.result === 'AC');

      const counts = this.countByDate(
        accepted,
        (s) => this.parseDate(s.epoch_second),
        (s) => s.problem_id
      );

      const entries = this.countsToEntries(
        counts,
        (count) => `Solved ${count} problem${count > 1 ? 's' : ''} on AtCoder`
      );

      return this.success(entries, {
        username,
        profileUrl: `https://atcoder.jp/users/${username}`,
        totalProblems: accepted.length,
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default AtCoderScraper;