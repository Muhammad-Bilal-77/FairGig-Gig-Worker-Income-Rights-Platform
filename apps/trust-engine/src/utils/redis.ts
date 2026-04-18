import Redis from 'ioredis';
import { logger } from './logger';

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    client.on('error', (error) => logger.error('Redis error', { error }));
  }

  return client;
}

export async function setTrustScore(userId: string, score: number, tier: string): Promise<void> {
  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.setex(`trust:score:${userId}`, 120, score.toFixed(4));
  pipeline.setex(`trust:tier:${userId}`, 300, tier);
  await pipeline.exec();
}

export async function getTrustScore(userId: string): Promise<number | null> {
  const value = await getRedis().get(`trust:score:${userId}`);
  return value ? parseFloat(value) : null;
}

export async function getTrustTierCached(userId: string): Promise<string | null> {
  return getRedis().get(`trust:tier:${userId}`);
}
