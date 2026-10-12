// Copies the approved tracker articles into Supabase, so every artist search reads the whole collection:
//   data/articles-tracker.csv → articles (approved)
//   npm run db:articles
// Only articles: candidates, evidence notebooks and the product cache are left alone (that is db:seed).
// Safe to run again: rows are matched by link and updated, not duplicated.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { parseSheetCsv } from '../src/lib/tracker-import.ts';

const url = process.env['SUPABASE_URL'];
const key = process.env['SUPABASE_SECRET_KEY'] || process.env['SUPABASE_SERVICE_ROLE_KEY'];
if (!url || !key) { console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.'); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const tracker = parseSheetCsv(readFileSync('data/articles-tracker.csv', 'utf8'));
if (tracker.problems.length) throw new Error(`Tracker has problems: ${JSON.stringify(tracker.problems)}`);
// The ones from Hearst's own sites came from the scout; the rest from the Sheet.
const scouted = new Set(['harpersbazaar.com', 'esquire.com', 'elle.com']);
const rows = tracker.rows.map(row => ({
  tracker_id: row.id, url: row.url, publication: row.publication, published_at: row.published_at, title: row.title, summary: row.summary,
  categories: row.categories.split(',').map(category => category.trim()).filter(Boolean),
  status: 'approved', source: scouted.has(new URL(row.url).hostname.replace(/^www\./, '')) ? 'scout' : 'sheet',
}));
const { error } = await db.from('articles').upsert(rows, { onConflict: 'url' });
if (error) { console.error(`articles: ${error.message}`); process.exit(1); }
const { data } = await db.from('articles').select('status');
const counts = (data ?? []).reduce<Record<string, number>>((all, row) => ({ ...all, [row.status]: (all[row.status] ?? 0) + 1 }), {});
console.log(`Copied ${rows.length} approved tracker articles. Supabase now has:`, counts);
console.log('Search reads the new articles with the AI reader on its next request (once; then they are saved).');
