// Article scout: OpenAI's web search proposes tracker rows; this module decides which
// proposals are safe to put in front of an editor. Self-contained (zod only) so the
// scout script can run it with plain Node.
//
// Rules: a candidate's URL must be one the search actually cited (never a URL the model
// typed itself), on an allowed publication, not already tracked, with an ISO date and a
// short original summary that names the artist.

import { z } from 'zod';

/** Hearst-owned titles first, then the international editions already in the tracker. */
export const SCOUT_DOMAINS = [
  'elle.com', 'harpersbazaar.com', 'esquire.com', 'cosmopolitan.com', 'townandcountrymag.com', 'seventeen.com',
  'elle.in', 'esquiresg.com', 'harpersbazaar.mx', 'harpersbazaar.com.sg',
] as const;

export const scoutPrompt = (artist: string, limit: number) => `Find up to ${limit} fashion articles about the musician ${JSON.stringify(artist)} that name a fashion designer or brand they wore, collaborated with or were styled in. Use web search. Prefer articles that name the designer in the headline or first paragraph.
Return only JSON, no code fences: {"articles":[{"url":"...","publication":"...","published_at":"YYYY-MM-DD","title":"...","summary":"...","categories":["..."]}]}.
url: the exact address of a page you found through search. title: the article's real headline. published_at: its publication date. summary: one or two sentences in your own words (no quotes longer than ten words) that name ${JSON.stringify(artist)} and each designer or brand exactly as the article spells them, and say what was worn or done. categories: one to three of Fashion, Celebrity Style, Red Carpet, Menswear, Music, Festivals, Campaigns, Trends.
Only include articles you found; never guess an address, date or detail. Return {"articles":[]} if none qualify.`;

const candidateSchema = z.object({
  url: z.string().trim().url(),
  publication: z.string().trim().min(1).max(120),
  published_at: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => Number.isFinite(Date.parse(value))),
  title: z.string().trim().min(1).max(300),
  summary: z.string().trim().min(20).max(600),
  categories: z.array(z.string().trim().min(1).max(40)).max(3).default([]),
});
export type ScoutCandidate = z.infer<typeof candidateSchema>;
export type ScoutRejection = { url: string; reason: string };

/** Same page however it was linked: https, no www, no query/fragment, no trailing slash. */
export function canonicalUrl(value: string) {
  try {
    const url = new URL(value);
    return `https://${url.hostname.toLowerCase().replace(/^www\./, '')}${url.pathname.replace(/\/+$/, '')}`;
  } catch { return null; }
}

const allowedHost = (url: string) => {
  const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  return SCOUT_DOMAINS.some(domain => host === domain || host.endsWith(`.${domain}`));
};

/** The model's JSON + the search's citations → candidates fit for review, and why the rest were dropped. */
export function readScoutCandidates(payload: unknown, citedUrls: string[], trackedUrls: string[], artist: string) {
  const cited = new Set(citedUrls.map(canonicalUrl).filter(Boolean));
  const seen = new Set(trackedUrls.map(canonicalUrl).filter(Boolean));
  const raw = payload && typeof payload === 'object' && 'articles' in payload && Array.isArray(payload.articles) ? payload.articles : [];
  const accepted: ScoutCandidate[] = [];
  const rejected: ScoutRejection[] = [];
  for (const item of raw) {
    const url = item && typeof item === 'object' && 'url' in item && typeof item.url === 'string' ? item.url : '(no url)';
    const parsed = candidateSchema.safeParse(item && typeof item === 'object' && 'summary' in item && typeof item.summary === 'string' ? { ...item, summary: stripCitations(item.summary) } : item);
    if (!parsed.success) { rejected.push({ url, reason: `incomplete: ${parsed.error.issues[0]?.path.join('.') || 'shape'}` }); continue; }
    const candidate = parsed.data;
    const key = canonicalUrl(candidate.url);
    if (!key || !allowedHost(candidate.url)) { rejected.push({ url, reason: 'not an allowed publication' }); continue; }
    if (!cited.has(key)) { rejected.push({ url, reason: 'not a cited search result' }); continue; }
    if (seen.has(key)) { rejected.push({ url, reason: 'already tracked or duplicate' }); continue; }
    if (!candidate.summary.toLowerCase().includes(artist.trim().toLowerCase())) { rejected.push({ url, reason: `summary does not name ${artist}` }); continue; }
    seen.add(key);
    accepted.push({ ...candidate, url: key });
  }
  return { accepted, rejected };
}

/** Web search answers append citations like "([elle.com](https://…))"; the tracker keeps plain prose. */
export const stripCitations = (text: string) => text
  .replace(/\s*\(\[[^\]]*\]\([^)]*\)\)/g, '')
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/\s{2,}/g, ' ')
  .trim();

/** Tolerates a model that wraps its JSON in prose or code fences. */
export function parseScoutJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}
