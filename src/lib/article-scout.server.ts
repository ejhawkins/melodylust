// The OpenAI web search behind the article scout, shared by `npm run scout` and the live
// artist search. Server-only: the key is passed in by the caller, which reads it from env.

import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { parseScoutJson, SCOUT_DOMAINS, scoutPrompt } from './article-scout.ts';

/** Searches the allowed publications for `artist`. Returns the model's JSON and every URL the
 *  search itself returned, so only cited pages can become candidates. */
export async function searchScoutArticles(apiKey: string, artist: string, limit = 8, signal?: AbortSignal) {
  const openai = createOpenAI({ apiKey });
  const result = await generateText({
    model: openai.responses(process.env['MELODYLUST_SCOUT_MODEL'] || 'gpt-5-mini'),
    tools: { web_search: openai.tools.webSearch({ filters: { allowedDomains: [...SCOUT_DOMAINS] }, searchContextSize: 'medium' }) },
    prompt: scoutPrompt(artist, limit),
    ...(signal ? { abortSignal: signal } : {}),
  });
  // Every URL the search itself returned: citations on the answer plus the tool's own source list.
  const cited = [
    ...result.steps.flatMap(step => step.sources),
    ...result.sources,
  ].flatMap(source => (source.sourceType === 'url' ? [source.url] : []));
  for (const output of result.steps.flatMap(step => step.toolResults)) {
    const sources = (output.output as { sources?: { type: string; url?: string }[] } | undefined)?.sources ?? [];
    for (const source of sources) if (source.type === 'url' && source.url) cited.push(source.url);
  }
  return { payload: parseScoutJson(result.text), cited };
}
