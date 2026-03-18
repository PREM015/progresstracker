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

const SCRAPER_IMPORTS: Record<string, () => Promise<any>> = {
  // DSA
  'leetcode': () => import('./leetcodeScraper'),
  'codeforces': () => import('./codeforcesScraper'),
  'codechef': () => import('./codechefScraper'),
  'hackerrank': () => import('./hackerrankScraper'),
  'hackerearth': () => import('./hackerearthScraper'),
  'atcoder': () => import('./atcoderScraper'),
  'geeksforgeeks': () => import('./geeksforgeeksScraper'),
  'interviewbit': () => import('./interviewbitScraper'),
  'codewars': () => import('./codewarsScraper'),
  'exercism': () => import('./exercismScraper'),
  'topcoder': () => import('./topcoderScraper'),
  'spoj': () => import('./spojScraper'),
  'projecteuler': () => import('./projecteulerScraper'),
  'binarysearch': () => import('./binarysearchScraper'),
  'algoexpert': () => import('./algoexpertScraper'),
  'codingame': () => import('./codinGameScraper'),

  // Git
  'github': () => import('./githubScraper'),
  'gitlab': () => import('./gitlabScraper'),
  'bitbucket': () => import('./bitbucketScraper'),
  'sourceforge': () => import('./sourceforgeScraper'),

  // Learning
  'freecodecamp': () => import('./freecodecampScraper'),
  'codecademy': () => import('./codecademyScraper'),
  'coursera': () => import('./courseraScaper'),
  'udemy': () => import('./udemyScraper'),
  'udacity': () => import('./udacityScraper'),
  'edx': () => import('./edxScraper'),
  'khanacademy': () => import('./khanacademyScraper'),
  'pluralsight': () => import('./pluralsightScraper'),
  'skillshare': () => import('./skillshareScraper'),
  'linkedinlearning': () => import('./linkedinlearningScraper'),
  'datacamp': () => import('./datacampScraper'),
  'scrimba': () => import('./scrimbaScraper'),

  // Data Science
  'kaggle': () => import('./kaggleScraper'),

  // Job
  'linkedin': () => import('./linkedinScraper'),
  'indeed': () => import('./indeedScraper'),
  'glassdoor': () => import('./glassdoorScraper'),
  'naukri': () => import('./naukriScraper'),
  'monster': () => import('./monsterScraper'),
  'dice': () => import('./diceScraper'),
  'ziprecruiter': () => import('./ziprecruiterScraper'),
  'simplyhired': () => import('./simplyhiredScraper'),
  'hired': () => import('./hiredScraper'),
  'wellfound': () => import('./wellfoundScraper'),
  'angellist': () => import('./angellistScraper'),
  'instahyre': () => import('./instahyreScraper'),
  'internshala': () => import('./internshalaScaper'),
  'unstop': () => import('./unstopScraper'),

  // Hackathon
  'devpost': () => import('./devpostScraper'),
  'mlh': () => import('./mlhScraper'),
  'hackathoncom': () => import('./hackathoncomScraper'),
  'devfolio': () => import('./devfolioScraper'),

  // Open Source
  'gssoc': () => import('./gssocScraper'),
  'hacktoberfest': () => import('./hacktoberfestScraper'),
  'outreachy': () => import('./outreachyScraper'),
  'lfx': () => import('./lfxScraper'),
  'kwoc': () => import('./kwocScraper'),
  'swoc': () => import('./swocScraper'),

  // Company
  'google': () => import('./googleScraper'),
  'meta': () => import('./metaScraper'),
  'amazon': () => import('./amazonScraper'),
  'microsoft': () => import('./microsoftScraper'),
  'apple': () => import('./appleScraper'),
  'ibm': () => import('./ibmScraper'),

  // Design
  'dribbble': () => import('./dribbbleScraper'),
  'behance': () => import('./behanceScraper'),
  'producthunt': () => import('./producthuntScraper'),
};

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
  isHeavy: boolean; // Added for BullMQ routing
}

