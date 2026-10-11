// The evidence notebook on disk: every article the AI has read, keyed by its fingerprint,
// so a restart re-reads only new or edited articles. Locally it lives in .cache/
// (git-ignored); on Vercel only /tmp is writable. A shared database can replace this
// store later without touching the loader.

import { createHash } from 'node:crypto';
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

/** One notebook per way of reading (provider, model, instructions), so switching AI
 *  providers back and forth doesn't throw away the other one's saved work. */
export function diskEvidenceStore(readerVersion: string): EvidenceStore {
  const file = join(DIR, `evidence-${createHash('sha256').update(readerVersion).digest('hex').slice(0, 12)}.json`);
  let loaded: Promise<Record<string, ArticleEvidence>> | undefined;
  return {
    read: () => (loaded ??= readFile(file, 'utf8').then(readNotebook, (): Record<string, ArticleEvidence> => ({}))),
    async write(entries) {
      loaded = Promise.resolve(entries);
      try {
        await mkdir(DIR, { recursive: true });
        await writeFile(file, JSON.stringify(entries));
      } catch (failure) {
        // A failed write only means those articles are read again next time.
        console.error('[MelodyLust] could not write the evidence cache', failure instanceof Error ? failure.message : failure);
      }
    },
  };
}
