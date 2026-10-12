import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { findArtistArticles, likePattern, scoutKey, type LiveScoutResponse, type ScoutedArticle } from './live-scout';
import { createRateLimiter } from './rate-limit';

// Each new web search costs OpenAI credit, so: one answer per artist for a week (memory, per
// server instance), visitors asking at the same moment share one search, and each visitor may
// start a limited number of new searches. Reusing saved candidates is free and never limited.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const answers = new Map<string, { at: number; answer: Promise<LiveScoutResponse> }>();
const searchLimiter = createRateLimiter({ limit: 6, windowMs: 60 * 60_000 });
const debug = process.env['NODE_ENV'] !== 'production' || process.env['MELODYLUST_DEBUG'] === '1';

async function scout(artist: string, visitor: string): Promise<LiveScoutResponse> {
  const { getDb } = await import('./db.server');
  const db = getDb();
  const apiKey = process.env['OPENAI_API_KEY'];
  let blocked: LiveScoutResponse['status'] | null = null;
  const started = Date.now();
  const found = await findArtistArticles(artist, {
    async savedCandidates(name) {
      if (!db) return [];
      const columns = 'url,publication,published_at,title,summary';
      // Two filters rather than one .or(): an artist name may contain commas or parentheses.
      const [byTitle, bySummary] = await Promise.all(['title', 'summary'].map(field =>
        db.from('articles').select(columns).eq('status', 'candidate').ilike(field, likePattern(name)).order('published_at', { ascending: false }).limit(8)));
      const error = byTitle?.error ?? bySummary?.error;
      if (error) throw new Error(`Could not read saved candidates: ${error.message}`);
      const rows = [...(byTitle?.data ?? []), ...(bySummary?.data ?? [])] as ScoutedArticle[];
      return rows.filter((row, index) => rows.findIndex(other => other.url === row.url) === index);
    },
    async knownUrls() {
      if (!db) return [];
      const urls: string[] = [];
      for (let start = 0; ; start += 500) {
        const { data, error } = await db.from('articles').select('url').order('id').range(start, start + 499);
        if (error) throw new Error(`Could not check existing articles: ${error.message}`);
        urls.push(...(data ?? []).map(row => row.url as string));
        if (!data || data.length < 500) return urls;
      }
    },
    async search(name) {
      if (!apiKey) { blocked = 'not_configured'; return null; }
      if (!searchLimiter.allow(visitor)) { blocked = 'rate_limited'; return null; }
      const { searchScoutArticles } = await import('./article-scout.server');
      return searchScoutArticles(apiKey, name, 8, AbortSignal.timeout(90_000));
    },
    async save(articles) {
      if (!db || !articles.length) return;
      const { saveScoutArticles } = await import('./scout-storage.server');
      await saveScoutArticles(db, articles, 'candidate');
    },
  });
  if (debug) console.info('[Scout] live', { artist, status: blocked ?? 'ok', articles: found?.articles.length ?? 0, newSearch: found?.searched ?? false, dropped: found?.rejected ?? 0, elapsedMs: Date.now() - started });
  return found ? { status: 'ok', articles: found.articles, searched: found.searched } : { status: blocked ?? 'unavailable', articles: [], searched: false };
}

/** Articles about a searched artist from Hearst and the other allowed publications, waiting for review. */
export const scoutArtistArticles = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ name: z.string().trim().min(1).max(120) }).strict().parse(input))
  .handler(async ({ data }): Promise<LiveScoutResponse> => {
    const key = scoutKey(data.name);
    const saved = answers.get(key);
    if (saved && Date.now() - saved.at < WEEK_MS) return saved.answer;
    const { clientKey } = await import('./client-key.server');
    const answer = scout(data.name, await clientKey()).catch(failure => {
      // Server log only; never a key.
      console.error('[Scout] live search failed', failure instanceof Error ? failure.message : failure);
      return { status: 'unavailable', articles: [], searched: false } satisfies LiveScoutResponse;
    });
    answers.set(key, { at: Date.now(), answer });
    const result = await answer;
    // Only real answers are remembered; a failure, missing key or rate limit is retried next time.
    if (result.status !== 'ok') answers.delete(key);
    return result;
  });
