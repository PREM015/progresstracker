/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/services/scrapers/index.ts (Alternative - handles missing files)
// ScraperFactory with graceful handling of missing scraper files

import { BaseScraper } from './baseScraper';
import { StubScraper } from './stubScraper';
import { logger } from '@/lib/logger';

// =============================================================================
// DYNAMIC SCRAPER LOADER
// =============================================================================

type ScraperModule = { default?: new () => BaseScraper } | { [key: string]: new () => BaseScraper };

/**
 * Safely import a scraper module
 */
async function loadScraper(
  slug: string, 
  modulePath: string, 
  className: string
): Promise<BaseScraper | null> {
  try {
    const importedModule = await import(modulePath) as ScraperModule;
    const ScraperClass = (importedModule as Record<string, new () => BaseScraper>)[className] || 
                         (importedModule as { default: new () => BaseScraper }).default;
    if (ScraperClass) {
      return new ScraperClass();
    }
    return null;
  } catch (error) {
    logger.debug(`Scraper not found for ${slug}: ${modulePath}`);
     console.error(error);
    return null;
  }
}

// =============================================================================
// PLATFORM DEFINITIONS
// =============================================================================

interface PlatformDef {
  slug: string;
  name: string;
  className: string;
  modulePath: string;
  category: 'dsa' | 'git' | 'learning' | 'job' | 'hackathon' | 'opensource' | 'company' | 'design' | 'data_science' | 'other';
  authType: 'none' | 'oauth' | 'api_key' | 'credentials' | 'scraping';
  priority: number;
  isExpectedWorking: boolean;
}

