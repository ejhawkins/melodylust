import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toggle = vi.fn(() => true);
const restart = vi.fn();
const seek = vi.fn();
const playback = { paused: true, positionMs: 0, durationMs: 0, stalled: false, failed: false };
const useSpotifyEmbed = vi.fn((_uri: string | null, _onEnded: () => void) => ({ host: { current: null }, playback, toggle, restart, seek }));
vi.mock('@/lib/spotify-embed', () => ({ useSpotifyEmbed: (uri: string | null, onEnded: () => void) => useSpotifyEmbed(uri, onEnded) }));
const { RunwaySongs } = await import('./RunwaySongs');

describe('Runway Songs player', () => {
  beforeEach(() => { window.localStorage.clear(); toggle.mockClear(); useSpotifyEmbed.mockClear(); });

  it('opens on the first sourced track with its show', () => {
    render(<RunwaySongs />);
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Spem in alium');
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Loewe');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Spring/Summer');
    expect(screen.getByText('2021’')).toBeInTheDocument();
    expect(screen.getByText('NOW PLAYING / 01')).toBeInTheDocument();
    expect(useSpotifyEmbed).toHaveBeenLastCalledWith('spotify:track:4XAvUh7v5cy7I5YIewJCCR', expect.any(Function));
    expect(screen.getByRole('link', { current: 'page' })).toHaveTextContent('Runway Songs');
  });

  it('moves through the queue and hands the new track to Spotify', () => {
    render(<RunwaySongs />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Sin Thetik');
    expect(screen.getByText('Prada SS21 Womenswear Version')).toBeInTheDocument();
    expect(useSpotifyEmbed).toHaveBeenLastCalledWith('spotify:track:4FHSuYWyoH9EsFalVIEaOC', expect.any(Function));
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Love in E Minor');
  });

  it('plays through the embed and saves the track on this device', () => {
    const { unmount } = render(<RunwaySongs />);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(toggle).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Save track' }));
    expect(screen.getByRole('button', { name: 'Remove from saved' })).toHaveAttribute('aria-pressed', 'true');
    unmount();
    render(<RunwaySongs />);
    expect(screen.getByRole('button', { name: 'Remove from saved' })).toBeInTheDocument();
  });

  it('seeks when the progress bar is dragged or clicked, once the track has a length', () => {
    const { rerender } = render(<RunwaySongs />);
    expect(screen.getByRole('slider', { name: 'Seek' })).toBeDisabled();
    Object.assign(playback, { durationMs: 200_000, positionMs: 30_000 });
    rerender(<RunwaySongs archive={[]} />);
    const slider = screen.getByRole('slider', { name: 'Seek' });
    expect(slider).toHaveAttribute('aria-valuetext', '0:30 of 3:20');
    fireEvent.change(slider, { target: { value: '90000' } });
    expect(seek).toHaveBeenCalledWith(90_000);
    Object.assign(playback, { durationMs: 0, positionMs: 0 });
  });

  it('advances when a track plays out, unless repeat is on', () => {
    render(<RunwaySongs />);
    const onEnded = () => useSpotifyEmbed.mock.lastCall![1];
    fireEvent.click(screen.getByRole('button', { name: 'Repeat' }));
    act(() => onEnded()());
    expect(restart).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Repeat' }));
    act(() => onEnded()());
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Sin Thetik');
  });

  it('shows the show’s designer from Wikipedia, opened by tap as well as hover', () => {
    render(<RunwaySongs />);
    const portrait = screen.getByRole('button', { name: 'Jonathan Anderson, creative director of Loewe' });
    expect(portrait).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(portrait);
    expect(portrait).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Jonathan Anderson on Wikipedia' })).toHaveAttribute('href', 'https://en.wikipedia.org/wiki/Jonathan_Anderson_(fashion_designer)');
    expect(screen.getByRole('link', { name: 'Marie Claire Korea, CC BY 3.0' })).toHaveAttribute('href', expect.stringContaining('commons.wikimedia.org'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('button', { name: 'Miuccia Prada and Raf Simons, co-creative directors of Prada' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('links the show’s first looks to Tagwalk as text once the archive has them', () => {
    const { rerender } = render(<RunwaySongs />);
    expect(screen.queryByRole('link', { name: /on Tagwalk/ })).toBeNull();
    const archived = { id: 'archive-x', name: 'Spem in alium', version: null, artist: 'Thomas Tallis · The Tallis Scholars', house: 'Loewe', season: 'Spring/Summer', year: 2021,
      designers: [], category: 'D' as const, spotifyUri: 'spotify:track:4XAvUh7v5cy7I5YIewJCCR', spotifyUrl: '', looks: ['https://www.tag-walk.com/en/look/251566', 'https://www.tag-walk.com/en/look/251564'] };
    rerender(<RunwaySongs archive={[archived]} />);
    const links = screen.getAllByRole('link', { name: /on Tagwalk/ });
    expect(links.map(a => [a.textContent, a.getAttribute('href')])).toEqual([
      ['LOOK 01 of Loewe Spring/Summer 2021 on Tagwalk', 'https://www.tag-walk.com/en/look/251566'],
      ['LOOK 02 of Loewe Spring/Summer 2021 on Tagwalk', 'https://www.tag-walk.com/en/look/251564'],
    ]);
    expect(screen.getByRole('region', { name: 'Runway looks' }).querySelectorAll('img')).toHaveLength(0);
  });

  it('keeps a track hidden in the sampler out of the queue when the archive has it too', () => {
    window.localStorage.setItem('ml-runway-sampler', JSON.stringify({ edits: { 'sin-thetik': { hidden: true } }, added: [] }));
    const archived = { id: 'archive-sin', name: 'Sin Thetik', version: null, artist: 'Plastikman', house: 'Prada', season: 'Spring/Summer', year: 2021,
      designers: [], category: 'A' as const, spotifyUri: 'spotify:track:4FHSuYWyoH9EsFalVIEaOC', spotifyUrl: '', looks: [] };
    render(<RunwaySongs archive={[archived]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Narkosis / Spektre');
  });

  it('runs the current show’s AI notes as a ticker, with its sources for screen readers', () => {
    const notes = { summary: 'A show in a box, mailed to guests.', atmosphere: null, palette: ['ivory', 'cobalt'], silhouettes: [], materials: [], details: [],
      sources: [{ url: 'https://www.wallpaper.com/fashion/loewe-ss21', title: 'wallpaper.com' }], model: 'gemini-3.8-flash', generatedAt: '2026-10-31T12:00:00.000Z' };
    render(<RunwaySongs showNotes={{ 'show-notes|v1|loewe|spring-summer|2021': notes }} />);
    const ticker = screen.getByRole('region', { name: 'Show notes, Loewe Spring/Summer 2021' });
    expect(within(ticker).getByText('Palette', { selector: 'dt' }).nextElementSibling).toHaveTextContent('ivory · cobalt');
    expect(screen.getByRole('link', { name: 'wallpaper.com' })).toHaveAttribute('href', notes.sources[0]!.url);
    expect(screen.getByText('Written by AI (Gemini) from')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.queryByRole('region', { name: /Show notes/ })).toBeNull();
  });

  it('names a director Commons has no portrait of without crediting a photo', () => {
    render(<RunwaySongs />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('link', { name: 'Raf Simons on Wikipedia' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /CC BY/ }).map(link => link.textContent)).toEqual(['Cory M. Grenier, CC BY-SA 2.0']);
  });
});
