import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MelodyLustEvidence } from './MelodyLustEvidence';
import type { ArtistSearchResponse } from '@/lib/artist-search';
import { recommendArtistLooks } from '@/lib/artist-style';
import { emptyStyleProfile } from '@/lib/style-profile';
const mocks = vi.hoisted(() => ({ search: vi.fn(), artists: vi.fn<() => Promise<ArtistSearchResponse>>(async () => ({ status: 'ok', results: [], provider: 'ok', database: 'ok' })) }));
vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock('@/lib/artists.functions', () => ({ searchArtists: mocks.artists }));
vi.mock('@/lib/melodylust.functions', () => ({ searchTrackedEditorialEvidence: mocks.search }));
vi.mock('@/lib/freqblog.functions', () => ({ lookupTrackDetails: vi.fn(), lookupArtistSongs: vi.fn(async () => ({ songs: [], status: 'ok' })) }));
vi.mock('@/lib/album-cover.functions', () => ({ lookupAlbumCover: vi.fn() }));
vi.mock('@/lib/style-look.functions', () => ({ styleLook: vi.fn() }));
vi.mock('@/lib/products.functions', () => ({ lookupProducts: vi.fn() }));
vi.mock('@/lib/ai-style.functions', () => ({ styleArtistWithAI: vi.fn(async () => ({ status: 'not_configured', suggestions: [], provider: '' })) }));
vi.mock('@/lib/scout.functions', () => ({ scoutArtistArticles: vi.fn(async () => ({ status: 'ok', articles: [], searched: false })) }));
afterEach(cleanup);
it('shows a clear empty result for Bruno Mars with a way to search again', async () => {
  mocks.search.mockResolvedValue({ result: { intent: { music_name: 'Bruno Mars', music_kind: 'artist', designer_name: null }, music: null, missingDesigner: false, associations: [] }, articles: [], error: '' });
  render(<MelodyLustEvidence profile={emptyStyleProfile()} />);
  fireEvent.change(screen.getByLabelText(/Music &/), { target: { value: 'Bruno Mars' } });
  fireEvent.submit(screen.getByRole('search'));
  expect(await screen.findByRole('heading', { name: 'No fashion matches for Bruno Mars yet.' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try another search' }));
  expect(screen.getByLabelText(/Music &/)).toHaveFocus();
  expect(mocks.search).toHaveBeenCalledTimes(1);
});

it('selects an artist suggestion without submitting until the next Enter or click', async () => {
  mocks.search.mockClear();
  mocks.artists.mockResolvedValueOnce({ status: 'ok', results: [{ id: 'freqblog:Bruno', name: 'Bruno Mars', source: 'freqblog', genres: ['Pop'], disambiguation: 'Sample track', imageUrl: null, sourceId: 'Bruno Mars', provenance: null }], provider: 'ok', database: 'ok' });
  const { container } = render(<MelodyLustEvidence profile={emptyStyleProfile()} />);
  const input = screen.getByRole('combobox');
  fireEvent.change(input, { target: { value: 'bru' } });
  await screen.findByRole('option');
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(input).toHaveValue('Bruno Mars');
  expect(container.querySelector('input[name=artist_id]')).toHaveValue('freqblog:Bruno');
  expect(mocks.search).not.toHaveBeenCalled();
  fireEvent.submit(screen.getByRole('search'));
  await waitFor(() => expect(mocks.search).toHaveBeenCalledWith({ data: { query: 'Bruno Mars', artist: { id: 'freqblog:Bruno', name: 'Bruno Mars', source: 'freqblog' }, profile: emptyStyleProfile() } }));
  await waitFor(() => expect(input).toBeEnabled());
  fireEvent.change(input, { target: { value: 'funk' } });
  expect(container.querySelector('input[name=artist_id]')).toHaveValue('');
});

it('renders an outfit without fashion articles and clears it for the next artist', async () => {
  const recommendation = recommendArtistLooks({ id: 'freqblog:test', name: 'Test Artist', source: 'freqblog', genres: ['Rock'] }, []);
  mocks.search.mockResolvedValue({ result: { intent: { music_name: 'Test Artist', music_kind: 'artist', designer_name: null }, music: null, missingDesigner: false, associations: [] }, recommendation, articles: [], error: '', warning: '' });
  render(<MelodyLustEvidence profile={emptyStyleProfile()} />);
  const input = screen.getByRole('combobox');
  fireEvent.change(input, { target: { value: 'Test Artist' } });
  fireEvent.submit(screen.getByRole('search'));
  expect(await screen.findByRole('region', { name: 'Outfit ideas for Test Artist' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Texture and edge' })).toBeInTheDocument();
  expect(screen.getByText(/No approved articles about Test Artist in Melody Lust’s collection yet/).compareDocumentPosition(screen.getByRole('region', { name: 'Outfit ideas for Test Artist' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.queryByRole('heading', { name: /No fashion matches/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Another outfit' }));
  expect(screen.queryByRole('heading', { name: 'Texture and edge' })).not.toBeInTheDocument();
  fireEvent.change(input, { target: { value: 'A different artist' } });
  expect(screen.queryByRole('region', { name: 'Outfit ideas for Test Artist' })).not.toBeInTheDocument();
});

it('shows the artist\'s articles before the editorial outfit', async () => {
  const article = { id: '3', url: 'https://www.esquire.com/x', title: 'Bruno Mars and Cardi B in Please Me', publication: 'Esquire', published_at: '2019-02-15', summary: 'Bruno Mars wears a silk shirt.' };
  const recommendation = recommendArtistLooks({ id: 'freqblog:bruno', name: 'Bruno Mars', source: 'freqblog', genres: ['Pop'] }, [article as never]);
  mocks.search.mockResolvedValue({ result: { intent: { music_name: 'Bruno Mars', music_kind: 'artist', designer_name: null }, music: { kind: 'artist', id: 'bruno', name: 'Bruno Mars' }, missingDesigner: false, associations: [] }, recommendation, articles: [article], error: '', warning: '' });
  render(<MelodyLustEvidence profile={emptyStyleProfile()} />);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Bruno Mars' } });
  fireEvent.submit(screen.getByRole('search'));
  const outfit = await screen.findByRole('region', { name: 'Outfit ideas for Bruno Mars' });
  const articleLink = screen.getByRole('link', { name: /Bruno Mars and Cardi B in Please Me/ });
  expect(articleLink.compareDocumentPosition(outfit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