const PLATFORM_DEFINITIONS: PlatformDef[] = [
  // DSA Platforms
  { slug: 'leetcode', name: 'LeetCode', className: 'LeetCodeScraper', modulePath: './leetcodeScraper', category: 'dsa', authType: 'scraping', priority: 100, isExpectedWorking: true },
  { slug: 'codeforces', name: 'Codeforces', className: 'CodeforcesScraper', modulePath: './codeforcesScraper', category: 'dsa', authType: 'scraping', priority: 95, isExpectedWorking: true },
  { slug: 'codechef', name: 'CodeChef', className: 'CodeChefScraper', modulePath: './codechefScraper', category: 'dsa', authType: 'scraping', priority: 90, isExpectedWorking: true },
  { slug: 'hackerrank', name: 'HackerRank', className: 'HackerRankScraper', modulePath: './hackerrankScraper', category: 'dsa', authType: 'scraping', priority: 85, isExpectedWorking: true },
  { slug: 'hackerearth', name: 'HackerEarth', className: 'HackerEarthScraper', modulePath: './hackerearthScraper', category: 'dsa', authType: 'scraping', priority: 70, isExpectedWorking: false },
  { slug: 'atcoder', name: 'AtCoder', className: 'AtCoderScraper', modulePath: './atcoderScraper', category: 'dsa', authType: 'scraping', priority: 80, isExpectedWorking: true },
  { slug: 'geeksforgeeks', name: 'GeeksforGeeks', className: 'GeeksForGeeksScraper', modulePath: './geeksforgeeksScraper', category: 'dsa', authType: 'scraping', priority: 85, isExpectedWorking: true },
  { slug: 'interviewbit', name: 'InterviewBit', className: 'InterviewBitScraper', modulePath: './interviewbitScraper', category: 'dsa', authType: 'scraping', priority: 60, isExpectedWorking: false },
  { slug: 'codewars', name: 'Codewars', className: 'CodewarsScraper', modulePath: './codewarsScraper', category: 'dsa', authType: 'scraping', priority: 75, isExpectedWorking: true },
  { slug: 'exercism', name: 'Exercism', className: 'ExercismScraper', modulePath: './exercismScraper', category: 'dsa', authType: 'scraping', priority: 70, isExpectedWorking: true },
  { slug: 'topcoder', name: 'TopCoder', className: 'TopCoderScraper', modulePath: './topcoderScraper', category: 'dsa', authType: 'scraping', priority: 65, isExpectedWorking: false },
  { slug: 'spoj', name: 'SPOJ', className: 'SPOJScraper', modulePath: './spojScraper', category: 'dsa', authType: 'scraping', priority: 50, isExpectedWorking: false },
  { slug: 'projecteuler', name: 'Project Euler', className: 'ProjectEulerScraper', modulePath: './projecteulerScraper', category: 'dsa', authType: 'scraping', priority: 40, isExpectedWorking: false },
  { slug: 'binarysearch', name: 'Binary Search', className: 'BinarySearchScraper', modulePath: './binarysearchScraper', category: 'dsa', authType: 'scraping', priority: 30, isExpectedWorking: false },
  { slug: 'algoexpert', name: 'AlgoExpert', className: 'AlgoExpertScraper', modulePath: './algoexpertScraper', category: 'dsa', authType: 'credentials', priority: 50, isExpectedWorking: false },
  { slug: 'codingame', name: 'CodinGame', className: 'CodingGameScraper', modulePath: './codinGameScraper', category: 'dsa', authType: 'scraping', priority: 40, isExpectedWorking: false },

  // Git Platforms
  { slug: 'github', name: 'GitHub', className: 'GitHubScraper', modulePath: './githubScraper', category: 'git', authType: 'oauth', priority: 100, isExpectedWorking: true },
  { slug: 'gitlab', name: 'GitLab', className: 'GitLabScraper', modulePath: './gitlabScraper', category: 'git', authType: 'oauth', priority: 90, isExpectedWorking: true },
  { slug: 'bitbucket', name: 'Bitbucket', className: 'BitbucketScraper', modulePath: './bitbucketScraper', category: 'git', authType: 'oauth', priority: 85, isExpectedWorking: true },
  { slug: 'sourceforge', name: 'SourceForge', className: 'SourceForgeScraper', modulePath: './sourceforgeScraper', category: 'git', authType: 'scraping', priority: 30, isExpectedWorking: false },

  // Learning Platforms
  { slug: 'freecodecamp', name: 'freeCodeCamp', className: 'FreeCodeCampScraper', modulePath: './freecodecampScraper', category: 'learning', authType: 'scraping', priority: 80, isExpectedWorking: true },
  { slug: 'codecademy', name: 'Codecademy', className: 'CodecademyScraper', modulePath: './codecademyScraper', category: 'learning', authType: 'credentials', priority: 60, isExpectedWorking: false },
  { slug: 'coursera', name: 'Coursera', className: 'CourseraScraper', modulePath: './courseraScaper', category: 'learning', authType: 'credentials', priority: 70, isExpectedWorking: false },
  { slug: 'udemy', name: 'Udemy', className: 'UdemyScraper', modulePath: './udemyScraper', category: 'learning', authType: 'credentials', priority: 65, isExpectedWorking: false },
  { slug: 'udacity', name: 'Udacity', className: 'UdacityScraper', modulePath: './udacityScraper', category: 'learning', authType: 'credentials', priority: 60, isExpectedWorking: false },
  { slug: 'edx', name: 'edX', className: 'EdXScraper', modulePath: './edxScraper', category: 'learning', authType: 'credentials', priority: 55, isExpectedWorking: false },
  { slug: 'khanacademy', name: 'Khan Academy', className: 'KhanAcademyScraper', modulePath: './khanacademyScraper', category: 'learning', authType: 'scraping', priority: 50, isExpectedWorking: false },
  { slug: 'pluralsight', name: 'Pluralsight', className: 'PluralsightScraper', modulePath: './pluralsightScraper', category: 'learning', authType: 'credentials', priority: 55, isExpectedWorking: false },
  { slug: 'skillshare', name: 'Skillshare', className: 'SkillshareScraper', modulePath: './skillshareScraper', category: 'learning', authType: 'credentials', priority: 40, isExpectedWorking: false },
  { slug: 'linkedinlearning', name: 'LinkedIn Learning', className: 'LinkedInLearningScraper', modulePath: './linkedinlearningScraper', category: 'learning', authType: 'oauth', priority: 60, isExpectedWorking: false },
  { slug: 'datacamp', name: 'DataCamp', className: 'DataCampScraper', modulePath: './datacampScraper', category: 'learning', authType: 'credentials', priority: 55, isExpectedWorking: false },
  { slug: 'scrimba', name: 'Scrimba', className: 'ScrimbaScraper', modulePath: './scrimbaScraper', category: 'learning', authType: 'credentials', priority: 40, isExpectedWorking: false },

  // Data Science
  { slug: 'kaggle', name: 'Kaggle', className: 'KaggleScraper', modulePath: './kaggleScraper', category: 'data_science', authType: 'scraping', priority: 85, isExpectedWorking: true },

  // Job Platforms
  { slug: 'linkedin', name: 'LinkedIn', className: 'LinkedInScraper', modulePath: './linkedinScraper', category: 'job', authType: 'oauth', priority: 90, isExpectedWorking: false },
  { slug: 'indeed', name: 'Indeed', className: 'IndeedScraper', modulePath: './indeedScraper', category: 'job', authType: 'scraping', priority: 40, isExpectedWorking: false },
  { slug: 'glassdoor', name: 'Glassdoor', className: 'GlassdoorScraper', modulePath: './glassdoorScraper', category: 'job', authType: 'scraping', priority: 40, isExpectedWorking: false },
  { slug: 'naukri', name: 'Naukri', className: 'NaukriScraper', modulePath: './naukriScraper', category: 'job', authType: 'scraping', priority: 50, isExpectedWorking: false },
  { slug: 'monster', name: 'Monster', className: 'MonsterScraper', modulePath: './monsterScraper', category: 'job', authType: 'scraping', priority: 30, isExpectedWorking: false },
  { slug: 'dice', name: 'Dice', className: 'DiceScraper', modulePath: './diceScraper', category: 'job', authType: 'scraping', priority: 35, isExpectedWorking: false },
  { slug: 'ziprecruiter', name: 'ZipRecruiter', className: 'ZipRecruiterScraper', modulePath: './ziprecruiterScraper', category: 'job', authType: 'scraping', priority: 30, isExpectedWorking: false },
  { slug: 'simplyhired', name: 'SimplyHired', className: 'SimplyHiredScraper', modulePath: './simplyhiredScraper', category: 'job', authType: 'scraping', priority: 25, isExpectedWorking: false },
  { slug: 'hired', name: 'Hired', className: 'HiredScraper', modulePath: './hiredScraper', category: 'job', authType: 'credentials', priority: 40, isExpectedWorking: false },
  { slug: 'wellfound', name: 'Wellfound', className: 'WellfoundScraper', modulePath: './wellfoundScraper', category: 'job', authType: 'scraping', priority: 45, isExpectedWorking: false },
  { slug: 'angellist', name: 'AngelList', className: 'AngelListScraper', modulePath: './angellistScraper', category: 'job', authType: 'scraping', priority: 40, isExpectedWorking: false },
  { slug: 'instahyre', name: 'InstaHyre', className: 'InstaHyreScraper', modulePath: './instahyreScraper', category: 'job', authType: 'scraping', priority: 35, isExpectedWorking: false },
  { slug: 'internshala', name: 'Internshala', className: 'IntershalaScraper', modulePath: './internshalaScaper', category: 'job', authType: 'scraping', priority: 50, isExpectedWorking: false },
  { slug: 'unstop', name: 'Unstop', className: 'UnstopScraper', modulePath: './unstopScraper', category: 'job', authType: 'scraping', priority: 55, isExpectedWorking: false },

  // Hackathon Platforms  
  { slug: 'devpost', name: 'Devpost', className: 'DevpostScraper', modulePath: './devpostScraper', category: 'hackathon', authType: 'scraping', priority: 80, isExpectedWorking: true },
  { slug: 'mlh', name: 'MLH', className: 'MLHScraper', modulePath: './mlhScraper', category: 'hackathon', authType: 'scraping', priority: 70, isExpectedWorking: false },
  { slug: 'hackathoncom', name: 'Hackathon.com', className: 'HackathonComScraper', modulePath: './hackathoncomScraper', category: 'hackathon', authType: 'scraping', priority: 40, isExpectedWorking: false },
  { slug: 'devfolio', name: 'Devfolio', className: 'DevfolioScraper', modulePath: './devfolioScraper', category: 'hackathon', authType: 'scraping', priority: 60, isExpectedWorking: false },

  // Open Source
  { slug: 'gssoc', name: 'GSSoC', className: 'GSSoCScraper', modulePath: './gssocScraper', category: 'opensource', authType: 'scraping', priority: 50, isExpectedWorking: false },
  { slug: 'hacktoberfest', name: 'Hacktoberfest', className: 'HacktoberfestScraper', modulePath: './hacktoberfestScraper', category: 'opensource', authType: 'oauth', priority: 60, isExpectedWorking: false },
  { slug: 'outreachy', name: 'Outreachy', className: 'OutreachyScraper', modulePath: './outreachyScraper', category: 'opensource', authType: 'scraping', priority: 40, isExpectedWorking: false },
  { slug: 'lfx', name: 'LFX Mentorship', className: 'LFXScraper', modulePath: './lfxScraper', category: 'opensource', authType: 'scraping', priority: 45, isExpectedWorking: false },
  { slug: 'kwoc', name: 'KWoC', className: 'KWoCScraper', modulePath: './kwocScraper', category: 'opensource', authType: 'scraping', priority: 35, isExpectedWorking: false },
  { slug: 'swoc', name: 'SWoC', className: 'SWoCScraper', modulePath: './swocScraper', category: 'opensource', authType: 'scraping', priority: 35, isExpectedWorking: false },

  // Company Platforms
  { slug: 'google', name: 'Google Careers', className: 'GoogleScraper', modulePath: './googleScraper', category: 'company', authType: 'oauth', priority: 70, isExpectedWorking: false },
  { slug: 'meta', name: 'Meta Careers', className: 'MetaScraper', modulePath: './metaScraper', category: 'company', authType: 'scraping', priority: 60, isExpectedWorking: false },
  { slug: 'amazon', name: 'Amazon Jobs', className: 'AmazonScraper', modulePath: './amazonScraper', category: 'company', authType: 'scraping', priority: 60, isExpectedWorking: false },
  { slug: 'microsoft', name: 'Microsoft Careers', className: 'MicrosoftScraper', modulePath: './microsoftScraper', category: 'company', authType: 'oauth', priority: 65, isExpectedWorking: false },
  { slug: 'apple', name: 'Apple Jobs', className: 'AppleScraper', modulePath: './appleScraper', category: 'company', authType: 'scraping', priority: 55, isExpectedWorking: false },
  { slug: 'ibm', name: 'IBM Careers', className: 'IBMScraper', modulePath: './ibmScraper', category: 'company', authType: 'scraping', priority: 50, isExpectedWorking: false },

  // Design Platforms
  { slug: 'dribbble', name: 'Dribbble', className: 'DribbbleScraper', modulePath: './dribbbleScraper', category: 'design', authType: 'scraping', priority: 50, isExpectedWorking: false },
  { slug: 'behance', name: 'Behance', className: 'BehanceScraper', modulePath: './behanceScraper', category: 'design', authType: 'scraping', priority: 50, isExpectedWorking: false },
  { slug: 'producthunt', name: 'Product Hunt', className: 'ProductHuntScraper', modulePath: './producthuntScraper', category: 'design', authType: 'scraping', priority: 40, isExpectedWorking: false },
];

