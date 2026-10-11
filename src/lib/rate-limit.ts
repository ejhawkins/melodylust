// A small sliding-window rate limiter for server functions. Per server instance and in
// memory: enough to blunt bursts and scripted abuse locally and on a single host. A shared
// store (e.g. Supabase or Redis) is needed for a hard limit across many serverless instances.

export function createRateLimiter({ limit, windowMs, now = Date.now }: { limit: number; windowMs: number; now?: () => number }) {
  const hits = new Map<string, number[]>();
  return {
    /** Records an attempt for `key`; false when that key has used up its window. */
    allow(key: string) {
      const time = now();
      const recent = (hits.get(key) ?? []).filter(at => time - at < windowMs);
      if (recent.length >= limit) { hits.set(key, recent); return false; }
      recent.push(time);
      hits.set(key, recent);
      // Keep memory bounded: forget keys with nothing recent.
      if (hits.size > 5_000) for (const [k, list] of hits) if (!list.some(at => time - at < windowMs)) hits.delete(k);
      return true;
    },
  };
}
