vi.mock('./db.server', () => ({ getDb: () => null }));
import { describe, it, expect, vi } from 'vitest';
import { articleAnalysisInputSchema, editorialCorpusInputSchema, evidenceSearchIntentSchema, literalEvidenceIntent, parseEditorialCsv, readStyleResult, searchEvidence, validateArticleAnalysis, validateEvidenceExtraction } from './style-search';
import { evidenceStrength, parseEvidenceCorpus } from './melodylust-evidence';
import { createMemoryEvidenceStore, createTrackerLoader, readTrackedEvidence } from './article-tracker.server';

const corpus = parseEvidenceCorpus({
  version: 1,
  entities: [{ id: 'designer', kind: 'designer', name: 'Designer A' }, { id: 'artist', kind: 'artist', name: 'Artist A' }, { id: 'song', kind: 'song', name: 'Song A' }],
  documents: [
    { id: 'one', url: 'https://example.com/one', publication: 'Synthetic test', published_at: '2026-10-10', title: 'Designer A and Artist A', summary: '', categories: [], entity_ids: ['designer', 'artist'] },
    { id: 'two', url: 'https://example.com/two', publication: 'Synthetic test', published_at: '2026-10-10', title: 'A document with no matches', summary: '', categories: [], entity_ids: [] },
  ],
  observations: [],
});

describe('style notes', () => {
  it('keeps editorial text and trims empty edges', () => expect(readStyleResult(' Satin mood\n1. Slip dress ')).toBe('Satin mood\n1. Slip dress'));
  it('rejects an empty response', () => expect(() => readStyleResult('  ')).toThrow());
});

