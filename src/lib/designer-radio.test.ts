import { describe, expect, it } from 'vitest';
import { designerRadioSongs, rowDirectors, type DesignerRadioRow } from './designer-radio';

const row = (overrides: Partial<DesignerRadioRow> = {}): DesignerRadioRow => ({
  id: 'candidate-1',
  title: 'Night Drive',
  artist: 'The Artist',
  category: 'B',
  show_name: 'Prada Fall 2026',
  show_season: 'Fall 2026',
  spotify_url: 'https://open.spotify.com/track/1234567890123456789012',
  status: 'approved',
  designer: { name: 'Prada' },
  ...overrides,
});

describe('designer radio songs', () => {
  it('maps an approved, playable candidate into the existing player shape', () => {
    expect(designerRadioSongs([row()])).toEqual([expect.objectContaining({
      id: 'designer-radio-candidate-1',
      name: 'Night Drive',
      artist: 'The Artist',
      house: 'Prada',
      season: 'Fall',
      year: 2026,
      category: 'B',
      spotifyUri: 'spotify:track:1234567890123456789012',
    })]);
  });

  it('shows the creative directors the scout found, curated portraits first', () => {
    const pharrell = { name: 'Pharrell Williams', wikipedia: 'https://en.wikipedia.org/wiki/Pharrell_Williams', photo: null };
    const [song] = designerRadioSongs([row({ provenance: { creative_director: 'Miuccia Prada & Pharrell Williams' } })], new Map([['Pharrell Williams', pharrell]]));
    expect(song!.designers.map(designer => [designer.name, Boolean(designer.photo)])).toEqual([['Miuccia Prada', true], ['Pharrell Williams', false]]);
    expect(rowDirectors([row({ provenance: { creative_director: 'Miuccia Prada & Raf Simons' } }), row()])).toEqual(['Miuccia Prada', 'Raf Simons']);
  });

  it('keeps pending, uncategorized, incomplete, and unplayable candidates off the radio', () => {
    expect(designerRadioSongs([
      row({ status: 'pending' }),
      row({ category: null }),
      row({ show_name: null, show_season: null }),
      row({ spotify_url: null }),
    ])).toEqual([]);
  });
});