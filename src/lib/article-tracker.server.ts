import { createHash } from 'node:crypto';
import trackerCsv from '../../data/articles-tracker.csv?raw';
import { getDb } from './db.server';
import { readApprovedTrackerCsv } from './article-source.server';
import { parseEditorialCsv, validateEvidenceExtraction } from './style-search';
import { parseEvidenceCorpus, type Entity, type EvidenceCorpus, type EvidenceDocument, type Observation } from './melodylust-evidence';

type TrackerDocuments = ReturnType<typeof parseEditorialCsv>['documents'];
type TrackerReader = (input: { documents: TrackerDocuments }) => Promise<unknown>;

/** One article's validated evidence: the article, the entities it names, its observations. */
export type ArticleEvidence = { document: EvidenceDocument; entities: Entity[]; observations: Observation[] };
/** Where read articles are kept between runs. Keys are article fingerprints (see `articleFingerprint`). */
export type EvidenceStore = {
  read(): Promise<Record<string, ArticleEvidence>>;
  /** Adds or replaces these entries; never removes others (switching sources must not lose paid reads). */
  save(entries: Record<string, ArticleEvidence>): Promise<void>;
};

/** A store that only lasts for this process — used by tests and when no disk store is given. */
export function createMemoryEvidenceStore(initial: Record<string, ArticleEvidence> = {}): EvidenceStore {
  let entries = initial;
  return { read: async () => entries, save: async added => { entries = { ...entries, ...added }; } };
}

/** Same article text read the same way → same fingerprint. Editing any field, or changing the
 *  reader (provider, model, instructions), changes it, so that article is read again. */
export function articleFingerprint(document: TrackerDocuments[number], readerVersion: string) {
  const fields = [document.id, document.url, document.publication, document.published_at, document.title, document.summary, document.categories.join('\u001f'), readerVersion];
  return createHash('sha256').update(fields.join('\u001e')).digest('hex');
}

/** Splits a validated batch into one entry per article. */
function splitByArticle(corpus: EvidenceCorpus): Record<string, ArticleEvidence> {
  return Object.fromEntries(corpus.documents.map(document => [document.id, {
    document,
    entities: corpus.entities.filter(entity => document.entity_ids.includes(entity.id)),
    observations: corpus.observations.filter(observation => observation.article_id === document.id),
  }]));
}

// One AI request per small batch keeps each answer well inside the model's output limit
// and timeout as the tracker grows; a few batches run at once to keep first search quick.
export const TRACKER_BATCH_SIZE = 3;
const TRACKER_CONCURRENCY = 5;

/** Joins per-article evidence into one corpus: shared entities once, every article and observation. */
export function assembleCorpus(articles: ArticleEvidence[]): EvidenceCorpus {
  const entities = new Map<string, Entity>();
  for (const article of articles) for (const entity of article.entities) if (!entities.has(entity.id)) entities.set(entity.id, entity);
  return parseEvidenceCorpus({
    version: 1,
    entities: [...entities.values()],
    documents: articles.map(article => article.document),
    // Articles were read in different requests that number observations independently,
    // so each observation ID is prefixed with its article's ID to stay unique.
    observations: articles.flatMap(article => article.observations.map(observation => ({ ...observation, id: `${article.document.id}:${observation.id}` }))),
  });
}

/** Models vary run to run, so a batch that fails the strict quote/metadata checks gets one more try.
 *  Evidence is never loosened: whatever is kept still passes the same validation. */
async function readBatch(batch: TrackerDocuments, reader: TrackerReader) {
  for (let attempt = 1; ; attempt++) {
    const extracted = await reader({ documents: batch });
    if (!extracted) throw new Error('The AI reader is not connected. Configure a server-side AI provider.');
    try { return validateEvidenceExtraction(extracted, batch); }
    catch (failure) {
      if (attempt >= 2) throw failure;
      if (process.env['NODE_ENV'] !== 'production' || process.env['MELODYLUST_DEBUG'] === '1') {
        console.warn('[MelodyLust] batch failed validation, retrying', { documents: batch.map(document => document.id), reason: failure instanceof Error ? failure.message : String(failure) });
      }
    }
  }
}

export type TrackerLoadStats = { reused: number; read: number; pending: number; failed: number };
type Indexing = { csv: string; done: boolean; error: unknown; read: number; failed: number; promise: Promise<void> };

/** Reads the articles the store hasn't seen, a few batches at a time. Each batch is saved as soon as
 *  it passes validation, so progress survives a timeout, a failed batch or a restart. */
