// @vitest-environment node
// Spotify Developer Policy: Spotify Platform data and Spotify Content may not be used to train, or be ingested
// into, an AI/ML model. This test fails if any module on the AI styling path (the prompt builder, the server
// function, the client that assembles the request, and the style system that feeds it) imports a Spotify
// module or calls a Spotify endpoint that returns data. Songs reach the AI only as catalog entries.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { aiStylePayload, aiStyleInputSchema } from '../ai-style';

const root = resolve(__dirname, '../../..');
const AI_ENTRIES = [
  'src/lib/ai-style.ts', 'src/lib/ai-style.functions.ts', 'src/lib/ai/read-json.server.ts',
  'src/components/AIArtistStyle.tsx',
  'src/lib/themes/theme-spec.ts', 'src/lib/themes/style-choice.ts', 'src/lib/themes/style-evidence.ts', 'src/lib/themes/readiness.ts',
];
// Endpoints that return Spotify data. An outbound "search on Spotify" link for readers (song-recommendations.ts)
// reads nothing and never reaches a model, so open.spotify.com/search is allowed.
const DATA_ENDPOINTS = ['api.spotify.com', 'accounts.spotify.com', 'sdk.scdn.co', 'open.spotify.com/oembed', 'open.spotify.com/embed', 'open.spotify.com/get_access_token'];

function resolveImport(from: string, spec: string) {
  const base = spec.startsWith('@/') ? join(root, 'src', spec.slice(2)) : spec.startsWith('.') ? resolve(dirname(from), spec) : null;
  if (!base) return null;
  return [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')].find(file => existsSync(file) && /\.tsx?$/.test(file)) ?? null;
}

function importGraph(entries: string[]) {
  const seen = new Set<string>();
  const queue = entries.map(entry => join(root, entry));
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const match of readFileSync(file, 'utf8').matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g)) {
      const next = resolveImport(file, match[1]!);
      if (next && !seen.has(next)) queue.push(next);
    }
  }
  return [...seen].map(file => relative(root, file));
}

describe('no Spotify data on the AI styling path', () => {
  const graph = importGraph(AI_ENTRIES);

  it('walks the real graph', () => {
    expect(graph).toEqual(expect.arrayContaining(['src/lib/song-recommendations.ts', 'src/lib/freqblog.functions.ts', 'src/lib/melodylust-evidence.ts']));
  });

  it('imports no Spotify module (no Spotify response types or clients)', () => {
    expect(graph.filter(file => /spotify/i.test(file))).toEqual([]);
  });

  it('calls no Spotify data endpoint', () => {
    expect(graph.filter(file => DATA_ENDPOINTS.some(endpoint => readFileSync(join(root, file), 'utf8').includes(endpoint)))).toEqual([]);
  });

  it('sends song titles and theme constraints only: no Spotify links or IDs in the payload', () => {
    const payload = aiStylePayload(aiStyleInputSchema.parse({ artist: 'Usher', songs: ['Yeah!'], style: 'hiphop-runway' }));
    expect(JSON.stringify(payload)).not.toMatch(/spotify|scdn\.co/i);
  });
});
