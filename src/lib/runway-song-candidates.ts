import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().min(1).max(max).nullable();
const candidateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().min(1).max(200),
  category: z.enum(['A', 'B', 'C', 'D']),
  show_name: optionalText(200),
  show_season: optionalText(100),
  evidence_summary: z.string().trim().min(20).max(600),
  source_url: z.string().url().max(2000).refine(url => url.startsWith('https://')),
  source_title: optionalText(300),
  // Checked against the citations after parsing, so a bad guess costs the link, not the candidate.
  spotify_url: z.string().max(2000).nullable().optional(),
  creative_director: optionalText(200).optional(),
  sound_director: optionalText(200).optional(),
  notes: optionalText(400).optional(),
}).strict();

export type RunwaySongCandidate = Omit<z.infer<typeof candidateSchema>, 'spotify_url'> & { spotify_url: string | null };
export type CitedSource = { url: string; title?: string | null };
export type GroundingSupport = { text: string; chunks: number[] };

// Share and campaign parameters; anything else (YouTube's v, say) names the page.
const trackingParam = /^(utm_.*|si|fbclid|gclid|igshid|ref_src)$/;

/** Host without www, path without trailing slash, and the query minus tracking, so one page reads the same however it was linked. */
export const canonicalUrl = (value: string) => {
  try {
    const url = new URL(value);
    const query = new URLSearchParams([...url.searchParams].filter(([key]) => !trackingParam.test(key)).sort(([a], [b]) => a.localeCompare(b))).toString();
    return `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/+$/, '')}${query ? `?${query}` : ''}`;
  } catch { return null; }
};

