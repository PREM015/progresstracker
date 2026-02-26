
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

export class SPOJScraper extends BaseScraper {
  platformName = 'SPOJ';
  platformSlug = 'spoj';
  protected baseUrl = 'https://www.spoj.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;
      const profileUrl = `${this.baseUrl}/users/${username}/`;

      const response = await this.request<string>(profileUrl, { responseType: 'text' });
      const html = response.data;

      if (html.includes("User not found")) {
        return this.failure(`SPOJ user "${username}" not found`);
      }

      // Regex to find "Problems solved"
      // DOM usually: <dt>Problems solved</dt> <dd>123</dd>
      const problemsMatch = html.match(/Problems solved[:\s]*<\/dt>\s*<dd>(\d+)/i);
      const rankMatch = html.match(/World Rank[:\s]*<\/dt>\s*<dd>#?(\d+)/i);

      const totalSolved = problemsMatch ? parseInt(problemsMatch[1], 10) : 0;
      const rank = rankMatch ? parseInt(rankMatch[1], 10) : undefined;

      // Extract join date for fun, but not critical

      const entries = totalSolved > 0 ? [{
        date: new Date(),
        problems: 0,
        notes: `SPOJ Sync: ${totalSolved} problems solved`
      }] : [];

      return this.success(entries, {
        username,
        profileUrl,
        totalProblems: totalSolved,
        rank: rank?.toString()
      });

    } catch (error) {
      // SPOJ 404s might throw error on getRequest depending on axios config
      if (String(error).includes('404')) {
        return this.failure(`SPOJ user "${credentials.username}" not found`);
      }
      return this.handleError(error);
    }
  }
}

export default SPOJScraper;