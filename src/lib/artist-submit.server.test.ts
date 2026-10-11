import { afterEach, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { submitArtistWith } from './artist-submit.server';
import { submissionInputSchema } from './artist-search';
const input = submissionInputSchema.parse({ name: 'New Artist', profileUrl: 'https://example.com/artist', startedAt: 1000 });
function fakeDb(responses: { data: unknown; status?: number }[]) {
  const fetch = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => {
    const response = responses.shift()!;
    return new Response(JSON.stringify(response.data), { status: response.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  });
  return { db: createClient('https://example.supabase.co', 'test-key', { global: { fetch } }), fetch };
}
afterEach(() => vi.restoreAllMocks());
it('creates only a pending submission with normalized identity', async () => {
  const { db, fetch } = fakeDb([{ data: [] }, { data: [] }, { data: null }]);
  expect(await submitArtistWith(db, input, 'hash', 4000)).toEqual({ status: 'created' });
  const last = fetch.mock.calls[2]!;
  expect(String(last[0])).toContain('artist_submissions');
  expect(JSON.parse(String(last[1]?.body))).toMatchObject({ status: 'pending', normalized_name: 'new artist', submitter_hash: 'hash' });
});
it.each([
  [[{ data: [{ name: 'New Artist' }] }], 'duplicate_artist'],
  [[{ data: [] }, { data: [{ id: 'pending' }] }], 'duplicate_pending'],
  [[{ data: [] }, { data: [] }, { data: { code: '23505' }, status: 409 }], 'duplicate_pending'],
  [[{ data: { message: 'unavailable' }, status: 403 }], 'error'],
] as const)('handles duplicates and database failures (%s)', async (responses, status) => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const { db } = fakeDb([...responses]);
  expect((await submitArtistWith(db, input, 'hash', 4000)).status).toBe(status);
});
it('rejects invalid profiles, handles no database, and silently discards spam', async () => {
  expect((await submitArtistWith(null, input, 'hash', 4000)).status).toBe('unavailable');
  expect((await submitArtistWith(null, { ...input, profileUrl: 'http://localhost' }, 'hash', 4000)).status).toBe('invalid');
  const { db, fetch } = fakeDb([]);
  expect((await submitArtistWith(db, { ...input, website: 'bot' }, 'hash', 4000)).status).toBe('created');
  expect(fetch).not.toHaveBeenCalled();
});
