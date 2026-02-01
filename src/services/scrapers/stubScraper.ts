// src/services/scrapers/stubScraper.ts
// Template for scrapers that aren't fully implemented yet

import { BaseScraper } from './baseScraper';
import type { ScraperCredentials, ScraperResult } from './types';

/**
 * Creates a stub scraper for platforms that aren't implemented yet
 */
export function createStubScraper(platformName: string, platformSlug: string): BaseScraper {
  return new (class extends BaseScraper {
    platformName = platformName;
    platformSlug = platformSlug;
    protected baseUrl = '';

    async fetchData(_credentials: ScraperCredentials): Promise<ScraperResult> {
           if(_credentials) {
      return this.notSupported(
        `Auto-sync for this platform is not yet available. Please use manual tracking.`
      );
    }
        
      return this.notSupported(
        `Auto-sync for ${this.platformName} is not yet available. Please use manual tracking.`
      );
    }
  })();
}

// Pre-made stub scrapers for platforms without implementation
export class StubScraper extends BaseScraper {
  platformName: string;
  platformSlug: string;
  protected baseUrl = '';

  constructor(name: string, slug: string) {
    super();
    this.platformName = name;
    this.platformSlug = slug;
  }

  async fetchData(_credentials: ScraperCredentials): Promise<ScraperResult> {
    if (this.platformName && this.platformSlug) {
      return this.notSupported(
        `Auto-sync for ${this.platformName} is not yet available. Please use manual tracking.`
      );
    }
    if(_credentials) {
      return this.notSupported(
        `Auto-sync for this platform is not yet available. Please use manual tracking.`
      );
    }
    return this.notSupported();
  }
}