import { describe, expect, it } from 'vitest';
import { MemoryCacheService } from '../../src/core/cache/cache-service.js';

describe('MemoryCacheService', () => {
  it('stores and retrieves cached objects with TTL', () => {
    const cache = new MemoryCacheService(10, 5000);
    cache.set('key1', { val: 123 });

    expect(cache.has('key1')).toBe(true);
    expect(cache.get('key1')).toEqual({ val: 123 });

    cache.delete('key1');
    expect(cache.has('key1')).toBe(false);

    cache.set('key2', 'hello');
    cache.clear();
    expect(cache.has('key2')).toBe(false);
  });
});
