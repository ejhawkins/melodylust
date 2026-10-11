import { createHash } from 'node:crypto';
import trackerCsv from '../../data/articles-tracker.csv?raw';
import { parseEditorialCsv, validateEvidenceExtraction } from './style-search';
import { parseEvidenceCorpus, type Entity, type EvidenceCorpus, type EvidenceDocument, type Observation } from './melodylust-evidence';

type TrackerDocuments = ReturnType<typeof parseEditorialCsv>['documents'];
type TrackerReader = (input: { documents: TrackerDocuments }) => Promise<unknown>;

/** One article's validated evidence: the article, the entities it names, its observations. */
export type ArticleEvidence = { document: EvidenceDocument; entities: Entity[]; observations: Observation[] };
/** Where read articles are kept between runs. Keys are article fingerprints (see `articleFingerprint`). */
export type EvidenceStore = { read(): Promise<Record<string, ArticleEvidence>>; write(entries: Record<string, ArticleEvidence>): Promise<void> };

/** A store that only lasts for this process — used by tests and when no disk store is given. */
export function createMemoryEvidenceStore(initial: Record<string, ArticleEvidence> = {}): EvidenceStore {
  let entries = initial;
  return { read: async () => entries, write: async next => { entries = next; } };
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
export const TRACKER_BATCH_SIZE = 5;
const TRACKER_CONCURRENCY = 3;

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

async function readInBatches(documents: TrackerDocuments, reader: TrackerReader) {
  const batches: TrackerDocuments[] = [];
  for (let start = 0; start < documents.length; start += TRACKER_BATCH_SIZE) batches.push(documents.slice(start, start + TRACKER_BATCH_SIZE));
  const read: Record<string, ArticleEvidence> = {};
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(TRACKER_CONCURRENCY, batches.length) }, async () => {
    while (next < batches.length) {
      const batch = batches[next++]!;
      Object.assign(read, splitByArticle(await readBatch(batch, reader)));
    }
  }));
  return read;
}

export type TrackerLoadStats = { reused: number; read: number };

/** Reads only articles the store hasn't seen with this exact text and reader, then saves them all. */
async function loadArticles(documents: TrackerDocuments, reader: TrackerReader, store: EvidenceStore, readerVersion: string, stats: TrackerLoadStats) {
  const keys = documents.map(document => articleFingerprint(document, readerVersion));
  const saved = await store.read();
  const unread = documents.filter((_, index) => !saved[keys[index]!]);
  const fresh = unread.length ? await readInBatches(unread, reader) : {};
  const articles = documents.map((document, index) => saved[keys[index]!] ?? fresh[document.id]!);
  // Only current articles are kept, so removed or edited ones don't pile up.
  await store.write(Object.fromEntries(keys.map((key, index) => [key, articles[index]!])));
  stats.reused = documents.length - unread.length;
  stats.read = unread.length;
  return assembleCorpus(articles);
}

export function createTrackerLoader(store: EvidenceStore = createMemoryEvidenceStore(), readerVersion = 'default') {
  let cachedCsv = '';
  let pending: Promise<EvidenceCorpus> | undefined;
  const stats: TrackerLoadStats = { reused: 0, read: 0 };
  const load = async (csv: string, reader: TrackerReader) => {
    if (pending && cachedCsv === csv) return pending;
    const input = parseEditorialCsv(csv);
    cachedCsv = csv;
    const next = Promise.resolve().then(() => loadArticles(input.documents, reader, store, readerVersion, stats));
    pending = next;
    try { return await next; }
    catch (failure) {
      if (pending === next) pending = undefined;
      throw failure;
    }
  };
  return Object.assign(load, { stats });
}

// One loader per reader version, each saving to the evidence notebook on disk.
const loaders = new Map<string, ReturnType<typeof createTrackerLoader>>();

/** `readerVersion` names how articles are read (provider, model, instructions); changing it re-reads them. */
export async function readTrackedEvidence(reader: TrackerReader, readerVersion = 'default') {
  if (!loaders.has(readerVersion)) {
    const { diskEvidenceStore } = await import('./evidence-cache.server');
    loaders.set(readerVersion, createTrackerLoader(diskEvidenceStore(readerVersion), readerVersion));
  }
  const loadTracker = loaders.get(readerVersion)!;
  let csv = trackerCsv;
  const path = process.env['MELODYLUST_TRACKER_CSV'];
  if (path) {
    const { readFile, stat } = await import('node:fs/promises');
    if ((await stat(path)).size > 2000000) throw new Error('CSV exceeds the 2 MB import limit.');
    csv = await readFile(path, 'utf8');
  }
  const started = Date.now();
  const corpus = await loadTracker(csv, reader);
  if (process.env['NODE_ENV'] !== 'production' || process.env['MELODYLUST_DEBUG'] === '1') {
    console.info('[MelodyLust] tracker', { documents: corpus.documents.length, readNow: loadTracker.stats.read, reusedFromCache: loadTracker.stats.reused, entities: corpus.entities.length, observations: corpus.observations.length, elapsedMs: Date.now() - started });
  }
  return corpus;
}