// =============================================================================
// SCRAPER STATUS INTERFACE
// =============================================================================

interface ScraperStatus {
  isWorking: boolean;
  lastChecked: Date | null;
  errorCount: number;
  lastError: string | null;
  avgResponseTime: number | null;
  successRate: number;
  totalAttempts: number;
  totalSuccesses: number;
}

interface PlatformInfo {
  slug: string;
  name: string;
  category: PlatformDef['category'];
  authType: PlatformDef['authType'];
  isImplemented: boolean;
  isWorking: boolean;
  priority: number;
}

interface ScraperCapabilities {
  hasAutoSync: boolean;
  requiresOAuth: boolean;
  requiresApiKey: boolean;
  requiresUsername: boolean;
  requiresPassword: boolean;
  isWorking: boolean;
  supportedFeatures: string[];
}

// =============================================================================
// SCRAPER FACTORY CLASS
// =============================================================================

class ScraperFactoryClass {
  private scrapers: Map<string, BaseScraper> = new Map();
  private scraperStatus: Map<string, ScraperStatus> = new Map();
  private platformInfo: Map<string, PlatformInfo> = new Map();
  private workingScrapers: Set<string> = new Set();
  private initialized: boolean = false;


private async loadScraperDynamic(slug: string): Promise<BaseScraper | null> {
  const normalizedSlug = slug.toLowerCase();
  const def = PLATFORM_DEFINITIONS.find(p => p.slug === normalizedSlug);
  if (!def) return null;

  try {
    const importedModule = await import(def.modulePath);
    const ScraperClass =
      (importedModule as any)[def.className] ||
      (importedModule as any).default;

    if (!ScraperClass) return null;

    const scraper = new ScraperClass();
    this.scrapers.set(def.slug, scraper);

    const info = this.platformInfo.get(def.slug);
    if (info) info.isImplemented = true;

    return scraper;
  } catch (err) {
    logger.debug(`Dynamic scraper load failed for ${slug}: ${def.modulePath}`);
      console.error(err);
    return null;
  }
}
// Add inside ScraperFactoryClass

async getOrLoadScraper(slug: string): Promise<BaseScraper | null> {
  const normalizedSlug = slug.toLowerCase();

  const existing = this.scrapers.get(normalizedSlug);
  if (existing && !(existing instanceof StubScraper)) {
    return existing;
  }

  // Try dynamic load
  const loaded = await this.loadScraperDynamic(normalizedSlug);
  if (loaded) return loaded;

  // fallback: return stub if present
  return this.scrapers.get(normalizedSlug) || null;
}


