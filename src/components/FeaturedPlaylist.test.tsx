import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeaturedPlaylist } from './FeaturedPlaylist';
import { editorialSongs, runwayNotes } from '@/lib/runway-notes';
import { emptySamplerEdits, resolveSampler } from '@/lib/runway-sampler';
import { runwaySongs } from '@/lib/runway-songs';
import { emptyStyleProfile } from '@/lib/style-profile';

vi.mock('@/lib/designer-radio.functions', () => ({ getDesignerPortraits: vi.fn(async () => []) }));

const sampler = runwaySongs(resolveSampler(emptySamplerEdits()));
const songs = [...sampler, ...editorialSongs(sampler)];
const notes = runwayNotes(songs);
const hipHop = { ...emptyStyleProfile(), music: ['Hip-hop'] } as ReturnType<typeof emptyStyleProfile>;

const show = (id: string, onPlay = vi.fn(), onBack = vi.fn()) => {
  render(<QueryClientProvider client={new QueryClient()}><FeaturedPlaylist id={id} profile={hipHop} notes={notes} songs={songs} onPlay={onPlay} onBack={onBack} /></QueryClientProvider>);
  return { onPlay, onBack };
};

describe('featured playlist page', () => {
  it('lays out the suggested playlist with every song’s show, store and sources', () => {
    show('music:Hip-hop');
    expect(screen.getByRole('heading', { level: 1, name: 'Hip-hop from the runway' })).toBeTruthy();
    expect(screen.getByText('4 songs from 4 shows · for Hip-hop')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Shop Kenzo/ }).getAttribute('href')).toBe('https://www.kenzo.com');
    expect(screen.getAllByText(/^Sources:/)).toHaveLength(4);
  });
  it('plays the whole playlist, or from a song, on the room’s player', () => {
    const { onPlay } = show('music:Hip-hop');
    fireEvent.click(screen.getByRole('button', { name: 'Play the playlist' }));
    expect(onPlay.mock.calls[0]![0].map((s: { title: string }) => s.title)).toEqual(['Mathematics', 'Arya', 'Swag Surfin’', 'The Birds Don’t Sing']);
    fireEvent.click(screen.getByRole('button', { name: 'Play Arya by Nigo, A$AP Rocky' }));
    expect(onPlay.mock.calls[1]![1]).toBe(1);
  });
  it('saves to the library only when the reader taps Save', () => {
    show('music:Hip-hop');
    fireEvent.click(screen.getByRole('button', { name: 'Save to my library' }));
    expect(screen.getByRole('status').textContent).toMatch(/Saved 4 songs to your library/);
  });
  it('says so when the reader’s tags no longer make the playlist', () => {
    const { onBack } = show('music:Rock');
    fireEvent.click(screen.getByRole('button', { name: 'Runways for your taste' }));
    expect(onBack).toHaveBeenCalled();
  });
});
