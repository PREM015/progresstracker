
import type { Browser, Page } from 'puppeteer';
import { logger } from '@/lib/logger';

let puppeteer: any;

if (typeof window === 'undefined') {
  try {
    puppeteer = require('puppeteer');
  } catch {
    logger.warn('Puppeteer not available in this environment');
  }
}

class BrowserServiceClass {
    private browser: Browser | null = null;
    private isLaunching: boolean = false;
    private lastLaunchTime: number = 0;

    /**
     * Get a configured Puppeteer page
     * Reuses the browser instance
     */
    async getPage(): Promise<Page> {
        const browser = await this.getBrowser();
        const page = await browser.newPage();

        // Optimize page 
        await this.configurePage(page);

        return page;
    }

    /**
     * Get or launch the browser instance
     */
    private async getBrowser(): Promise<Browser> {
        if (this.browser && this.browser.isConnected()) {
            return this.browser;
        }

        // prevent race conditions on launch
        if (this.isLaunching) {
            // Wait for launch to complete (simple poll)
            let attempts = 0;
            while (this.isLaunching && attempts < 20) {
                await new Promise(r => setTimeout(r, 200));
                attempts++;
                if (this.browser && this.browser.isConnected()) return this.browser;
            }
            if (this.browser && this.browser.isConnected()) return this.browser;
            // If still launching after 4s, try to take over or throw
            logger.warn('[BrowserService] Browser launch timed out or race condition. Retrying launch.');
        }

        this.isLaunching = true;

        try {
            this.lastLaunchTime = Date.now();
            logger.info('[BrowserService] Launching new browser instance...');

            this.browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--window-size=1920,1080',
                ],
                // Optional: executablePath if needed for specific environments
            });

            if (!this.browser) {
                throw new Error('Failed to launch browser instance');
            }

            this.browser.on('disconnected', () => {
                logger.warn('[BrowserService] Browser disconnected.');
                this.browser = null;
            });

            logger.info(`[BrowserService] Browser launched. Version: ${await this.browser.version()}`);
            return this.browser;
        } catch (error) {
            logger.error('[BrowserService] Failed to launch browser', error instanceof Error ? error : new Error(String(error)));
            throw error;
        } finally {
            this.isLaunching = false;
        }
    }

    /**
     * Configure page for performance and resource blocking
     */
    private async configurePage(page: Page): Promise<void> {
        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });

        // Enable request interception for resource blocking
        await page.setRequestInterception(true);

        page.on('request', (req) => {
            const resourceType = req.resourceType();
            const url = req.url().toLowerCase();

            // 1. Resource Blocking
            if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
                req.abort();
                return;
            }

            // 2. SSRF Protection (Comprehensive)
            // Block access to localhost, private IPs (RFC 1918/4193), and cloud metadata services
            const isForbidden = 
                url.includes('localhost') ||
                url.includes('127.0.0.1') ||
                url.includes('0.0.0.0') ||
                url.includes('169.254.') || // AWS/GCP/Azure Metadata
                url.includes('10.') ||      // Private Class A
                url.includes('192.168.') || // Private Class C
                url.match(/172\.(1[6-9]|2[0-9]|3[01])\./) || // Private Class B
                url.includes('::1') ||
                url.match(/^fd[0-9a-f]{2}:/i) || 
                url.match(/^fe[89ab][0-9a-f]:/i);

            if (isForbidden) {
                logger.warn(`[BrowserService] Blocked potential SSRF request to: ${url}`);
                req.abort();
                return;
            }

            // 3. Protocol Restriction
            if (url.startsWith('file:') || url.startsWith('ftp:')) {
                req.abort();
                return;
            }

            req.continue();
        });

        // Set default timeout
        page.setDefaultNavigationTimeout(30000);
        page.setDefaultTimeout(30000);
    }

    /**
     * Close the browser instance (e.g. on shutdown)
     */
    async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}

export const BrowserService = new BrowserServiceClass();
