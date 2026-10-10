import { describe, expect, it } from 'vitest';
import { readTrackDetails, trackStats } from './freqblog';

const payload = {
  track_name: 'Yeah! (feat. Lil Jon & Ludacris)', artist_name: 'Usher', album_name: 'Confessions',
  itunes_track_id: '1440', bpm: 105.2, bpm_confidence: 0.9, key: 'G minor', mood: 'energetic', genre: 'R&B/Soul',
};

describe('FreqBlog track details', () => {
  it('maps a lookup and its artwork into thumbnail details', () => {
    expect(readTrackDetails(payload, 'https://art.freqblog.com/1440/1200.jpg')).toEqual({
      title: 'Yeah! (feat. Lil Jon & Ludacris)', artist: 'Usher', album: 'Confessions',
      artworkUrl: 'https://art.freqblog.com/1440/1200.jpg', bpm: 105, key: 'G minor', mood: 'energetic',
    });
  });

  it('keeps the details but drops artwork that is missing or not https', () => {
    expect(readTrackDetails(payload)?.artworkUrl).toBeNull();
    expect(readTrackDetails(payload, 'http://art.example/1.jpg')?.artworkUrl).toBeNull();
    expect(readTrackDetails(payload, 'javascript:alert(1)')?.artworkUrl).toBeNull();
  });

  it('tolerates missing analysis fields', () => {
    const sparse = readTrackDetails({ track_name: 'U Got It Bad', artist_name: 'Usher', itunes_track_id: '9', bpm: 0, key: '' });
    expect(sparse).toMatchObject({ album: null, bpm: null, key: null, mood: null });
    expect(trackStats(sparse!)).toBe('');
  });

  it('rejects payloads that are not a track', () => {
    expect(readTrackDetails({ detail: 'Not found', error_code: 'track_not_found' })).toBeNull();
    expect(readTrackDetails(null)).toBeNull();
  });

  it('formats tempo and key for the card', () => {
    expect(trackStats(readTrackDetails(payload)!)).toBe('105 BPM · G minor');
    // Shape of a live FreqBlog response (Uptown Funk): fractional BPM, hyphenated key, FreqBlog track ID.
    const live = readTrackDetails({ track_name: 'Uptown Funk', artist_name: 'Mark Ronson featuring Bruno Mars', album_name: 'Uptown Special', itunes_track_id: 'apple_6be7d70bfc5e180d', bpm: 116.69, key: 'C-Major', mood: 'neutral', genre: 'pop', camelot: '8B' }, 'https://coverartarchive.org/release/6c36554e-1e01-4136-8df6-7cb74ed3cb4b/front-600');
    expect(live?.artworkUrl).toBe('https://coverartarchive.org/release/6c36554e-1e01-4136-8df6-7cb74ed3cb4b/front-600');
    expect(trackStats(live!)).toBe('117 BPM · C major');
  });
});
