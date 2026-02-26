
import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';
import { BrowserService } from '../browserService';

interface DevfolioUser {
  user?: {
    username: string;
    hackathons?: Array<{
      name: string;
      start_time?: string;
    }>;
  };
}

export class DevfolioScraper extends BaseScraper {
  platformName = 'Devfolio';
  platformSlug = 'devfolio';
  protected baseUrl = 'https://devfolio.co';

  async fetchData(credentials: ScraperCredentials): Promise<ScraperResult> {
    try {
      this.validateCredentials(credentials, ['username']);
      const username = credentials.username!;
      const profileUrl = `${this.baseUrl}/@${username}`;

      let page;
      try {
        page = await BrowserService.getPage();
        await page.setViewport({ width: 1280, height: 800 });

        // Navigate to profile
        console.log(`[DevfolioScraper] Navigating to ${profileUrl}`);
        const response = await page.goto(profileUrl, {
          waitUntil: 'networkidle2',
          timeout: 45000
        });

        if (response && response.status() === 404) {
          return this.failure(`Devfolio user "${username}" not found`);
        }

        // Wait for dynamic content to be present
        // We look for either project cards or hackathon list items
        try {
          await page.waitForSelector('main', { timeout: 10000 });
        } catch (e) {
          console.log('[DevfolioScraper] Timeout waiting for main content, proceeding with what we have');
        }

        // Extract data from the page
        const data = await page.evaluate(() => {
          // Attempt to find hackathon/project cards
          // This selector strategy tries to find cards based on common Devfolio classes or structure
          // Since classes are often hashed, we look for structural elements or aria-labels if possible.
          // Fallback: look for text that resembles dates or project names.

          const projects = [];

          // Look for project cards - strictly heuristic based on observed structure
          // This naturally needs to be robust against class name changes.
          // We'll search for elements that look like project titles.

          // Strategy: Find all links that go to /projects/
          const projectLinks = Array.from(document.querySelectorAll('a[href*="/projects/"]'));
          const hackathonLinks = Array.from(document.querySelectorAll('a[href*="devfolio.co" i]')); // Hackathon links often external or subdomain

          // Scrape visible text potentially related to hackathons
          const potentialHackathons = Array.from(document.querySelectorAll('h1, h2, h3, h4, div'))
            .filter(el => el.textContent?.toLowerCase().includes('hackathon'))
            .map(el => el.textContent?.trim())
            .filter(Boolean);

          // For verified structure, we'd need to inspect the live DOM. 
          // Since we can't fully inspect, we'll try a generic extraction of "Projects" section if labeled.

          // Count distinct project links as a proxy for participation
          const uniqueProjects = new Set(projectLinks.map(l => l.getAttribute('href')));

          return {
            projectCount: uniqueProjects.size,
            titles: projectLinks.map(l => l.textContent?.trim()).filter(Boolean),
            hackathonSample: potentialHackathons.slice(0, 3)
          };
        });

        if (data.projectCount === 0 && data.hackathonSample.length === 0) {
          // Fallback: Check if page is empty/404 disguised
          const bodyText = await page.evaluate(() => document.body.innerText);
          if (bodyText.includes("This page could not be found") || bodyText.includes("404")) {
            return this.failure(`Devfolio user "${username}" not found`);
          }
        }

        const entries = data.titles.map(title => ({
          date: new Date(), // We don't have dates easily, default to now
          problems: 0,
          commits: 0,
          pullRequests: 0,
          issues: 0,
          timeSpent: 0,
          notes: `Project: ${title}`,
        }));

        // If we found nothing but the page loaded, we still count it as success but with 0 entries
        // Or we can add a dummy entry to show "Connected" status
        if (entries.length === 0) {
          // Check if we can extract "Hackathons attended" count
          const stats = await page.evaluate(() => {
            // Try to find stats numbers
            const numbers = Array.from(document.querySelectorAll('h2, h3, span'))
              .map(el => el.textContent?.trim())
              .filter(t => /^\d+$/.test(t || ''));
            return numbers;
          });

          // If we found some numbers, maybe one is the hackathon count.
          // For now, let's just return success with empty entries if page is valid.
        }

        return this.success(entries, {
          username,
          profileUrl,
          totalProjects: data.projectCount,
          rawStats: data
        });

      } catch (error: any) {
        console.error('[DevfolioScraper] Puppeteer error:', error);
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
export default DevfolioScraper;