  // Auth requirement sets
  private oauthRequired: Set<string> = new Set(['github', 'gitlab', 'bitbucket', 'linkedin', 'google', 'microsoft']);
  private apiKeyRequired: Set<string> = new Set(['wakatime', 'toggl']);
  private credentialsRequired: Set<string> = new Set(['coursera', 'udemy', 'udacity', 'pluralsight', 'skillshare', 'datacamp', 'algoexpert']);

  constructor() {
    this.initializeSync();
  }

  /**
   * Synchronous initialization with dynamic imports handled later
   */
  private initializeSync(): void {
    // Initialize platform info and stubs
    for (const def of PLATFORM_DEFINITIONS) {
      this.platformInfo.set(def.slug, {
        slug: def.slug,
        name: def.name,
        category: def.category,
        authType: def.authType,
        isImplemented: false, // Will be updated when scraper loads
        isWorking: def.isExpectedWorking,
        priority: def.priority,
      });

      // Initialize with stub scraper
      this.scrapers.set(def.slug, new StubScraper(def.name, def.slug));
      
      this.scraperStatus.set(def.slug, {
        isWorking: def.isExpectedWorking,
        lastChecked: null,
        errorCount: 0,
        lastError: null,
        avgResponseTime: null,
        successRate: 100,
        totalAttempts: 0,
        totalSuccesses: 0,
      });

      if (def.isExpectedWorking) {
        this.workingScrapers.add(def.slug);
      }
    }

    // Load actual scrapers synchronously using require
    this.loadScrapersSync();
    this.initialized = true;
    
    logger.info(`ScraperFactory initialized with ${this.scrapers.size} scrapers (${this.workingScrapers.size} working)`);
  }

