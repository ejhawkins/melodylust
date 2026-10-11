import trackerCsv from '../../data/articles-tracker.csv?raw';
import { parseEditorialCsv, validateEvidenceExtraction } from './style-search';
import { parseEvidenceCorpus, type EvidenceCorpus } from './melodylust-evidence';

type TrackerDocuments = ReturnType<typeof parseEditorialCsv>['documents'];
type TrackerReader = (input: { documents: TrackerDocuments }) => Promise<unknown>;

// One AI request per small batch keeps each answer well inside the model's output limit
// and timeout as the tracker grows; a few batches run at once to keep first search quick.
export const TRACKER_BATCH_SIZE = 5;
const TRACKER_CONCURRENCY = 3;

/** Joins per-batch corpora: shared entities once, documents and observations from every batch. */
export function mergeEvidenceCorpora(parts: EvidenceCorpus[]): EvidenceCorpus {
  const entities = new Map<string, EvidenceCorpus['entities'][number]>();
  for (const part of parts) for (const entity of part.entities) if (!entities.has(entity.id)) entities.set(entity.id, entity);
  return parseEvidenceCorpus({
    version: 1,
    entities: [...entities.values()],
    documents: parts.flatMap(part => part.documents),
    // Each batch numbers its own observations, so prefix them to keep IDs unique.
    observations: parts.flatMap((part, index) => part.observations.map(observation => ({ ...observation, id: `b${index + 1}:${observation.id}` }))),
  });
}

async function readInBatches(documents: TrackerDocuments, reader: TrackerReader) {
  const batches: TrackerDocuments[] = [];
  for (let start = 0; start < documents.length; start += TRACKER_BATCH_SIZE) batches.push(documents.slice(start, start + TRACKER_BATCH_SIZE));
  const parts: EvidenceCorpus[] = new Array(batches.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(TRACKER_CONCURRENCY, batches.length) }, async () => {
    while (next < batches.length) {
      const index = next++;
      const batch = batches[index]!;
      const extracted = await reader({ documents: batch });
      if (!extracted) throw new Error('The AI reader is not connected. Configure a server-side AI provider.');
      parts[index] = validateEvidenceExtraction(extracted, batch);
    }
  }));
  return mergeEvidenceCorpora(parts);
}

export function createTrackerLoader() {
  let cachedCsv = '';
  let pending: Promise<EvidenceCorpus> | undefined;
  return async (csv: string, reader: TrackerReader) => {
    if (pending && cachedCsv === csv) return pending;
    const input = parseEditorialCsv(csv);
    cachedCsv = csv;
    const next = Promise.resolve().then(() => readInBatches(input.documents, reader));
    pending = next;
    try { return await next; }
    catch (failure) {
      if (pending === next) pending = undefined;
      throw failure;
    }
  };
}

const loadTracker = createTrackerLoader();

export async function readTrackedEvidence(reader: TrackerReader) {
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
    console.info('[MelodyLust] tracker', { documents: corpus.documents.length, entities: corpus.entities.length, observations: corpus.observations.length, elapsedMs: Date.now() - started });
  }
  return corpus;
}