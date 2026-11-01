import { describe, expect, it, vi } from 'vitest';
import {
  citedReport, readGrounding, readRunwaySongCandidates, resolveGroundingUrl, runwaySongResearchPrompt, runwaySongScoutPrompt, sameRecording,
  spotifyTrackTitle, spotifyTrackUrl, withCheckedSpotify,
} from './runway-song-candidates';

const joy = {
  title: 'JOY (Unspeakable)',
  artist: 'Voices of Fire feat. Pharrell Williams',
  category: 'A' as const,
  show_name: "Men's Spring-Summer 2024 (Pont Neuf)",
  show_season: 'SS24',
  evidence_summary: 'The official show playlist includes the song used for the runway finale.',
  source_url: 'https://open.spotify.com/playlist/07UFBdRvYOJxYsc9RjKdIn',
  source_title: "Louis Vuitton SS24 Men's Official Playlist",
  spotify_url: 'https://open.spotify.com/track/629H13pL9wJ2WbVn91gJgT',
  creative_director: 'Pharrell Williams',
  sound_director: 'Pharrell Williams',
  notes: 'Live choir performance',
};

describe('readRunwaySongCandidates', () => {
  it('keeps unique, cited song evidence and rejects uncited claims', () => {
    const cited = [{ url: 'https://example.com/prada-show', title: 'Prada show soundtrack' }];
    const payload = {
      candidates: [
        {
          title: 'Song One', artist: 'Artist One', category: 'B', show_name: 'Prada Fall 2026', show_season: 'Fall 2026',
          evidence_summary: 'The source explicitly identifies Song One in the runway soundtrack.',
          source_url: 'https://example.com/prada-show', source_title: 'Prada show soundtrack', spotify_url: null,
        },
        {
          title: 'Song One', artist: 'Artist One', category: 'B', show_name: null, show_season: null,
          evidence_summary: 'Duplicate.', source_url: 'https://example.com/prada-show', source_title: null, spotify_url: null,
        },
        {
          title: 'Invented Song', artist: 'Nobody', category: 'D', show_name: null, show_season: null,
          evidence_summary: 'No cited support.', source_url: 'https://uncited.example/story', source_title: null, spotify_url: null,
        },
      ],
    };

    expect(readRunwaySongCandidates(payload, cited)).toEqual([payload.candidates[0]]);
  });

  it('keeps cited official-playlist results with runway production credits and their cited track', () => {
    const sources = [{ url: joy.source_url }, { url: `${joy.spotify_url}?si=abc` }];
    expect(readRunwaySongCandidates({ candidates: [joy] }, sources)).toEqual([joy]);
  });

  it('matches a cited page however it was linked, and stores the cited link', () => {
    const cited = 'https://www.vogue.com/fashion-shows/spring-2020-ready-to-wear/louis-vuitton';
    const video = 'https://www.youtube.com/watch?v=eNm_4w1NANU';
    const sophie = { ...joy, title: "It's Okay to Cry", artist: 'SOPHIE', spotify_url: null, source_url: 'https://vogue.com/fashion-shows/spring-2020-ready-to-wear/louis-vuitton/?utm_source=x#review' };
    const amen = { ...joy, title: '4th Chamber', artist: 'GZA', spotify_url: null, source_url: 'https://youtube.com/watch?v=eNm_4w1NANU&si=share' };
    const otherVideo = { ...amen, title: 'Other', source_url: 'https://www.youtube.com/watch?v=somethingElse' };

    expect(readRunwaySongCandidates({ candidates: [sophie, amen, otherVideo] }, [{ url: cited }, { url: video }]).map(c => c.source_url))
      .toEqual([cited, video]);
  });

  it('drops a Spotify link that is malformed, not a track, or never cited, but keeps the candidate', () => {
    const sources = [{ url: joy.source_url }, { url: joy.spotify_url }];
    const read = (spotify_url: string | null) => readRunwaySongCandidates({ candidates: [{ ...joy, spotify_url }] }, sources)[0]?.spotify_url;

    expect(read('https://open.spotify.com/track/629H13pL9wJ2WbVn91gJgT?si=x')).toBe(joy.spotify_url);
    expect(read('https://open.spotify.com/album/629H13pL9wJ2WbVn91gJgT')).toBeNull();
    expect(read('https://open.spotify.com/track/629H13pL9wJ2')).toBeNull();
    expect(read('spotify:track:629H13pL9wJ2WbVn91gJgT')).toBeNull();
    expect(read('https://open.spotify.com/track/1XAeqooXjzw3JD47kBGJaE')).toBeNull(); // well-formed, but no search returned it
  });
});

