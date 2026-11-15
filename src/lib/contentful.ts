// Contentful's Content Delivery API, read into the journal's own story shape. Nothing here holds a credential or makes a
// request: contentful.functions.ts does that on the server and hands the raw reply to readStories, so this half can be
// tested without a space. The content model it expects is one type, `story`, with these fields:
//   title (Short text), genre (Short text), category (Short text), intro (Long text), body (Rich text or Long text),
//   image (Media, one file), date (Date, optional: the entry's first-published date stands in).
import { GENRES, type Genre } from './genre-shapes';

/** A story as the room's cards and reader take it: the same shape as the stories in data/home.ts. */
export type EditionStory = { id: number; category: string; genre: string; title: string; image: string; date: string; intro: string; body: string };

export const CONTENTFUL_CDN = 'https://cdn.contentful.com';
/** The most stories one edition asks for. */
export const STORY_LIMIT = 24;

/** Where a space's entries are read from: the CDN (or a configured gateway), with the environment when one is named. */
export function entriesRoot({ base = CONTENTFUL_CDN, space, environment }: { base?: string; space: string; environment?: string | undefined }): string {
  return `${base.replace(/\/$/, '')}/spaces/${encodeURIComponent(space)}${environment ? `/environments/${encodeURIComponent(environment)}` : ''}/entries`;
}

/** `GET /spaces/{space}/entries?content_type=story&fields.genre[match]=Hip-Hop&include=2`, newest first. Without a genre
 *  it asks for every story. The access token is never part of the URL; it travels in a header. */
export function entriesUrl({ base = CONTENTFUL_CDN, space, environment, genre, limit = STORY_LIMIT }: {
  base?: string; space: string; environment?: string | undefined; genre?: Genre | undefined; limit?: number;
}): string {
  const root = entriesRoot({ base, space, environment });
  const query = [
    'content_type=story',
    ...(genre ? [`fields.genre[match]=${encodeURIComponent(genre)}`] : []),
    'include=2',
    'order=-fields.date,-sys.createdAt',
    `limit=${Math.min(Math.max(Math.trunc(limit), 1), 100)}`,
  ];
  return `${root}?${query.join('&')}`;
}

type Bag = Record<string, unknown>;
const bag = (value: unknown): Bag | null => (value && typeof value === 'object' && !Array.isArray(value) ? value as Bag : null);
const text = (value: unknown, max = 20_000): string => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** A stable number for an entry id, clear of the bundled stories' small ids, so likes and open stories keep their key. */
export function storyNumber(sysId: string): number {
  let hash = 0;
  for (const char of sysId) hash = (hash * 31 + char.charCodeAt(0)) % 2_000_000_000;
  return 100_000 + hash;
}

/** An asset's file as an https image URL sized for a story card, or '' when it isn't an image we can show. */
export function assetUrl(asset: unknown, width = 1600): string {
  const file = bag(bag(bag(asset)?.['fields'])?.['file']);
  const raw = text(file?.['url'], 2000);
  if (!raw) return '';
  const contentType = text(file?.['contentType'], 100);
  if (contentType && !contentType.startsWith('image/')) return '';
  try {
    const url = new URL(raw.startsWith('//') ? `https:${raw}` : raw);
    if (url.protocol !== 'https:') return '';
    url.searchParams.set('w', String(width));
    url.searchParams.set('q', '80');
    return url.toString();
  } catch { return ''; }
}

const BLOCKS = new Set(['paragraph', 'heading-1', 'heading-2', 'heading-3', 'heading-4', 'heading-5', 'heading-6', 'blockquote', 'list-item']);
const inline = (node: unknown): string => {
  const n = bag(node);
  if (!n) return '';
  return n['nodeType'] === 'text' ? (typeof n['value'] === 'string' ? n['value'] : '') : list(n['content']).map(inline).join('');
};

/** A rich-text document as plain paragraphs (blank line between them) and the images embedded in it, in order. Marks and
 *  links keep their words and lose their formatting, which is all the story reader sets. */
export function richText(document: unknown, assets: ReadonlyMap<string, unknown> = new Map()): { body: string; images: string[] } {
  const paragraphs: string[] = [];
  const images: string[] = [];
  const walk = (node: unknown) => {
    const n = bag(node);
    if (!n) return;
    const type = n['nodeType'];
    if (type === 'embedded-asset-block') {
      const id = text(bag(bag(bag(n['data'])?.['target'])?.['sys'])?.['id'], 200);
      const url = assetUrl(assets.get(id));
      if (url) images.push(url);
    } else if (typeof type === 'string' && BLOCKS.has(type) && !list(n['content']).some(child => BLOCKS.has(String(bag(child)?.['nodeType'])))) {
      const line = inline(n).replace(/\s+/g, ' ').trim();
      if (line) paragraphs.push(line);
    } else list(n['content']).forEach(walk);
  };
  walk(document);
  return { body: paragraphs.join('\n\n'), images };
}

const DAY = /^(\d{4})-(\d{2})-(\d{2})/;
/** "2026-11-07…" as the journal dates its stories: "November 07, 2026". '' when the value isn't a date. */
export function storyDate(value: unknown): string {
  const match = DAY.exec(text(value, 40));
  if (!match) return '';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

/** The genre as the journal spells it ("hip-hop" → "Hip-Hop"), or the trimmed value when it is one the lexicon lacks. */
export const journalGenre = (value: string): string => GENRES.find(g => g.toLowerCase() === value.toLowerCase()) ?? value;

/** A Content Delivery reply as stories ready for the room: linked images resolved to URLs and rich text flattened, so no
 *  component sees Contentful's JSON. Entries missing a title, an intro or any body are left out; a reply that isn't an
 *  entry collection reads as no stories. */
export function readStories(payload: unknown): EditionStory[] {
  const reply = bag(payload);
  const assets = new Map<string, unknown>();
  for (const asset of list(bag(reply?.['includes'])?.['Asset'])) {
    const id = text(bag(bag(asset)?.['sys'])?.['id'], 200);
    if (id) assets.set(id, asset);
  }
  const seen = new Set<number>();
  return list(reply?.['items']).flatMap(item => {
    const sys = bag(bag(item)?.['sys']);
    const fields = bag(bag(item)?.['fields']);
    const sysId = text(sys?.['id'], 200);
    if (!sysId || !fields) return [];
    const rich = bag(fields['body'])?.['nodeType'] === 'document' ? richText(fields['body'], assets) : { body: text(fields['body']), images: [] };
    const title = text(fields['title'], 300);
    const intro = text(fields['intro'], 1000) || rich.body.split('\n\n')[0]?.slice(0, 400) || '';
    const linked = text(bag(bag(fields['image'])?.['sys'])?.['id'], 200);
    const id = storyNumber(sysId);
    if (!title || !intro || !rich.body || seen.has(id)) return [];
    seen.add(id);
    return [{
      id, title, intro, body: rich.body,
      category: text(fields['category'], 60) || 'Music',
      genre: journalGenre(text(fields['genre'], 60)),
      image: assetUrl(assets.get(linked)) || rich.images[0] || '',
      date: storyDate(fields['date']) || storyDate(sys?.['firstPublishedAt']) || storyDate(sys?.['createdAt']),
    }];
  });
}
