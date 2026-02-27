// src/services/scrapers/proxyManager.ts
import { logger } from '@/lib/logger';
import type { ProxyConfig } from './types';

interface ProxyState {
  config: ProxyConfig;
  failures: number;
  successes: number;
  lastUsed: number;
  lastError?: string;
  isHealthy: boolean;
}

class ProxyManager {
  private proxies: Map<string, ProxyState> = new Map();
  private currentIndex: number = 0;
  private enabled: boolean = false;

  constructor() {
    this.loadFromEnv();
  }

  /**
   * Load proxies from environment
   */
  private loadFromEnv(): void {
    const proxyList = process.env.PROXY_LIST;
    if (!proxyList) return;

    try {
      const configs: ProxyConfig[] = JSON.parse(proxyList);
      configs.forEach((config) => this.add(config));
      this.enabled = true;
      logger.info(`Loaded ${configs.length} proxies from environment`);
    } catch (error) {
      logger.warn('Failed to parse PROXY_LIST from environment variable', { error });
    }
  }

  /**
   * Add a proxy
   */
  add(config: ProxyConfig): void {
    const key = this.getKey(config);
    this.proxies.set(key, {
      config,
      failures: 0,
      successes: 0,
      lastUsed: 0,
      isHealthy: true,
    });
  }

  /**
   * Remove a proxy
   */
  remove(config: ProxyConfig): void {
    this.proxies.delete(this.getKey(config));
  }

  /**
   * Get proxy key
   */
  private getKey(config: ProxyConfig): string {
    return `${config.protocol}://${config.host}:${config.port}`;
  }

  /**
   * Get next available proxy (round-robin)
   */
  getNext(): ProxyConfig | null {
    if (!this.enabled || this.proxies.size === 0) return null;

    const healthyProxies = Array.from(this.proxies.values())
      .filter((p) => p.isHealthy);

    if (healthyProxies.length === 0) {
      // Reset all proxies if none healthy
      this.resetHealth();
      return this.getNext();
    }

    this.currentIndex = (this.currentIndex + 1) % healthyProxies.length;
    const state = healthyProxies[this.currentIndex];
    state.lastUsed = Date.now();

    return state.config;
  }

  /**
   * Get least used proxy
   */
  getLeastUsed(): ProxyConfig | null {
    if (!this.enabled || this.proxies.size === 0) return null;

    const healthyProxies = Array.from(this.proxies.values())
      .filter((p) => p.isHealthy)
      .sort((a, b) => a.lastUsed - b.lastUsed);

    if (healthyProxies.length === 0) return null;

    const state = healthyProxies[0];
    state.lastUsed = Date.now();

    return state.config;
  }

  /**
   * Get proxy for specific country
   */
  getByCountry(country: string): ProxyConfig | null {
    const matching = Array.from(this.proxies.values())
      .filter((p) => p.isHealthy && p.config.country?.toLowerCase() === country.toLowerCase());

    if (matching.length === 0) return null;

    const state = matching[Math.floor(Math.random() * matching.length)];
    state.lastUsed = Date.now();

    return state.config;
  }

  /**
   * Report proxy success
   */
  reportSuccess(config: ProxyConfig): void {
    const key = this.getKey(config);
    const state = this.proxies.get(key);
    
    if (state) {
      state.successes++;
      state.failures = Math.max(0, state.failures - 1);
      state.isHealthy = true;
    }
  }

  /**
   * Report proxy failure
   */
  reportFailure(config: ProxyConfig, error?: string): void {
    const key = this.getKey(config);
    const state = this.proxies.get(key);
    
    if (state) {
      state.failures++;
      state.lastError = error;
      
      // Mark unhealthy after 3 consecutive failures
      if (state.failures >= 3) {
        state.isHealthy = false;
        logger.warn(`Proxy marked unhealthy: ${key}`, { failures: state.failures });
      }
    }
  }

  /**
   * Reset health status of all proxies
   */
  resetHealth(): void {
    for (const state of this.proxies.values()) {
      state.isHealthy = true;
      state.failures = 0;
    }
  }

  /**
   * Get proxy URL string
   */
  toUrl(config: ProxyConfig): string {
    const auth = config.username && config.password
      ? `${config.username}:${config.password}@`
      : '';
    return `${config.protocol}://${auth}${config.host}:${config.port}`;
  }

  /**
   * Check if proxies are enabled
   */
  isEnabled(): boolean {
    return this.enabled && this.proxies.size > 0;
  }

  /**
   * Get proxy count
   */
  getCount(): { total: number; healthy: number } {
    const total = this.proxies.size;
    const healthy = Array.from(this.proxies.values())
      .filter((p) => p.isHealthy).length;
    return { total, healthy };
  }

  /**
   * Get statistics
   */
  getStats(): Array<{
    proxy: string;
    successes: number;
    failures: number;
    healthy: boolean;
  }> {
    return Array.from(this.proxies.entries()).map(([key, state]) => ({
      proxy: key,
      successes: state.successes,
      failures: state.failures,
      healthy: state.isHealthy,
    }));
  }
}

export const proxyManager = new ProxyManager();
export default proxyManager;