import { createHash } from 'node:crypto';

/** Who is asking, as a salted hash: enough to rate-limit and review spam, never the raw IP. */
export async function clientKey() {
  const { getRequestIP } = await import('@tanstack/react-start/server');
  const ip = getRequestIP({ xForwardedFor: true }) ?? 'unknown';
  return createHash('sha256').update(`${process.env['RATE_LIMIT_SALT'] ?? 'melodylust'}:${ip}`).digest('hex').slice(0, 32);
}
