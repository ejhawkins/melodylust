import trackerCsv from '../../data/articles-tracker.csv?raw';
import { parseEditorialCsv, validateEvidenceExtraction } from './style-search';
import type { EvidenceCorpus } from './melodylust-evidence';

type TrackerReader = (input: ReturnType<typeof parseEditorialCsv>) => Promise<unknown>;

export function createTrackerLoader() {
  let cachedCsv = '';
  let pending: Promise<EvidenceCorpus> | undefined;
  return async (csv: string, reader: TrackerReader) => {
    if (pending && cachedCsv === csv) return pending;
    const input = parseEditorialCsv(csv);
    cachedCsv = csv;
    const next = Promise.resolve().then(async () => {
      const extracted = await reader(input);
      if (!extracted) throw new Error('The AI reader is not connected. Configure a server-side AI provider.');
      return validateEvidenceExtraction(extracted, input.documents);
    });
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