/** The canonical https://open.spotify.com/track/{id} link, or null for anything that isn't exactly a Spotify track link. */
export function spotifyTrackUrl(value: string | null | undefined) {
  const id = value?.trim().match(/^https:\/\/open\.spotify\.com\/track\/([A-Za-z0-9]{22})(?:\?[^#\s]*)?$/)?.[1];
  return id ? `https://open.spotify.com/track/${id}` : null;
}

/**
 * Keeps up to five unique candidates whose source_url is one of the pages Google Search cited, stored as that cited page.
 * A Spotify link survives only when it is a track link that was itself cited; otherwise it becomes null.
 */
export function readRunwaySongCandidates(payload: unknown, sources: CitedSource[]): RunwaySongCandidate[] {
  const cited = new Map(sources.flatMap(source => {
    const key = canonicalUrl(source.url);
    return key && source.url.startsWith('https://') ? [[key, source.url] as const] : [];
  }));
  const citedTracks = new Set(sources.map(source => spotifyTrackUrl(source.url)).filter(Boolean));
  const raw = payload && typeof payload === 'object' && 'candidates' in payload && Array.isArray(payload.candidates)
    ? payload.candidates : [];
  const seen = new Set<string>();
  const accepted: RunwaySongCandidate[] = [];

  for (const value of raw) {
    const parsed = candidateSchema.safeParse(value);
    const sourceUrl = parsed.success ? cited.get(canonicalUrl(parsed.data.source_url) ?? '') : undefined;
    if (!parsed.success || !sourceUrl) continue;
    const key = `${parsed.data.title.toLowerCase()}\n${parsed.data.artist.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const spotify = spotifyTrackUrl(parsed.data.spotify_url);
    accepted.push({ ...parsed.data, source_url: sourceUrl, spotify_url: spotify && citedTracks.has(spotify) ? spotify : null });
    if (accepted.length === 5) break;
  }
  return accepted;
}

const titleWords = (value: string) => value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/&/g, ' and ').replace(/[^a-z0-9*]+/g, ' ').trim();
// Spotify puts the version after " - " or in brackets: "Sin Thetik - Ambient Version", "Song (feat. Someone)".
const splitTitle = (title: string): [string, string] => {
  const match = title.match(/^(.*?)(?:\s+-\s+|\s*[([])(.*)$/);
  return match ? [match[1]!, match[2]!] : [title, ''];
};
// An asterisk stands in for a censored letter: "Work B**ch" is "Work Bitch".
const sameWords = (a: string, b: string) => a.length === b.length && [...a].every((letter, k) => letter === b[k] || letter === '*' || b[k] === '*');
// Version words that don't make a different recording; anything else (Ambient, Live, a remixer) has to appear on both sides.
const plainVersion = /^(remaster|remastered|\d{4}|mono|stereo|version|mix|original|single|album|edit|radio|explicit|clean|digital)$/;
const distinctVersion = (version: string) => titleWords(version.replace(/\b(feat|ft|featuring|with)\b.*$/i, ''))
  .split(' ').filter(word => word && !plainVersion.test(word));

/**
 * Whether Spotify's track title names the candidate's recording: the same song title, and no version on either side the other lacks.
 * A version the candidate's show names counts as named (a "Prada SS21 Version" for a Prada SS21 show).
 */
export function sameRecording(candidate: Pick<RunwaySongCandidate, 'title' | 'show_name' | 'show_season'>, spotifyTitle: string) {
  const [ourTitle, ourVersion] = splitTitle(candidate.title);
  const [theirTitle, theirVersion] = splitTitle(spotifyTitle);
  if (!sameWords(titleWords(ourTitle), titleWords(theirTitle))) return false;
  const ours = new Set(titleWords(`${candidate.title} ${candidate.show_name ?? ''} ${candidate.show_season ?? ''}`).split(' '));
  const theirs = new Set(titleWords(spotifyTitle).split(' '));
  return distinctVersion(theirVersion).every(word => ours.has(word)) && distinctVersion(ourVersion).every(word => theirs.has(word));
}

/** The track's title from Spotify's public oEmbed endpoint (no key needed), or null when Spotify doesn't know the link. */
export async function spotifyTrackTitle(url: string, fetcher: typeof fetch = fetch): Promise<string | null> {
  try {
    const response = await fetcher(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return body && typeof body === 'object' && 'title' in body && typeof body.title === 'string' ? body.title : null;
  } catch { return null; }
}

/**
 * Google labels a cited Spotify page only "spotify.com", so Gemini can pin the wrong track on a song.
 * Keeps a Spotify link only when Spotify's own title for it is the candidate's recording.
 */
export async function withCheckedSpotify(candidates: RunwaySongCandidate[], fetcher: typeof fetch = fetch) {
  return Promise.all(candidates.map(async candidate => {
    if (!candidate.spotify_url) return candidate;
    const title = await spotifyTrackTitle(candidate.spotify_url, fetcher);
    return title && sameRecording(candidate, title) ? candidate : { ...candidate, spotify_url: null };
  }));
}

export function parseRunwaySongCandidateJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

const groundingSchema = z.object({
  groundingChunks: z.array(z.object({ web: z.object({ uri: z.string(), title: z.string().nullish() }).nullish() })).nullish(),
  groundingSupports: z.array(z.object({
    segment: z.object({ text: z.string().nullish() }).nullish(),
    groundingChunkIndices: z.array(z.number().int().nonnegative()).nullish(),
  })).nullish(),
});

/** Gemini's grounding metadata: web chunks by index (null where a chunk isn't a web page) and the report text each supports. */
export function readGrounding(metadata: unknown): { chunks: (CitedSource | null)[]; supports: GroundingSupport[] } {
  const parsed = groundingSchema.safeParse(metadata);
  if (!parsed.success) return { chunks: [], supports: [] };
  return {
    chunks: (parsed.data.groundingChunks ?? []).map(chunk => chunk.web ? { url: chunk.web.uri, title: chunk.web.title ?? null } : null),
    supports: (parsed.data.groundingSupports ?? []).flatMap(support => support.segment?.text && support.groundingChunkIndices?.length
      ? [{ text: support.segment.text, chunks: support.groundingChunkIndices }] : []),
  };
}

const isGroundingRedirect = (value: string) => {
  try {
    const url = new URL(value);
    return url.hostname === 'vertexaisearch.cloud.google.com' && url.pathname.startsWith('/grounding-api-redirect/');
  } catch { return false; }
};

/**
 * Google cites pages through grounding-api-redirect links; this reads where one points without fetching the page.
 * Other links come back as they are; a redirect that doesn't lead to an http(s) page comes back null.
 */
export async function resolveGroundingUrl(value: string, fetcher: typeof fetch = fetch): Promise<string | null> {
  if (!isGroundingRedirect(value)) return value;
  try {
    const response = await fetcher(value, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(5_000) });
    const location = response.status >= 300 && response.status < 400 ? response.headers.get('location') : null;
    return location && /^https?:\/\//.test(location) ? location : null;
  } catch { return null; }
}

/** The report with a [n] marker after each passage Google says chunk n-1 supports, skipping chunks that didn't resolve. */
export function citedReport(text: string, supports: GroundingSupport[], resolved: (string | null)[]) {
  const marks = new Map<number, Set<number>>();
  let cursor = 0;
  for (const support of supports) {
    let at = text.indexOf(support.text, cursor);
    if (at < 0) at = text.indexOf(support.text);
    if (at < 0) continue;
    cursor = at + support.text.length;
    const numbers = marks.get(cursor) ?? new Set<number>();
    for (const chunk of support.chunks) if (resolved[chunk]) numbers.add(chunk + 1);
    if (numbers.size) marks.set(cursor, numbers);
  }
  let report = text;
  for (const [end, numbers] of [...marks].sort(([a], [b]) => b - a)) {
    report = `${report.slice(0, end)} ${[...numbers].sort((a, b) => a - b).map(n => `[${n}]`).join('')}${report.slice(end)}`;
  }
  return report;
}

// Asked for as prose, not JSON: Gemini searches and grounds each passage for prose, but tends to answer a JSON request from memory with no citations.
export const runwaySongResearchPrompt = (designer: string) => `Use Google Search to research songs played at ${JSON.stringify(designer)} runway shows. Find up to five songs from different shows and eras.
Search Vogue Runway show reviews, the house's official show notes, official show playlists, official runway videos (whose title, description or credits name the track), reputable music and fashion publications, and soundtrack specialists. Also search for each song's Spotify track page (open.spotify.com/track/...).
A song counts only when a source connects that named song or recording to a specific ${JSON.stringify(designer)} show. Do not infer a track from unidentified audio, visual mood, or brand identity. A community source (a forum or fan thread) counts only for manual review, and only when it names both the song and the show; say when it is the only source.
For each song give the title, artist, show and season, the creative director and the sound director or music supervisor when reported, any production context, and what the source states.`;

/** Turns the cited research report into JSON whose links can only come from the numbered sources. */
export const runwaySongScoutPrompt = (designer: string, report: string, sources: { number: number; url: string }[]) => `Below is a research report on songs used in ${JSON.stringify(designer)} runway shows. Each [n] marks a passage supported by numbered source n.
Convert it to JSON. Use only songs, facts and links in the report and the source list; add nothing from memory.
source_url must be copied exactly from the source list, from the sources cited [n] on that song's passages. Prefer the page that names both the song and the show: an editorial review, official show notes, an official show playlist, or an official runway video.
spotify_url must be copied from the source list only when it is an open.spotify.com/track/ link for that exact recording; otherwise null. Never construct a Spotify link.
Classify each song into one radio energy: A = Industrial, B = Electro-pulse, C = Post-punk, D = Spatial.
Every result will enter a pending editorial review queue; do not determine approval status. In notes, say when the only evidence is a community source (manual review only).
Return only JSON: {"candidates":[{"title":"...","artist":"...","category":"A, B, C, or D","show_name":"... or null","show_season":"... or null","evidence_summary":"one sentence describing exactly what the source establishes","source_url":"https://...","source_title":"... or null","spotify_url":"https://open.spotify.com/track/... or null","creative_director":"... or null","sound_director":"... or null","notes":"production or evidence context, or null"}]}.
Return {"candidates":[]} when the report has no qualifying song.

Report:
${report}

Sources:
${sources.map(source => `[${source.number}] ${source.url}`).join('\n')}`;
