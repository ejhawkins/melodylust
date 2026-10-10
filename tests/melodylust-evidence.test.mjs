import { test } from 'node:test';
import assert from 'node:assert/strict';
import { measureAssociation, parseEvidenceCorpus, resolveMusicEvidence, enrichProduct } from '../src/lib/melodylust-evidence.ts';

const entities = [
  { id: 'designer', kind: 'designer', name: 'Designer A' },
  { id: 'artist', kind: 'artist', name: 'Artist A' },
  { id: 'song', kind: 'song', name: 'Song A' },
];
const doc = (id, ids = ['designer', 'artist']) => ({ id, url: `https://example.org/${id}`, publication: 'Synthetic test fixture', published_at: '2026-10-01', title: 'Designer A and Artist A', summary: '', categories: [], entity_ids: ids });
const observation = { id: 'o1', article_id: 'a', left_id: 'designer', right_id: 'artist', relationship: 'co_occurs_with', quote: 'Designer A and Artist A', field: 'title', section: 'headline', proximity: 'same_sentence', evidence_level: 'artist', song_specific: false };
const fixture = () => ({ version: 1, entities, documents: [doc('a'), doc('b', [])], observations: [observation] });

test('counts zero-hit documents in denominator and retains source evidence', () => {
  const corpus = parseEvidenceCorpus(fixture());
  const r = measureAssociation(corpus, 'designer', 'artist');
  assert.equal(r.corpusSize, 2); assert.equal(r.observed, 1); assert.equal(r.expected, .5); assert.equal(r.lift, 2);
  assert.equal(r.sources[0].url, 'https://example.org/a'); assert.equal(r.observations[0].quote, observation.quote);
  assert.equal(r.song_specific, false);
});
test('reproduces review sheet: 100,000 documents, 4,000 designer, 10,000 music, 1,200 overlap → 3×', () => {
  const documents = Array.from({ length: 100000 }, (_, i) => doc(String(i), [
    ...(i < 4000 ? ['designer'] : []),
    ...(i < 1200 || (i >= 4000 && i < 12800) ? ['artist'] : []),
  ]));
  const r = measureAssociation({ version: 1, entities, documents, observations: [] }, 'designer', 'artist');
  assert.deepEqual([r.corpusSize, r.designerCount, r.musicCount, r.observed, r.expected, r.lift], [100000, 4000, 10000, 1200, 400, 3]);
});
test('duplicate source URLs including fragments never inflate counts', () => {
  const corpus = fixture(); corpus.documents.push({ ...doc('copy'), url: 'https://example.org/a#fragment' });
  const r = measureAssociation(parseEvidenceCorpus(corpus), 'designer', 'artist');
  assert.equal(r.corpusSize, 2); assert.equal(r.observed, 1);
});
test('zero denominators produce null lift, not NaN or a made-up affinity', () => {
  const r = measureAssociation({ version: 1, entities, documents: [], observations: [] }, 'designer', 'artist');
  assert.equal(r.expected, 0); assert.equal(r.lift, null); assert.equal('affinity' in r, false); assert.equal('index' in r, false);
});
test('song request returns no result by default; explicit artist fallback stays labeled', () => {
  const corpus = parseEvidenceCorpus(fixture());
  assert.equal(resolveMusicEvidence(corpus, 'designer', 'song'), null);
  const r = resolveMusicEvidence(corpus, 'designer', 'song', ['artist']);
  assert.equal(r.requested_music_id, 'song'); assert.equal(r.matched_music_id, 'artist'); assert.equal(r.evidence_level, 'artist'); assert.equal(r.song_specific, false); assert.equal(r.fallback_used, true);
  assert.throws(() => resolveMusicEvidence(corpus, 'designer', 'artist', ['song']));
});
test('rejects fabricated quotes, names, song attribution and unknown references', () => {
  for (const patch of [{ quote: 'Invented quotation' }, { song_specific: true }, { evidence_level: 'song' }, { left_id: 'missing' }, { section: 'body' }]) {
    const f = fixture(); f.observations = [{ ...observation, ...patch }];
    assert.throws(() => parseEvidenceCorpus(f));
  }
  const f = fixture(); f.documents[0].entity_ids.push('song');
  assert.throws(() => parseEvidenceCorpus(f));
});
test('validates the declared music level against either endpoint without depending on pair order', () => {
  const source = fixture();
  source.entities = [...source.entities, { id: 'genre', kind: 'genre', name: 'Rock' }];
  source.documents = [{ ...doc('a', ['artist', 'genre']), title: 'Artist A performs Rock' }];
  const edge = { ...observation, left_id: 'artist', right_id: 'genre', quote: 'Artist A performs Rock', evidence_level: 'genre' };
  for (const pair of [edge, { ...edge, left_id: 'genre', right_id: 'artist' }]) {
    const parsed = parseEvidenceCorpus({ ...source, observations: [pair] });
    assert.equal(parsed.observations[0].evidence_level, 'genre');
    assert.equal(parsed.observations[0].song_specific, false);
  }
  assert.throws(() => parseEvidenceCorpus({ ...source, observations: [{ ...edge, evidence_level: 'song', song_specific: true }] }));
  assert.throws(() => parseEvidenceCorpus({ ...source, observations: [{ ...edge, song_specific: true }] }));
});
test('rejects unsafe source links and mismatched format versions', () => {
  const f = fixture(); f.documents[0].url = 'javascript:alert(1)';
  assert.throws(() => parseEvidenceCorpus(f));
  assert.throws(() => parseEvidenceCorpus({ ...fixture(), version: 2 }));
});
test('supports genre evidence without relabeling it as artist or song', () => {
  const f = fixture(); f.entities.push({ id: 'genre', name: 'Rock', kind: 'genre' });
  f.documents = [{ ...doc('a', ['designer', 'genre']), title: 'Designer A meets Rock' }]; f.observations = [];
  const r = measureAssociation(parseEvidenceCorpus(f), 'designer', 'genre');
  assert.equal(r.evidence_level, 'genre'); assert.equal(r.song_specific, false);
});
test('joins product and temporal collection; rejects wrong designer linkage', () => {
  const product = { id: 'shirt', name: 'Wool shirt', designer_id: 'designer', collection_id: 'fw27', attributes: { color: ['blue'], material: ['wool'] } };
  const designers = [{ id: 'designer', name: 'Designer A' }];
  const collections = [{ id: 'fw27', designer_id: 'designer', season: 'FW', year: 2027 }];
  const r = enrichProduct(product, designers, collections);
  assert.equal(r.collection.year, 2027); assert.equal(r.designer.name, 'Designer A'); assert.equal('index' in r.designer, false);
  assert.throws(() => enrichProduct(product, designers, [{ ...collections[0], designer_id: 'other' }]));
});
