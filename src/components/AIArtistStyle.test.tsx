import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { AIArtistStyle } from './AIArtistStyle';
import { recommendArtistLooks } from '@/lib/artist-style';
import type { EvidenceDocument } from '@/lib/melodylust-evidence';
import { emptyStyleProfile } from '@/lib/style-profile';
import { STYLE_STORAGE_KEY } from '@/lib/themes/style-choice';

const mocks = vi.hoisted(() => ({ style: vi.fn() }));
vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock('@/lib/ai-style.functions', () => ({ styleArtistWithAI: mocks.style }));
vi.mock('@/lib/freqblog.functions', () => ({ lookupArtistSongs: vi.fn(async () => ({ songs: [{ title: 'Yeah!' }], status: 'ok' })) }));
vi.mock('@/lib/scout.functions', () => ({ scoutArtistArticles: vi.fn(async () => ({ status: 'ok', articles: [], searched: false })) }));
vi.mock('@/lib/products.functions', () => ({ lookupProducts: vi.fn(async () => ({ status: 'ok', products: [] })) }));

const doc = (id: string): EvidenceDocument => ({ id, url: `https://harpersbazaar.com/${id}`, publication: "Harper's Bazaar", published_at: '2025-05-05', title: `Usher article ${id}`, summary: 'Usher wore a black three-piece suit.', categories: [], entity_ids: [] });
const articles = [doc('1'), doc('2')];
const recommendation = recommendArtistLooks({ id: 'usher', name: 'Usher', source: 'melodylust', genres: ['r&b'] }, articles);

beforeEach(() => { localStorage.clear(); history.replaceState(null, '', '/'); });
afterEach(() => { cleanup(); vi.unstubAllEnvs(); mocks.style.mockReset(); });

it('sends the chosen style as an id and only the articles that meet its evidence minimum', async () => {
  vi.stubEnv('VITE_ENABLE_AI_STYLE_PERSONALIZATION', 'true');
  localStorage.setItem(STYLE_STORAGE_KEY, 'hiphop-runway');
  mocks.style.mockResolvedValue({ status: 'unavailable', suggestions: [], provider: 'gemini' });
  const strengths = new Map([['2', 'quoted' as const]]);
  render(<AIArtistStyle recommendation={recommendation} articles={articles} profile={emptyStyleProfile()} strengths={strengths} />);
  await waitFor(() => expect(mocks.style).toHaveBeenCalled());
  const sent = mocks.style.mock.calls[0]![0].data;
  expect(sent.style).toBe('hiphop-runway');
  expect(sent.articles.map((a: { id: string }) => a.id)).toEqual(['2']); // article 1 is contextual only
  expect(JSON.stringify(sent)).not.toMatch(/tone|garmentKeywords|catalogKey/); // constraints are added on the server
});

it('falls back to the rule-based outfit when AI is unavailable, with any style', async () => {
  vi.stubEnv('VITE_ENABLE_AI_STYLE_PERSONALIZATION', 'true');
  localStorage.setItem(STYLE_STORAGE_KEY, 'autumn-tartan');
  mocks.style.mockResolvedValue({ status: 'unavailable', suggestions: [], provider: '' });
  render(<AIArtistStyle recommendation={recommendation} articles={articles} profile={emptyStyleProfile()} />);
  await waitFor(() => expect(mocks.style).toHaveBeenCalled());
  await waitFor(() => expect(screen.queryByText(/Refining styling ideas/)).toBeNull());
  expect(screen.getByLabelText('Outfit ideas for Usher')).toBeInTheDocument(); // ArtistOutfitResult
});

it('sends no style when personalization is off', async () => {
  localStorage.setItem(STYLE_STORAGE_KEY, 'hiphop-runway');
  mocks.style.mockResolvedValue({ status: 'not_configured', suggestions: [], provider: '' });
  render(<AIArtistStyle recommendation={recommendation} articles={articles} profile={emptyStyleProfile()} />);
  await waitFor(() => expect(mocks.style).toHaveBeenCalled());
  expect(mocks.style.mock.calls[0]![0].data.style).toBeUndefined();
  expect(mocks.style.mock.calls[0]![0].data.articles).toHaveLength(2);
});
