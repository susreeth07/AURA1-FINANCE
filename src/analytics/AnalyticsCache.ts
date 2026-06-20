import { DomainEventBus } from '../domain/events/DomainEventBus';
import { DomainEvent } from '../domain/events/FinancialEvents';
import { logger } from '../utils/logger';

export interface PersistentCacheProvider {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
}

export class AnalyticsCache {
  private memoryCache = new Map<string, any>();
  private persistentCache?: PersistentCacheProvider;
  private unsubscribe?: () => void;

  constructor(persistentCache?: PersistentCacheProvider) {
    this.persistentCache = persistentCache;
    this.initEventListener();
  }

  private initEventListener() {
    this.unsubscribe = DomainEventBus.subscribe((event: DomainEvent) => {
      this.handleEvent(event);
    });
  }

  private handleEvent(event: DomainEvent) {
    const userId = event.payload?.userId;
    if (userId) {
      logger.info(`[AnalyticsCache] Event "${event.eventName}" received. Invalidating cache for user: ${userId}`);
      this.invalidate(userId);
    }
  }

  /**
   * Get cached dashboard payload for a user.
   */
  async get(userId: string): Promise<any | null> {
    // Check Level 1 memory cache
    if (this.memoryCache.has(userId)) {
      logger.info(`[AnalyticsCache] Level 1 (Memory) Cache Hit for user: ${userId}`);
      return this.memoryCache.get(userId);
    }

    // Check Level 2 persistent cache if present
    if (this.persistentCache) {
      try {
        const cached = await this.persistentCache.get(userId);
        if (cached) {
          logger.info(`[AnalyticsCache] Level 2 (Persistent) Cache Hit for user: ${userId}`);
          // Load back to memory cache
          this.memoryCache.set(userId, cached);
          return cached;
        }
      } catch (err) {
        logger.error(`[AnalyticsCache] Level 2 cache read error for user: ${userId}`, err);
      }
    }

    logger.info(`[AnalyticsCache] Cache Miss for user: ${userId}`);
    return null;
  }

  /**
   * Set cache entry.
   */
  async set(userId: string, data: any): Promise<void> {
    // Set Level 1
    this.memoryCache.set(userId, data);

    // Set Level 2
    if (this.persistentCache) {
      try {
        await this.persistentCache.set(userId, data);
      } catch (err) {
        logger.error(`[AnalyticsCache] Level 2 cache write error for user: ${userId}`, err);
      }
    }
  }

  /**
   * Invalidate cache for a user.
   */
  invalidate(userId: string): void {
    // Clear Level 1
    this.memoryCache.delete(userId);

    // Clear Level 2
    if (this.persistentCache) {
      this.persistentCache.delete(userId).catch((err) => {
        logger.error(`[AnalyticsCache] Level 2 cache delete error for user: ${userId}`, err);
      });
    }
  }

  /**
   * Clean up listeners (primarily for hot reloads or testing).
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.memoryCache.clear();
  }
}

// Export global singleton instance
export const analyticsCache = new AnalyticsCache();
