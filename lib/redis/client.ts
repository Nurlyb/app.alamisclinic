/**
 * Redis Client для кеширования и сессий
 */

import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
});

redis.on('connect', () => {
  console.log('✅ Redis подключен');
});

redis.on('error', (err) => {
  console.error('❌ Ошибка Redis:', err);
});

/**
 * Сохранение refresh токена в Redis
 */
export async function saveRefreshToken(
  userId: string,
  token: string,
  expiresIn: number = 7 * 24 * 60 * 60 // 7 дней в секундах
): Promise<void> {
  const key = `refresh_token:${userId}`;
  await redis.setex(key, expiresIn, token);
}

/**
 * Получение refresh токена из Redis
 */
export async function getRefreshToken(userId: string): Promise<string | null> {
  const key = `refresh_token:${userId}`;
  return redis.get(key);
}

/**
 * Удаление refresh токена (logout)
 */
export async function deleteRefreshToken(userId: string): Promise<void> {
  const key = `refresh_token:${userId}`;
  await redis.del(key);
}

/**
 * Проверка существования refresh токена
 */
export async function hasRefreshToken(userId: string): Promise<boolean> {
  const key = `refresh_token:${userId}`;
  const exists = await redis.exists(key);
  return exists === 1;
}

/**
 * Кеширование данных
 */
export async function cacheSet(
  key: string,
  value: any,
  expiresIn: number = 300 // 5 минут по умолчанию
): Promise<void> {
  await redis.setex(key, expiresIn, JSON.stringify(value));
}

/**
 * Получение данных из кеша
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  if (!data) return null;
  return JSON.parse(data) as T;
}

/**
 * Удаление данных из кеша
 */
export async function cacheDel(key: string): Promise<void> {
  await redis.del(key);
}

/**
 * Инвалидация кеша по паттерну
 */
export async function cacheInvalidate(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
