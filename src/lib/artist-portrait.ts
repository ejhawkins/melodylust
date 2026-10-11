// Picks a freely licensed portrait for the search cursor from Wikipedia / Wikimedia Commons.
// Pure: the server function fetches, these rules decide. Only free licences (CC BY, CC BY-SA,
// CC0, public domain) are accepted, and the credit those licences require travels with the image.

export type ArtistPortrait = { name: string; imageUrl: string; author: string; license: string; licenseUrl: string | null; sourceUrl: string };

/** The plain name first, then the usual Wikipedia titles for musicians who share a name. */
export const portraitCandidates = (name: string) =>
  [name, `${name} (singer)`, `${name} (musician)`, `${name} (rapper)`, `${name} (band)`].map(title => title.trim());

/** Wikipedia's short description must say this page is about a musician ("American singer", "rock band"). */
const MUSICIAN = /\b(singers?|rappers?|musicians?|bands?|songwriters?|singer-songwriters?|dj|disc jockey|record producers?|vocalists?|composers?|musical (group|duo|act)|girl group|boy band|duo|rock group|hip hop group)\b/i;

type WikiPage = { title?: unknown; missing?: unknown; description?: unknown; pageimage?: unknown; pageprops?: { disambiguation?: unknown } };

/** Wikipedia query (titles = candidates, prop=description|pageimages|pageprops) → the first musician page with a free lead image. */
export function pickPortraitPage(payload: unknown, candidates: string[]): { title: string; file: string } | null {
  const query = payload && typeof payload === 'object' && 'query' in payload ? (payload as { query?: { pages?: unknown; normalized?: { from: string; to: string }[]; redirects?: { from: string; to: string }[] } }).query : undefined;
  const pages = query?.pages && typeof query.pages === 'object' ? Object.values(query.pages as Record<string, WikiPage>) : [];
  // Follow Wikipedia's own normalisation and redirects so each candidate maps to its real page.
  const resolve = (title: string) => {
    let current = title;
    for (const step of [...(query?.normalized ?? []), ...(query?.redirects ?? [])]) if (step.from === current) current = step.to;
    return current;
  };
  for (const candidate of candidates) {
    const page = pages.find(p => p.title === resolve(candidate));
    if (!page || 'missing' in page || page.pageprops?.disambiguation !== undefined) continue;
    if (typeof page.description !== 'string' || !MUSICIAN.test(page.description)) continue;
    if (typeof page.pageimage !== 'string' || !page.pageimage) continue;
    return { title: String(page.title), file: page.pageimage };
  }
  return null;
}

const FREE_LICENSE = /^(cc[ -]by(-sa)?[ -][\d.]+|cc0|cc zero|public domain|pd\b)/i;
const stripTags = (value: unknown) => (typeof value === 'string' ? value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '');

/** Commons imageinfo (iiprop=url|extmetadata, iiurlwidth) → a credited portrait, or null if the licence isn't free. */
export function readPortraitImage(payload: unknown, name: string): ArtistPortrait | null {
  const pages = payload && typeof payload === 'object' && 'query' in payload ? (payload as { query?: { pages?: Record<string, { imageinfo?: unknown[] }> } }).query?.pages : undefined;
  const info = pages ? Object.values(pages)[0]?.imageinfo?.[0] as { thumburl?: unknown; descriptionurl?: unknown; extmetadata?: Record<string, { value?: unknown }> } | undefined : undefined;
  // Wikimedia serves resized copies from upload.wikimedia.org or thumb.wikimedia.org; nothing else is accepted.
  if (!info || typeof info.thumburl !== 'string' || !/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(info.thumburl)) return null;
  const license = stripTags(info.extmetadata?.['LicenseShortName']?.value);
  if (!FREE_LICENSE.test(license)) return null;
  const licenseUrl = stripTags(info.extmetadata?.['LicenseUrl']?.value);
  return {
    name,
    imageUrl: info.thumburl,
    author: stripTags(info.extmetadata?.['Artist']?.value).slice(0, 80) || 'Unknown photographer',
    license,
    licenseUrl: licenseUrl.startsWith('https://') ? licenseUrl : null,
    sourceUrl: typeof info.descriptionurl === 'string' ? info.descriptionurl : 'https://commons.wikimedia.org/',
  };
}
