
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';
import * as cheerio from 'cheerio';
import { cache } from '@/lib/redis';

export class SourceForgeScraper extends BaseScraper {
  platformName = 'SourceForge';
  platformSlug = 'sourceforge';
  protected baseUrl = 'https://sourceforge.net';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;
      const cacheKey = `scraper:sourceforge:${username}`;

      // Check cache first (1-2 hours)
      const cached = await cache.get<ScraperResult>(cacheKey);
      if (cached) return cached;

      const profileUrl = `${this.baseUrl}/u/${username}/profile/`;

      const response = await this.request<string>(profileUrl, {
        responseType: 'text',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const html = response.data;
      const $ = cheerio.load(html);

      if ($('h1').text().includes('404') || $('body').text().includes('User not found')) {
        return this.failure(`SourceForge user "${username}" not found`);
      }

      // Extract Join Date
      const joinDateText = $('time.joined_date').text().trim(); // "Joined Jun 20, 2012"

      // Extract Projects count if visible
      let projectsCount = 0;
      const projectsText = $('.projects-count').text() || $('a:contains("Projects")').text();
      const projectMatch = projectsText.match(/(\d+)/);
      if (projectMatch) projectsCount = parseInt(projectMatch[1], 10);

      const entries = joinDateText ? [{
        date: new Date(),
        problems: projectsCount || 1, // At least 1 if user exists
        notes: `SourceForge User: ${joinDateText}, ${projectsCount} projects`
      }] : [];

      const result = this.success(entries, {
        username,
        profileUrl,
        joined: joinDateText,
        projectsCount
      });

      // Cache for 2 hours
      await cache.set(cacheKey, result, 7200);

      return result;

    } catch (error: any) {
      if (error.response?.status === 404) {
        return this.failure(`SourceForge user "${credentials.username}" not found`);
      }
      return this.handleError(error);
    }
  }
}

// Export as default and named for compatibility
export default SourceForgeScraper;