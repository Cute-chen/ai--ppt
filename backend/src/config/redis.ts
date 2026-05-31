import Redis from 'ioredis';
import { env } from './env';

let client: Redis | null = null;

export const getRedis = (): Redis => {
  if (client) {
    return client;
  }

  client = new Redis({
    host: env.redis.host,
    port: env.redis.port,
    password: env.redis.password || undefined,
    maxRetriesPerRequest: null
  });

  return client;
};
