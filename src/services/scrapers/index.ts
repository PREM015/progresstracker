// src/services/scrapers/index.ts

import { BaseScraper } from './baseScraper';

// DSA Platforms
import { LeetCodeScraper } from './leetcodeScraper';
import { CodeforcesScraper } from './codeforcesScraper';
import { CodeChefScraper } from './codechefScraper';
import { HackerRankScraper } from './hackerrankScraper';
import { HackerEarthScraper } from './hackerearthScraper';
import { GeeksforGeeksScraper } from './geeksforgeeksScraper';
import { AtCoderScraper } from './atcoderScraper';
import { SPOJScraper } from './spojScraper';
import { TopCoderScraper } from './topcoderScraper';
import { CodewarsScraper } from './codewarsScraper';
import { ExercismScraper } from './exercismScraper';
import { InterviewBitScraper } from './interviewbitScraper';
import { BinarySearchScraper } from './binarysearchScraper';

// Job Portals
import { LinkedInScraper } from './linkedinScraper';
import { NaukriScraper } from './naukriScraper';
// import { WellfoundScraper } from './wellfoundScraper.ts';
import { InternshalaScaper } from './internshalaScaper';
import { HiredScraper } from './hiredScraper';
import { InstahyreScraper } from './instahyreScraper';

// Hackathons
import { DevpostScraper } from './devpostScraper';
import { DevfolioScraper } from './devfolioScraper';
import { MLHScraper } from './mlhScraper';
import { UnstopScraper } from './unstopScraper';
import { KaggleScraper } from './kaggleScraper';
import { CodinGameScraper } from './codinGameScraper';
import { DribbbleScraper } from './dribbbleScraper';
import { BehanceScraper } from './behanceScraper';
import { ProductHuntScraper } from './producthuntScraper';

// Git Platforms
import { GitHubScraper } from './githubScraper';
import { GitLabScraper } from './gitlabScraper';
import { BitbucketScraper } from './bitbucketScraper';

// Learning Platforms
import { CourseraScraper } from './courseraScaper';
import { FreeCodeCampScraper } from './freecodecampScraper';
import { CodecademyScraper } from './codecademyScraper';
import { DataCampScraper } from './datacampScraper';
import { PluralsightScraper } from './pluralsightScraper';
import { EdxScraper } from './edxScraper';
import { UdacityScraper } from './udacityScraper';
import { KhanAcademyScraper } from './khanacademyScraper';
import { ScrimbaScraper } from './scrimbaScraper';

// Open Source
import { GSSoCScraper } from './gssocScraper';
import { HacktoberfestScraper } from './hacktoberfestScraper';
import { KWoCScraper } from './kwocScraper';

// Registry type
type ScraperRegistry = Map<string, BaseScraper>;

// Initialize all scrapers
const scraperRegistry: ScraperRegistry = new Map([
  // DSA
  ['leetcode', new LeetCodeScraper()],
  ['codeforces', new CodeforcesScraper()],
  ['codechef', new CodeChefScraper()],
  ['hackerrank', new HackerRankScraper()],
  ['hackerearth', new HackerEarthScraper()],
  ['geeksforgeeks', new GeeksforGeeksScraper()],
  ['atcoder', new AtCoderScraper()],
  ['spoj', new SPOJScraper()],
  ['topcoder', new TopCoderScraper()],
  ['codewars', new CodewarsScraper()],
  ['exercism', new ExercismScraper()],
  ['interviewbit', new InterviewBitScraper()],
  ['binarysearch', new BinarySearchScraper()],
  
  // Job Portals
  ['linkedin', new LinkedInScraper()],
  ['naukri', new NaukriScraper()],
  // ['wellfound', new WellfoundScraper()],
  ['internshala', new InternshalaScaper()],
  ['hired', new HiredScraper()],
  ['instahyre', new InstahyreScraper()],
  
  // Hackathons
  ['devpost', new DevpostScraper()],
  ['devfolio', new DevfolioScraper()],
  ['mlh', new MLHScraper()],
  ['unstop', new UnstopScraper()],
  ['kaggle', new KaggleScraper()],
  ['codingame', new CodinGameScraper()],
  ['dribbble', new DribbbleScraper()],
  ['behance', new BehanceScraper()],
  ['producthunt', new ProductHuntScraper()],
  
  // Git
  ['github', new GitHubScraper()],
  ['gitlab', new GitLabScraper()],
  ['bitbucket', new BitbucketScraper()],
  
  // Learning
  ['coursera', new CourseraScraper()],
  ['freecodecamp', new FreeCodeCampScraper()],
  ['codecademy', new CodecademyScraper()],
  ['datacamp', new DataCampScraper()],
  ['pluralsight', new PluralsightScraper()],
  ['edx', new EdxScraper()],
  ['udacity', new UdacityScraper()],
  ['khanacademy', new KhanAcademyScraper()],
  ['scrimba', new ScrimbaScraper()],
  
  // Open Source
  ['gssoc', new GSSoCScraper()],
  ['hacktoberfest', new HacktoberfestScraper()],
  ['kwoc', new KWoCScraper()],
]);

