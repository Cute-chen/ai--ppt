import { AppError } from '../common/errors/app-error';
import { env } from '../config/env';
import { getRedis } from '../config/redis';
import { AuthCodePurpose } from '../repositories/auth.repository';

const clampPositive = (value: number, fallback: number): number => {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
};

const getConfig = () => {
  return {
    cooldownSeconds: clampPositive(env.authCodeRateLimit.cooldownSeconds, 60),
    windowSeconds: clampPositive(env.authCodeRateLimit.windowSeconds, 3600),
    maxPerWindow: clampPositive(env.authCodeRateLimit.maxPerWindow, 10)
  };
};

const keyPart = (value: string): string => encodeURIComponent(value.trim().toLowerCase());

const nowUnix = (): number => Math.floor(Date.now() / 1000);

type RateLimitResult = {
  blocked: boolean;
  retryAfterSeconds: number;
  reason?: 'cooldown' | 'window';
};

export class AuthCodeRateLimitService {
  public async assertCanSend(email: string, purpose: AuthCodePurpose): Promise<void> {
    const result = await this.checkAndConsume(email, purpose);
    if (!result.blocked) {
      return;
    }

    if (result.reason === 'cooldown') {
      throw new AppError(
        `too many requests: wait ${result.retryAfterSeconds}s before requesting another code`,
        429,
        429
      );
    }

    throw new AppError(
      `too many requests: hourly limit reached, retry in ${result.retryAfterSeconds}s`,
      429,
      429
    );
  }

  private async checkAndConsume(email: string, purpose: AuthCodePurpose): Promise<RateLimitResult> {
    const redis = getRedis();
    const cfg = getConfig();
    const emailPart = keyPart(email);
    const purposePart = keyPart(purpose);
    const baseKey = `auth:send-code:${purposePart}:${emailPart}`;
    const cooldownKey = `${baseKey}:cooldown`;
    const windowKey = `${baseKey}:window`;

    const cooldownSet = await redis.set(cooldownKey, '1', 'EX', cfg.cooldownSeconds, 'NX');
    if (cooldownSet !== 'OK') {
      const ttl = await redis.ttl(cooldownKey);
      return {
        blocked: true,
        retryAfterSeconds: ttl > 0 ? ttl : cfg.cooldownSeconds,
        reason: 'cooldown'
      };
    }

    const count = await redis.incr(windowKey);
    if (count === 1) {
      await redis.expire(windowKey, cfg.windowSeconds);
    }

    if (count > cfg.maxPerWindow) {
      await redis.del(cooldownKey);
      const ttl = await redis.ttl(windowKey);
      return {
        blocked: true,
        retryAfterSeconds: ttl > 0 ? ttl : cfg.windowSeconds,
        reason: 'window'
      };
    }

    return {
      blocked: false,
      retryAfterSeconds: 0
    };
  }

  public getPolicySnapshot(): {
    cooldownSeconds: number;
    windowSeconds: number;
    maxPerWindow: number;
    nowUnix: number;
  } {
    const cfg = getConfig();
    return {
      cooldownSeconds: cfg.cooldownSeconds,
      windowSeconds: cfg.windowSeconds,
      maxPerWindow: cfg.maxPerWindow,
      nowUnix: nowUnix()
    };
  }
}

export const authCodeRateLimitService = new AuthCodeRateLimitService();
