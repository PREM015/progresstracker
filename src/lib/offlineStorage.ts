// src/lib/offlineStorage.ts
/**
 * Offline Storage utilities
 * IndexedDB wrapper for offline-first functionality
 */

import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

export interface OfflineEntry {
  id: string;
  type: 'tracker_entry' | 'goal_update' | 'settings_change' | 'sync_request';
  data: unknown;
  createdAt: number;
  synced: boolean;
  syncedAt?: number;
  retryCount: number;
  lastError?: string;
}

export interface OfflineStorageConfig {
  dbName: string;
  version: number;
  stores: string[];
}

// =============================================================================
// OFFLINE STORAGE SERVICE
// =============================================================================

class OfflineStorageService {
  private readonly log = logger.child({ service: 'offlineStorage' });
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  private readonly config: OfflineStorageConfig = {
    dbName: 'codesync_offline',
    version: 1,
    stores: ['pending_entries', 'cached_data', 'sync_queue'],
  };

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<boolean> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      this.log.warn('IndexedDB not available');
      return false;
    }

    if (this.isInitialized) {
      return true;
    }

    return new Promise((resolve) => {
      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => {
        this.log.error('Failed to open IndexedDB', {}, request.error);
        resolve(false);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        this.log.info('IndexedDB initialized');
        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create stores
        for (const storeName of this.config.stores) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            store.createIndex('createdAt', 'createdAt', { unique: false });
            store.createIndex('synced', 'synced', { unique: false });
            store.createIndex('type', 'type', { unique: false });
          }
        }

        this.log.info('IndexedDB upgraded', { version: this.config.version });
      };
    });
  }

  /**
   * Check if offline storage is available
   */
  isAvailable(): boolean {
    return this.isInitialized && this.db !== null;
  }

  /**
   * Add entry to offline queue
   */
  async addToQueue(entry: Omit<OfflineEntry, 'id' | 'createdAt' | 'synced' | 'retryCount'>): Promise<string> {
    if (!this.isAvailable()) {
      await this.init();
    }

    if (!this.db) {
      throw new Error('Offline storage not available');
    }

    const fullEntry: OfflineEntry = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      synced: false,
      retryCount: 0,
      ...entry,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('pending_entries', 'readwrite');
      const store = transaction.objectStore('pending_entries');
      const request = store.add(fullEntry);

      request.onsuccess = () => {
        this.log.debug('Entry added to offline queue', { id: fullEntry.id, type: fullEntry.type });
        resolve(fullEntry.id);
      };

      request.onerror = () => {
        this.log.error('Failed to add entry to queue', {}, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get pending entries
   */
  async getPendingEntries(type?: OfflineEntry['type']): Promise<OfflineEntry[]> {
    if (!this.isAvailable()) {
      await this.init();
    }

    if (!this.db) {
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('pending_entries', 'readonly');
      const store = transaction.objectStore('pending_entries');
      
      let request: IDBRequest;
      
      if (type) {
        const index = store.index('type');
        request = index.getAll(type);
      } else {
        const index = store.index('synced');
        request = index.getAll(undefined);
      }

      request.onsuccess = () => {
        const entries = (request.result as OfflineEntry[]).filter((e) => !e.synced);
        resolve(entries.sort((a, b) => a.createdAt - b.createdAt));
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Mark entry as synced
   */
  async markSynced(id: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('pending_entries', 'readwrite');
      const store = transaction.objectStore('pending_entries');
      const request = store.get(id);

      request.onsuccess = () => {
        const entry = request.result as OfflineEntry;
        if (entry) {
          entry.synced = true;
          entry.syncedAt = Date.now();
          store.put(entry);
        }
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Mark entry as failed
   */
  async markFailed(id: string, error: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('pending_entries', 'readwrite');
      const store = transaction.objectStore('pending_entries');
      const request = store.get(id);

      request.onsuccess = () => {
        const entry = request.result as OfflineEntry;
        if (entry) {
          entry.retryCount++;
          entry.lastError = error;
          store.put(entry);
        }
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete synced entries older than given age
   */
  async cleanupSynced(maxAge: number = 24 * 60 * 60 * 1000): Promise<number> {
    if (!this.db) return 0;

    const cutoff = Date.now() - maxAge;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('pending_entries', 'readwrite');
      const store = transaction.objectStore('pending_entries');
      const index = store.index('synced');
      const request = index.openCursor(IDBKeyRange.only(true));

      let deleted = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor) {
          const entry = cursor.value as OfflineEntry;
          if (entry.syncedAt && entry.syncedAt < cutoff) {
            cursor.delete();
            deleted++;
          }
          cursor.continue();
        } else {
          resolve(deleted);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cache data for offline access
   */
  async cacheData(key: string, data: unknown, ttl?: number): Promise<void> {
    if (!this.isAvailable()) {
      await this.init();
    }

    if (!this.db) return;

    const cacheEntry = {
      id: key,
      data,
      createdAt: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : undefined,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('cached_data', 'readwrite');
      const store = transaction.objectStore('cached_data');
      const request = store.put(cacheEntry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cached data
   */
  async getCachedData<T>(key: string): Promise<T | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('cached_data', 'readonly');
      const store = transaction.objectStore('cached_data');
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result;
        
        if (!entry) {
          resolve(null);
          return;
        }

        // Check expiration
        if (entry.expiresAt && entry.expiresAt < Date.now()) {
          this.deleteCachedData(key);
          resolve(null);
          return;
        }

        resolve(entry.data as T);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete cached data
   */
  async deleteCachedData(key: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('cached_data', 'readwrite');
      const store = transaction.objectStore('cached_data');
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get storage usage info
   */
  async getStorageInfo(): Promise<{
    pendingCount: number;
    cachedCount: number;
    estimatedSize?: number;
  }> {
    if (!this.db) {
      return { pendingCount: 0, cachedCount: 0 };
    }

    const [pendingCount, cachedCount] = await Promise.all([
      this.getStoreCount('pending_entries'),
      this.getStoreCount('cached_data'),
    ]);

    let estimatedSize: number | undefined;

    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        estimatedSize = estimate.usage;
      } catch {
        // Ignore
      }
    }

    return { pendingCount, cachedCount, estimatedSize };
  }

  /**
   * Clear all offline data
   */
  async clearAll(): Promise<void> {
    if (!this.db) return;

    const promises = this.config.stores.map(
      (storeName) =>
        new Promise<void>((resolve, reject) => {
          const transaction = this.db!.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.clear();

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        })
    );

    await Promise.all(promises);
    this.log.info('Offline storage cleared');
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private async getStoreCount(storeName: string): Promise<number> {
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
  }
}

// =============================================================================
// SINGLETON & EXPORTS
// =============================================================================

export const offlineStorage = new OfflineStorageService();

/**
 * Queue tracker entry for offline sync
 */
export async function queueTrackerEntry(data: unknown): Promise<string> {
  return offlineStorage.addToQueue({
    type: 'tracker_entry',
    data,
  });
}

/**
 * Queue goal update for offline sync
 */
export async function queueGoalUpdate(data: unknown): Promise<string> {
  return offlineStorage.addToQueue({
    type: 'goal_update',
    data,
  });
}

export default offlineStorage;