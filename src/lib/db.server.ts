// The site's server-only connection to its own Supabase project. Uses the secret key, so
// it can read and write the MelodyLust tables (which browsers can't touch at all).
// Returns null when Supabase isn't configured, and callers fall back to local files.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;

/** Supabase is configured but unusable. The message names the problem, never the value. */
export class SupabaseConfigError extends Error {}

const isHttpUrl = (value: string) => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
};

export function getDb(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SECRET_KEY'] || process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !key) return (client = null);
  // Not cached when invalid, so a corrected value is used as soon as the server sees it.
  if (!isHttpUrl(url)) {
    throw new SupabaseConfigError('SUPABASE_URL is not a valid https:// address. Fix it in .env and restart the server: a running server keeps the first value it saw.');
  }
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
