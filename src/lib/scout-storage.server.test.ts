import { createClient } from '@supabase/supabase-js';
import { expect, it, vi } from 'vitest';
import { saveScoutArticles } from './scout-storage.server';
const article = { url: 'https://esquire.com/test', publication: 'Esquire', published_at: '2026-10-11', title: 'Video style', summary: 'Original article summary for review.', categories: ['Music Videos'] };
it.each(['candidate', 'approved'] as const)('saves %s articles with explicit conflict behavior', async status => {
  const fetch = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(null, { status: 201 }));
  const db = createClient('https://example.supabase.co', 'test', { global: { fetch } });
  await saveScoutArticles(db, [article], status);
  const init = fetch.mock.calls[0]![1]!;
  expect(JSON.parse(String(init.body))[0]).toMatchObject({ ...article, source: 'scout', status });
  expect(new Headers(init.headers).get('Prefer')).toContain(status === 'candidate' ? 'resolution=ignore-duplicates' : 'resolution=merge-duplicates');
});
it('surfaces storage errors rather than claiming an import succeeded', async () => {
  const db = createClient('https://example.supabase.co', 'test', { global: { fetch: async () => new Response(JSON.stringify({ message: 'denied' }), { status: 403 }) } });
  await expect(saveScoutArticles(db, [article], 'candidate')).rejects.toThrow('denied');
});
