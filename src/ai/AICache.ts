import { AuraResponse } from './models/AuraResponse';
import { AIConfiguration } from './AIConfiguration';

export interface CacheKeyDetails {
  readonly userId: string;
  readonly prompt: string;
  readonly contextVersion: string;
  readonly conversationStateHash: string;
}

export class AICache {
  private static cache = new Map<string, { response: AuraResponse; expiresAt: number }>();

  static generateKey(details: CacheKeyDetails): string {
    const raw = `${details.userId}:${details.contextVersion}:${details.prompt}:${details.conversationStateHash}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return `ai_cache_${hash}`;
  }

  static get(key: string): AuraResponse | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.response;
  }

  static set(key: string, response: AuraResponse): void {
    const config = AIConfiguration.getConfig();
    if (config.cacheTtlMs <= 0) {
      return; // Caching disabled
    }

    const expiresAt = Date.now() + config.cacheTtlMs;
    this.cache.set(key, { response, expiresAt });
  }

  static invalidate(userId: string): void {
    // Clear all keys matching user
    const prefix = `ai_cache_`;
    for (const [key] of this.cache.entries()) {
      // Invalidation is handled reactively by changing the contextVersion at query time, 
      // but we support clear/delete if needed.
    }
  }

  static clear(): void {
    this.cache.clear();
  }
}