describe('backend article tracker', () => {
  const csv = 'ID,URL,Publication,Published At,Title,Summary,Categories\n1,https://example.com/one,Test,2024-01-01,Usher,,Fashion';
  const reader = async (input: ReturnType<typeof parseEditorialCsv>) => ({ version: 1, entities: [], documents: input.documents.map(document => ({ ...document, entity_ids: [] })), observations: [] });

  it('loads every configured tracker row without browser uploads', async () => {
    const { default: trackerCsv } = await import('../../data/articles-tracker.csv?raw');
    const result = await readTrackedEvidence(reader);
    expect(result.documents).toHaveLength(parseEditorialCsv(trackerCsv).documents.length);
    expect(result.documents.find(document => document.id === '5')?.title).toContain('Usher');
  });

  it('shares validated indexing across requests and reloads changed CSV content', async () => {
    const load = createTrackerLoader();
    let calls = 0;
    const countedReader = async (input: ReturnType<typeof parseEditorialCsv>) => { calls += 1; return reader(input); };
    const [first, second] = await Promise.all([load(csv, countedReader), load(csv, countedReader)]);
    expect(first).toBe(second);
    await load(csv, countedReader);
    expect(calls).toBe(1);
    await load(csv.replace('Usher', 'Gwen Stefani'), countedReader);
    expect(calls).toBe(2);
  });

  it('indexes large trackers in batches and merges them into one corpus', async () => {
    const rows = Array.from({ length: 12 }, (_, i) => `${i + 1},https://example.com/${i + 1},Test,2024-01-01,Usher in Off-White ${i + 1},,Fashion`);
    const bigCsv = ['ID,URL,Publication,Published At,Title,Summary,Categories', ...rows].join('\n');
    const batchSizes: number[] = [];
    const linkingReader = async (input: ReturnType<typeof parseEditorialCsv>) => {
      batchSizes.push(input.documents.length);
      return {
        version: 1,
        entities: [{ id: 'artist:usher', kind: 'artist', name: 'Usher' }, { id: 'designer:off-white', kind: 'designer', name: 'Off-White' }],
        documents: input.documents.map(document => ({ ...document, entity_ids: ['artist:usher', 'designer:off-white'] })),
        // Every batch reuses the same local observation IDs.
        observations: input.documents.map((document, i) => ({ id: `o${i + 1}`, article_id: document.id, left_id: 'designer:off-white', right_id: 'artist:usher', relationship: 'co_occurs_with', quote: 'Usher in Off-White', field: 'title', section: 'headline', proximity: 'same_sentence', evidence_level: 'artist', song_specific: false })),
      };
    };
    const corpus = await createTrackerLoader()(bigCsv, linkingReader);
    // TRACKER_BATCH_SIZE is 3, so 12 articles are read in four batches.
    expect(batchSizes.sort()).toEqual([3, 3, 3, 3]);
    expect(corpus.documents).toHaveLength(12);
    expect(corpus.entities).toHaveLength(2);
    expect(new Set(corpus.observations.map(observation => observation.id)).size).toBe(12);
  });

  it('retries a batch once when the reader returns invalid evidence, then gives up', async () => {
    let calls = 0;
    const flaky = async (input: ReturnType<typeof parseEditorialCsv>) => (++calls === 1 ? { version: 1, entities: [], documents: [], observations: [] } : reader(input));
    expect((await createTrackerLoader()(csv, flaky)).documents).toHaveLength(1);
    expect(calls).toBe(2);
    let broken = 0;
    await expect(createTrackerLoader()(csv, async () => { broken += 1; return { version: 1, entities: [], documents: [], observations: [] }; })).rejects.toThrow('omitted eligible documents');
    expect(broken).toBe(2);
  });

  it('reads each article once: saved evidence is reused, only edited articles are re-read', async () => {
    const twoRows = `${csv}\n2,https://example.com/two,Test,2024-01-02,Gwen Stefani,,Fashion`;
    const store = createMemoryEvidenceStore();
    const seen: string[][] = [];
    const tracking = async (input: ReturnType<typeof parseEditorialCsv>) => { seen.push(input.documents.map(document => document.id)); return reader(input); };

    // First run reads both articles.
    expect((await createTrackerLoader(store, 'gemini')(twoRows, tracking)).documents).toHaveLength(2);
    expect(seen).toEqual([['1', '2']]);

    // A fresh loader (as after a restart) with the same notebook reads nothing.
    const restarted = createTrackerLoader(store, 'gemini');
    expect((await restarted(twoRows, tracking)).documents).toHaveLength(2);
    expect(seen).toHaveLength(1);
    expect(restarted.stats).toEqual({ reused: 2, read: 0 });

    // Editing one article's title re-reads only that article.
    await createTrackerLoader(store, 'gemini')(twoRows.replace('Gwen Stefani', 'Gwen Stefani at Coachella'), tracking);
    expect(seen.at(-1)).toEqual(['2']);

    // A different reader (provider, model or instructions) reads everything again.
    await createTrackerLoader(store, 'openai')(twoRows, tracking);
    expect(seen.at(-1)).toEqual(['1', '2']);
  });

  it('keeps saved evidence for articles that drop out of the source, so switching sources costs no re-reads', async () => {
    const twoRows = `${csv}\n2,https://example.com/two,Test,2024-01-02,Gwen Stefani,,Fashion`;
    const store = createMemoryEvidenceStore();
    let reads = 0;
    const counting = async (input: ReturnType<typeof parseEditorialCsv>) => { reads += input.documents.length; return reader(input); };
    await createTrackerLoader(store, 'gemini')(twoRows, counting);
    await createTrackerLoader(store, 'gemini')(csv, counting); // source shrinks to one article
    await createTrackerLoader(store, 'gemini')(twoRows, counting); // and grows back
    expect(reads).toBe(2);
    expect(Object.keys(await store.read())).toHaveLength(2);
  });

  it('does not cache failed or partially indexed evidence', async () => {
    const load = createTrackerLoader();
    await expect(load(csv, async () => ({ version: 1, entities: [], documents: [], observations: [] }))).rejects.toThrow('omitted eligible documents');
    expect((await load(csv, reader)).documents).toHaveLength(1);
    await expect(load('ID,URL', reader)).rejects.toThrow('missing columns');
  });
});

describe('article analysis', () => {
  const article = { title: 'Supplied test excerpt', url: 'https://example.com/article', text: 'Usher wore a white tailored jacket with crystal detailing. The outfit paired a structured silhouette with a bright finish for the performance.' };
  const output = { summary: 'The excerpt describes a structured white jacket with crystal detailing.', summary_quotes: ['Usher wore a white tailored jacket with crystal detailing.'], styling_suggestions: [{ title: 'Structured tailoring', suggestion: 'Try a white tailored jacket with one crystal accessory.', source_quote: 'a white tailored jacket with crystal detailing' }] };

  it('keeps source metadata and separate styling suggestions with exact article quotes', () => {
    expect(validateArticleAnalysis(output, article)).toEqual({ ...output, source: { title: article.title, url: article.url } });
  });

  it('rejects invented quotes, missing citations and model-added scores or source metadata', () => {
    expect(() => validateArticleAnalysis({ ...output, summary_quotes: ['Invented source text'] }, article)).toThrow('not in the supplied article');
    expect(() => validateArticleAnalysis({ ...output, styling_suggestions: [{ ...output.styling_suggestions[0], source_quote: 'a red leather coat' }] }, article)).toThrow('not in the supplied article');
    expect(() => validateArticleAnalysis({ ...output, summary_quotes: [] }, article)).toThrow();
    expect(() => validateArticleAnalysis({ ...output, affinity: 99 }, article)).toThrow();
    expect(() => validateArticleAnalysis({ ...output, source: { url: 'https://invented.com' } }, article)).toThrow();
    expect(validateArticleAnalysis({ ...output, styling_suggestions: [] }, article).styling_suggestions).toEqual([]);
  });

  it('requires bounded article text and a public web source URL, not just a link', () => {
    expect(articleAnalysisInputSchema.safeParse({ ...article, text: '' }).success).toBe(false);
    expect(articleAnalysisInputSchema.safeParse({ ...article, text: 'x'.repeat(60001) }).success).toBe(false);
    expect(articleAnalysisInputSchema.safeParse({ ...article, url: 'file:///private/article' }).success).toBe(false);
  });
});

