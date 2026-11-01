// Portraits for the creative directors the designer radio scout names: the curated DESIGNERS first (their photos are
// checked by hand), then Wikipedia's free lead photo credited from Commons. Pure, so the payload reading is tested offline.

import { DESIGNERS, type Designer } from './runway-songs';

const key = (name: string) => name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const known = new Map(Object.values(DESIGNERS).map(designer => [key(designer.name), designer as Designer]));

/** Up to two director names from the scout's free text: "Miuccia Prada & Raf Simons", "Richie Hawtin (as Plastikman)". */
export function directorNames(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  return value.replace(/\([^)]*\)/g, ' ').split(/\s*(?:&|,|\/|\band\b)\s*/i)
    .map(name => name.replace(/\s+/g, ' ').trim()).filter(name => name.length > 1 && name.length <= 80).slice(0, 2);
}

/** The curated directory entry for a name, which wins over anything found on Wikipedia. */
export const knownDesigner = (name: string) => known.get(key(name)) ?? null;

const search = (name: string) => `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(name)}`;
/** A name with no article found: captioned with a Wikipedia search, no photo. */
export const unknownDesigner = (name: string): Designer => ({ name, wikipedia: search(name), photo: null });

export const wikipediaPagesUrl = (names: string[]) => `https://en.wikipedia.org/w/api.php?${new URLSearchParams({
  action: 'query', format: 'json', formatversion: '2', redirects: '1', origin: '*',
  prop: 'pageimages|pageprops|description', piprop: 'name', pilicense: 'free', ppprop: 'disambiguation', titles: names.join('|'),
})}`;

export const commonsPhotosUrl = (files: string[]) => `https://commons.wikimedia.org/w/api.php?${new URLSearchParams({
  action: 'query', format: 'json', formatversion: '2', origin: '*',
  prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '400', iiextmetadatafilter: 'Artist|LicenseShortName', titles: files.map(file => `File:${file}`).join('|'),
})}`;

type Rename = { from?: unknown; to?: unknown };
// People's short descriptions name a trade or carry life years; a fashion house's ("French luxury fashion house") doesn't.
const personLike = /\b(born|designer|director|couturier|musician|rapper|singer|producer|composer|artist|stylist|DJ)\b|\b\d{4}\s*[–-]\s*\d{4}\b/i;

/** Article title, link and lead-photo file per requested name, for articles about a person only. */
export function readWikipediaPages(payload: unknown, names: string[]) {
  const query = (payload as { query?: { pages?: unknown[]; normalized?: Rename[]; redirects?: Rename[] } } | null)?.query;
  const renames = new Map([...(query?.normalized ?? []), ...(query?.redirects ?? [])]
    .flatMap(({ from, to }) => typeof from === 'string' && typeof to === 'string' ? [[from, to] as const] : []));
  const pages = new Map((query?.pages ?? []).flatMap(page => {
    const { title, missing, pageprops, description, pageimage } = (page ?? {}) as Record<string, unknown>;
    if (typeof title !== 'string' || missing || (pageprops && typeof pageprops === 'object' && 'disambiguation' in pageprops)) return [];
    if (typeof description !== 'string' || !personLike.test(description)) return [];
    return [[title, { url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`, file: typeof pageimage === 'string' ? pageimage : null }] as const];
  }));
  return new Map(names.flatMap(name => {
    let title = name;
    for (let hop = 0; hop < 3 && renames.has(title); hop += 1) title = renames.get(title)!;
    const page = pages.get(title);
    return page ? [[name, page] as const] : [];
  }));
}

const plain = (html: unknown) => typeof html === 'string'
  ? html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim().slice(0, 120) || null
  : null;

/** Commons photo, credit and licence per file name (without "File:"). */
export function readCommonsPhotos(payload: unknown) {
  const pages = (payload as { query?: { pages?: unknown[] } } | null)?.query?.pages ?? [];
  return new Map(pages.flatMap(page => {
    const { title, imageinfo } = (page ?? {}) as { title?: unknown; imageinfo?: Record<string, unknown>[] };
    const info = imageinfo?.[0];
    const src = info?.['thumburl'] ?? info?.['url'];
    if (typeof title !== 'string' || typeof src !== 'string' || !src.startsWith('https://')) return [];
    const meta = (info?.['extmetadata'] ?? {}) as Record<string, { value?: unknown } | undefined>;
    return [[title.replace(/^File:/, '').replace(/ /g, '_'), {
      src, credit: plain(meta['Artist']?.value), licence: plain(meta['LicenseShortName']?.value),
      source: typeof info?.['descriptionurl'] === 'string' ? info['descriptionurl'] as string : null,
    }] as const];
  }));
}

// A lead image is sometimes the work, not the person ("Jun_Takahashi_dress_for_Undercover", "Backstageraf"): only a file
// named for the person's surname, with no garment or show words, counts as their portrait.
const notPortrait = /dress|gown|collection|look|runway|catwalk|backstage|show|store|boutique|logo|bag|shoe|sneaker|exhibition|museum|campaign/i;
const isPortraitOf = (name: string, file: string) => {
  const surname = key(name).split(' ').at(-1) ?? '';
  return surname.length > 1 && key(file).includes(surname) && !notPortrait.test(file);
};

/** Directors as the portrait shows them: curated first, then the Wikipedia article and its free photo, else a name with a search link. */
export function portraitDesigners(names: string[], pages: ReturnType<typeof readWikipediaPages>, photos: ReturnType<typeof readCommonsPhotos>): Designer[] {
  return names.map(name => {
    const curated = knownDesigner(name);
    if (curated) return curated;
    const page = pages.get(name);
    if (!page) return unknownDesigner(name);
    const photo = page.file && isPortraitOf(name, page.file) ? photos.get(page.file.replace(/ /g, '_')) : undefined;
    return { name, wikipedia: page.url, photo: photo ?? null };
  });
}
