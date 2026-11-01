// Where read articles are kept, keyed by fingerprint, so a restart re-reads only new or edited
// articles. With Supabase configured they live in the article_evidence table, which survives
// deploys and cold starts (Cloudflare Workers has no disk; Vercel only a temporary /tmp).
// Without it, a notebook file in .cache/ (git-ignored) is the local fallback.

import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseEvidenceCorpus } from './melodylust-evidence';
import type { ArticleEvidence, EvidenceStore } from './article-tracker.server';

const DIR = process.env['MELODYLUST_CACHE_DIR'] || (process.env['VERCEL'] ? '/tmp/melodylust-cache' : '.cache');

/** Keeps only saved articles that still pass the evidence rules on their own; anything else is re-read. */
function readNotebook(text: string): Record<string, ArticleEvidence> {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return {}; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const kept: Record<string, ArticleEvidence> = {};
  for (const [key, entry] of Object.entries(parsed)) {
    try {
      const article = entry as ArticleEvidence;
      parseEvidenceCorpus({ version: 1, entities: article.entities, documents: [article.document], observations: article.observations });
      kept[key] = article;
    } catch { /* dropped: it will simply be read again */ }
  }
  return kept;
}

const readerCode = (readerVersion: string) => createHash('sha256').update(readerVersion).digest('hex').slice(0, 12);

/** One notebook per way of reading (the reader's instructions), so changing them doesn't throw away older saved work. */
export function diskEvidenceStore(readerVersion: string): EvidenceStore {
  const file = join(DIR, `evidence-${readerCode(readerVersion)}.json`);
  let loaded: Promise<Record<string, ArticleEvidence>> | undefined;
  const read = () => (loaded ??= readFile(file, 'utf8').then(readNotebook, (): Record<string, ArticleEvidence> => ({})));
  // Batches finish concurrently: each save waits for the last, so none overwrites another.
  let queue = Promise.resolve();
  return {
    read,
    save: added => (queue = queue.then(async () => {
      const entries = { ...(await read()), ...added };
      loaded = Promise.resolve(entries);
      try {
        await mkdir(DIR, { recursive: true });
        await writeFile(file, JSON.stringify(entries));
      } catch (failure) {
        // A failed write only means those articles are read again next time.
        console.error('[MelodyLust] could not write the evidence cache', failure instanceof Error ? failure.message : failure);
      }
    })),
  };
}

/** Saved evidence in Supabase (article_evidence), shared by every server instance and deploy.
 *  Read once per instance, then kept in memory and updated as batches are saved. */
export function supabaseEvidenceStore(db: Pick<SupabaseClient, 'from'>, readerVersion: string): EvidenceStore {
  const reader = readerCode(readerVersion);
  let loaded: Promise<Record<string, ArticleEvidence>> | undefined;
  const fetchAll = async () => {
    const entries: Record<string, unknown> = {};
    for (let start = 0; ; start += 500) {
      const { data, error } = await db.from('article_evidence').select('fingerprint,evidence').eq('reader', reader).order('fingerprint').range(start, start + 499);
      if (error) throw new Error(`Could not read saved evidence: ${error.message}`);
      for (const row of data ?? []) entries[row.fingerprint as string] = row.evidence;
      if (!data || data.length < 500) break;
    }
    return readNotebook(JSON.stringify(entries));
  };
  const read = () => (loaded ??= fetchAll().catch(failure => {
    // Unreadable store: carry on as if empty (articles are re-read) and try the table again next time.
    console.error('[MelodyLust] could not read saved evidence', failure instanceof Error ? failure.message : failure);
    loaded = undefined;
    return {};
  }));
  let queue = Promise.resolve();
  return {
    read,
    save: added => (queue = queue.then(async () => {
      const rows = Object.entries(added).map(([fingerprint, evidence]) => ({ fingerprint, reader, article_url: evidence.document.url, evidence }));
      loaded = Promise.resolve({ ...(await read()), ...added });
      if (!rows.length) return;
      const { error } = await db.from('article_evidence').upsert(rows, { onConflict: 'fingerprint' });
      // Kept in memory either way; a failed write only means a later cold start reads them again.
      if (error) console.error('[MelodyLust] could not save evidence', error.message);
    })),
  };
}