describe('editorial CSV import', () => {
  const header = 'ID,URL,Publication,Published At,Title,Summary,Categories';
  const csv = `${header}\r\n1,https://example.com/one?ai-allowed=1,Harper's BAZAAR en Español,2024-02-11,Usher wears Off-White,"Usher wears Off-White, with crystals.","Fashion, Celebrities"\r\n2,https://example.com/two,ELLE Canada,2024-04-15,Unrelated editorial,"A quoted ""look""\nwith no matching entities.",Fashion\r\n`;

  it('preserves quoted commas, embedded newlines, accents, URLs and every row', () => {
    const parsed = parseEditorialCsv(csv);
    expect(parsed.documents).toHaveLength(2);
    expect(parsed.documents[0]).toMatchObject({ id: '1', url: 'https://example.com/one?ai-allowed=1', publication: "Harper's BAZAAR en Español", summary: 'Usher wears Off-White, with crystals.', categories: ['Fashion', 'Celebrities'] });
    expect(parsed.documents[1]?.summary).toBe('A quoted "look"\nwith no matching entities.');
  });

  it('accepts BOM and normalized spreadsheet headers', () => {
    expect(parseEditorialCsv(`\uFEFF${csv.replace('Published At', 'published_at')}`).documents).toHaveLength(2);
  });

  it('rejects malformed, missing-column and duplicate-ID imports without dropping rows', () => {
    expect(() => parseEditorialCsv('ID,URL\n1,https://example.com')).toThrow('missing columns');
    expect(() => parseEditorialCsv(`${header}\n1,https://example.com,ELLE,not-a-date,Title,Summary,Fashion`)).toThrow('CSV row 2');
    expect(() => parseEditorialCsv(csv.replace('2,https://example.com/two', '1,https://example.com/two'))).toThrow('Duplicate document ID');
    expect(() => parseEditorialCsv(`${header}\n1,https://example.com,ELLE,2024-01-01,Title,"Unclosed,Fashion`)).toThrow('Could not parse CSV');
  });

  it('rejects oversized files; trackers may exceed one AI request, single requests may not', () => {
    expect(() => parseEditorialCsv('a'.repeat(2000001))).toThrow('2 MB');
    const rows = Array.from({ length: 31 }, (_, index) => `${index},https://example.com/${index},ELLE,2024-01-01,Title,,Fashion`);
    // The tracker is indexed in batches, so 31 rows are fine there…
    const { documents } = parseEditorialCsv([header, ...rows].join('\n'));
    expect(documents).toHaveLength(31);
    // …but a corpus sent to the AI reader in one request is still capped at 30.
    expect(editorialCorpusInputSchema.safeParse({ documents }).success).toBe(false);
  });
});

describe('evidence search', () => {
  it('uses deterministic lift with zero-hit documents in the denominator', () => {
    const result = searchEvidence(corpus, { music_name: 'Artist A', music_kind: 'artist', designer_name: null });
    expect(result.associations[0]).toMatchObject({ corpusSize: 2, expected: 0.5, observed: 1, lift: 2, evidence_level: 'artist', song_specific: false });
    expect(result.associations[0]?.sources[0]?.url).toBe('https://example.com/one');
  });

  it('does not substitute artist evidence for an unobserved song', () => {
    expect(searchEvidence(corpus, { music_name: 'Song A', music_kind: 'song', designer_name: null }).associations).toEqual([]);
    expect(searchEvidence(corpus, { music_name: 'Unknown song', music_kind: 'song', designer_name: null }).music).toBeNull();
  });

  it('exposes missing designer evidence rather than returning another designer', () => {
    const result = searchEvidence(corpus, { music_name: 'Artist A', music_kind: 'artist', designer_name: 'Unknown designer' });
    expect(result.missingDesigner).toBe(true);
    expect(result.associations).toEqual([]);
  });

  it('supports literal names without calling them AI interpretation', () => {
    expect(literalEvidenceIntent('Designer A with ARTIST A?', corpus)).toEqual({ music_name: 'Artist A', music_kind: 'artist', designer_name: 'Designer A' });
    expect(literalEvidenceIntent('artist alphabet', corpus)).toBeNull();
    expect(literalEvidenceIntent('Artist A and Song A', corpus)).toBeNull();
    expect(literalEvidenceIntent('Artist A - Unknown song', corpus)).toBeNull();
  });

  it('rejects AI scores at the intent boundary', () => {
    expect(() => evidenceSearchIntentSchema.parse({ music_name: 'Artist A', music_kind: 'artist', designer_name: null, lift: 99 })).toThrow();
  });

  it('requires the AI reader to preserve every source and zero-hit document', () => {
    expect(validateEvidenceExtraction(corpus, corpus.documents)).toEqual(corpus);
    expect(() => validateEvidenceExtraction({ ...corpus, documents: [corpus.documents[0]] }, corpus.documents)).toThrow('omitted eligible documents');
    expect(() => validateEvidenceExtraction({ ...corpus, documents: [{ ...corpus.documents[0], publication: 'Invented source' }, corpus.documents[1]] }, corpus.documents)).toThrow('changed source metadata');
  });
});

