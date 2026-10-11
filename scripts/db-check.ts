// Checks the site can reach your Supabase project and that the MelodyLust tables exist.
//   npm run db:check
// Uses the server's secret key from .env; prints table names and row counts only.

import { createClient } from '@supabase/supabase-js';

const url = process.env['SUPABASE_URL'];
const key = process.env['SUPABASE_SECRET_KEY'] || process.env['SUPABASE_SERVICE_ROLE_KEY'];
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
let ok = true;
for (const table of ['articles', 'article_evidence', 'product_cache']) {
  // A real read (not a HEAD request): HEAD answers 204 even for tables that don't exist.
  const { count, error } = await supabase.from(table).select('*', { count: 'exact' }).limit(1);
  if (error) { ok = false; console.log(`  ✗ ${table}: ${error.message}`); }
  else console.log(`  ✓ ${table}: ${count ?? 0} rows`);
}
console.log(ok ? '\nConnected — all MelodyLust tables are ready.' : '\nSome tables are missing: run supabase/migrations/20261011000000_melodylust_core.sql in the SQL Editor.');
process.exitCode = ok ? 0 : 1;
