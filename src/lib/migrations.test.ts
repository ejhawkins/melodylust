import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Every checked-in migration, Supabase's and drizzle's (Lovable's), as one script.
const migrations = ['supabase/migrations', 'drizzle/migrations']
  .flatMap(dir => readdirSync(dir).filter(file => file.endsWith('.sql')).map(file => readFileSync(`${dir}/${file}`, 'utf8')))
  .join('\n').toLowerCase();

describe('Checked-in migrations', () => {
  it.each(['article_evidence', 'product_cache'])('grants server access to %s without opening it to visitors', table => {
    expect(migrations).toContain(`grant all on public.${table} to service_role;`);
    expect(migrations).toContain(`revoke all on public.${table} from anon, authenticated;`);
  });
  it.each(['designers', 'runway_song_candidates', 'product_cache', 'article_evidence'])(
    'create %s, which the designer radio, show notes and evidence store need on a fresh database', table => {
      expect(migrations).toMatch(new RegExp(`create table (if not exists )?public\\.${table} \\(`));
      expect(migrations).toContain(`alter table public.${table} enable row level security;`);
    });
});