describe('bundled articles tracker', () => {
  it('parses, with unique IDs and URLs', async () => {
    const { default: csv } = await import('../../data/articles-tracker.csv?raw');
    const { documents } = parseEditorialCsv(csv);
    expect(documents.length).toBeGreaterThanOrEqual(20);
    expect(new Set(documents.map(document => document.id)).size).toBe(documents.length);
    expect(new Set(documents.map(document => document.url)).size).toBe(documents.length);
  });
});

describe('ranking designer connections by how directly the articles state them', () => {
  // Modelled on the Glastonbury roundup: Charli XCX wore McQueen; Doechii (not Charli) wore Westwood.
  const roundup = 'Charli XCX turned an Alexander McQueen skull scarf into a halter top, Doechii wore custom Vivienne Westwood';
  const doc = (id: string, title: string, entity_ids: string[]) => ({ id, url: `https://example.com/${id}`, publication: 'Synthetic test', published_at: '2025-07-01', title, summary: '', categories: [], entity_ids });
  const charli = parseEvidenceCorpus({
    version: 1,
    entities: [{ id: 'artist:Charli XCX', kind: 'artist', name: 'Charli XCX' }, { id: 'designer:Alexander McQueen', kind: 'designer', name: 'Alexander McQueen' }, { id: 'designer:Vivienne Westwood', kind: 'designer', name: 'Vivienne Westwood' }, { id: 'designer:Chanel', kind: 'designer', name: 'Chanel' }],
    documents: [
      doc('roundup', roundup, ['artist:Charli XCX', 'designer:Alexander McQueen', 'designer:Vivienne Westwood']),
      doc('chanel', 'Charli XCX was seen beside a Chanel show', ['artist:Charli XCX', 'designer:Chanel']),
      // McQueen is common elsewhere, which lowers its lift.
      doc('m1', 'Alexander McQueen spring', ['designer:Alexander McQueen']), doc('m2', 'Alexander McQueen archive', ['designer:Alexander McQueen']),
      doc('c1', 'Chanel couture', ['designer:Chanel']),
    ],
    observations: [
      { id: 'o1', article_id: 'roundup', left_id: 'artist:Charli XCX', right_id: 'designer:Alexander McQueen', relationship: 'worn_by', quote: 'Charli XCX turned an Alexander McQueen skull scarf', field: 'title', section: 'headline', proximity: 'same_sentence', evidence_level: 'artist', song_specific: false },
      { id: 'o2', article_id: 'chanel', left_id: 'artist:Charli XCX', right_id: 'designer:Chanel', relationship: 'co_occurs_with', quote: 'Charli XCX was seen beside a Chanel show', field: 'title', section: 'headline', proximity: 'same_sentence', evidence_level: 'artist', song_specific: false },
    ],
  });

  it('puts the quoted "worn by" house first even with lower lift, and a shared article last', () => {
    const { associations } = searchEvidence(charli, { music_name: 'Charli xcx', music_kind: 'artist', designer_name: null });
    expect(associations.map(a => [a.designer.name, evidenceStrength(a)])).toEqual([
      ['Alexander McQueen', 'verified'], ['Chanel', 'quoted'], ['Vivienne Westwood', 'same_article'],
    ]);
    // Lift alone would have put Westwood first.
    const lift = (name: string) => associations.find(a => a.designer.name === name)!.lift!;
    expect(lift('Vivienne Westwood')).toBeGreaterThan(lift('Alexander McQueen'));
  });
});
