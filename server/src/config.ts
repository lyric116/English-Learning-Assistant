import dotenv from 'dotenv';
dotenv.config();

interface FallbackProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  dailyQuota: number;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const num = Number.parseInt(value || '', 10);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return num;
}

function parseFallbackProviders(raw: string | undefined): FallbackProviderConfig[] {
  if (!raw?.trim()) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item, index) => {
        const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : `fallback-${index + 1}`;
        const baseUrl = typeof item.baseUrl === 'string' ? item.baseUrl.trim() : '';
        const apiKey = typeof item.apiKey === 'string' ? item.apiKey.trim() : '';
        const model = typeof item.model === 'string' ? item.model.trim() : '';
        const dailyQuota = typeof item.dailyQuota === 'number' && Number.isFinite(item.dailyQuota) && item.dailyQuota > 0
          ? Math.floor(item.dailyQuota)
          : parsePositiveInt(process.env.AI_PROVIDER_FALLBACK_DAILY_QUOTA, 500);

        if (!baseUrl || !apiKey || !model) return null;
        return { name, baseUrl, apiKey, model, dailyQuota };
      })
      .filter((item): item is FallbackProviderConfig => !!item);
  } catch {
    return [];
  }
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  rateLimit: {
    windowMs: 60 * 1000,
    max: 20,
  },
  ai: {
    requestTimeoutMs: parsePositiveInt(process.env.AI_REQUEST_TIMEOUT_MS, 45000),
    allowPrivateHosts: process.env.ALLOW_PRIVATE_AI_HOSTS === '1',
    primaryDailyQuota: parsePositiveInt(process.env.AI_PROVIDER_PRIMARY_DAILY_QUOTA, 2000),
    fallbackProviders: parseFallbackProviders(process.env.AI_FALLBACK_PROVIDERS),
  },
};
