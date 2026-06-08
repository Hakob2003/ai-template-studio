import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL; // Render provides this as a full URL
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

let redis: Redis;

if (REDIS_URL) {
  // Render provides a full Redis URL (redis://...)
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // for BullMQ
    retryStrategy: (times) => {
      if (times > 10) return null;
      return Math.min(times * 200, 2000);
    },
    tls: REDIS_URL.startsWith('rediss://') ? {} : undefined,
  });
} else {
  redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: null, // for BullMQ
    retryStrategy: (times) => {
      if (times > 10) return null;
      return Math.min(times * 200, 2000);
    },
  });
}

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err));

export { redis };