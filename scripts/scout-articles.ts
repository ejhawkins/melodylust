// Article scout. OpenAI web search proposes tracker rows for an artist; they land in a
// review file, and only rows you approve join the tracker that Gemini indexes.
//
//   npm run scout -- "Usher"          search, then add candidates to data/articles-candidates.csv
//   npm run scout -- --approve        move every remaining candidate into data/articles-tracker.csv
//
// Review the candidates file between the two steps and delete any row you don't want.

import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import Papa from 'papaparse';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { parseScoutJson, readScoutCandidates, SCOUT_DOMAINS, scoutPrompt, type ScoutCandidate } from '../src/lib/article-scout.ts';

const TRACKER = 'data/articles-tracker.csv';
const CANDIDATES = 'data/articles-candidates.csv';
const HEADER = ['ID', 'URL', 'Publication', 'Published At', 'Title', 'Summary', 'Categories'];
type Row = Record<string, string>;

const readCsv = (path: string): Row[] => existsSync(path) ? Papa.parse<Row>(readFileSync(path, 'utf8'), { header: true, skipEmptyLines: 'greedy' }).data : [];
const cell = (value: string) => /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
const line = (values: string[]) => values.map(cell).join(',');
const toRow = (id: string, c: ScoutCandidate) => [id, c.url, c.publication, c.published_at, c.title, c.summary, c.categories.join(', ')];

function approve() {
  const candidates = readCsv(CANDIDATES);
  if (!candidates.length) return console.log('No candidates to approve.');
  const tracker = readFileSync(TRACKER, 'utf8').replace(/\n*$/, '\n');
  let next = Math.max(0, ...readCsv(TRACKER).map(row => Number(row['ID']) || 0)) + 1;
  const rows = candidates.map(row => line([String(next++), ...HEADER.slice(1).map(key => row[key] ?? '')]));
  writeFileSync(TRACKER, tracker + rows.join('\n') + '\n');
  rmSync(CANDIDATES);
  console.log(`Approved ${rows.length} article(s) into ${TRACKER}. Gemini indexes them on the next search.`);
}

async function scout(artist: string) {
  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) throw new Error('OPENAI_API_KEY is missing from .env.');
  const openai = createOpenAI({ apiKey });
  const result = await generateText({
    model: openai.responses(process.env['MELODYLUST_SCOUT_MODEL'] || 'gpt-5-mini'),
    tools: { web_search: openai.tools.webSearch({ filters: { allowedDomains: [...SCOUT_DOMAINS] }, searchContextSize: 'medium' }) },
    prompt: scoutPrompt(artist, 8),
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
  const queued = readCsv(CANDIDATES);
  const tracked = [...readCsv(TRACKER), ...queued].map(row => row['URL'] ?? '');
  const { accepted, rejected } = readScoutCandidates(parseScoutJson(result.text), cited, tracked, artist);

  if (accepted.length) {
    const existing = existsSync(CANDIDATES) ? readFileSync(CANDIDATES, 'utf8').replace(/\n*$/, '\n') : line(HEADER) + '\n';
    writeFileSync(CANDIDATES, existing + accepted.map(c => line(toRow('new', c))).join('\n') + '\n');
  }
  console.log(`\nScouted "${artist}": ${accepted.length} candidate(s) added to ${CANDIDATES}, ${rejected.length} dropped.`);
  for (const c of accepted) console.log(`  + ${c.publication} · ${c.published_at} · ${c.title}\n    ${c.url}`);
  for (const r of rejected) console.log(`  - ${r.reason}: ${r.url}`);
  if (accepted.length) console.log(`\nReview ${CANDIDATES}, delete rows you don't want, then run: npm run scout -- --approve`);
}

const arg = process.argv.slice(2).join(' ').trim();
if (arg === '--approve') approve();
else if (!arg) console.log('Usage: npm run scout -- "Artist name"   |   npm run scout -- --approve');
else await scout(arg).catch(failure => { console.error(`Scout failed: ${failure instanceof Error ? failure.message : failure}`); process.exitCode = 1; });
