import { describe, it, expect, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { readApprovedTrackerCsv } from './article-source.server';
import { parseSheetCsv } from './tracker-import';

const article = { id: 2, tracker_id: null, url: 'https://example.com/article', publication: 'Test', published_at: '2026-10-11', title: 'A title, with commas', summary: 'A "quoted" summary', categories: ['Fashion', 'Music'] };
function database(responses: unknown[]) {
  const fetch = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify(responses.shift()), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  return { db: createClient('https://example.supabase.co', 'test-key', { global: { fetch } }), fetch };
}
describe('Supabase article source', () => {
  it('filters approved articles and preserves arrays, quoting and database-only IDs', async () => {
    const { db, fetch } = database([[article]]);
    const parsed = parseSheetCsv(await readApprovedTrackerCsv(db));
    expect(parsed.problems).toEqual([]);
    expect(parsed.rows[0]).toMatchObject({ id: 'db:2', title: article.title, summary: article.summary, categories: 'Fashion, Music' });
    expect(String(fetch.mock.calls[0]?.[0])).toContain('status=eq.approved');
  });
  it('fetches additional pages and preserves tracker IDs', async () => {
    const { db, fetch } = database([Array.from({ length: 500 }, (_, id) => ({ ...article, id, tracker_id: String(id), url: `https://example.com/${id}` })), [{ ...article, id: 501 }]]);
    expect(parseSheetCsv(await readApprovedTrackerCsv(db)).rows).toHaveLength(501);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('keeps an empty database empty', async () => {
    const { db } = database([[]]);
    expect(parseSheetCsv(await readApprovedTrackerCsv(db)).rows).toEqual([]);
  });
  it('reports database failures instead of falling back silently', async () => {
    const db = createClient('https://example.supabase.co', 'test-key', { global: { fetch: async () => new Response(JSON.stringify({ message: 'permission denied' }), { status: 403 }) } });
    await expect(readApprovedTrackerCsv(db)).rejects.toThrow('permission denied');
  });
});
