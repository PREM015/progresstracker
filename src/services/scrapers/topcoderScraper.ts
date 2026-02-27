
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';
import { BrowserService } from '../browserService';

export class TopCoderScraper extends BaseScraper {
  platformName = 'TopCoder';
  platformSlug = 'topcoder';
  protected baseUrl = 'https://www.topcoder.com';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;
      const profileUrl = `${this.baseUrl}/members/${username}`;

      let page;
      try {
        page = await BrowserService.getPage();

        console.log(`[TopCoderScraper] Navigating to ${profileUrl}`);
        const response = await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        // TopCoder SPA might return 200 even for 404 page content

        try {
          await page.waitForSelector('div[class*="styles__rating"]', { timeout: 15000 });
        } catch (e) {
          // Check if 404
          const content = await page.content();
          if (content.includes("Member not found")) {
            return this.failure(`TopCoder user "${username}" not found`);
          }
          console.log('[TopCoderScraper] Timeout waiting for rating, proceeding to scrape what we can');
        }

        const data = await page.evaluate(() => {
          // Extract Rating
          const ratingEl = document.querySelector('div[class*="styles__rating"]');
          const ratingText = ratingEl?.textContent || '0';
          const rating = parseInt(ratingText.replace(/\D/g, ''), 10) || 0;

          // Extract "Track" wins or activity if clear
          // For now, rating is the main stat

          return { rating };
        });

        // Topcoder doesn't show "problems solved" directly in a simple way on the new profile
        // We'll track rating as the primary metric

        const entries = data.rating > 0 ? [{
          date: new Date(),
          rating: data.rating,
          notes: `TopCoder Rating: ${data.rating}`
        }] : [];

        return this.success(entries, {
          username,
          profileUrl,
          rating: data.rating,
          rank: data.rating.toString() // Use rating as rank proxy
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

export default TopCoderScraper;