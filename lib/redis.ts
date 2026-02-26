/**
 * Redis Client для кеширования
 */

import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

/**
 * Кеширование с TTL
 */
export async function cacheSet(key: string, value: any, ttl: number = 3600) {
  await redis.setex(key, ttl, JSON.stringify(value));
}

/**
 * Получение из кеша
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Удаление из кеша
 */
export async function cacheDel(key: string) {
  await redis.del(key);
}

/**
 * Удаление по паттерну
 */
export async function cacheDelPattern(pattern: string) {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
