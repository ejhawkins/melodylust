import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchProvider } from './artist-provider.server';
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe('artist provider failures', () => {
  it('supports unconfigured and labelled mock states', async () => {
    vi.stubEnv('ARTIST_PROVIDER', ''); expect((await searchProvider('ve')).status).toBe('not_configured');
    vi.stubEnv('ARTIST_PROVIDER', 'mock'); expect((await searchProvider('ve')).status).toBe('mock');
  });
  it.each([401, 429, 500])('maps HTTP %s to unavailable', async status => {
    vi.stubEnv('ARTIST_PROVIDER', 'freqblog'); vi.stubEnv('FREQBLOG_API_KEY', 'test');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status })));
    expect((await searchProvider('ush')).status).toBe('unavailable');
  });
  it('handles network errors and timeout', async () => {
    vi.stubEnv('ARTIST_PROVIDER', 'freqblog'); vi.stubEnv('FREQBLOG_API_KEY', 'test');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect((await searchProvider('ush')).status).toBe('unavailable');
    vi.stubGlobal('fetch', vi.fn((_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason)))));
    expect((await searchProvider('ush', 5)).status).toBe('unavailable');
  });
});
