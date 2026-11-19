// The Reading Room's Good Reads: links worth a reader's time, kept in Contentful as `goodRead` entries (title, source,
// note, url, and an order). Nothing here holds a credential or makes a request: good-reads.functions.ts does that on the
// server and hands the raw reply to readGoodReads.
import { entriesRoot } from './contentful';

export type GoodRead = { id: string; source: string; title: string; note: string; url: string };

/** The most reads the zine's list shows. */
export const GOOD_READS_LIMIT = 8;

/** Every published good read, the editor's order first (lowest number on top), then the newest. */
export const goodReadsUrl = (place: { base?: string; space: string; environment?: string | undefined }) =>
  `${entriesRoot(place)}?content_type=goodRead&order=fields.order,-sys.createdAt&limit=${GOOD_READS_LIMIT}`;

type Bag = Record<string, unknown>;
const bag = (value: unknown): Bag | null => (value && typeof value === 'object' && !Array.isArray(value) ? value as Bag : null);
const text = (value: unknown, max: number): string => (typeof value === 'string' ? value.trim().slice(0, max) : '');

/** A link the zine can open: http or https only, so an entry can't smuggle in a javascript: or data: address. */
export function webLink(value: unknown): string {
  const raw = text(value, 2000);
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch {
    return '';
  }
}

/** A Content Delivery reply as good reads. Entries missing a title or a usable link are left out, and the source falls
 *  back to the link's site ("vogue.com") when the editor names none. */
export function readGoodReads(payload: unknown): GoodRead[] {
  const items = bag(payload)?.['items'];
  const seen = new Set<string>();
  return (Array.isArray(items) ? items : []).flatMap(item => {
    const fields = bag(bag(item)?.['fields']);
    const id = text(bag(bag(item)?.['sys'])?.['id'], 200);
    const title = text(fields?.['title'], 200);
    const url = webLink(fields?.['url']);
    if (!id || !title || !url || seen.has(url)) return [];
    seen.add(url);
    const source = text(fields?.['source'], 60) || new URL(url).hostname.replace(/^www\./, '');
    return [{ id, title, url, source, note: text(fields?.['note'], 200) }];
  }).slice(0, GOOD_READS_LIMIT);
}
