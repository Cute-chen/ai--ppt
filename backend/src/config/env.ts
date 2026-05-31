import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

const toAbsolutePath = (value: string | undefined, fallback: string): string => {
  return path.resolve(value || fallback);
};

const toEnum = <T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T
): T => {
  const raw = (value || '').trim().toLowerCase();
  const hit = allowed.find((item) => item.toLowerCase() === raw);
  return hit || fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toNumber(process.env.PORT, 3001),
  secretKey: process.env.APP_SECRET_KEY || '',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: toNumber(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
    connectionLimit: toNumber(process.env.DB_CONNECTION_LIMIT, 10)
  },
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: toNumber(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD || ''
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: toNumber(process.env.SMTP_PORT, 465),
    secure: toBoolean(process.env.SMTP_SECURE, true),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || ''
  },
  authCodeRateLimit: {
    cooldownSeconds: toNumber(process.env.AUTH_CODE_COOLDOWN_SECONDS, 60),
    windowSeconds: toNumber(process.env.AUTH_CODE_WINDOW_SECONDS, 3600),
    maxPerWindow: toNumber(process.env.AUTH_CODE_MAX_PER_WINDOW, 10)
  },
  queue: {
    enabled: toBoolean(process.env.QUEUE_ENABLED, false),
    addTimeoutMs: toNumber(process.env.QUEUE_ADD_TIMEOUT_MS, 1200)
  },
  storage: {
    endpoint: process.env.S3_ENDPOINT || '',
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || '',
    bucket: process.env.S3_BUCKET || '',
    localRootDir: toAbsolutePath(
      process.env.LOCAL_STORAGE_ROOT_DIR,
      `${process.cwd().replace(/\\/g, '/')}/local-storage`
    )
  },
  skill: {
    pythonBin: process.env.SKILL_PYTHON_BIN || 'python3',
    rootDir: toAbsolutePath(
      process.env.PPT_SKILL_ROOT_DIR,
      `${process.cwd().replace(/\\/g, '/')}/../ppt-skill/gpt-image2-ppt-skills`
    ),
    generateConcurrency: toNumber(process.env.PPT_SKILL_GENERATE_CONCURRENCY, 4),
    commandTimeoutMs: toNumber(process.env.PPT_SKILL_COMMAND_TIMEOUT_MS, 600000),
    quality: toEnum(process.env.PPT_SKILL_IMAGE_QUALITY, ['low', 'medium', 'high', 'auto'], 'high'),
    outputRootDir: toAbsolutePath(
      process.env.PPT_SKILL_OUTPUT_ROOT_DIR,
      `${process.cwd().replace(/\\/g, '/')}/local-storage/skill-outputs`
    )
  },
  feature: {
    realSourceParse: toBoolean(process.env.FEATURE_REAL_SOURCE_PARSE, true),
    realDeckPlan: toBoolean(process.env.FEATURE_REAL_DECK_PLAN, true),
    realDeckGenerate: toBoolean(process.env.FEATURE_REAL_DECK_GENERATE, true),
    realSlideRegenerate: toBoolean(process.env.FEATURE_REAL_SLIDE_REGENERATE, true),
    realDeckExport: toBoolean(process.env.FEATURE_REAL_DECK_EXPORT, true)
  }
};
