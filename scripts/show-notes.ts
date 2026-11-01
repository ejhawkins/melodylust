// Writes AI show notes (atmosphere, palette, silhouettes, materials) for the shows Runway Songs plays and has no notes
// for yet: the sampler's, approved designer-radio songs', and Contentful's when it's configured. Each show is researched
// with Google Search, then turned into notes that keep only cited pages. Run with tsx: the app's modules import without
// file extensions. `--dry-run` prints instead of saving; `--limit` caps how many shows one run researches.
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { designerRadioSongs, type DesignerRadioRow } from '../src/lib/designer-radio.ts';
import { archiveSongs } from '../src/lib/runway-archive.ts';
import { citedReport, parseRunwaySongCandidateJson, readGrounding, resolveGroundingUrl } from '../src/lib/runway-song-candidates.ts';
import { emptySamplerEdits, resolveSampler } from '../src/lib/runway-sampler.ts';
import { runwaySongs, type RunwaySong } from '../src/lib/runway-songs.ts';
import { readShowNotes, SHOW_NOTES_PREFIX, showKey, showNotesJsonPrompt, showNotesResearchPrompt, type Show } from '../src/lib/show-notes.ts';
import { createSupabaseFetch } from '../src/lib/supabase-fetch.ts';

const valueAfter = (flag: string) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const limit = Number(valueAfter('--limit') ?? '10');
if (!Number.isInteger(limit) || limit < 1 || limit > 30) throw new Error('--limit must be an integer from 1 to 30.');
const dryRun = process.argv.includes('--dry-run');

const databaseUrl = process.env['SUPABASE_URL'];
const databaseKey = process.env['SUPABASE_SECRET_KEY'] || process.env['SUPABASE_SERVICE_ROLE_KEY'];
const geminiKey = process.env['GEMINI_API_KEY'] || process.env['GOOGLE_GENERATIVE_AI_API_KEY'];
if (!databaseUrl || !databaseKey) throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.');
if (!geminiKey) throw new Error('Missing GEMINI_API_KEY in .env.');

const db = createClient(databaseUrl, databaseKey, {
  global: { fetch: createSupabaseFetch(databaseKey) },
  auth: { persistSession: false, autoRefreshToken: false },
});
const google = createGoogleGenerativeAI({ apiKey: geminiKey });
const model = process.env['MELODYLUST_AI_MODEL'] || 'gemini-3.8-flash';
const providerOptions = model.startsWith('gemini-3') ? { google: { thinkingConfig: { thinkingLevel: 'low' as const } } } : {};

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

async function contentfulSongs(): Promise<RunwaySong[]> {
  const space = process.env['CONTENTFUL_SPACE_ID'];
  const token = process.env['CONTENTFUL_DELIVERY_TOKEN'];
  if (!space || !token) return [];
  const environment = process.env['CONTENTFUL_ENVIRONMENT'] || 'master';
  const response = await fetch(`https://cdn.contentful.com/spaces/${space}/environments/${environment}/entries?content_type=runwaySong&include=3&limit=1000`,
    { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) });
  return response.ok ? archiveSongs(await response.json()) : [];
}

async function radioSongs(): Promise<RunwaySong[]> {
  const { data, error } = await db.from('runway_song_candidates')
    .select('id,title,artist,category,show_name,show_season,spotify_url,status,designer:designers!inner(name)')
    .eq('status', 'approved');
  if (error) throw new Error(`Could not load approved songs: ${error.message}`);
  return designerRadioSongs((data ?? []) as unknown as DesignerRadioRow[]);
}

const songs = [...runwaySongs(resolveSampler(emptySamplerEdits())), ...await radioSongs(), ...await contentfulSongs()];
const shows = [...new Map(songs.map(({ house, season, year }) => [showKey({ house, season, year }), { house, season, year }])).entries()];
const stored = await db.from('product_cache').select('key').like('key', `${SHOW_NOTES_PREFIX}%`);
if (stored.error) throw new Error(`Could not read saved notes: ${stored.error.message}`);
const done = new Set(stored.data.map(row => row.key));
const todo = shows.filter(([key]) => !done.has(key)).slice(0, limit);
console.log(`${shows.length} shows, ${shows.length - shows.filter(([key]) => !done.has(key)).length} with notes; researching ${todo.length}.`);

async function research(show: Show) {
  const found = await within(60, 'search', abortSignal => generateText({
    model: google(model), tools: { google_search: google.tools.googleSearch({}) }, prompt: showNotesResearchPrompt(show),
    providerOptions, maxOutputTokens: 8192, maxRetries: 1, abortSignal,
  }));
  if (found.finishReason === 'length') throw new Error('Gemini ran out of output tokens before finishing its research.');
  const grounding = readGrounding(found.providerMetadata?.['google']?.['groundingMetadata']);
  const resolved = await Promise.all(grounding.chunks.map(chunk => chunk ? resolveGroundingUrl(chunk.url) : null));
  const sources = resolved.flatMap((url, index) => url ? [{ url, title: grounding.chunks[index]?.title ?? null }] : []);
  if (!sources.length) throw new Error('Gemini returned no Google Search citations.');
  const numbered = resolved.flatMap((url, index) => url ? [{ number: index + 1, url }] : []);
  const shaped = await within(60, 'formatting', abortSignal => generateText({
    model: google(model), prompt: showNotesJsonPrompt(show, citedReport(found.text, grounding.supports, resolved), numbered),
    providerOptions, maxOutputTokens: 4096, maxRetries: 1, abortSignal,
  }));
  if (shaped.finishReason === 'length') throw new Error('Gemini ran out of output tokens before finishing the notes.');
  return readShowNotes(parseRunwaySongCandidateJson(shaped.text), sources, model, new Date().toISOString());
}

for (const [key, show] of todo) {
  try {
    console.log(`Researching ${show.house} ${show.season} ${show.year}...`);
    const notes = await research(show);
    if (!notes) {
      console.log('  No cited notes; nothing saved.');
      continue;
    }
    if (dryRun) {
      console.log(JSON.stringify(notes, null, 2));
      continue;
    }
    const { error } = await db.from('product_cache').upsert({ key, products: notes, saved_at: new Date().toISOString() });
    if (error) throw new Error(`Could not save notes: ${error.message}`);
    console.log(`  Saved, citing ${notes.sources.map(source => source.title).join(', ')}.`);
  } catch (failure) {
    console.error(`  Failed: ${failure instanceof Error ? failure.message : failure}`);
  }
}
