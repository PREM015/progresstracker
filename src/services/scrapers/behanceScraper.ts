
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';
import { BrowserService } from '../browserService';

export class BehanceScraper extends BaseScraper {
  platformName = 'Behance';
  platformSlug = 'behance';
  protected baseUrl = 'https://www.behance.net';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;
      const profileUrl = `${this.baseUrl}/${username}`;

      let page;
      try {
        page = await BrowserService.getPage();

        console.log(`[BehanceScraper] Navigating to ${profileUrl}`);
        const response = await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 45000 });

        if (response && response.status() === 404) {
          return this.failure(`Behance user "${username}" not found`);
        }

        const data = await page.evaluate(() => {
          const text = document.body.innerText;
          if (text.includes("We can't find that page")) return null;

          // Behance stats
          let projectViews = 0;
          let appreciations = 0;
          let followers = 0;

          // Regex heuristics
          // "1.2k Project Views"
          // "500 Appreciations"
          // "200 Followers"

          // Helper to parse k/m suffixes if needed (Behance uses them)
          // simplified regex for raw numbers first

          // Behance textual scraping is tricky, but let's try common patterns

          const appreciationsMatch = text.match(/([\d,.]+[km]?)\s*Appreciations/i);
          const followersMatch = text.match(/([\d,.]+[km]?)\s*Followers/i);
          const viewsMatch = text.match(/([\d,.]+[km]?)\s*Project Views/i);

          const parseMetric = (str: string) => {
            str = str.toLowerCase().replace(/,/g, '');
            let multiplier = 1;
            if (str.includes('k')) multiplier = 1000;
            if (str.includes('m')) multiplier = 1000000;
            return Math.floor(parseFloat(str) * multiplier);
          };

          if (appreciationsMatch) appreciations = parseMetric(appreciationsMatch[1]);
          if (followersMatch) followers = parseMetric(followersMatch[1]);
          if (viewsMatch) projectViews = parseMetric(viewsMatch[1]);

          return { projectViews, appreciations, followers };
        });

        if (!data) return this.failure(`Behance user "${username}" not found`);

        const entries = data.appreciations > 0 ? [{
          date: new Date(),
          problems: Math.floor(data.appreciations / 10), // Arbitrary mapping: 10 appreciations = 1 'unit' of work
          notes: `Behance Stats: ${data.appreciations} appreciations, ${data.projectViews} views`
        }] : [];

        return this.success(entries, {
          username,
          profileUrl,
          totalProblems: data.appreciations, // Tracking appreciations as main metric
          followers: data.followers,
          views: data.projectViews
        });

      } catch (error: any) {
        return this.handleError(error);
      } finally {
        if (page) await page.close();
      }

    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default BehanceScraper;