const PLATFORM_DEFINITIONS: PlatformDef[] = [
  // Group 1: Elite Tier (Rank 1-20)
  { slug: 'github', name: 'GitHub', className: 'GitHubScraper', modulePath: './githubScraper', category: 'git', authType: 'oauth', priority: 100, isExpectedWorking: true, isHeavy: false },
  { slug: 'leetcode', name: 'LeetCode', className: 'LeetCodeScraper', modulePath: './leetcodeScraper', category: 'dsa', authType: 'scraping', priority: 100, isExpectedWorking: true, isHeavy: false },
  { slug: 'linkedin', name: 'LinkedIn', className: 'LinkedInScraper', modulePath: './linkedinScraper', category: 'job', authType: 'scraping', priority: 100, isExpectedWorking: true, isHeavy: true },
  { slug: 'codeforces', name: 'Codeforces', className: 'CodeforcesScraper', modulePath: './codeforcesScraper', category: 'dsa', authType: 'scraping', priority: 100, isExpectedWorking: true, isHeavy: false },
  { slug: 'hackerrank', name: 'HackerRank', className: 'HackerRankScraper', modulePath: './hackerrankScraper', category: 'dsa', authType: 'scraping', priority: 100, isExpectedWorking: true, isHeavy: false },
  { slug: 'coursera', name: 'Coursera', className: 'CourseraScraper', modulePath: './courseraScaper', category: 'learning', authType: 'scraping', priority: 90, isExpectedWorking: true, isHeavy: false },
  { slug: 'geeksforgeeks', name: 'GeeksforGeeks', className: 'GeeksForGeeksScraper', modulePath: './geeksforgeeksScraper', category: 'dsa', authType: 'scraping', priority: 90, isExpectedWorking: true, isHeavy: false },
  { slug: 'kaggle', name: 'Kaggle', className: 'KaggleScraper', modulePath: './kaggleScraper', category: 'data_science', authType: 'scraping', priority: 90, isExpectedWorking: true, isHeavy: false },
  { slug: 'codechef', name: 'CodeChef', className: 'CodeChefScraper', modulePath: './codechefScraper', category: 'dsa', authType: 'scraping', priority: 90, isExpectedWorking: true, isHeavy: false },
  { slug: 'gitlab', name: 'GitLab', className: 'GitLabScraper', modulePath: './gitlabScraper', category: 'git', authType: 'oauth', priority: 90, isExpectedWorking: true, isHeavy: false },
  { slug: 'freecodecamp', name: 'freeCodeCamp', className: 'FreeCodeCampScraper', modulePath: './freecodecampScraper', category: 'learning', authType: 'scraping', priority: 90, isExpectedWorking: true, isHeavy: false },
  { slug: 'udemy', name: 'Udemy', className: 'UdemyScraper', modulePath: './udemyScraper', category: 'learning', authType: 'scraping', priority: 90, isExpectedWorking: true, isHeavy: false },
  { slug: 'atcoder', name: 'AtCoder', className: 'AtCoderScraper', modulePath: './atcoderScraper', category: 'dsa', authType: 'scraping', priority: 90, isExpectedWorking: true, isHeavy: false },
  { slug: 'devpost', name: 'Devpost', className: 'DevpostScraper', modulePath: './devpostScraper', category: 'hackathon', authType: 'scraping', priority: 90, isExpectedWorking: true, isHeavy: true },
  { slug: 'edx', name: 'edX', className: 'EdXScraper', modulePath: './edxScraper', category: 'learning', authType: 'scraping', priority: 90, isExpectedWorking: true, isHeavy: false },
  { slug: 'hackerearth', name: 'HackerEarth', className: 'HackerEarthScraper', modulePath: './hackerearthScraper', category: 'dsa', authType: 'scraping', priority: 90, isExpectedWorking: true, isHeavy: true },
  { slug: 'codewars', name: 'Codewars', className: 'CodewarsScraper', modulePath: './codewarsScraper', category: 'dsa', authType: 'scraping', priority: 90, isExpectedWorking: true, isHeavy: false },
  { slug: 'indeed', name: 'Indeed', className: 'IndeedScraper', modulePath: './indeedScraper', category: 'job', authType: 'scraping', priority: 90, isExpectedWorking: true, isHeavy: true },
  { slug: 'gsoc', name: 'GSoC', className: 'GSoCScraper', modulePath: './gssocScraper', category: 'opensource', authType: 'scraping', priority: 90, isExpectedWorking: true, isHeavy: false },
  { slug: 'pluralsight', name: 'Pluralsight', className: 'PluralsightScraper', modulePath: './pluralsightScraper', category: 'learning', authType: 'scraping', priority: 90, isExpectedWorking: true, isHeavy: false },

  // Group 2: High Value Tier (Rank 21-40)
  { slug: 'bitbucket', name: 'Bitbucket', className: 'BitbucketScraper', modulePath: './bitbucketScraper', category: 'git', authType: 'oauth', priority: 80, isExpectedWorking: true, isHeavy: false },
  { slug: 'naukri', name: 'Naukri', className: 'NaukriScraper', modulePath: './naukriScraper', category: 'job', authType: 'scraping', priority: 80, isExpectedWorking: true, isHeavy: true },
  { slug: 'devfolio', name: 'Devfolio', className: 'DevfolioScraper', modulePath: './devfolioScraper', category: 'hackathon', authType: 'scraping', priority: 80, isExpectedWorking: true, isHeavy: true },
  { slug: 'mlh', name: 'MLH', className: 'MLHScraper', modulePath: './mlhScraper', category: 'hackathon', authType: 'scraping', priority: 80, isExpectedWorking: true, isHeavy: true },
  { slug: 'datacamp', name: 'DataCamp', className: 'DataCampScraper', modulePath: './datacampScraper', category: 'learning', authType: 'scraping', priority: 80, isExpectedWorking: true, isHeavy: false },
  { slug: 'codecademy', name: 'Codecademy', className: 'CodecademyScraper', modulePath: './codecademyScraper', category: 'learning', authType: 'scraping', priority: 80, isExpectedWorking: true, isHeavy: false },
  { slug: 'udacity', name: 'Udacity', className: 'UdacityScraper', modulePath: './udacityScraper', category: 'learning', authType: 'scraping', priority: 80, isExpectedWorking: true, isHeavy: false },
  { slug: 'interviewbit', name: 'InterviewBit', className: 'InterviewBitScraper', modulePath: './interviewbitScraper', category: 'dsa', authType: 'scraping', priority: 80, isExpectedWorking: true, isHeavy: true },
  { slug: 'unstop', name: 'Unstop', className: 'UnstopScraper', modulePath: './unstopScraper', category: 'hackathon', authType: 'scraping', priority: 80, isExpectedWorking: true, isHeavy: true },
  { slug: 'glassdoor', name: 'Glassdoor', className: 'GlassdoorScraper', modulePath: './glassdoorScraper', category: 'job', authType: 'scraping', priority: 80, isExpectedWorking: true, isHeavy: true },
  { slug: 'wellfound', name: 'Wellfound', className: 'WellfoundScraper', modulePath: './wellfoundScraper', category: 'job', authType: 'scraping', priority: 80, isExpectedWorking: true, isHeavy: true },
  { slug: 'linkedinlearning', name: 'LinkedIn Learning', className: 'LinkedInLearningScraper', modulePath: './linkedinlearningScraper', category: 'learning', authType: 'scraping', priority: 80, isExpectedWorking: true, isHeavy: false },
  { slug: 'hacktoberfest', name: 'Hacktoberfest', className: 'HacktoberfestScraper', modulePath: './hacktoberfestScraper', category: 'opensource', authType: 'scraping', priority: 80, isExpectedWorking: true, isHeavy: false },
  { slug: 'outreachy', name: 'Outreachy', className: 'OutreachyScraper', modulePath: './outreachyScraper', category: 'opensource', authType: 'scraping', priority: 80, isExpectedWorking: true, isHeavy: false },
  { slug: 'spoj', name: 'SPOJ', className: 'SPOJScraper', modulePath: './spojScraper', category: 'dsa', authType: 'scraping', priority: 80, isExpectedWorking: true, isHeavy: true },
  { slug: 'topcoder', name: 'TopCoder', className: 'TopCoderScraper', modulePath: './topcoderScraper', category: 'dsa', authType: 'scraping', priority: 80, isExpectedWorking: true, isHeavy: true },
  { slug: 'khanacademy', name: 'Khan Academy', className: 'KhanAcademyScraper', modulePath: './khanacademyScraper', category: 'learning', authType: 'scraping', priority: 80, isExpectedWorking: true, isHeavy: false },
  { slug: 'exercism', name: 'Exercism', className: 'ExercismScraper', modulePath: './exercismScraper', category: 'dsa', authType: 'scraping', priority: 80, isExpectedWorking: true, isHeavy: false },
  { slug: 'amazon', name: 'Amazon Jobs', className: 'AmazonScraper', modulePath: './amazonScraper', category: 'company', authType: 'scraping', priority: 80, isExpectedWorking: true, isHeavy: true },
  { slug: 'google', name: 'Google Careers', className: 'GoogleScraper', modulePath: './googleScraper', category: 'company', authType: 'scraping', priority: 80, isExpectedWorking: true, isHeavy: true },

  // Group 3: Good Value Tier (Rank 41-60)
  { slug: 'microsoft', name: 'Microsoft Careers', className: 'MicrosoftScraper', modulePath: './microsoftScraper', category: 'company', authType: 'scraping', priority: 70, isExpectedWorking: true, isHeavy: true },
  { slug: 'meta', name: 'Meta Careers', className: 'MetaScraper', modulePath: './metaScraper', category: 'company', authType: 'scraping', priority: 70, isExpectedWorking: true, isHeavy: true },
  { slug: 'apple', name: 'Apple Careers', className: 'AppleScraper', modulePath: './appleScraper', category: 'company', authType: 'scraping', priority: 70, isExpectedWorking: true, isHeavy: true },
  { slug: 'lfx', name: 'LFX Mentorship', className: 'LFXScraper', modulePath: './lfxScraper', category: 'opensource', authType: 'scraping', priority: 70, isExpectedWorking: true, isHeavy: false },
  { slug: 'gssoc', name: 'GSSoC', className: 'GSSoCScraper', modulePath: './gssocScraper', category: 'opensource', authType: 'scraping', priority: 70, isExpectedWorking: true, isHeavy: false },
  { slug: 'internshala', name: 'Internshala', className: 'InternshalaScraper', modulePath: './internshalaScaper', category: 'job', authType: 'scraping', priority: 70, isExpectedWorking: true, isHeavy: true },
  { slug: 'dribbble', name: 'Dribbble', className: 'DribbbleScraper', modulePath: './dribbbleScraper', category: 'design', authType: 'scraping', priority: 70, isExpectedWorking: true, isHeavy: true },
  { slug: 'behance', name: 'Behance', className: 'BehanceScraper', modulePath: './behanceScraper', category: 'design', authType: 'scraping', priority: 70, isExpectedWorking: true, isHeavy: true },
  { slug: 'producthunt', name: 'Product Hunt', className: 'ProductHuntScraper', modulePath: './producthuntScraper', category: 'design', authType: 'scraping', priority: 70, isExpectedWorking: true, isHeavy: true },
  { slug: 'hired', name: 'Hired', className: 'HiredScraper', modulePath: './hiredScraper', category: 'job', authType: 'scraping', priority: 70, isExpectedWorking: true, isHeavy: true },
  { slug: 'skillshare', name: 'Skillshare', className: 'SkillshareScraper', modulePath: './skillshareScraper', category: 'learning', authType: 'scraping', priority: 70, isExpectedWorking: true, isHeavy: false },
  { slug: 'codingame', name: 'CodinGame', className: 'CodinGameScraper', modulePath: './codinGameScraper', category: 'hackathon', authType: 'scraping', priority: 70, isExpectedWorking: true, isHeavy: false },
  { slug: 'replit', name: 'Replit', className: 'ReplitScraper', modulePath: './stubScraper', category: 'hackathon', authType: 'scraping', priority: 70, isExpectedWorking: true, isHeavy: false },
  { slug: 'scrimba', name: 'Scrimba', className: 'ScrimbaScraper', modulePath: './scrimbaScraper', category: 'learning', authType: 'scraping', priority: 70, isExpectedWorking: true, isHeavy: false },
  { slug: 'codingninjas', name: 'Coding Ninjas', className: 'CodingninjasScraper', modulePath: './stubScraper', category: 'dsa', authType: 'scraping', priority: 70, isExpectedWorking: true, isHeavy: false },
  { slug: 'dmoj', name: 'DMOJ', className: 'DMOJScraper', modulePath: './stubScraper', category: 'dsa', authType: 'scraping', priority: 70, isExpectedWorking: true, isHeavy: false },
  { slug: 'projecteuler', name: 'Project Euler', className: 'ProjectEulerScraper', modulePath: './projecteulerScraper', category: 'dsa', authType: 'scraping', priority: 70, isExpectedWorking: true, isHeavy: false },
  { slug: 'algoexpert', name: 'AlgoExpert', className: 'AlgoExpertScraper', modulePath: './algoexpertScraper', category: 'dsa', authType: 'scraping', priority: 70, isExpectedWorking: true, isHeavy: false },
  { slug: 'binarysearch', name: 'BinarySearch', className: 'BinarySearchScraper', modulePath: './binarysearchScraper', category: 'dsa', authType: 'scraping', priority: 70, isExpectedWorking: true, isHeavy: false },
  { slug: 'instahyre', name: 'Instahyre', className: 'InstahyreScraper', modulePath: './instahyreScraper', category: 'job', authType: 'scraping', priority: 70, isExpectedWorking: true, isHeavy: true },

  // Group 4: Niche/Specialized Tier (Rank 61+)
  { slug: 'cses', name: 'CSES', className: 'CSESScraper', modulePath: './stubScraper', category: 'dsa', authType: 'scraping', priority: 50, isExpectedWorking: true, isHeavy: false },
  { slug: 'sololearn', name: 'SoloLearn', className: 'SoloLearnScraper', modulePath: './stubScraper', category: 'learning', authType: 'scraping', priority: 50, isExpectedWorking: true, isHeavy: false },
  { slug: 'egghead', name: 'egghead.io', className: 'EggheadScraper', modulePath: './stubScraper', category: 'learning', authType: 'scraping', priority: 50, isExpectedWorking: true, isHeavy: false },
  { slug: 'frontendmasters', name: 'Frontend Masters', className: 'FrontendmastersScraper', modulePath: './stubScraper', category: 'learning', authType: 'scraping', priority: 50, isExpectedWorking: true, isHeavy: false },
  { slug: 'mlhfellowship', name: 'MLH Fellowship', className: 'MlhfellowshipScraper', modulePath: './stubScraper', category: 'opensource', authType: 'scraping', priority: 50, isExpectedWorking: true, isHeavy: false },
  { slug: 'kwoc', name: 'KWoC', className: 'KWoCScraper', modulePath: './kwocScraper', category: 'opensource', authType: 'scraping', priority: 50, isExpectedWorking: true, isHeavy: false },
  { slug: 'swoc', name: 'SWoC', className: 'SWoCScraper', modulePath: './swocScraper', category: 'opensource', authType: 'scraping', priority: 50, isExpectedWorking: true, isHeavy: false },
  { slug: 'jwoc', name: 'JWoC', className: 'JWoCScraper', modulePath: './stubScraper', category: 'opensource', authType: 'scraping', priority: 50, isExpectedWorking: true, isHeavy: false },
  { slug: 'ssoc', name: 'SSoC', className: 'SSoCScraper', modulePath: './stubScraper', category: 'opensource', authType: 'scraping', priority: 50, isExpectedWorking: true, isHeavy: false },
  { slug: 'monster', name: 'Monster', className: 'MonsterScraper', modulePath: './monsterScraper', category: 'job', authType: 'scraping', priority: 50, isExpectedWorking: true, isHeavy: true },
  { slug: 'dice', name: 'Dice', className: 'DiceScraper', modulePath: './diceScraper', category: 'job', authType: 'scraping', priority: 50, isExpectedWorking: true, isHeavy: true },
  { slug: 'simplyhired', name: 'SimplyHired', className: 'SimplyHiredScraper', modulePath: './simplyhiredScraper', category: 'job', authType: 'scraping', priority: 50, isExpectedWorking: true, isHeavy: true },
  { slug: 'ziprecruiter', name: 'ZipRecruiter', className: 'ZipRecruiterScraper', modulePath: './ziprecruiterScraper', category: 'job', authType: 'scraping', priority: 50, isExpectedWorking: true, isHeavy: true },
  { slug: 'levels', name: 'Levels.fyi', className: 'LevelsScraper', modulePath: './stubScraper', category: 'job', authType: 'scraping', priority: 50, isExpectedWorking: true, isHeavy: true },
  { slug: 'blind', name: 'Blind', className: 'BlindScraper', modulePath: './stubScraper', category: 'job', authType: 'scraping', priority: 50, isExpectedWorking: true, isHeavy: true },
  { slug: 'netflix', name: 'Netflix Jobs', className: 'NetflixScraper', modulePath: './stubScraper', category: 'company', authType: 'scraping', priority: 50, isExpectedWorking: true, isHeavy: true },
  { slug: 'ibm', name: 'IBM Careers', className: 'IBMScraper', modulePath: './ibmScraper', category: 'company', authType: 'scraping', priority: 50, isExpectedWorking: true, isHeavy: true },
  { slug: 'salesforce', name: 'Salesforce Careers', className: 'SalesforceScraper', modulePath: './stubScraper', category: 'company', authType: 'scraping', priority: 50, isExpectedWorking: true, isHeavy: true },
  { slug: 'hackathoncom', name: 'Hackathon.com', className: 'HackathoncomScraper', modulePath: './hackathoncomScraper', category: 'hackathon', authType: 'scraping', priority: 50, isExpectedWorking: true, isHeavy: true },
  { slug: 'showwcase', name: 'Showwcase', className: 'ShowwcaseScraper', modulePath: './stubScraper', category: 'hackathon', authType: 'scraping', priority: 50, isExpectedWorking: true, isHeavy: false },
  { slug: 'codeberg', name: 'Codeberg', className: 'CodebergScraper', modulePath: './codebergScraper', category: 'git', authType: 'oauth', priority: 50, isExpectedWorking: true, isHeavy: false },
  { slug: 'sourceforge', name: 'SourceForge', className: 'SourceForgeScraper', modulePath: './sourceforgeScraper', category: 'git', authType: 'scraping', priority: 50, isExpectedWorking: true, isHeavy: false },
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
  isHeavy: boolean;
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
  private activeSyncs: Map<string, boolean> = new Map();
  private initialized: boolean = false;

  /**
   * Acquire a lock for a platform sync to prevent concurrent execution
   */
  acquireLock(slug: string): boolean {
    const normalizedSlug = slug.toLowerCase();
    if (this.activeSyncs.get(normalizedSlug)) {
      return false;
    }
    this.activeSyncs.set(normalizedSlug, true);
    return true;
  }

  /**
   * Release a lock for a platform sync
   */
  releaseLock(slug: string): void {
    const normalizedSlug = slug.toLowerCase();
    this.activeSyncs.delete(normalizedSlug);
  }

  /**
   * Check if a platform is currently syncing
   */
  isSyncing(slug: string): boolean {
    return this.activeSyncs.get(slug.toLowerCase()) || false;
  }


  private async loadScraperDynamic(slug: string): Promise<BaseScraper | null> {
    const normalizedSlug = slug.toLowerCase();
    const def = PLATFORM_DEFINITIONS.find(p => p.slug === normalizedSlug);
    if (!def) return null;

    try {
      console.log(`[ScraperFactory] Attempting to load ${slug} from ${def.modulePath}`);

      const loader = SCRAPER_IMPORTS[normalizedSlug];
      if (!loader) {
        console.error(`[ScraperFactory] No loader defined for ${slug}`);
        return null;
      }

      const importedModule = await loader();
      const ScraperClass =
        (importedModule as any)[def.className] ||
        (importedModule as any).default;

      if (!ScraperClass) {
        console.error(`[ScraperFactory] Scraper class not found in module for ${slug}`);
        return null;
      }

      console.log(`[ScraperFactory] Successfully loaded class for ${slug}`);
      const scraper = new ScraperClass();
      this.scrapers.set(def.slug, scraper);

      const info = this.platformInfo.get(def.slug);
      if (info) info.isImplemented = true;

      return scraper;
    } catch (err) {
      logger.error(`Dynamic scraper load FAILED for ${slug}`, {
        slug,
        module: def.modulePath,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      return null;
    }
  }
  // Add inside ScraperFactoryClass

  async getOrLoadScraper(slug: string): Promise<BaseScraper | null> {
    const normalizedSlug = slug.toLowerCase();
    console.log(`[ScraperFactory] getOrLoadScraper called for ${normalizedSlug}`);

    const existing = this.scrapers.get(normalizedSlug);
    if (existing && !(existing instanceof StubScraper)) {
      console.log(`[ScraperFactory] Found existing scraper for ${normalizedSlug}`);
      return existing;
    }

    console.log(`[ScraperFactory] Existing scraper for ${normalizedSlug} is stub or missing. Trying dynamic load.`);

    // Try dynamic load
    const loaded = await this.loadScraperDynamic(normalizedSlug);
    if (loaded) {
      console.log(`[ScraperFactory] Dynamic load successful for ${normalizedSlug}`);
      return loaded;
    }

    // fallback: return stub if present
    console.log(`[ScraperFactory] Dynamic load failed for ${normalizedSlug}, falling back to stub.`);
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
   * Synchronous initialization - LIGHTWEIGHT ONLY
   * Does NOT load actual scraper modules to prevent cold start delays
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
        isHeavy: def.isHeavy,
      });

      // Initialize with stub scraper ONLY
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

    this.initialized = true;
    logger.info(`ScraperFactory initialized with ${this.scrapers.size} stubs. Real scrapers will be lazy loaded.`);
  }

  // =========================================================================
  // PUBLIC METHODS
  // =========================================================================

  /**
   * Get a scraper instance (returns Stub if not loaded)
   * This is fast and synchronous for UI rendering
   */
  getScraper(slug: string): BaseScraper | null {
    return this.scrapers.get(slug.toLowerCase()) || null;
  }

  hasScraper(slug: string): boolean {
    return this.scrapers.has(slug.toLowerCase());
  }

  isScraperWorking(slug: string): boolean {
    return this.workingScrapers.has(slug.toLowerCase());
  }

  isHeavy(slug: string): boolean {
    return this.platformInfo.get(slug.toLowerCase())?.isHeavy ?? false;
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

      // Log every error at warn level for visibility
      logger.warn(`Scraper ${normalizedSlug} failed attempt ${status.errorCount}: ${status.lastError}`);

      if (status.errorCount >= 5) {
        this.workingScrapers.delete(normalizedSlug);
        status.isWorking = false;

        const info = this.platformInfo.get(normalizedSlug);
        if (info) info.isWorking = false;

        logger.error(`[CRITICAL] Scraper ${slug} marked as NOT WORKING after ${status.errorCount} consecutive errors. Last error: ${status.lastError}`);
      }
    }

    status.successRate = status.totalAttempts > 0
      ? (status.totalSuccesses / status.totalAttempts) * 100
      : 100;
  }

  /**
   * Explicitly report a likely structural change on the platform
   */
  reportStructuralChange(slug: string, detail: string): void {
    const normalizedSlug = slug.toLowerCase();
    logger.error(`[ScraperFactory] Structural change detected for ${slug}: ${detail}`);

    this.updateStatus(normalizedSlug, false, `Structural Change: ${detail}`);

    // Potentially trigger an automated alert or flag for developer review
    const status = this.scraperStatus.get(normalizedSlug);
    if (status) {
      status.isWorking = false; // Immediately mark as not working if structure changed
      this.workingScrapers.delete(normalizedSlug);
    }
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
export const getScraperForPlatform = (slug: string) => ScraperFactory.getScraper(slug);

export { BaseScraper } from './baseScraper';
export { StubScraper } from './stubScraper';
export type {
  ScraperCredentials,
  ScraperResult,
  ScraperEntry,
  ScraperMetadata,
} from './types';
export type { ScraperStatus, PlatformInfo, ScraperCapabilities };