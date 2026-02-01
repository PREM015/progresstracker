// src/lib/serviceWorker.ts
/**
 * Service Worker utilities
 * PWA support, caching strategies, and background sync
 */

import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

export interface ServiceWorkerConfig {
    scope?: string;
    updateViaCache?: 'imports' | 'all' | 'none';
}
interface SyncManager { 
    register(tag: string): Promise<void>;
 }
export interface CacheConfig {
    name: string;
    maxEntries?: number;
    maxAgeSeconds?: number;
}

export type SWMessageType =
    | 'SKIP_WAITING'
    | 'CACHE_URLS'
    | 'CLEAR_CACHE'
    | 'SYNC_DATA'
    | 'SHOW_NOTIFICATION';

export interface SWMessage {
    type: SWMessageType;
    payload?: unknown;
}

// =============================================================================
// SERVICE WORKER MANAGER
// =============================================================================

class ServiceWorkerManager {
    private readonly log = logger.child({ service: 'serviceWorker' });
    private registration: ServiceWorkerRegistration | null = null;
    private isSupported = false;

    constructor() {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            this.isSupported = true;
        }
    }

    /**
     * Check if service workers are supported
     */
    isAvailable(): boolean {
        return this.isSupported;
    }

    /**
     * Register service worker
     */
    async register(
        scriptUrl: string = '/sw.js',
        config?: ServiceWorkerConfig
    ): Promise<ServiceWorkerRegistration | null> {
        if (!this.isSupported) {
            this.log.warn('Service workers not supported');
            return null;
        }

        try {
            this.registration = await navigator.serviceWorker.register(scriptUrl, {
                scope: config?.scope || '/',
                updateViaCache: config?.updateViaCache || 'none',
            });

            this.log.info('Service worker registered', {
                scope: this.registration.scope,
            });

            // Set up update handling
            this.setupUpdateHandling();

            return this.registration;
        } catch (error) {
            this.log.error('Service worker registration failed', {}, error);
            return null;
        }
    }

    /**
     * Unregister service worker
     */
    async unregister(): Promise<boolean> {
        if (!this.registration) {
            return false;
        }

        try {
            const result = await this.registration.unregister();
            this.registration = null;
            this.log.info('Service worker unregistered');
            return result;
        } catch (error) {
            this.log.error('Failed to unregister service worker', {}, error);
            return false;
        }
    }

    /**
     * Get current registration
     */
    getRegistration(): ServiceWorkerRegistration | null {
        return this.registration;
    }

    /**
     * Check for updates
     */
    async checkForUpdates(): Promise<void> {
        if (!this.registration) return;

        try {
            await this.registration.update();
            this.log.debug('Service worker update check completed');
        } catch (error) {
            this.log.error('Failed to check for updates', {}, error);
        }
    }

    /**
     * Skip waiting and activate new service worker
     */
    async skipWaiting(): Promise<void> {
        if (!this.registration?.waiting) return;

        this.sendMessage({ type: 'SKIP_WAITING' });
    }

    /**
     * Send message to service worker
     */
    sendMessage(message: SWMessage): void {
        if (!navigator.serviceWorker.controller) {
            this.log.warn('No active service worker controller');
            return;
        }

        navigator.serviceWorker.controller.postMessage(message);
    }

    /**
     * Request background sync
     */
    async requestSync(tag: string): Promise<boolean> {
        if (!this.registration) return false;

        if (!('sync' in this.registration)) {
            this.log.warn('Background sync not supported');
            return false;
        }

        try {
            await (this.registration as ServiceWorkerRegistration & { sync: SyncManager }).sync.register(tag);
            this.log.debug('Background sync registered', { tag });
            return true;
        } catch (error) {
            this.log.error('Failed to register background sync', { tag }, error);
            return false;
        }
    }

    /**
     * Request periodic background sync
     */
    async requestPeriodicSync(tag: string, minInterval: number): Promise<boolean> {
        if (!this.registration) return false;

        if (!('periodicSync' in this.registration)) {
            this.log.warn('Periodic background sync not supported');
            return false;
        }

        try {
            await (this.registration as ServiceWorkerRegistration & {
                periodicSync: { register: (tag: string, options: { minInterval: number }) => Promise<void> }
            }).periodicSync.register(tag, { minInterval });
            this.log.debug('Periodic sync registered', { tag, minInterval });
            return true;
        } catch (error) {
            this.log.error('Failed to register periodic sync', { tag }, error);
            return false;
        }
    }

    /**
     * Get cache storage info
     */
    async getCacheInfo(): Promise<{
        caches: string[];
        totalSize?: number;
    }> {
        if (!('caches' in window)) {
            return { caches: [] };
        }

        try {
            const cacheNames = await caches.keys();

            let totalSize: number | undefined;
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                totalSize = estimate.usage;
            }

            return { caches: cacheNames, totalSize };
        } catch (error) {
            this.log.error('Failed to get cache info', {}, error);
            return { caches: [] };
        }
    }

    /**
     * Clear specific cache
     */
    async clearCache(cacheName: string): Promise<boolean> {
        try {
            const result = await caches.delete(cacheName);
            this.log.info('Cache cleared', { cacheName });
            return result;
        } catch (error) {
            this.log.error('Failed to clear cache', { cacheName }, error);
            return false;
        }
    }

    /**
     * Clear all caches
     */
    async clearAllCaches(): Promise<void> {
        try {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map((name) => caches.delete(name)));
            this.log.info('All caches cleared');
        } catch (error) {
            this.log.error('Failed to clear all caches', {}, error);
        }
    }

    /**
     * Add URLs to cache
     */
    async cacheUrls(cacheName: string, urls: string[]): Promise<void> {
        try {
            const cache = await caches.open(cacheName);
            await cache.addAll(urls);
            this.log.debug('URLs cached', { cacheName, count: urls.length });
        } catch (error) {
            this.log.error('Failed to cache URLs', { cacheName }, error);
        }
    }

    /**
     * Listen for service worker messages
     */
    onMessage(callback: (event: MessageEvent) => void): () => void {
        if (!this.isSupported) {
            return () => { };
        }

        navigator.serviceWorker.addEventListener('message', callback);

        return () => {
            navigator.serviceWorker.removeEventListener('message', callback);
        };
    }

    /**
     * Listen for controller change (new service worker activated)
     */
    onControllerChange(callback: () => void): () => void {
        if (!this.isSupported) {
            return () => { };
        }

        navigator.serviceWorker.addEventListener('controllerchange', callback);

        return () => {
            navigator.serviceWorker.removeEventListener('controllerchange', callback);
        };
    }

    // =============================================================================
    // PRIVATE METHODS
    // =============================================================================

    private setupUpdateHandling(): void {
        if (!this.registration) return;

        // Check for installing worker
        if (this.registration.installing) {
            this.trackInstalling(this.registration.installing);
        }

        // Listen for new workers
        this.registration.addEventListener('updatefound', () => {
            const newWorker = this.registration?.installing;
            if (newWorker) {
                this.trackInstalling(newWorker);
            }
        });
    }

    private trackInstalling(worker: ServiceWorker): void {
        worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content available
                this.log.info('New service worker installed, update available');

                // Dispatch custom event for UI to handle
                window.dispatchEvent(new CustomEvent('swUpdateAvailable'));
            }
        });
    }
}

// =============================================================================
// SINGLETON & EXPORTS
// =============================================================================

export const serviceWorker = new ServiceWorkerManager();

/**
 * Initialize service worker on app load
 */
export async function initServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (process.env.NODE_ENV === 'development') {
        logger.debug('Skipping service worker in development');
        return null;
    }

    return serviceWorker.register();
}

export default serviceWorker;