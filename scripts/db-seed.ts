// One-time move of the file-based data into Supabase:
//   data/articles-tracker.csv      → articles (approved)
//   data/articles-candidates.csv   → articles (candidate, waiting for review), if present
//   .cache/evidence-*.json         → article_evidence (so nothing has to be re-read)
//   .cache/products.json           → product_cache
//   npm run db:seed
// Safe to run again: rows are matched by link / fingerprint / key and updated, not duplicated.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { parseSheetCsv } from '../src/lib/tracker-import.ts';

const url = process.env['SUPABASE_URL'];
const key = process.env['SUPABASE_SECRET_KEY'] || process.env['SUPABASE_SERVICE_ROLE_KEY'];
if (!url || !key) { console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.'); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const toArticle = (row: ReturnType<typeof parseSheetCsv>['rows'][number], status: 'approved' | 'candidate', source: 'sheet' | 'scout') => ({
  tracker_id: status === 'approved' ? row.id : null,
  url: row.url, publication: row.publication, published_at: row.published_at, title: row.title, summary: row.summary,
  categories: row.categories.split(',').map(category => category.trim()).filter(Boolean),
  status, source,
});

async function upsert(table: string, rows: object[], onConflict: string) {
  if (!rows.length) return 0;
  const { error } = await db.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table}: ${error.message}`);
  return rows.length;
}

// Articles: the ones from Hearst's own sites came from the scout; the rest from the Sheet.
// Candidates are all labelled "new" in the review file, so their IDs are blanked first.
const tracker = parseSheetCsv(readFileSync('data/articles-tracker.csv', 'utf8'));
if (tracker.problems.length) throw new Error(`Tracker has problems: ${JSON.stringify(tracker.problems)}`);
const scouted = new Set(['harpersbazaar.com', 'esquire.com', 'elle.com']);
const approved = tracker.rows.map(row => toArticle(row, 'approved', scouted.has(new URL(row.url).hostname.replace(/^www\./, '')) ? 'scout' : 'sheet'));
const candidates = existsSync('data/articles-candidates.csv') ? parseSheetCsv(readFileSync('data/articles-candidates.csv', 'utf8').replace(/^new,/gm, ',')).rows.map(row => toArticle({ ...row, id: '' }, 'candidate', 'scout')) : [];
console.log(`articles: ${await upsert('articles', [...approved, ...candidates], 'url')} (${approved.length} approved, ${candidates.length} waiting for review)`);

// Evidence notebooks: one file per reader; the reader code is in the file name.
let evidence = 0;
for (const file of existsSync('.cache') ? readdirSync('.cache').filter(name => /^evidence-[0-9a-f]{12}\.json$/.test(name)) : []) {
  const reader = file.slice('evidence-'.length, -'.json'.length);
  const entries = JSON.parse(readFileSync(join('.cache', file), 'utf8')) as Record<string, { document: { url: string } }>;
  evidence += await upsert('article_evidence', Object.entries(entries).map(([fingerprint, entry]) => ({ fingerprint, reader, article_url: entry.document.url, evidence: entry })), 'fingerprint');
}
console.log(`article_evidence: ${evidence}`);

// Product cache: keep each search's original save time so the 24-hour rule still applies.
const products = existsSync('.cache/products.json') ? JSON.parse(readFileSync('.cache/products.json', 'utf8')) as Record<string, { savedAt: number; products: unknown[] }> : {};
console.log(`product_cache: ${await upsert('product_cache', Object.entries(products).map(([cacheKey, entry]) => ({ key: cacheKey, products: entry.products, saved_at: new Date(entry.savedAt).toISOString() })), 'key')}`);
console.log('\nDone. Check them in Supabase → Table Editor.');
