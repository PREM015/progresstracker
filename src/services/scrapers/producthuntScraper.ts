
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';
import { BrowserService } from '../browserService';
import { cache } from '@/lib/redis';

export class ProductHuntScraper extends BaseScraper {
  platformName = 'Product Hunt';
  platformSlug = 'producthunt';
  protected baseUrl = 'https://www.producthunt.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;
      const cacheKey = `scraper:producthunt:${username}`;

      // Check cache (30-60 mins)
      const cached = await cache.get<ScraperResult>(cacheKey);
      if (cached) return cached;

      const profileUrl = `${this.baseUrl}/@${username}`;

      let page;
      try {
        page = await BrowserService.getPage();

        console.log(`[ProductHuntScraper] Navigating to ${profileUrl}`);
        const response = await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 45000 });

        if (response && response.status() === 404) {
          return this.failure(`Product Hunt user "${username}" not found`);
        }

        const data = await page.evaluate(() => {
          const text = document.body.innerText;
          if (text.includes("Page Not Found") || text.includes("404")) return null;

          let followers = 0;
          let following = 0;
          let made = 0;
          let points = 0;

          // Heuristics based on Product Hunt profile text
          const followersMatch = text.match(/(\d+)\s*followers/i);
          if (followersMatch) followers = parseInt(followersMatch[1], 10);

          const followingMatch = text.match(/(\d+)\s*following/i);
          if (followingMatch) following = parseInt(followingMatch[1], 10);

          const madeMatch = text.match(/Made\s*(\d+)/i);
          if (madeMatch) made = parseInt(madeMatch[1], 10);

          // "1,234 points" or similar
          const pointsMatch = text.match(/([\d,]+)\s*points/i);
          if (pointsMatch) points = parseInt(pointsMatch[1].replace(/,/g, ''), 10);

          return { followers, following, made, points };
        });

        if (!data) return this.failure(`Product Hunt user "${username}" not found`);

        const entries = data.made > 0 || data.points > 0 ? [{
          date: new Date(),
          problems: data.made,
          points: data.points,
          notes: `Product Hunt: Made ${data.made} products, ${data.points} points, ${data.followers} followers`
        }] : [];

        const result = this.success(entries, {
          username,
          profileUrl,
          totalProblems: data.made,
          points: data.points,
          followers: data.followers,
          following: data.following
        });

        // Cache for 1 hour
        await cache.set(cacheKey, result, 3600);

        return result;

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

// Export as default and named for compatibility
export default ProductHuntScraper;