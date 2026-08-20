import { LRUCache } from 'lru-cache';
import { logger } from '../logger.js';

export interface ICacheService {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlMs?: number): void;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
}

export class MemoryCacheService implements ICacheService {
  private readonly lru: LRUCache<string, any>;

  constructor(maxItems = 200, defaultTtlMs = 60 * 1000) {
    this.lru = new LRUCache<string, any>({
      max: maxItems,
      ttl: defaultTtlMs,
    });
  }

  public get<T>(key: string): T | undefined {
    if (this.lru.has(key)) {
      logger.debug(`[Cache Hit] ${key}`);
      return this.lru.get(key) as T;
    }
    return undefined;
  }

  public set<T>(key: string, value: T, ttlMs?: number): void {
    this.lru.set(key, value, { ttl: ttlMs });
  }

  public has(key: string): boolean {
    return this.lru.has(key);
  }

  public delete(key: string): void {
    this.lru.delete(key);
  }

  public clear(): void {
    this.lru.clear();
  }
}
