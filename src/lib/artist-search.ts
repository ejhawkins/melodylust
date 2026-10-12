// Artist search and submission rules, shared by the browser and the server. Pure and
// credential-free so every rule is unit-tested. Finding an artist establishes directory identity. Fashion evidence stays separate;
// the outfit ranker uses only server-resolved metadata and labels its editorial choices.

import { z } from 'zod';

/** Where a suggestion came from. `mock` is sample data for development only. */
export type ArtistSource = 'melodylust' | 'freqblog' | 'mock';

export type ArtistSuggestion = {
  /** Stable ID to store: a MelodyLust UUID, or `<source>:<provider identifier>` for external records. */
  id: string;
  name: string;
  source: ArtistSource;
  /** The provider's own identifier, kept verbatim (FreqBlog identifies artists by name). */
  sourceId: string | null;
  /** Details that tell same-name artists apart. */
  disambiguation: string | null;
  genres: string[];
  imageUrl: string | null;
  /** How an external record was obtained, kept with it when stored (text and lists of text only). */
  provenance: Record<string, string | string[]> | null;
};

export type SelectedArtist = Pick<ArtistSuggestion, 'id' | 'name' | 'source'>;

export type ProviderStatus = 'ok' | 'unavailable' | 'not_configured' | 'mock';
export type ArtistSearchResponse =
  | { status: 'ok'; results: ArtistSuggestion[]; database: 'ok' | 'unavailable'; provider: ProviderStatus }
  | { status: 'rate_limited' | 'error'; results: []; database: 'ok' | 'unavailable'; provider: ProviderStatus };

export const MIN_QUERY_LENGTH = 2;
export const MAX_SUGGESTIONS = 8;

/** "Beyoncé", "BEYONCE " and "beyoncé" all become "beyonce"; "&" and "and" match. */
export function normalizeArtistName(name: string) {
  return name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
}

export const artistQuerySchema = z.object({ query: z.string().trim().min(MIN_QUERY_LENGTH).max(80) }).strict();

/** Escapes LIKE wildcards so a query of "100%" is matched literally. */
export const escapeLike = (text: string) => text.replace(/[\\%_]/g, character => `\\${character}`);

/** Database matches first (prefix matches before mid-name), then provider results not already shown. */
export function mergeSuggestions(query: string, database: ArtistSuggestion[], provider: ArtistSuggestion[], limit = MAX_SUGGESTIONS) {
  const wanted = normalizeArtistName(query);
  const rank = (suggestion: ArtistSuggestion) => (normalizeArtistName(suggestion.name).startsWith(wanted) ? 0 : 1);
  const ordered = [...database].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  // The approved database is authoritative: a provider record with the same name as an
  // approved artist is left out so readers aren't offered the same artist twice.
  const approvedNames = new Set(database.map(suggestion => normalizeArtistName(suggestion.name)));
  const seen = new Set<string>();
  for (const suggestion of provider) {
    const key = `${suggestion.source}:${suggestion.id}`;
    if (approvedNames.has(normalizeArtistName(suggestion.name)) || seen.has(key)) continue;
    seen.add(key);
    ordered.push(suggestion);
  }
  return ordered.slice(0, limit);
}

// ── Submissions ────────────────────────────────────────────────────────────────

const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|\d{1,3}(\.\d{1,3}){3}|\[.*\])$/i;

/** An official profile must be a public https:// page; returns its host, or a reason it isn't usable. */
export function checkProfileUrl(value: string): { ok: true; url: string; host: string } | { ok: false; reason: string } {
  let url: URL;
  try { url = new URL(value.trim()); } catch { return { ok: false, reason: 'Enter a full link, starting with https://' }; }
  if (url.protocol !== 'https:') return { ok: false, reason: 'Use a secure link that starts with https://' };
  if (url.username || url.password || PRIVATE_HOST.test(url.hostname) || !url.hostname.includes('.')) return { ok: false, reason: 'Use a public link to the artist’s official profile' };
  url.hash = '';
  return { ok: true, url: url.toString(), host: url.hostname.replace(/^www\./, '').toLowerCase() };
}

/** Fields the form sends. `website` is a hidden honeypot; `startedAt` is when the form opened. */
export const submissionInputSchema = z.object({
  name: z.string().trim().min(1, 'Enter the artist’s name').max(120, 'Keep the name under 120 characters'),
  profileUrl: z.string().trim().min(1, 'Add a link to an official artist or music profile').max(500),
  note: z.string().trim().max(500, 'Keep the note under 500 characters').optional().default(''),
  website: z.string().max(200).optional().default(''),
  startedAt: z.number().int().nonnegative(),
}).strict();
export type SubmissionInput = z.input<typeof submissionInputSchema>;

export const MIN_FILL_MS = 2_500;

/** Basic spam signals: the honeypot was filled, the form was sent faster than a person types,
 *  or the text is link-stuffed. Spam gets a normal-looking reply and is not saved. */
export function looksLikeSpam(input: z.output<typeof submissionInputSchema>, now: number) {
  const elapsed = now - input.startedAt;
  const links = (input.note.match(/https?:\/\//g) ?? []).length;
  return Boolean(input.website) || elapsed < MIN_FILL_MS || elapsed > 24 * 60 * 60 * 1000 || links > 2 || /https?:\/\//.test(input.name);
}

export type SubmissionResponse =
  | { status: 'created' }
  | { status: 'duplicate_artist'; name: string }
  | { status: 'duplicate_pending' }
  | { status: 'invalid'; field: 'name' | 'profileUrl' | 'note'; message: string }
  | { status: 'rate_limited' | 'unavailable' | 'error' };
