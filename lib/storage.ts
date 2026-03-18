import { kv } from '@vercel/kv';

const memory = new Map<string, { value: unknown; expiresAt?: number }>();

function hasKvConfig() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export async function storageGet<T>(key: string): Promise<T | null> {
  if (hasKvConfig()) {
    return (await kv.get<T>(key)) ?? null;
  }

  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    memory.delete(key);
    return null;
  }
  return entry.value as T;
}

export async function storageSet(key: string, value: unknown, ttlSeconds?: number) {
  if (hasKvConfig()) {
    if (ttlSeconds) {
      await kv.set(key, value, { ex: ttlSeconds });
      return;
    }
    await kv.set(key, value);
    return;
  }

  memory.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
  });
}

export async function storageDel(key: string) {
  if (hasKvConfig()) {
    await kv.del(key);
    return;
  }
  memory.delete(key);
}
