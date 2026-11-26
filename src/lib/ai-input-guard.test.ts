// @vitest-environment node
// Spotify Developer Policy: no Spotify Platform data or Spotify Content may be ingested into an AI/ML model.
// Two checks: (1) statically, no module on the embedding or stylist paths imports a Spotify module or calls a
// Spotify host; (2) at runtime, Spotify links and URIs are refused before an embedding call or a prompt.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { aiStyleInputSchema } from './ai-style';
import { assertNoSpotifyContent, findSpotifyContent, SpotifyContentError } from './ai-input-guard';
import { retrieveApprovedArticles, withRetrieval } from './article-retrieval';
import { EMBEDDING_DIMENSIONS } from './article-rag';

const root = resolve(__dirname, '../..');
/** Every file that builds, embeds or sends AI input. */
const AI_ENTRIES = [
  'src/lib/ai-style.ts', 'src/lib/ai-style.functions.ts', 'src/components/AIArtistStyle.tsx',
  'src/lib/article-rag.ts', 'src/lib/article-retrieval.ts', 'src/lib/article-retrieval.server.ts',
  'src/lib/ai/embeddings.server.ts', 'src/lib/ai/read-json.server.ts', 'scripts/embed-articles.ts',
];

function resolveImport(from: string, spec: string): string | null {
  const base = spec.startsWith('@/') ? join(root, 'src', spec.slice(2)) : spec.startsWith('.') ? resolve(dirname(from), spec) : null;
  if (!base) return null; // a package
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]) {
    if (existsSync(candidate) && /\.tsx?$/.test(candidate)) return candidate;
  }
  return null;
}

/** The project files reachable from the entries through static and dynamic imports. */
function importGraph(entries: string[]) {
  const seen = new Set<string>();
  const queue = entries.map(entry => join(root, entry));
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g)) {
      const next = resolveImport(file, match[1]!);
      if (next && !seen.has(next)) queue.push(next);
    }
  }
  return [...seen].map(file => relative(root, file));
}

describe('no Spotify data reaches the embedding or stylist code paths', () => {
  const graph = importGraph(AI_ENTRIES);

  it('walks the real graph', () => {
    expect(graph).toEqual(expect.arrayContaining(['src/lib/ai-input-guard.ts', 'src/lib/freqblog.functions.ts', 'src/lib/db.server.ts']));
  });

  it('imports no Spotify module', () => {
    expect(graph.filter(file => /spotify/i.test(file))).toEqual([]);
  });

  it('reads nothing from Spotify', () => {
    // Endpoints that return Spotify data. Building an outbound "search on Spotify" link for the reader to click
    // (freqblog.ts, song-recommendations.ts) reads nothing, and the link itself never reaches a model (next test).
    const readers = ['api.spotify.com', 'accounts.spotify.com', 'sdk.scdn.co', 'open.spotify.com/oembed', 'open.spotify.com/embed', 'open.spotify.com/get_access_token'];
    const offenders = graph.filter(file => readers.some(host => readFileSync(join(root, file), 'utf8').includes(host)));
    expect(offenders).toEqual([]);
  });

  it('sends the stylist FreqBlog song titles only, never their Spotify links', () => {
    const client = readFileSync(join(root, 'src/components/AIArtistStyle.tsx'), 'utf8');
    expect(client).toMatch(/r\.songs\.map\(s => s\.title\)/);
    expect(client).not.toMatch(/spotifyUrl/);
  });
});

describe('the runtime guard', () => {
  it('finds Spotify links, URIs and artwork anywhere in a payload', () => {
    expect(findSpotifyContent({ songs: ['Just a Girl'] })).toBeNull();
    expect(findSpotifyContent({ a: [{ b: 'see https://open.spotify.com/track/0123456789abcdefghijkl' }] })).toContain('open.spotify');
    expect(findSpotifyContent(['spotify:track:0123456789abcdefghijkl'])).not.toBeNull();
    expect(findSpotifyContent('https://i.scdn.co/image/ab67616d')).not.toBeNull();
    // Mentioning the service in prose is fine; only its data is refused.
    expect(findSpotifyContent('She topped the Spotify charts in a plaid jumpsuit.')).toBeNull();
  });

  it('refuses a stylist request carrying Spotify data', () => {
    const input = aiStyleInputSchema.parse({ artist: 'Gwen Stefani', songs: ['https://open.spotify.com/track/0123456789abcdefghijkl'] });
    expect(() => withRetrieval(input, { status: 'off', articles: [], chunkIds: [] })).toThrow(SpotifyContentError);
    expect(() => assertNoSpotifyContent({ title: 'ok' }, 'test')).not.toThrow();
  });

  it('never embeds a Spotify-sourced query', async () => {
    const embedQuery = vi.fn(async () => Array<number>(EMBEDDING_DIMENSIONS).fill(0.1));
    const retrieval = await retrieveApprovedArticles('spotify:track:0123456789abcdefghijkl', { embedQuery, matchChunks: async () => [] });
    expect(retrieval.status).toBe('fallback');
    expect(embedQuery).not.toHaveBeenCalled();
  });
});
