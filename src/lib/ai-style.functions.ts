import { createServerFn } from '@tanstack/react-start';
import { AI_STYLE_PROMPT, aiStyleCacheKey, aiStyleInputSchema, readAIStyle, type AIStyleResponse } from './ai-style';
import { createRateLimiter } from './rate-limit';

// Each answer costs AI credit: one per artist + songs + articles + preferences for a day (memory,
// per server instance), shared by visitors asking at once, and a per-visitor limit on new answers.
const DAY_MS = 24 * 60 * 60 * 1000;
const answers = new Map<string, { at: number; answer: Promise<AIStyleResponse> }>();
const limiter = createRateLimiter({ limit: 20, windowMs: 60 * 60_000 });
const debug = process.env['NODE_ENV'] !== 'production' || process.env['MELODYLUST_DEBUG'] === '1';

/** Three styling ideas for a searched artist: evidence-backed (quoting an approved article) or creative. */
export const styleArtistWithAI = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => aiStyleInputSchema.parse(input))
  .handler(async ({ data }): Promise<AIStyleResponse> => {
    const { getAIProvider, readAIJSON } = await import('./ai/read-json.server');
    const provider = getAIProvider() ?? '';
    if (!provider) return { status: 'not_configured', suggestions: [], provider };
    const key = aiStyleCacheKey(data);
    const saved = answers.get(key);
    if (saved && Date.now() - saved.at < DAY_MS) return saved.answer;
    const { clientKey } = await import('./client-key.server');
    if (!limiter.allow(await clientKey())) return { status: 'rate_limited', suggestions: [], provider };
    const { getRequest } = await import('@tanstack/react-start/server');
    const started = Date.now();
    const answer = readAIJSON(AI_STYLE_PROMPT, data, getRequest()).then((payload): AIStyleResponse => {
      const suggestions = readAIStyle(payload, data);
      if (debug) console.info('[AI style]', { provider, artist: data.artist, articles: data.articles.length, kept: suggestions.length, evidence: suggestions.filter(s => s.basis === 'evidence').length, elapsedMs: Date.now() - started });
      return suggestions.length ? { status: 'ok', suggestions, provider } : { status: 'unavailable', suggestions: [], provider };
    }).catch(failure => {
      // Server log only; never a key.
      console.error('[AI style] failed', failure instanceof Error ? failure.message : failure);
      return { status: 'unavailable', suggestions: [], provider } satisfies AIStyleResponse;
    });
    answers.set(key, { at: Date.now(), answer });
    const result = await answer;
    // Only usable answers are remembered; a failure is retried on the next search.
    if (result.status !== 'ok') answers.delete(key);
    return result;
  });
