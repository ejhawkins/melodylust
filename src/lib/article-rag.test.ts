// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { aiStyleCacheKey, aiStyleInputSchema, readAIStyle } from './ai-style';
import { chunkApprovedArticles, chunkArticle, contentHash, EMBEDDING_DIMENSIONS, mergeRankings, planEmbedding, readMatches, retrievalQuery, toVector, type ArticleRow, type MatchRow } from './article-rag';
import { retrieveApprovedArticles, withRetrieval, type RetrievalDeps } from './article-retrieval';

const approved: ArticleRow = { id: 3, tracker_id: '3', url: 'https://elle.in/coachella-fits/', status: 'approved', title: 'Our Top 15 Coachella Fits', summary: "Gwen Stefani's funky plaid jumpsuit paired with glittery Dr. Martens boots." };
const candidate: ArticleRow = { id: 40, tracker_id: null, url: 'https://example.com/lead', status: 'candidate', title: 'An unreviewed lead', summary: 'Gwen Stefani in something.' };
const row = (over: Partial<MatchRow>): MatchRow => ({ chunk_id: 1, article_id: 3, tracker_id: '3', url: approved.url, title: approved.title, summary: approved.summary, status: 'approved', similarity: 0.8, ...over });
const vector = Array.from({ length: EMBEDDING_DIMENSIONS }, (_, i) => (i % 7) / 7);

const input = aiStyleInputSchema.parse({
  artist: 'Gwen Stefani', genres: ['ska'], preferences: ['plaid'],
  articles: [{ id: '1', title: 'Gwen Stefani Still Rocks Her Iconic No Doubt Outfit', summary: 'a cropped red-and-blue striped tank top and baggy blue track pants', url: 'https://harpersbazaar.com.sg/a' }],
});
const deps = (rows: MatchRow[]): RetrievalDeps => ({ embedQuery: vi.fn(async () => vector), matchChunks: vi.fn(async () => rows) });

describe('only approved articles are retrieved', () => {
  it('never chunks a candidate', () => {
    expect(chunkArticle(candidate)).toEqual([]);
    expect(chunkApprovedArticles([approved, candidate]).map(chunk => chunk.article_id)).toEqual([3]);
  });

  it('drops match rows whose article is not approved, even if the SQL returned them', () => {
    const read = readMatches([row({}), row({ chunk_id: 9, article_id: 40, tracker_id: null, status: 'candidate', similarity: 0.99 })]);
    expect(read.map(article => article.id)).toEqual(['3']);
  });

  it('filters on approved in the match function itself', () => {
    const sql = readFileSync('supabase/migrations/20261126120000_article_chunks_pgvector.sql', 'utf8');
    expect(sql).toMatch(/where a\.status = 'approved'/);
    expect(sql).toMatch(/revoke execute on function public\.match_article_chunks[^;]*from public, anon, authenticated/);
  });

  it('keeps one entry per article with its best similarity and every matched chunk', () => {
    const read = readMatches([row({ chunk_id: 1, similarity: 0.6 }), row({ chunk_id: 2, similarity: 0.9 }), row({ chunk_id: 5, article_id: 7, tracker_id: null, similarity: 0.2 })], 0.3);
    expect(read).toEqual([{ id: '3', title: approved.title, summary: approved.summary, url: approved.url, similarity: 0.9, chunkIds: ['1', '2'] }]);
  });
});

describe('embedding only what changed', () => {
  it('re-embeds new and changed chunks, skips unchanged ones and deletes stale ones', async () => {
    const [first] = chunkApprovedArticles([approved]);
    const hash = await contentHash('gemini:m:768', first!.content);
    const wanted = [{ ...first!, content_hash: hash }, { article_id: 8, chunk_index: 0, content: 'new', content_hash: 'n' }];
    const plan = planEmbedding(wanted, [
      { id: 1, article_id: 3, chunk_index: 0, content_hash: hash },
      { id: 2, article_id: 3, chunk_index: 1, content_hash: 'old' },
      { id: 3, article_id: 40, chunk_index: 0, content_hash: 'lost approval' },
    ]);
    expect(plan.embed.map(chunk => chunk.article_id)).toEqual([8]);
    expect(plan.unchanged).toBe(1);
    expect(plan.remove).toEqual([2, 3]);
  });

  it('changes the hash when the text or the model changes', async () => {
    expect(await contentHash('a', 'x')).toBe(await contentHash('a', 'x'));
    expect(await contentHash('a', 'x')).not.toBe(await contentHash('b', 'x'));
    expect(await contentHash('a', 'x')).not.toBe(await contentHash('a', 'y'));
  });

  it('splits a long summary into titled chunks under the limit', () => {
    const long = { ...approved, summary: Array.from({ length: 40 }, (_, i) => `Sentence number ${i} about a plaid look.`).join(' ') };
    const chunks = chunkArticle(long, 300);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every(chunk => chunk.content.startsWith(approved.title) && chunk.content.length <= 300)).toBe(true);
    expect(chunks.map(chunk => chunk.chunk_index)).toEqual(chunks.map((_, i) => i));
  });

  it('writes vectors in pgvector text form and refuses the wrong size', () => {
    expect(toVector(vector).startsWith('[0,0.14')).toBe(true);
    expect(() => toVector([1, 2])).toThrow();
  });
});

