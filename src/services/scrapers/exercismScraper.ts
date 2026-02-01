// src/services/scrapers/exercismScraper.ts
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

interface ExercismProfile {
  profile: {
    user: {
      handle: string;
      reputation: number;
      avatar_url: string;
    };
  };
}

interface ExercismSolution {
  uuid: string;
  exercise: { slug: string; title: string };
  published_at?: string;
  completed_at?: string;
}

interface ExercismSolutionsResponse {
  results: ExercismSolution[];
}

export class ExercismScraper extends BaseScraper {
  platformName = 'Exercism';
  platformSlug = 'exercism';
  protected baseUrl = 'https://exercism.org/api/v2';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;

      // Get profile
      const profileResponse = await this.get<ExercismProfile>(
        `${this.baseUrl}/profiles/${username}`
      );

      if (!profileResponse?.profile?.user) {
        return this.failure(`Exercism user "${username}" not found`);
      }

      const profile = profileResponse.profile;

      // Get solutions
      const solutionsResponse = await this.get<ExercismSolutionsResponse>(
        `${this.baseUrl}/profiles/${username}/solutions`
      );

      const solutions = solutionsResponse.results || [];

      // Group by date
      const counts = this.countByDate(
        solutions.filter((s) => s.published_at || s.completed_at),
        (s) => this.parseDate(s.published_at || s.completed_at!),
        (s) => s.uuid
      );

      const entries = this.countsToEntries(
        counts,
        (count) => `Completed ${count} exercise${count > 1 ? 's' : ''} on Exercism`
      );

      return this.success(entries, {
        username,
        profileUrl: `https://exercism.org/profiles/${username}`,
        avatarUrl: profile.user.avatar_url,
        totalProblems: solutions.length,
        reputation: profile.user.reputation,
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default ExercismScraper;