// Platforms with working auto-sync
const workingScrapers = new Set([
  'leetcode',
  'codeforces',
  'atcoder',
  'codewars',
  'exercism',
  'geeksforgeeks',
  'github',
  'gitlab',
  'kaggle',
  'codingame',
  'freecodecamp',
  'gssoc',
  'topcoder',
]);

// Platforms that need OAuth
const oauthScrapers = new Set([
  'github',
  'gitlab',
  'bitbucket',
  'linkedin',
  'devpost',
  'devfolio',
  'mlh',
  'coursera',
  'hacktoberfest',
]);

// Platforms that need web scraping (Puppeteer)
const scrapingRequired = new Set([
  'codechef',
  'hackerrank',
  'hackerearth',
  'spoj',
  'interviewbit',
  'naukri',
  'internshala',
  'codecademy',
  'datacamp',
]);

export class ScraperFactory {
  static getScraper(platformSlug: string): BaseScraper | null {
    return scraperRegistry.get(platformSlug.toLowerCase()) || null;
  }

  static hasScraper(platformSlug: string): boolean {
    return scraperRegistry.has(platformSlug.toLowerCase());
  }

  static isScraperWorking(platformSlug: string): boolean {
    return workingScrapers.has(platformSlug.toLowerCase());
  }

  static requiresOAuth(platformSlug: string): boolean {
    return oauthScrapers.has(platformSlug.toLowerCase());
  }

  static requiresScraping(platformSlug: string): boolean {
    return scrapingRequired.has(platformSlug.toLowerCase());
  }

  static getWorkingScrapers(): string[] {
    return Array.from(workingScrapers);
  }

  static getAllScrapers(): string[] {
    return Array.from(scraperRegistry.keys());
  }

  static getScraperCount(): number {
    return scraperRegistry.size;
  }

  static registerScraper(slug: string, scraper: BaseScraper): void {
    scraperRegistry.set(slug.toLowerCase(), scraper);
  }
}

// Export all scrapers and types
export * from './baseScraper';
export {
  LeetCodeScraper,
  CodeforcesScraper,
  CodeChefScraper,
  HackerRankScraper,
  HackerEarthScraper,
  GeeksforGeeksScraper,
  AtCoderScraper,
  SPOJScraper,
  TopCoderScraper,
  CodewarsScraper,
  ExercismScraper,
  InterviewBitScraper,
  BinarySearchScraper,
  LinkedInScraper,
  NaukriScraper,
  // WellfoundScraper,
  InternshalaScaper,
  HiredScraper,
  InstahyreScraper,
  DevpostScraper,
  DevfolioScraper,
  MLHScraper,
  UnstopScraper,
  KaggleScraper,
  CodinGameScraper,
  GitHubScraper,
  GitLabScraper,
  BitbucketScraper,
  CourseraScraper,
  FreeCodeCampScraper,
  CodecademyScraper,
  DataCampScraper,
  GSSoCScraper,
  HacktoberfestScraper,
  KWoCScraper,
};

export default ScraperFactory;