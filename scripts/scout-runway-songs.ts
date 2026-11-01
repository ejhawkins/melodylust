import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { normalizeDesignerName } from '../src/lib/designer-directory.server.ts';
import {
  citedReport, parseRunwaySongCandidateJson, readGrounding, readRunwaySongCandidates, resolveGroundingUrl, runwaySongResearchPrompt, runwaySongScoutPrompt,
  withCheckedSpotify,
} from '../src/lib/runway-song-candidates.ts';
import { createSupabaseFetch } from '../src/lib/supabase-fetch.ts';

const valueAfter = (flag: string) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const requestedLimit = Number(valueAfter('--limit') ?? '10');
if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 10) throw new Error('--limit must be an integer from 1 to 10.');
const dryRun = process.argv.includes('--dry-run');
const requestedDesigner = valueAfter('--designer');
if (dryRun && !requestedDesigner) throw new Error('--dry-run requires --designer "Name".');

const databaseUrl = process.env['SUPABASE_URL'];
const databaseKey = process.env['SUPABASE_SECRET_KEY'] || process.env['SUPABASE_SERVICE_ROLE_KEY'];
const geminiKey = process.env['GEMINI_API_KEY'] || process.env['GOOGLE_GENERATIVE_AI_API_KEY'];
if (!dryRun && (!databaseUrl || !databaseKey)) throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.');
if (!geminiKey) throw new Error('Missing GEMINI_API_KEY in .env.');

const db = databaseUrl && databaseKey ? createClient(databaseUrl, databaseKey, {
  global: { fetch: createSupabaseFetch(databaseKey) },
  auth: { persistSession: false, autoRefreshToken: false },
}) : null;
const google = createGoogleGenerativeAI({ apiKey: geminiKey });
const model = process.env['MELODYLUST_AI_MODEL'] || 'gemini-3.8-flash';
// Deeper thinking spent the whole output budget and ran past the timeout, and searched no more reliably.
const providerOptions = model.startsWith('gemini-3') ? { google: { thinkingConfig: { thinkingLevel: 'low' as const } } } : {};

/** Runs one Gemini step, aborting it once `seconds` pass. */
async function within<T>(seconds: number, step: string, run: (signal: AbortSignal) => Promise<T>) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Gemini ${step} exceeded ${seconds} seconds.`));
    }, seconds * 1000);
  });
  return Promise.race([run(controller.signal), timeout]).finally(() => clearTimeout(timer));
}

let designers: { id: string; name: string }[] | null;
if (dryRun) designers = [{ id: 'dry-run', name: requestedDesigner! }];
else {
  const result = await db!.rpc('claim_designer_radio_batch', {
    requested_limit: requestedLimit,
    requested_normalized_name: requestedDesigner ? normalizeDesignerName(requestedDesigner) : null,
  });
  if (result.error) throw new Error(`Could not claim designers: ${result.error.message}`);
  designers = result.data as { id: string; name: string }[];
}
if (!designers?.length) {
  console.log(requestedDesigner
    ? `No eligible designer record matched "${requestedDesigner}", or today's limit is reached.`
    : 'No curated designers are available, or today’s 10-designer limit is reached.');
  process.exit(0);
}

for (const designer of designers) {
  try {
    console.log(`Searching runway songs for ${designer.name}...`);
    // Research first, as cited prose, then shape it into JSON with links taken only from the citations.
    const research = await within(60, 'search', abortSignal => generateText({
      model: google(model),
      tools: { google_search: google.tools.googleSearch({}) },
      prompt: runwaySongResearchPrompt(designer.name),
      providerOptions,
      maxOutputTokens: 8192,
      maxRetries: 1,
      abortSignal,
    }));
    if (research.finishReason === 'length') throw new Error('Gemini ran out of output tokens before finishing its research.');
    const grounding = readGrounding(research.providerMetadata?.['google']?.['groundingMetadata']);
    const resolved = await Promise.all(grounding.chunks.map(chunk => chunk ? resolveGroundingUrl(chunk.url) : null));
    const sources = resolved.flatMap((url, index) => url ? [{ url, title: grounding.chunks[index]?.title ?? null }] : []);
    // Not 'complete': with nothing cited the designer was never really searched.
    if (!sources.length) throw new Error('Gemini returned no Google Search citations.');
    const numbered = resolved.flatMap((url, index) => url ? [{ number: index + 1, url }] : []);
    const shaped = await within(60, 'formatting', abortSignal => generateText({
      model: google(model),
      prompt: runwaySongScoutPrompt(designer.name, citedReport(research.text, grounding.supports, resolved), numbered),
      providerOptions,
      maxOutputTokens: 8192,
      maxRetries: 1,
      abortSignal,
    }));
    if (shaped.finishReason === 'length') throw new Error('Gemini ran out of output tokens before finishing the JSON.');
    const candidates = await withCheckedSpotify(readRunwaySongCandidates(parseRunwaySongCandidateJson(shaped.text), sources));
    if (dryRun) {
      console.log(JSON.stringify({ designer: designer.name, model, candidates, sources }, null, 2));
      continue;
    }
    if (candidates.length) {
      const rows = candidates.map(candidate => ({
        designer_id: designer.id,
        title: candidate.title,
        artist: candidate.artist,
        category: candidate.category,
        show_name: candidate.show_name,
        show_season: candidate.show_season,
        evidence_summary: candidate.evidence_summary,
        source_url: candidate.source_url,
        source_title: candidate.source_title,
        spotify_url: candidate.spotify_url,
        provider: 'gemini',
        model,
        provenance: {
          search_sources: sources,
          creative_director: candidate.creative_director ?? null,
          sound_director: candidate.sound_director ?? null,
          notes: candidate.notes ?? null,
        },
      }));
      const { error } = await db!.from('runway_song_candidates').upsert(rows, { onConflict: 'designer_id,title,artist,source_url' });
      if (error) throw new Error(`Could not save candidates: ${error.message}`);
    }
    const { error } = await db!.from('designers').update({ discovery_status: 'complete', discovered_at: new Date().toISOString() }).eq('id', designer.id);
    if (error) throw new Error(`Could not update designer: ${error.message}`);
    console.log(`  ${candidates.length} cited candidate(s) saved for review.`);
  } catch (failure) {
    if (!dryRun) await db!.from('designers').update({ discovery_status: 'error', discovered_at: new Date().toISOString() }).eq('id', designer.id);
    console.error(`  Failed: ${failure instanceof Error ? failure.message : failure}`);
  }
}