describe('the query path', () => {
  it('merges retrieval into the keyword ranking without pushing a keyword article out', () => {
    const keyword = Array.from({ length: 8 }, (_, i) => ({ id: `k${i}`, title: `K${i}`, summary: '', url: `https://k/${i}` }));
    const retrieved = readMatches([row({ chunk_id: 1, article_id: 99, tracker_id: 'r', similarity: 0.95 }), row({ chunk_id: 2, article_id: 5, tracker_id: 'k5', similarity: 0.9 })]);
    const merged = mergeRankings(keyword, retrieved, 8);
    expect(merged.map(a => a.id).sort()).toEqual(keyword.map(a => a.id).sort());
    expect(merged[0]!.id).toBe('k5'); // found by both, so it rises
    expect(mergeRankings(keyword.slice(0, 2), retrieved, 8).map(a => a.id)).toEqual(['k0', 'k1', 'r', 'k5']); // retrieval fills the empty places
  });

  it('builds the search text from the artist, genres and quiz preferences', () => {
    expect(retrievalQuery({ artist: 'Gwen Stefani', genres: ['ska', 'rock'], preferences: ['plaid'] })).toBe('Gwen Stefani\nGenres: ska, rock\nStyle: plaid');
  });

  it('falls back to the keyword ranking when the embedding call fails', async () => {
    const failing: RetrievalDeps = { embedQuery: vi.fn(async () => { throw new Error('quota'); }), matchChunks: vi.fn() };
    const retrieval = await retrieveApprovedArticles('Gwen Stefani', failing);
    expect(retrieval).toEqual({ status: 'fallback', articles: [], chunkIds: [] });
    expect(failing.matchChunks).not.toHaveBeenCalled();
    expect(withRetrieval(input, retrieval)).toEqual(input);
  });

  it('falls back when the vector query fails, and is off when not configured', async () => {
    const failing: RetrievalDeps = { embedQuery: async () => vector, matchChunks: async () => { throw new Error('function match_article_chunks does not exist'); } };
    expect((await retrieveApprovedArticles('Gwen Stefani', failing)).status).toBe('fallback');
    expect((await retrieveApprovedArticles('Gwen Stefani', null)).status).toBe('off');
  });

  it('changes the cache key when different chunks are retrieved', async () => {
    const a = await retrieveApprovedArticles('Gwen Stefani', deps([row({ chunk_id: 1 })]));
    const b = await retrieveApprovedArticles('Gwen Stefani', deps([row({ chunk_id: 2 })]));
    expect(a.chunkIds).toEqual(['1']);
    expect(aiStyleCacheKey(withRetrieval(input, a), a.chunkIds)).not.toBe(aiStyleCacheKey(withRetrieval(input, b), b.chunkIds));
    expect(aiStyleCacheKey(input)).toBe(aiStyleCacheKey(input, [])); // no retrieval: the key is as before
  });

  it('still drops an evidence quote that is not an exact substring of a retrieved article', async () => {
    const retrieval = await retrieveApprovedArticles('Gwen Stefani', deps([row({})]));
    const merged = withRetrieval(input, retrieval);
    expect(merged.articles.map(a => a.id)).toEqual(['1', '3']);
    const idea = (quote: string) => ({ title: 'Plaid punk', basis: 'evidence', why: 'From the article.', article_id: '3', quote, pieces: [{ item: 'plaid jumpsuit', note: 'n' }, { item: 'combat boots', note: 'n' }] });
    expect(readAIStyle({ suggestions: [idea('plaid jumpsuit paired with glittery Dr. Martens boots')] }, merged)).toHaveLength(1);
    expect(readAIStyle({ suggestions: [idea('plaid jumpsuit with glittery Dr. Martens boots')] }, merged)).toHaveLength(0);
    // A quote from an article that was never supplied is dropped too.
    expect(readAIStyle({ suggestions: [{ ...idea('plaid jumpsuit paired with glittery Dr. Martens boots'), article_id: '99' }] }, merged)).toHaveLength(0);
  });
});
