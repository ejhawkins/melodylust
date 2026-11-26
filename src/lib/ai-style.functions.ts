import { createServerFn } from '@tanstack/react-start';
import { AI_STYLE_PROMPT, aiStyleCacheKey, aiStyleInputSchema, readAIStyle, type AIStyleInput, type AIStyleResponse } from './ai-style';
import { NO_RETRIEVAL, styleRetrievalQuery, withRetrieval, type Retrieval } from './article-retrieval';
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
    const { clientKey } = await import('./client-key.server');
    const visitor = await clientKey();
    // Semantic retrieval over approved articles adds a ranking signal to the articles the search found. It
    // never throws: without embeddings, or when they fail, the keyword/evidence ranking is used alone.
    let retrieval: Retrieval = NO_RETRIEVAL;
    try {
      const { retrieveForQuery } = await import('./article-retrieval.server');
      retrieval = await retrieveForQuery(styleRetrievalQuery(data), visitor);
    } catch (failure) {
      console.error('[RAG] retrieval unavailable; using the keyword ranking', failure instanceof Error ? failure.message : failure);
    }
    let input: AIStyleInput;
    // Refuses a request carrying Spotify content (links, URIs): nothing from Spotify goes into the prompt.
    try { input = withRetrieval(data, retrieval); }
    catch (failure) {
      console.error('[AI style] refused', failure instanceof Error ? failure.message : failure);
      return { status: 'unavailable', suggestions: [], provider };
    }
    const key = aiStyleCacheKey(input, retrieval.chunkIds);
    const saved = answers.get(key);
    if (saved && Date.now() - saved.at < DAY_MS) return saved.answer;
    // Registered before any await, so a request arriving a moment later shares this answer instead of paying again.
    const started = Date.now();
    const answer = (async (): Promise<AIStyleResponse> => {
      if (!limiter.allow(visitor)) return { status: 'rate_limited', suggestions: [], provider };
      const { getRequest } = await import('@tanstack/react-start/server');
      // The model now and then returns text that isn't valid JSON; one more try usually answers, so the reader gets
      // ideas from the articles rather than the generic fallback outfit.
      const ask = () => readAIJSON(AI_STYLE_PROMPT, input, getRequest());
      return ask().catch(failure => {
        // Only malformed JSON benefits from another attempt; provider failures do not.
        if (!(failure instanceof SyntaxError)) throw failure;
        console.error('[AI style] retrying after', failure instanceof Error ? failure.message : failure);
        return ask();
      }).then(payload => readResult(payload));
    })().catch(failure => {
      // Server log only; never a key.
      console.error('[AI style] failed', failure instanceof Error ? failure.message : failure);
      return { status: 'unavailable', suggestions: [], provider } satisfies AIStyleResponse;
    });
    answers.set(key, { at: Date.now(), answer });
    const result = await answer;
    // Only usable answers are remembered; a failure or rate limit is retried on the next search.
    if (result.status !== 'ok') answers.delete(key);
    return result;

    function readResult(payload: unknown): AIStyleResponse {
      // Evidence quotes are still checked word for word against the articles sent, retrieved ones included.
      const suggestions = readAIStyle(payload, input);
      if (debug) console.info('[AI style]', { provider, artist: data.artist, articles: input.articles.length, retrieval: retrieval.status, retrieved: retrieval.articles.length, coverage: data.coverage.length, kept: suggestions.length, evidence: suggestions.filter(s => s.basis === 'evidence').length, inspired: suggestions.filter(s => s.inspiration).length, brands: suggestions.flatMap(s => s.pieces.flatMap(p => p.brand ? [`${p.brand} ${p.item}`] : [])), elapsedMs: Date.now() - started });
      return suggestions.length ? { status: 'ok', suggestions, provider } : { status: 'unavailable', suggestions: [], provider };
    }
  });
