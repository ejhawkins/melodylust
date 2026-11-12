import { afterEach, describe, expect, it, vi } from 'vitest';
import { albumArt, coverFromOEmbed, spotifyTrackId } from './album-art';

afterEach(() => window.localStorage.clear());

describe('album art', () => {
  it('reads the track id from a Spotify link', () => {
    expect(spotifyTrackId('https://open.spotify.com/track/1wrIp2G2kEa2pt6jsUJ05A?si=x')).toBe('1wrIp2G2kEa2pt6jsUJ05A');
    expect(spotifyTrackId('https://open.spotify.com/album/1wrIp2G2kEa2pt6jsUJ05A')).toBeNull();
    expect(spotifyTrackId(undefined)).toBeNull();
  });

  it('takes the cover from an oEmbed reply and nothing else', () => {
    expect(coverFromOEmbed({ thumbnail_url: 'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02abc' })).toContain('spotifycdn');
    expect(coverFromOEmbed({ thumbnail_url: 'javascript:alert(1)' })).toBeNull();
    expect(coverFromOEmbed(null)).toBeNull();
  });

  it('asks Spotify once per track and keeps the cover on the device', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ thumbnail_url: 'https://i.scdn.co/image/cover' })));
    const id = 'AAAAAAAAAAAAAAAAAAAAA1';
    await expect(Promise.all([albumArt(id, fetcher), albumArt(id, fetcher)])).resolves.toEqual(['https://i.scdn.co/image/cover', 'https://i.scdn.co/image/cover']);
    await albumArt(id, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(window.localStorage.getItem('ml-album-art') ?? '{}')[id]).toBe('https://i.scdn.co/image/cover');
  });

  it('gives null for a track Spotify does not know', async () => {
    const fetcher = vi.fn(async () => new Response('Not found', { status: 404 }));
    await expect(albumArt('BBBBBBBBBBBBBBBBBBBBB2', fetcher)).resolves.toBeNull();
  });
});
