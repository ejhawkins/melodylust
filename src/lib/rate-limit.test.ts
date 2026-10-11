import { expect, it } from 'vitest';
import { createRateLimiter } from './rate-limit';
it('limits each client within a sliding window and expires old attempts', () => {
  let now = 0;
  const limiter = createRateLimiter({ limit: 2, windowMs: 100, now: () => now });
  expect(limiter.allow('a')).toBe(true); now = 50;
  expect(limiter.allow('a')).toBe(true); expect(limiter.allow('a')).toBe(false);
  expect(limiter.allow('b')).toBe(true); now = 100;
  expect(limiter.allow('a')).toBe(true); expect(limiter.allow('a')).toBe(false);
});
