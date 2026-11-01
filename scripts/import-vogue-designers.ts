import { createClient } from '@supabase/supabase-js';
import { parseVogueDesignerDirectory } from '../src/lib/designer-directory.server.ts';
import { RADIO_PRIORITIES } from '../src/lib/designer-radio-priority.ts';
import { createSupabaseFetch } from '../src/lib/supabase-fetch.ts';

const DIRECTORY_URL = 'https://www.vogue.com/fashion-shows/designers';
const dryRun = process.argv.includes('--dry-run');

const response = await fetch(DIRECTORY_URL, {
  headers: {
    Accept: 'text/html,application/xhtml+xml',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent': 'MelodyLust designer directory importer/1.0',
  },
  signal: AbortSignal.timeout(30_000),
});
if (!response.ok) throw new Error(`Vogue directory request failed with ${response.status}.`);

const designers = parseVogueDesignerDirectory(await response.text());
if (designers.length < 100) throw new Error(`Vogue directory returned only ${designers.length} designer records; import stopped.`);

console.log(`Found ${designers.length} unique Vogue Runway designer records.`);
console.log(`First: ${designers.slice(0, 5).map(designer => designer.name).join(', ')}`);
console.log(`Last: ${designers.slice(-5).map(designer => designer.name).join(', ')}`);
if (dryRun) process.exit(0);

const url = process.env['SUPABASE_URL'];
const key = process.env['SUPABASE_SECRET_KEY'] || process.env['SUPABASE_SERVICE_ROLE_KEY'];
if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.');
const db = createClient(url, key, {
  global: { fetch: createSupabaseFetch(key) },
  auth: { persistSession: false, autoRefreshToken: false },
});
const lastSeenAt = new Date().toISOString();

for (let start = 0; start < designers.length; start += 500) {
  const rows = designers.slice(start, start + 500).map(designer => ({
    name: designer.name,
    normalized_name: designer.normalizedName,
    source: designer.source,
    source_id: designer.sourceId,
    source_url: designer.sourceUrl,
    last_seen_at: lastSeenAt,
  }));
  const { error } = await db.from('designers').upsert(rows, { onConflict: 'source,source_id' });
  if (error) throw new Error(`Could not import designers: ${error.message}`);
}

console.log(`Imported ${designers.length} designer records into Supabase.`);

// The daily scout only claims designers with a radio priority. Set the listed ones that have none yet (a database
// migrated before its first import), leaving any priority already set, by a migration or by hand, as it is.
let prioritised = 0;
for (const [sourceId, priority] of Object.entries(RADIO_PRIORITIES)) {
  const { data, error } = await db.from('designers').update({ radio_priority: priority })
    .eq('source', 'vogue-runway').eq('source_id', sourceId).is('radio_priority', null).select('id');
  if (error) throw new Error(`Could not set the radio priority for ${sourceId}: ${error.message}`);
  prioritised += data.length;
}
console.log(`Gave ${prioritised} designers a radio priority (${Object.keys(RADIO_PRIORITIES).length} listed).`);