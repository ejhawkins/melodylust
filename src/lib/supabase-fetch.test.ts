import { describe, expect, it, vi } from 'vitest';
import { createSupabaseFetch } from './supabase-fetch';

describe('Supabase API-key fetch', () => {
  it('removes an opaque API key from the bearer header', async () => {
    const key = 'sb_secret_test';
    const baseFetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(null, { status: 200 }));
    const request = createSupabaseFetch(key, baseFetch);

    await request('https://example.supabase.co/rest/v1/articles', {
      headers: { Authorization: `Bearer ${key}` },
    });

    const headers = new Headers(baseFetch.mock.calls[0]?.[1]?.headers);
    expect(headers.get('Authorization')).toBeNull();
    expect(headers.get('apikey')).toBe(key);
  });

  it('retains a legacy service-role JWT as the bearer token', async () => {
    const key = 'legacy.jwt.value';
    const baseFetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(null, { status: 200 }));
    const request = createSupabaseFetch(key, baseFetch);

    await request('https://example.supabase.co/rest/v1/articles', {
      headers: { Authorization: `Bearer ${key}` },
    });

    const headers = new Headers(baseFetch.mock.calls[0]?.[1]?.headers);
    expect(headers.get('Authorization')).toBe(`Bearer ${key}`);
    expect(headers.get('apikey')).toBe(key);
  });

  it('preserves a user bearer token when the API key is publishable', async () => {
    const key = 'sb_publishable_test';
    const baseFetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(null, { status: 200 }));
    const request = createSupabaseFetch(key, baseFetch);

    await request('https://example.supabase.co/rest/v1/articles', {
      headers: { Authorization: 'Bearer user.jwt.value' },
    });

    const headers = new Headers(baseFetch.mock.calls[0]?.[1]?.headers);
    expect(headers.get('Authorization')).toBe('Bearer user.jwt.value');
    expect(headers.get('apikey')).toBe(key);
  });
});