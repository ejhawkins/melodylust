// Article scout. OpenAI web search proposes tracker rows for an artist; they land in a
// review file, and only rows you approve join the tracker that Gemini indexes.
//
//   npm run scout -- "Usher"          search, then add candidates to data/articles-candidates.csv
//   npm run scout -- --approve        move every remaining candidate into data/articles-tracker.csv
//
// Review the candidates file between the two steps and delete any row you don't want.

import { getDb } from '../src/lib/db.server.ts';
import { saveScoutArticles } from '../src/lib/scout-storage.server.ts';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import Papa from 'papaparse';
import { readScoutCandidates, type ScoutCandidate } from '../src/lib/article-scout.ts';
import { searchScoutArticles } from '../src/lib/article-scout.server.ts';

const TRACKER = 'data/articles-tracker.csv';
const CANDIDATES = 'data/articles-candidates.csv';
const HEADER = ['ID', 'URL', 'Publication', 'Published At', 'Title', 'Summary', 'Categories'];
type Row = Record<string, string>;

const readCsv = (path: string): Row[] => existsSync(path) ? Papa.parse<Row>(readFileSync(path, 'utf8'), { header: true, skipEmptyLines: 'greedy' }).data : [];
const cell = (value: string) => /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
const line = (values: string[]) => values.map(cell).join(',');
const toRow = (id: string, c: ScoutCandidate) => [id, c.url, c.publication, c.published_at, c.title, c.summary, c.categories.join(', ')];

async function approve() {
  const candidates = readCsv(CANDIDATES);
  if (!candidates.length) return console.log('No candidates to approve.');
  const tracker = readFileSync(TRACKER, 'utf8').replace(/\n*$/, '\n');
  let next = Math.max(0, ...readCsv(TRACKER).map(row => Number(row['ID']) || 0)) + 1;
  const rows = candidates.map(row => line([String(next++), ...HEADER.slice(1).map(key => row[key] ?? '')]));
  const db = getDb();
  if (db) await saveScoutArticles(db, candidates.map((row, index) => ({
    tracker_id: String(next - candidates.length + index), url: row['URL'] ?? '', publication: row['Publication'] ?? '',
    published_at: row['Published At'] ?? '', title: row['Title'] ?? '', summary: row['Summary'] ?? '',
    categories: (row['Categories'] ?? '').split(',').map(value => value.trim()).filter(Boolean),
  })), 'approved');
  writeFileSync(TRACKER, tracker + rows.join('\n') + '\n');
  rmSync(CANDIDATES);
  console.log(`Approved ${rows.length} article(s) into ${TRACKER}. ${db ? 'Supabase is updated; search indexes them on its next request.' : 'Search indexes the local tracker on its next request.'}`);
}

async function scout(artist: string) {
  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) throw new Error('OPENAI_API_KEY is missing from .env.');
  const { payload, cited } = await searchScoutArticles(apiKey, artist, 8);
  const queued = readCsv(CANDIDATES);
  const tracked = [...readCsv(TRACKER), ...queued].map(row => row['URL'] ?? '');
  const db = getDb();
  if (db) {
    for (let start = 0; ; start += 500) {
      const { data, error } = await db.from('articles').select('url').order('id').range(start, start + 499);
      if (error) throw new Error(`Could not check existing articles: ${error.message}`);
      tracked.push(...(data ?? []).map(row => row.url));
      if (!data || data.length < 500) break;
    }
  }
  const { accepted, rejected } = readScoutCandidates(payload, cited, tracked, artist);

  if (accepted.length) {
    if (db) await saveScoutArticles(db, accepted, 'candidate');
    const existing = existsSync(CANDIDATES) ? readFileSync(CANDIDATES, 'utf8').replace(/\n*$/, '\n') : line(HEADER) + '\n';
    writeFileSync(CANDIDATES, existing + accepted.map(c => line(toRow('new', c))).join('\n') + '\n');
  }
  console.log(`\nScouted "${artist}": ${accepted.length} candidate(s) added to ${CANDIDATES}, ${rejected.length} dropped.`);
  for (const c of accepted) console.log(`  + ${c.publication} · ${c.published_at} · ${c.title}\n    ${c.url}`);
  for (const r of rejected) console.log(`  - ${r.reason}: ${r.url}`);
  if (accepted.length) console.log(`\nReview ${CANDIDATES}, delete rows you don't want, then run: npm run scout -- --approve`);
}

const arg = process.argv.slice(2).join(' ').trim();
if (arg === '--approve') await approve().catch(failure => { console.error(`Approval failed: ${failure instanceof Error ? failure.message : failure}`); process.exitCode = 1; });
else if (!arg) console.log('Usage: npm run scout -- "Artist name"   |   npm run scout -- --approve');
else await scout(arg).catch(failure => { console.error(`Scout failed: ${failure instanceof Error ? failure.message : failure}`); process.exitCode = 1; });
