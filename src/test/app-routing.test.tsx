import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StyleSearch } from "@/components/StyleSearch";
import { Wishlist } from "@/components/Wishlist";
import { emptyStyleProfile } from "@/lib/style-profile";
import { searchTrackedEditorialEvidence } from "@/lib/melodylust.functions";
import { parseEvidenceCorpus } from "@/lib/melodylust-evidence";
import { searchEvidence } from "@/lib/style-search";
import syntheticCorpus from "../../examples/melodylust-synthetic-corpus.json";
import { routeTree } from "@/routeTree.gen";

vi.mock('@tanstack/react-start', async importOriginal => ({ ...(await importOriginal<typeof import('@tanstack/react-start')>()), useServerFn: (fn: unknown) => fn }));
vi.mock('@/lib/artists.functions', () => ({ searchArtists: vi.fn().mockResolvedValue({ status: 'ok', results: [], database: 'ok', provider: 'ok' }), submitArtist: vi.fn() }));
vi.mock("@/lib/melodylust.functions", () => ({ searchTrackedEditorialEvidence: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes("/").at(-1)?.routeId).not.toBe(rootRouteId);
  });
});

describe("Editorial artwork", () => {
  it("uses restored product photographs rather than placeholder illustrations", () => {
    render(<StyleSearch profile={emptyStyleProfile()} onEditProfile={() => {}} />);
    for (const name of ['Tiger-print tailoring', 'The sculptural heel', 'Vintage suede', 'Patent after dark', 'A little silk', 'Silver, on repeat']) {
      const source = screen.getByRole('img', { name }).getAttribute('src');
      expect(source).toMatch(/\.jpg(?:\?|$)/);
      expect(source).not.toContain('/placeholders/');
    }
  });

  it("uses the journal notice and local album artwork for the Stylus scene and cursor", () => {
    const { container } = render(<StyleSearch profile={emptyStyleProfile()} onEditProfile={() => {}} />);
    const album = screen.getByRole('img', { name: /Red Moon in Venus album artwork/ });
    expect(album.getAttribute('src')).toMatch(/kali-album.*\.jpg(?:\?|$)/);
    expect(container.querySelector('.stylus-cursor img')).toHaveAttribute('src', album.getAttribute('src'));
    expect(container.querySelector('.stylus-journal-title')).toHaveTextContent('An independentfashion journalVol. 01 — Autumn 2026');
    expect(container.querySelector('.stylus-journal-title')?.querySelectorAll('br')).toHaveLength(2);
    expect(screen.getByText('I AM NOT AFFILIATED WITH ANY OF THESE BRANDS. IT IS MEANT FOR INSPIRATION ONLY.')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Melody Lust' })).not.toBeInTheDocument();
  });
});

describe("Wishlist heading", () => {
  it("uses the supplied editorial Want List heading and keeps saved pieces and playlist", () => {
    render(<Wishlist />);
    expect(screen.getByRole('heading', { name: 'The Want List', level: 2 })).toHaveClass('want-heading');
    expect(screen.getByRole('heading', { name: 'III. Saved / My Edit' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Pieces/, level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Playlist/, level: 3 })).toBeInTheDocument();
  });
});

describe("Want List worksheet", () => {
  beforeEach(() => window.localStorage.clear());

  it("keeps one to ten numbered artists and toggles optional song inputs", () => {
    render(<Wishlist />);
    expect(screen.getAllByRole('textbox', { name: /^Artist \d+$/ })).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Style my list' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Add song for artist 2' }));
    fireEvent.change(screen.getByLabelText('Song for artist 2'), { target: { value: 'Just a Girl' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove song for artist 2' }));
    expect(screen.queryByLabelText('Song for artist 2')).not.toBeInTheDocument();
    for (let index = 3; index < 10; index += 1) fireEvent.click(screen.getByRole('button', { name: 'Add an artist' }));
    expect(screen.getAllByRole('textbox', { name: /^Artist \d+$/ })).toHaveLength(10);
    expect(screen.getByRole('button', { name: 'Add an artist' })).toBeDisabled();
    for (let index = 10; index > 1; index -= 1) fireEvent.click(screen.getByRole('button', { name: 'Remove artist 1' }));
    expect(screen.getByRole('button', { name: 'Remove artist 1' })).toBeDisabled();
  });

  it("restores rotation drafts and shows Spotify search links without invented audio metrics", () => {
    const first = render(<Wishlist />);
    fireEvent.change(screen.getByLabelText('Artist 1'), { target: { value: 'Gwen Stefani' } });
    fireEvent.change(screen.getByLabelText('Song for artist 1'), { target: { value: 'Just a Girl' } });
    expect(screen.getByRole('link', { name: 'Find Just a Girl on Spotify' })).toHaveAttribute('href', 'https://open.spotify.com/search/Gwen%20Stefani%20Just%20a%20Girl');
    first.unmount();
    render(<Wishlist />);
    expect(screen.getByLabelText('Artist 1')).toHaveValue('Gwen Stefani');
    expect(screen.getByLabelText('Song for artist 1')).toHaveValue('Just a Girl');
    expect(searchTrackedEditorialEvidence).not.toHaveBeenCalled();
    expect(screen.queryByText('BPM')).not.toBeInTheDocument();
  });

  it("saves a placeholder edit only once and retains product notes", () => {
    render(<Wishlist />);
    fireEvent.click(screen.getByRole('button', { name: 'Save The sharp entrance' }));
    expect(screen.getByRole('button', { name: 'Save The sharp entrance' })).toBeDisabled();
    const saved = within(screen.getByRole('region', { name: 'Saved edit' }));
    expect(saved.getByText('Tiger-print tailoring')).toBeInTheDocument();
    expect(saved.getByLabelText('Notes for Tiger-print tailoring')).toHaveValue('Editorial preview; not a verified product or recommendation.');
    expect(JSON.parse(window.localStorage.getItem('ml-wishlist') ?? '[]')).toHaveLength(3);
    expect(saved.getByRole('button', { name: 'Export list' })).toBeEnabled();
  });

  it("opens accessible product and next-issue dialogs", () => {
    render(<Wishlist />);
    fireEvent.click(screen.getByRole('button', { name: 'View The sharp entrance pieces' }));
    const product = screen.getByRole('dialog');
    expect(product).toHaveAccessibleName('The sharp entrance');
    expect(within(product).getAllByRole('img')).toHaveLength(3);
    expect(within(product).getByText(/No verified brand, price or availability/)).toBeInTheDocument();
    fireEvent.click(within(product).getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next issue' }));
    expect(screen.getByRole('dialog')).toHaveAccessibleName('One more on repeat.');
    expect(screen.queryByText(/Sponsored/)).not.toBeInTheDocument();
  });

  it("queries the tracker only on submission, preserves requested songs and separates preview products", async () => {
    vi.mocked(searchTrackedEditorialEvidence).mockResolvedValue({ result: null, articles: [], interpretation: 'ai', error: 'No song-level evidence is available.' });
    render(<Wishlist />);
    fireEvent.change(screen.getByLabelText('Artist 1'), { target: { value: '  Gwen Stefani  ' } });
    fireEvent.change(screen.getByLabelText('Song for artist 1'), { target: { value: 'Just a Girl' } });
    expect(searchTrackedEditorialEvidence).not.toHaveBeenCalled();
    fireEvent.submit(screen.getByRole('form', { name: 'Your rotation' }));
    expect(await screen.findByText('No song-level evidence is available.')).toBeInTheDocument();
    expect(searchTrackedEditorialEvidence).toHaveBeenCalledExactlyOnceWith({ data: { query: 'Just a Girl by Gwen Stefani' } });
    expect(screen.getByRole('status')).toHaveTextContent('product edits remain placeholders');
    expect(JSON.parse(window.localStorage.getItem('ml-wishlist') ?? '[]')[0]).toMatchObject({ name: 'Just a Girl', detail: 'Gwen Stefani', kind: 'song' });
  });

  it("recovers from tracker failures without fabricating source-backed looks", async () => {
    vi.mocked(searchTrackedEditorialEvidence).mockRejectedValue(new Error('Unavailable'));
    render(<Wishlist />);
    fireEvent.change(screen.getByLabelText('Artist 1'), { target: { value: 'Usher' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Your rotation' }));
    expect(await screen.findByRole('status')).toHaveTextContent('tracker is unavailable');
    expect(screen.getByRole('button', { name: 'Style my list' })).toBeEnabled();
    expect(screen.queryByRole('heading', { name: 'From the article tracker' })).not.toBeInTheDocument();
  });
});

describe("Automatic tracker search", () => {
  const corpus = parseEvidenceCorpus(syntheticCorpus);
  const response = (name = 'Usher', kind: 'artist' | 'song' | 'genre' = 'artist'): Awaited<ReturnType<typeof searchTrackedEditorialEvidence>> => {
    const result = searchEvidence(corpus, { music_name: name, music_kind: kind, designer_name: null });
    return { result, articles: corpus.documents.filter(document => result.music && document.entity_ids.includes(result.music.id)), interpretation: 'literal', error: '' };
  };
  const submit = (query = 'Usher') => {
    fireEvent.change(screen.getByRole('combobox', { name: 'Music & fashion evidence' }), { target: { value: query } });
    fireEvent.submit(screen.getByRole('search', { name: 'Music and fashion evidence' }));
  };

  it("removes preparation controls and does not call paid AI on page load", () => {
    render(<StyleSearch profile={emptyStyleProfile()} onEditProfile={() => {}} />);
    expect(screen.getByRole('combobox', { name: 'Music & fashion evidence' })).toHaveAttribute('placeholder', 'Artist, song or genre');
    for (const name of ['Upload article CSV', 'Read with AI', 'Read article', 'Summarize & style', 'Measure association']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
    expect(screen.queryByLabelText('Article text')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('CSV article')).not.toBeInTheDocument();
    expect(searchTrackedEditorialEvidence).not.toHaveBeenCalled();
  });

  it("searches on a fresh device with the trimmed query and profile, not client corpus or article URLs", async () => {
    vi.mocked(searchTrackedEditorialEvidence).mockResolvedValue(response());
    render(<StyleSearch profile={emptyStyleProfile()} onEditProfile={() => {}} />);
    submit('  Usher  ');
    expect(await screen.findByText('2.00× lift')).toBeInTheDocument();
    expect(searchTrackedEditorialEvidence).toHaveBeenCalledExactlyOnceWith({ data: { query: 'Usher', profile: emptyStyleProfile() } });
    expect(screen.getByRole('link', { name: 'Synthetic scenario: Usher wears Designer A' })).toHaveAttribute('href', 'https://example.org/synthetic-001');
    expect(screen.getByText(/not song-specific/)).toBeInTheDocument();
  });

  it("does not submit empty queries", () => {
    render(<StyleSearch profile={emptyStyleProfile()} onEditProfile={() => {}} />);
    submit('   ');
    expect(screen.getByRole('button', { name: 'Search evidence' })).toBeDisabled();
    expect(searchTrackedEditorialEvidence).not.toHaveBeenCalled();
  });

  it("shows safe backend errors and allows retry without inventing results", async () => {
    vi.mocked(searchTrackedEditorialEvidence).mockResolvedValue({ result: null, articles: [], interpretation: 'ai', error: 'The article tracker could not be indexed.' });
    render(<StyleSearch profile={emptyStyleProfile()} onEditProfile={() => {}} />);
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be indexed');
    expect(screen.queryByText('2.00× lift')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search evidence' })).toBeEnabled();
  });

  it("keeps missing songs separate from artist evidence", async () => {
    vi.mocked(searchTrackedEditorialEvidence).mockResolvedValue(response('Narcos', 'song'));
    render(<StyleSearch profile={emptyStyleProfile()} onEditProfile={() => {}} />);
    submit('Narcos');
    expect(await screen.findByRole('heading', { name: 'No fashion matches for Narcos yet.' })).toBeInTheDocument();
    expect(screen.getByText(/matching coverage for this song yet/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Designer A × Usher' })).not.toBeInTheDocument();
  });

  it("sends genre queries without adding an artist or fallback", async () => {
    vi.mocked(searchTrackedEditorialEvidence).mockResolvedValue(response('Jazz', 'genre'));
    render(<StyleSearch profile={emptyStyleProfile()} onEditProfile={() => {}} />);
    submit('Jazz');
    expect(await screen.findByRole('heading', { name: 'No fashion matches for Jazz yet.' })).toBeInTheDocument();
    expect(screen.getByText(/matching coverage for this genre yet/)).toBeInTheDocument();
    expect(searchTrackedEditorialEvidence).toHaveBeenCalledExactlyOnceWith({ data: { query: 'Jazz', profile: emptyStyleProfile() } });
  });

  it("clears stale results when the query changes", async () => {
    vi.mocked(searchTrackedEditorialEvidence).mockResolvedValue(response());
    render(<StyleSearch profile={emptyStyleProfile()} onEditProfile={() => {}} />);
    submit();
    await screen.findByText('2.00× lift');
    fireEvent.change(screen.getByRole('combobox', { name: 'Music & fashion evidence' }), { target: { value: 'Gwen Stefani' } });
    expect(screen.queryByText('2.00× lift')).not.toBeInTheDocument();
  });
});