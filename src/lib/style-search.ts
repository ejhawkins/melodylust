import { z } from 'zod';
import Papa from 'papaparse';
import { measureAssociation, parseEvidenceCorpus, type EvidenceCorpus } from './melodylust-evidence';

export const editorialMetadataSchema = z.object({
  id: z.string().trim().min(1).max(200),
  url: z.string().url().max(2000).refine(value => /^https?:\/\//.test(value)),
  publication: z.string().trim().min(1).max(200),
  published_at: z.string().max(40).refine(value => /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value) && Number.isFinite(Date.parse(value))),
  title: z.string().trim().min(1).max(600), summary: z.string().max(5000),
  categories: z.array(z.string().max(200)).max(30),
});
export const editorialCorpusInputSchema = z.object({
  documents: z.array(editorialMetadataSchema).min(1).max(30),
}).refine(value => new Set(value.documents.map(document => document.id)).size === value.documents.length, 'Duplicate document ID.');

export function parseEditorialCsv(csv: string) {
  if (new TextEncoder().encode(csv).length > 2000000) throw new Error('CSV exceeds the 2 MB import limit.');
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: header => header.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[\s_]+/g, '_'),
  });
  if (parsed.errors.length) throw new Error(`Could not parse CSV: ${parsed.errors[0]?.message}`);
  const fields = parsed.meta.fields ?? [];
  const required = ['id', 'url', 'publication', 'published_at', 'title', 'summary', 'categories'];
  const missing = required.filter(field => !fields.includes(field));
  if (missing.length) throw new Error(`CSV is missing columns: ${missing.join(', ')}.`);
  const documents = parsed.data.map((row, index) => {
    const document = editorialMetadataSchema.safeParse({
      id: row['id'], url: row['url'], publication: row['publication'], published_at: row['published_at'],
      title: row['title'], summary: row['summary'],
      categories: row['categories']?.split(',').map(category => category.trim()).filter(Boolean),
    });
    if (!document.success) {
      const issue = document.error.issues[0];
      throw new Error(`CSV row ${index + 2}: ${issue?.path.join('.')} ${issue?.message}`);
    }
    return document.data;
  });
  return editorialCorpusInputSchema.parse({ documents });
}

export function validateEvidenceExtraction(value: unknown, documents: z.infer<typeof editorialMetadataSchema>[]) {
  const corpus = parseEvidenceCorpus(value);
  if (corpus.documents.length !== documents.length) throw new Error('Reader omitted eligible documents.');
  for (const original of documents) {
    const extracted = corpus.documents.find(document => document.id === original.id);
    if (!extracted || extracted.url !== new URL(original.url).href || extracted.publication !== original.publication || extracted.published_at !== original.published_at || extracted.title !== original.title || extracted.summary !== original.summary || JSON.stringify(extracted.categories) !== JSON.stringify(original.categories)) throw new Error('Reader changed source metadata.');
  }
  return corpus;
}

export const evidenceSearchIntentSchema = z.object({
  music_name: z.string().trim().min(1).max(200),
  music_kind: z.enum(['song', 'artist', 'genre', 'subculture']),
  designer_name: z.string().trim().min(1).max(200).nullable(),
}).strict();
export type EvidenceSearchIntent = z.infer<typeof evidenceSearchIntentSchema>;

const normalizedName = (name: string) => name.normalize('NFKC').trim().toLowerCase();

export function searchEvidence(corpus: EvidenceCorpus, intent: EvidenceSearchIntent) {
  const music = corpus.entities.find(entity => entity.kind === intent.music_kind && normalizedName(entity.name) === normalizedName(intent.music_name)) ?? null;
  const designers = corpus.entities.filter(entity => entity.kind === 'designer' && (!intent.designer_name || normalizedName(entity.name) === normalizedName(intent.designer_name)));
  const associations = music ? designers.map(designer => measureAssociation(corpus, designer.id, music.id))
    .filter(association => intent.designer_name || association.observed > 0)
    .sort((left, right) => (right.lift ?? 0) - (left.lift ?? 0) || right.observed - left.observed) : [];
  return { intent, music, associations, missingDesigner: Boolean(intent.designer_name && !designers.length) };
}
export type EvidenceSearchResult = ReturnType<typeof searchEvidence>;

export function literalEvidenceIntent(query: string, corpus: EvidenceCorpus): EvidenceSearchIntent | null {
  const names = normalizedName(query).replace(/\?$/, '').trim();
  const musicEntities = corpus.entities.filter(entity => ['song', 'artist', 'genre', 'subculture'].includes(entity.kind));
  const intents: EvidenceSearchIntent[] = [];
  for (const music of musicEntities) {
    if (names === normalizedName(music.name)) intents.push(evidenceSearchIntentSchema.parse({ music_name: music.name, music_kind: music.kind, designer_name: null }));
    for (const designer of corpus.entities.filter(entity => entity.kind === 'designer')) {
      const pairs = [' with ', ' and ', ' x ', ' × ', ' + '].flatMap(separator => [
        `${normalizedName(designer.name)}${separator}${normalizedName(music.name)}`,
        `${normalizedName(music.name)}${separator}${normalizedName(designer.name)}`,
      ]);
      if (pairs.includes(names)) intents.push(evidenceSearchIntentSchema.parse({ music_name: music.name, music_kind: music.kind, designer_name: designer.name }));
    }
  }
  return intents.length === 1 ? intents[0] ?? null : null;
}

export function readStyleResult(text: string) {
  const result = text.trim();
  if (!result) throw new Error("No style notes came back. Please try again.");
  return result;
}

export const articleAnalysisInputSchema = z.object({
  title: z.string().trim().min(1).max(600),
  url: editorialMetadataSchema.shape.url,
  text: z.string().trim().min(100, 'Supply at least 100 characters of article text.').max(60000)
    .refine(value => new TextEncoder().encode(value).length <= 160000, 'Article text exceeds the reader limit.'),
}).strict();

const articleAnalysisOutputSchema = z.object({
  summary: z.string().trim().min(1).max(2000),
  summary_quotes: z.array(z.string().min(1).max(600)).min(1).max(5),
  styling_suggestions: z.array(z.object({
    title: z.string().trim().min(1).max(100),
    suggestion: z.string().trim().min(1).max(600),
    source_quote: z.string().min(1).max(600),
  }).strict()).max(5),
}).strict();

export function validateArticleAnalysis(value: unknown, input: z.infer<typeof articleAnalysisInputSchema>) {
  const article = articleAnalysisInputSchema.parse(input);
  const analysis = articleAnalysisOutputSchema.parse(value);
  const quotes = [...analysis.summary_quotes, ...analysis.styling_suggestions.map(suggestion => suggestion.source_quote)];
  if (quotes.some(quote => !article.text.includes(quote))) throw new Error('AI returned a quote that is not in the supplied article. No analysis was loaded.');
  return { ...analysis, source: { title: article.title, url: article.url } };
}
export type ArticleAnalysis = ReturnType<typeof validateArticleAnalysis>;