  /**
   * Load scrapers synchronously
   */
  private loadScrapersSync(): void {
    for (const def of PLATFORM_DEFINITIONS) {
      try {
    
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const scraperModule = require(def.modulePath);
        const ScraperClass = scraperModule[def.className] || scraperModule.default;
        
        if (ScraperClass) {
          const scraper = new ScraperClass();
          this.scrapers.set(def.slug, scraper);
          
          const info = this.platformInfo.get(def.slug);
          if (info) {
            info.isImplemented = true;
          }
        }
      } catch {
        // Scraper module doesn't exist or has errors - keep stub
        logger.debug(`Using stub scraper for ${def.slug}`);
      }
    }
  }

  // =========================================================================
  // PUBLIC METHODS
  // =========================================================================

  getScraper(slug: string): BaseScraper | null {
    return this.scrapers.get(slug.toLowerCase()) || null;
  }

  hasScraper(slug: string): boolean {
    return this.scrapers.has(slug.toLowerCase());
  }

  isScraperWorking(slug: string): boolean {
    return this.workingScrapers.has(slug.toLowerCase());
  }

  requiresOAuth(slug: string): boolean {
    return this.oauthRequired.has(slug.toLowerCase());
  }

  requiresApiKey(slug: string): boolean {
    return this.apiKeyRequired.has(slug.toLowerCase());
  }