describe('spotifyTrackUrl', () => {
  it('accepts only https://open.spotify.com/track/ with a 22-character id', () => {
    expect(spotifyTrackUrl(' https://open.spotify.com/track/629H13pL9wJ2WbVn91gJgT?si=1 ')).toBe('https://open.spotify.com/track/629H13pL9wJ2WbVn91gJgT');
    expect(spotifyTrackUrl('http://open.spotify.com/track/629H13pL9wJ2WbVn91gJgT')).toBeNull();
    expect(spotifyTrackUrl('https://open.spotify.com/intl-fr/track/629H13pL9wJ2WbVn91gJgT')).toBeNull();
    expect(spotifyTrackUrl('https://open.spotify.com/track/629H13pL9wJ2WbVn91gJgTX')).toBeNull();
    expect(spotifyTrackUrl(null)).toBeNull();
  });
});

describe('Spotify title check', () => {
  const song = (title: string, show_name: string | null = null) => ({ title, show_name, show_season: null });

  it('matches the same recording however Spotify writes it', () => {
    expect(sameRecording(song('In Every Dream Home a Heartache'), 'In Every Dream Home A Heartache - 1999 Remaster')).toBe(true);
    expect(sameRecording(song('Work B**ch'), 'Work Bitch')).toBe(true);
    expect(sameRecording(song('JOY (Unspeakable)'), 'JOY (Unspeakable) (feat. Pharrell Williams)')).toBe(true);
    expect(sameRecording(song('Mad World'), 'Mad World - Feat. Gary Jules')).toBe(true);
    expect(sameRecording(song('Sin Thetik', 'Prada SS21 Womenswear'), 'Sin Thetik - Prada SS21 Womenswear Version')).toBe(true);
  });

  it('rejects another song, or a version only one side names', () => {
    expect(sameRecording(song('Fyuz'), 'Oh Yeah, Oh No')).toBe(false);
    expect(sameRecording(song('Sin Thetik'), 'Sin Thetik - Ambient Version')).toBe(false);
    expect(sameRecording(song('Sin Thetik (Prada SS21 Womenswear Version)'), 'Sin Thetik - Ambient Version')).toBe(false);
    expect(sameRecording(song("It's Okay to Cry (Extended LV SS20 Edit)"), "It's Okay to Cry")).toBe(false);
  });

  it('reads the title from Spotify oEmbed and gives up quietly', async () => {
    const fetcher = vi.fn(async () => Response.json({ title: 'Work Bitch', type: 'rich' }));
    expect(await spotifyTrackTitle('https://open.spotify.com/track/3KliPMvk1EvFZu9cvkj8p1', fetcher)).toBe('Work Bitch');
    expect(fetcher).toHaveBeenCalledWith('https://open.spotify.com/oembed?url=https%3A%2F%2Fopen.spotify.com%2Ftrack%2F3KliPMvk1EvFZu9cvkj8p1', expect.anything());
    expect(await spotifyTrackTitle('https://open.spotify.com/track/x', async () => new Response('Not found', { status: 404 }))).toBeNull();
    expect(await spotifyTrackTitle('https://open.spotify.com/track/x', async () => { throw new Error('offline'); })).toBeNull();
  });

  it('keeps a link Spotify confirms and drops one it contradicts or can’t confirm', async () => {
    const titles: Record<string, string> = { '6tAJ0gveN882TrPI6FhQYD': 'Oh Yeah, Oh No', '3KliPMvk1EvFZu9cvkj8p1': 'Work Bitch' };
    const fetcher = vi.fn(async (url: string | URL | Request) => {
      const title = titles[decodeURIComponent(String(url)).slice(-22)];
      return title ? Response.json({ title }) : new Response('Not found', { status: 404 });
    });
    const candidate = (title: string, id: string | null) => ({ ...joy, title, spotify_url: id && `https://open.spotify.com/track/${id}` });
    const checked = await withCheckedSpotify([
      candidate('Work B**ch', '3KliPMvk1EvFZu9cvkj8p1'), candidate('Fyuz', '6tAJ0gveN882TrPI6FhQYD'),
      candidate('Unknown', '0000000000000000000000'), candidate('No link', null),
    ], fetcher);
    expect(checked.map(c => c.spotify_url)).toEqual(['https://open.spotify.com/track/3KliPMvk1EvFZu9cvkj8p1', null, null, null]);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});

describe('grounding citations', () => {
  const redirect = 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEg2cFU9icEa5gezgTQ';

  it('reads where a grounding redirect points without following it', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 302, headers: { location: 'https://www.wmagazine.com/fashion/lv-spring-2024' } }));
    expect(await resolveGroundingUrl(redirect, fetcher)).toBe('https://www.wmagazine.com/fashion/lv-spring-2024');
    expect(fetcher).toHaveBeenCalledWith(redirect, expect.objectContaining({ method: 'HEAD', redirect: 'manual' }));
  });

  it('passes ordinary links through and gives up on a redirect that leads nowhere', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 404 }));
    expect(await resolveGroundingUrl('https://www.vogue.com/a', fetcher)).toBe('https://www.vogue.com/a');
    expect(fetcher).not.toHaveBeenCalled();
    expect(await resolveGroundingUrl(redirect, fetcher)).toBeNull();
    expect(await resolveGroundingUrl(redirect, async () => { throw new Error('offline'); })).toBeNull();
  });

  it('reads web chunks by index and the passages they support', () => {
    const metadata = {
      groundingChunks: [{ web: { uri: redirect, title: 'wmagazine.com' } }, { retrievedContext: {} }],
      groundingSupports: [
        { segment: { startIndex: 0, endIndex: 9, text: 'JOY sang.' }, groundingChunkIndices: [0] },
        { segment: { text: 'Uncited.' }, groundingChunkIndices: [] },
      ],
      webSearchQueries: ['louis vuitton soundtrack'],
    };
    expect(readGrounding(metadata)).toEqual({
      chunks: [{ url: redirect, title: 'wmagazine.com' }, null],
      supports: [{ text: 'JOY sang.', chunks: [0] }],
    });
    expect(readGrounding(undefined)).toEqual({ chunks: [], supports: [] });
  });

  it('marks each supported passage with its resolved source numbers', () => {
    const text = 'JOY closed the show. Choir in robes. JOY closed the show.';
    const supports = [
      { text: 'JOY closed the show.', chunks: [2, 0] },
      { text: 'Choir in robes.', chunks: [1] },
      { text: 'JOY closed the show.', chunks: [1] },
    ];
    expect(citedReport(text, supports, ['https://a.example', null, 'https://c.example']))
      .toBe('JOY closed the show. [1][3] Choir in robes. JOY closed the show.');
  });
});

describe('scout prompts', () => {
  it('asks Gemini to research official playlists, videos, credits and Spotify tracks', () => {
    const prompt = runwaySongResearchPrompt('Louis Vuitton');
    expect(prompt).toContain('Use Google Search');
    expect(prompt).toContain('official show playlists');
    expect(prompt).toContain('official runway videos');
    expect(prompt).toContain('open.spotify.com/track/');
    expect(prompt).not.toContain('JSON');
  });

  it('confines the JSON to the report and its numbered sources', () => {
    const prompt = runwaySongScoutPrompt('Louis Vuitton', 'JOY closed the show. [4]', [{ number: 4, url: joy.source_url }]);
    expect(prompt).toContain('copied exactly from the source list');
    expect(prompt).toContain('"creative_director"');
    expect(prompt).toContain('pending editorial review queue');
    expect(prompt).toContain(`[4] ${joy.source_url}`);
  });
});
