/** Versioned evidence model: independent entities, temporal runway data, evidence-backed edges. */
export type EntityKind = 'designer' | 'product' | 'collection' | 'look' | 'artist' | 'song' | 'genre' | 'subculture' | 'stylist' | 'material' | 'color';
export type Entity = { id: string; kind: EntityKind; name: string };
export type Designer = { id: string; name: string };
export type Collection = { id: string; designer_id: string; season: string; year: number };
export type Product = { id: string; name: string; designer_id: string; collection_id?: string; attributes: Record<string, string[]> };
export type ArticleSection = 'headline' | 'dek' | 'lede' | 'nut_graf' | 'body' | 'product_reference' | 'caption' | 'credits' | 'summary' | 'category' | 'unknown';
export type Observation = {
  id: string; article_id: string; left_id: string; right_id: string;
  relationship: 'co_occurs_with' | 'worn_by' | 'styled_by' | 'worked_with';
  quote: string; field: 'title' | 'summary' | 'categories'; section: ArticleSection;
  proximity: 'same_sentence' | 'same_paragraph' | 'same_document' | 'unknown';
  evidence_level: 'song' | 'artist' | 'genre' | 'subculture'; song_specific: boolean;
};
export type EvidenceDocument = { id: string; url: string; publication: string; published_at: string; title: string; summary: string; categories: string[]; entity_ids: string[] };
export type EvidenceCorpus = { version: 1; entities: Entity[]; documents: EvidenceDocument[]; observations: Observation[] };
type UnknownRecord = Record<string, unknown>;
function record(value: unknown): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object.');
  return value as UnknownRecord;
}
function list(value: unknown, max = 10000): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error('Missing or oversized array.');
  return value;
}
function text(value: unknown, limit = 5000, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim()) || value.length > limit) throw new Error('Missing or oversized text.');
  return value;
}
function option<T extends string>(value: unknown, choices: readonly T[]): T {
  if (typeof value !== 'string' || !choices.includes(value as T)) throw new Error('Unknown enum value.');
  return value as T;
}
const entityKinds: EntityKind[] = ['designer', 'product', 'collection', 'look', 'artist', 'song', 'genre', 'subculture', 'stylist', 'material', 'color'];
const sections: ArticleSection[] = ['headline', 'dek', 'lede', 'nut_graf', 'body', 'product_reference', 'caption', 'credits', 'summary', 'category', 'unknown'];
const levels = ['song', 'artist', 'genre', 'subculture'] as const;
function containsName(source: string, name: string) {
  const escape = name.normalize('NFKC').toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escape}($|[^\\p{L}\\p{N}])`, 'u').test(source.normalize('NFKC').toLowerCase());
}
/** Strict manual/LLM extraction boundary. Only supplied metadata can back an entity or observation. */
export function parseEvidenceCorpus(value: unknown): EvidenceCorpus {
  const raw = record(value);
  if (raw['version'] !== 1) throw new Error('Evidence corpus version must be 1.');
  const entities = list(raw['entities'], 2000).map(value => {
    const e = record(value);
    return { id: text(e['id'], 200), name: text(e['name'], 200), kind: option(e['kind'], entityKinds) };
  });
  const entityMap = new Map(entities.map(e => [e.id, e]));
  if (entityMap.size !== entities.length) throw new Error('Duplicate entity ID.');
  const documents = list(raw['documents'], 2000).map(value => {
    const d = record(value); const url = new URL(text(d['url'], 2000));
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Source URLs must be HTTP(S).');
    const published_at = text(d['published_at'], 40);
    if (!/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(published_at) || !Number.isFinite(Date.parse(published_at))) throw new Error('Use an ISO publication date.');
    const title = text(d['title'], 600); const summary = text(d['summary'], 5000, true);
    const categories = list(d['categories'], 30).map(v => text(v, 200));
    const entity_ids = list(d['entity_ids'], 100).map(v => text(v, 200));
    for (const id of entity_ids) {
      const entity = entityMap.get(id);
      if (!entity || ![title, summary, ...categories].some(source => containsName(source, entity.name))) throw new Error(`Entity ${id} is missing from document metadata.`);
    }
    return { id: text(d['id'], 200), url: url.href, publication: text(d['publication'], 200), published_at, title, summary, categories, entity_ids: [...new Set(entity_ids)] };
  });
  const documentMap = new Map(documents.map(d => [d.id, d]));
  if (documentMap.size !== documents.length) throw new Error('Duplicate document ID.');
  const observations = list(raw['observations'], 10000).map(value => {
    const o = record(value); const article_id = text(o['article_id'], 200);
    const document = documentMap.get(article_id);
    const left_id = text(o['left_id'], 200); const right_id = text(o['right_id'], 200);
    if (!document || left_id === right_id || !document.entity_ids.includes(left_id) || !document.entity_ids.includes(right_id)) throw new Error('Observation has unknown document/entity references.');
    const field = option(o['field'], ['title', 'summary', 'categories'] as const);
    const quote = text(o['quote']);
    const source = field === 'categories' ? document.categories : [document[field]];
    if (!source.some(s => s.includes(quote)) || !containsName(quote, entityMap.get(left_id)!.name) || !containsName(quote, entityMap.get(right_id)!.name)) throw new Error('Observation must quote both entities verbatim from its source field.');
    const evidence_level = option(o['evidence_level'], levels);
    const musicEntity = [entityMap.get(left_id)!, entityMap.get(right_id)!].find(entity => entity.kind === evidence_level);
    if (!musicEntity || musicEntity.kind !== evidence_level || o['song_specific'] !== (evidence_level === 'song')) throw new Error('Evidence level must match the actual music entity.');
    const section = option(o['section'], sections);
    if ((field === 'title' && !['headline', 'unknown'].includes(section)) || (field === 'categories' && !['category', 'unknown'].includes(section)) || (field === 'summary' && !['summary', 'unknown'].includes(section))) throw new Error('Do not infer article structure from RSS metadata.');
    const proximity = option(o['proximity'], ['same_sentence', 'same_paragraph', 'same_document', 'unknown'] as const);
    return { id: text(o['id'], 200), article_id, left_id, right_id, relationship: option(o['relationship'], ['co_occurs_with', 'worn_by', 'styled_by', 'worked_with'] as const), quote, field, section, proximity, evidence_level, song_specific: evidence_level === 'song' };
  });
  if (new Set(observations.map(o => o.id)).size !== observations.length) throw new Error('Duplicate observation ID.');
  return { version: 1, entities, documents, observations };
}
export type Association = {
  designer: Entity; music: Entity;
  corpusSize: number; designerCount: number; musicCount: number;
  observed: number; expected: number; lift: number | null;
  evidence_level: EntityKind; song_specific: boolean;
  sources: EvidenceDocument[]; observations: Observation[];
};
// Corpus populations must be declared upstream. Every eligible document, including zero-hit documents, counts.
export function measureAssociation(corpus: EvidenceCorpus, designerId: string, musicId: string): Association {
  const designer = corpus.entities.find(e => e.id === designerId && e.kind === 'designer');
  const music = corpus.entities.find(e => e.id === musicId && ['artist', 'song', 'genre', 'subculture'].includes(e.kind));
  if (!designer || !music) throw new Error('Select a designer and a music entity from the corpus.');
  const seenIds = new Set<string>(); const seenUrls = new Set<string>();
  const documents = corpus.documents.filter(d => {
    const url = new URL(d.url); url.hash = '';
    if (seenIds.has(d.id) || seenUrls.has(url.href)) return false;
    seenIds.add(d.id); seenUrls.add(url.href); return true;
  });
  const sources = documents.filter(d => d.entity_ids.includes(designerId) && d.entity_ids.includes(musicId));
  const designerCount = documents.filter(d => d.entity_ids.includes(designerId)).length;
  const musicCount = documents.filter(d => d.entity_ids.includes(musicId)).length;
  const expected = documents.length ? designerCount * musicCount / documents.length : 0;
  const observations = corpus.observations.filter(o => sources.some(d => d.id === o.article_id) && ((o.left_id === designerId && o.right_id === musicId) || (o.left_id === musicId && o.right_id === designerId)));
  return { designer, music, corpusSize: documents.length, designerCount, musicCount, observed: sources.length, expected, lift: expected ? sources.length / expected : null, evidence_level: music.kind, song_specific: music.kind === 'song', sources, observations };
}
/** How directly the articles tie a designer to the music, strongest first:
 *  verified = a quote says worn by / styled by / worked with; quoted = a quote names both;
 *  same_article = both appear in an article with no quote linking them. */
export type EvidenceStrength = 'verified' | 'quoted' | 'same_article';
export function evidenceStrength(association: Pick<Association, 'observations'>): EvidenceStrength {
  if (association.observations.some(o => o.relationship !== 'co_occurs_with')) return 'verified';
  return association.observations.length ? 'quoted' : 'same_article';
}
export const STRENGTH_RANK: Record<EvidenceStrength, number> = { verified: 2, quoted: 1, same_article: 0 };
/** Exact entity first. Fallback is returned with both IDs and a visible evidence level; never attributed to the song. */
export function resolveMusicEvidence(corpus: EvidenceCorpus, designerId: string, requestedId: string, fallbackIds: string[] = []) {
  const requested = corpus.entities.find(e => e.id === requestedId);
  const levels = ['song', 'artist', 'genre', 'subculture'];
  if (!requested || !levels.includes(requested.kind)) throw new Error('Invalid requested music entity.');
  let previous = levels.indexOf(requested.kind);
  for (const id of fallbackIds) {
    const entity = corpus.entities.find(e => e.id === id);
    const level = entity ? levels.indexOf(entity.kind) : -1;
    if (level <= previous) throw new Error('Fallbacks must explicitly follow song → artist → genre → subculture.');
    previous = level;
  }
  for (const id of [requestedId, ...fallbackIds]) {
    const association = measureAssociation(corpus, designerId, id);
    if (association.observed > 0) return { requested_music_id: requestedId, matched_music_id: id, fallback_used: id !== requestedId, ...association };
  }
  return null;
}
// Designer index and percent affinity are intentionally absent: neither metric has an agreed production definition.
export function enrichProduct(product: Product, designers: Designer[], collections: Collection[]) {
  const designer = designers.find(d => d.id === product.designer_id);
  if (!designer) throw new Error('Product references an unknown designer.');
  const collection = product.collection_id ? collections.find(c => c.id === product.collection_id) : undefined;
  if (product.collection_id && (!collection || collection.designer_id !== designer.id)) throw new Error('Product collection must belong to its designer.');
  return { product, designer, ...(collection ? { collection } : {}) };
}