function startIndexing(csv: string, documents: TrackerDocuments, reader: TrackerReader, store: EvidenceStore, readerVersion: string): Indexing {
  const state: Indexing = { csv, done: false, error: null, read: 0, failed: 0, promise: Promise.resolve() };
  type Part = { documents: TrackerDocuments; read: Record<string, ArticleEvidence> } | { documents: TrackerDocuments; failure: unknown };
  const readOrSplit = async (batch: TrackerDocuments): Promise<Part[]> => {
    try { return [{ documents: batch, read: splitByArticle(await readBatch(batch, reader)) }]; }
    catch (failure) {
      if (batch.length === 1) return [{ documents: batch, failure }];
      return (await Promise.all(batch.map(document => readOrSplit([document])))).flat();
    }
  };
  state.promise = (async () => {
    const saved = await store.read();
    const unread = documents.filter(document => !saved[articleFingerprint(document, readerVersion)]);
    const batches: TrackerDocuments[] = [];
    for (let start = 0; start < unread.length; start += TRACKER_BATCH_SIZE) batches.push(unread.slice(start, start + TRACKER_BATCH_SIZE));
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(TRACKER_CONCURRENCY, batches.length) }, async () => {
      while (next < batches.length) {
        const batch = batches[next++]!;
        // A batch that fails twice is read one article at a time, so one bad article can't hold back the rest.
        for (const part of await readOrSplit(batch)) {
          if ('failure' in part) {
            // Never sinks the others; these articles are tried again on a later search.
            state.failed += part.documents.length;
            state.error = part.failure;
            console.warn('[MelodyLust] could not be indexed', { documents: part.documents.map(document => document.id), reason: part.failure instanceof Error ? part.failure.message : String(part.failure) });
            continue;
          }
          await store.save(Object.fromEntries(part.documents.map(document => [articleFingerprint(document, readerVersion), part.read[document.id]!])));
          state.read += part.documents.length;
        }
      }
    }));
  })().catch(failure => { state.error = failure; }).finally(() => { state.done = true; });
  return state;
}

/** `budgetMs` caps how long a search waits for new articles to be read; reading carries on in the
 *  background and the next search picks up whatever has been saved. Infinity waits for everything. */
export function createTrackerLoader(store: EvidenceStore = createMemoryEvidenceStore(), readerVersion = 'default', budgetMs = Infinity) {
  let indexing: Indexing | undefined;
  const stats: TrackerLoadStats = { reused: 0, read: 0, pending: 0, failed: 0 };
  let unread: TrackerDocuments = [];
  const load = async (csv: string, reader: TrackerReader): Promise<EvidenceCorpus> => {
    const { documents } = parseEditorialCsv(csv);
    // One reading pass per source at a time; a finished pass (even a failed one) is retried next time.
    if (!indexing || indexing.csv !== csv || indexing.done) indexing = startIndexing(csv, documents, reader, store, readerVersion);
    const current = indexing;
    if (Number.isFinite(budgetMs)) await Promise.race([current.promise, new Promise(resolve => setTimeout(resolve, budgetMs))]);
    else await current.promise;
    const saved = await store.read();
    const available = documents.filter(document => saved[articleFingerprint(document, readerVersion)]);
    unread = documents.filter(document => !saved[articleFingerprint(document, readerVersion)]);
    Object.assign(stats, { read: current.read, reused: available.length - current.read, pending: current.done ? 0 : unread.length, failed: current.failed });
    // Nothing usable and nothing still on its way: say why, rather than returning an empty collection.
    if (current.done && unread.length && !available.length) throw current.error instanceof Error ? current.error : new Error('The article tracker could not be indexed.');
    return assembleCorpus(available.map(document => saved[articleFingerprint(document, readerVersion)]!));
  };
  return Object.assign(load, { stats, unread: () => unread });
}

// One loader per reader version, each saving to the evidence notebook on disk.
const loaders = new Map<string, ReturnType<typeof createTrackerLoader>>();

/** How long a search waits for newly added articles to be read before answering with what is ready. */
const SEARCH_BUDGET_MS = Number(process.env['MELODYLUST_INDEX_BUDGET_MS']) || 6_000;

export type TrackedEvidence = { corpus: EvidenceCorpus; pending: number; failed: number; unread: TrackerDocuments };

/** `readerVersion` names how articles are read (the reader's instructions); changing it re-reads them. */
export async function readTrackedEvidenceWithStatus(reader: TrackerReader, readerVersion = 'default', budgetMs = SEARCH_BUDGET_MS): Promise<TrackedEvidence> {
  const db = getDb();
  const loaderKey = `${readerVersion}|${budgetMs}`;
  if (!loaders.has(loaderKey)) {
    // Supabase keeps read articles across deploys and cold starts; the disk notebook is the local fallback.
    const store = db ? (await import('./evidence-cache.server')).supabaseEvidenceStore(db, readerVersion) : (await import('./evidence-cache.server')).diskEvidenceStore(readerVersion);
    loaders.set(loaderKey, createTrackerLoader(store, readerVersion, budgetMs));
  }
  const loadTracker = loaders.get(loaderKey)!;
  let csv = trackerCsv;
  const source = db ? 'supabase' : 'csv';
  const path = process.env['MELODYLUST_TRACKER_CSV'];
  if (db) {
    csv = await readApprovedTrackerCsv(db);
  } else if (path) {
    const { readFile, stat } = await import('node:fs/promises');
    if ((await stat(path)).size > 2000000) throw new Error('CSV exceeds the 2 MB import limit.');
    csv = await readFile(path, 'utf8');
  }
  const started = Date.now();
  const corpus = await loadTracker(csv, reader);
  const { pending, failed } = loadTracker.stats;
  if (process.env['NODE_ENV'] !== 'production' || process.env['MELODYLUST_DEBUG'] === '1') {
    console.info('[MelodyLust] tracker', { source, documents: corpus.documents.length, readNow: loadTracker.stats.read, reusedFromCache: loadTracker.stats.reused, stillReading: pending, failed, entities: corpus.entities.length, observations: corpus.observations.length, elapsedMs: Date.now() - started });
  }
  return { corpus, pending, failed, unread: loadTracker.unread() };
}

export async function readTrackedEvidence(reader: TrackerReader, readerVersion = 'default') {
  return (await readTrackedEvidenceWithStatus(reader, readerVersion, Infinity)).corpus;
}