  requiresCredentials(slug: string): boolean {
    return this.credentialsRequired.has(slug.toLowerCase());
  }

  getRegisteredPlatforms(): string[] {
    return Array.from(this.scrapers.keys());
  }

  getWorkingPlatforms(): string[] {
    return Array.from(this.workingScrapers);
  }

  getPlatformInfo(slug: string): PlatformInfo | null {
    return this.platformInfo.get(slug.toLowerCase()) || null;
  }

  getStatus(slug: string): ScraperStatus | null {
    return this.scraperStatus.get(slug.toLowerCase()) || null;
  }

  updateStatus(slug: string, success: boolean, error?: string, responseTime?: number): void {
    const normalizedSlug = slug.toLowerCase();
    const status = this.scraperStatus.get(normalizedSlug);
    
    if (!status) return;

    status.lastChecked = new Date();
    status.totalAttempts++;

    if (success) {
      status.totalSuccesses++;
      status.errorCount = 0;
      status.lastError = null;
      
      if (responseTime !== undefined) {
        status.avgResponseTime = status.avgResponseTime === null
          ? responseTime
          : (status.avgResponseTime * 0.8) + (responseTime * 0.2);
      }
    } else {
      status.errorCount++;
      status.lastError = error || 'Unknown error';

      if (status.errorCount >= 5) {
        this.workingScrapers.delete(normalizedSlug);
        status.isWorking = false;
        
        const info = this.platformInfo.get(normalizedSlug);
        if (info) info.isWorking = false;
        
        logger.warn(`Scraper ${slug} marked as not working after ${status.errorCount} consecutive errors`);
      }
    }

    status.successRate = status.totalAttempts > 0 
      ? (status.totalSuccesses / status.totalAttempts) * 100 
      : 100;
  }

  getCapabilities(slug: string): ScraperCapabilities {
    const normalizedSlug = slug.toLowerCase();
    
    return {
      hasAutoSync: this.hasScraper(normalizedSlug) && this.isScraperWorking(normalizedSlug),
      requiresOAuth: this.requiresOAuth(normalizedSlug),
      requiresApiKey: this.requiresApiKey(normalizedSlug),
      requiresUsername: !this.requiresOAuth(normalizedSlug) && !this.requiresApiKey(normalizedSlug),
      requiresPassword: this.requiresCredentials(normalizedSlug),
      isWorking: this.isScraperWorking(normalizedSlug),
      supportedFeatures: [],
    };
  }

  getHealthSummary(): {
    total: number;
    working: number;
    notWorking: number;
    byCategory: Record<string, { total: number; working: number }>;
  } {
    const categories: Record<string, { total: number; working: number }> = {};

    for (const info of this.platformInfo.values()) {
      if (!categories[info.category]) {
        categories[info.category] = { total: 0, working: 0 };
      }
      categories[info.category].total++;
      if (info.isWorking) {
        categories[info.category].working++;
      }
    }

    return {
      total: this.platformInfo.size,
      working: this.workingScrapers.size,
      notWorking: this.platformInfo.size - this.workingScrapers.size,
      byCategory: categories,
    };
  }

  async healthCheck(): Promise<Map<string, { healthy: boolean; latency: number; error?: string }>> {
    const results = new Map();

    for (const [slug] of this.scrapers) {
      const status = this.getStatus(slug);
      results.set(slug, {
        healthy: status?.isWorking ?? false,
        latency: status?.avgResponseTime ?? 0,
        status,
      });
    }

    return results;
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export const ScraperFactory = new ScraperFactoryClass();

export { BaseScraper } from './baseScraper';
export { StubScraper } from './stubScraper';
export type { 
  ScraperCredentials, 
  ScraperResult, 
  ScraperEntry, 
  ScraperMetadata,
} from './types';
export type { ScraperStatus, PlatformInfo, ScraperCapabilities };