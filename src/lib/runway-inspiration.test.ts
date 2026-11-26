import { describe, expect, it } from 'vitest';
import { editorialSongs, runwayNotes } from './runway-notes';
import { emptySamplerEdits, resolveSampler } from './runway-sampler';
import { runwaySongs } from './runway-songs';
import { featuredShow, inspire, profileTags, seasonTag, showSources, showTags, tagKey, trackGenres, withTag, type Tag } from './runway-inspiration';
import { emptyStyleProfile, profileFields } from './style-profile';

const sampler = runwaySongs(resolveSampler(emptySamplerEdits()));
const songs = [...sampler, ...editorialSongs(sampler)];
const notes = runwayNotes(songs);
const note = (id: string) => notes.find(n => n.id === id)!;

describe('tags', () => {
  it('uses only the quiz’s own vocabulary', () => {
    const vocab = new Set(profileFields.flatMap(field => field.options as readonly string[]));
    for (const n of notes) for (const tag of showTags(n)) expect(vocab.has(tag.value), `${n.id}: ${tag.value}`).toBe(true);
  });

  it('marks genre and aesthetic as our read, season and house as read off the show', () => {
    const tags = showTags(note('thom-browne-fall-winter-2017'));
    expect(tags).toEqual(expect.arrayContaining([
      { kind: 'music', value: 'Rock', basis: 'ours' }, { kind: 'music', value: 'Electronic', basis: 'ours' },
      { kind: 'aesthetic', value: 'Preppy', basis: 'ours' }, { kind: 'season', value: 'Fall / winter', basis: 'show' },
    ]));
    expect(showTags(note('prada-spring-summer-2021'))).toContainEqual({ kind: 'brand', value: 'Prada', basis: 'show' });
  });

  it('gives a track several genres, and leaves artists outside the quiz’s genres untagged', () => {
    expect(trackGenres('Britney Spears, BFRND')).toEqual(['Pop', 'Electronic']);
    expect(trackGenres('Wagner')).toEqual([]);
    expect(trackGenres('Voices of Fire, Pharrell Williams')).toEqual([]);
  });

  it('maps seasons the quiz knows, and not Resort or Artisanal', () => {
    expect([seasonTag('Autumn/Winter'), seasonTag('Summer'), seasonTag('Resort'), seasonTag('Artisanal')]).toEqual(['Fall / winter', 'Spring / summer', null, null]);
  });

  it('reads the reader’s tags from the profile', () => {
    expect(profileTags({ ...emptyStyleProfile(), music: ['Rock'], aesthetic: ['Preppy'] }).map(tagKey)).toEqual(['music:Rock', 'aesthetic:Preppy']);
  });
});

describe('inspire', () => {
  it('roots every show in a cited source, including the sampler’s articles', () => {
    expect(showSources(note('balenciaga-summer-2025')).map(s => s.url)).toEqual(expect.arrayContaining(['https://culted.com/the-runway-soundtracks-were-still-listening-to-from-mcqueen-to-balenciaga/']));
    const all = inspire([{ kind: 'season', value: 'Fall / winter' }, { kind: 'season', value: 'Spring / summer' }], notes, songs);
    for (const show of all.shows) expect(show.sources.length, show.note.id).toBeGreaterThan(0);
  });

  it('ranks shows sharing more of the reader’s tags first, and drops shows sharing none', () => {
    const tags: Tag[] = [{ kind: 'music', value: 'Rock' }, { kind: 'aesthetic', value: 'Preppy' }];
    const { shows } = inspire(tags, notes, songs);
    expect(shows[0]!.note.id).toBe('thom-browne-fall-winter-2017'); // Rock and Preppy
    expect(shows.map(s => s.note.id)).not.toContain('balenciaga-summer-2025'); // Pop and Electronic only
    expect(inspire([], notes, songs).shows).toEqual([]);
  });

  it('lists the designers behind the matched shows, with the shows and tags that brought them in', () => {
    const { designers } = inspire([{ kind: 'music', value: 'Hip-hop' }], notes, songs);
    expect(designers.map(d => [d.designer.name, d.shows, d.matched.map(tagKey)])).toEqual([['Grace Wales Bonner', ['Wales Bonner Autumn/Winter 2024'], ['music:Hip-hop']]]);
  });

  it('stacks the runway mix first, then a playlist per tag with at least two songs, from the shows’ soundtracks only', () => {
    const { playlists } = inspire([{ kind: 'music', value: 'Rock' }, { kind: 'music', value: 'Electronic' }, { kind: 'music', value: 'Hip-hop' }], notes, songs);
    expect(playlists.map(p => p.title)).toEqual(['Your runway mix', 'Rock from the runway', 'Electronic from the runway']); // one hip-hop song: no playlist
    const rock = playlists.find(p => p.id === 'music:Rock')!;
    expect(rock.tracks.every(t => t.genres.includes('Rock'))).toBe(true);
    expect(rock.tracks.map(t => t.title)).toContain('The Dope Show');
    const runwayTitles = new Set(notes.flatMap(n => n.music?.tracks ?? []).map(t => t.title));
    for (const p of playlists) for (const t of p.tracks) expect(runwayTitles.has(t.title)).toBe(true);
  });
});

describe('featured runway', () => {
  const tags: Tag[] = [{ kind: 'music', value: 'Rock' }, { kind: 'music', value: 'Hip-hop' }, { kind: 'aesthetic', value: 'Preppy' }];
  it('leads with the tag tapped last', () => {
    expect(featuredShow(tags, notes, { kind: 'music', value: 'Hip-hop' })?.note.id).toBe('wales-bonner-autumn-winter-2024');
    expect(featuredShow(tags, notes, { kind: 'music', value: 'Rock' })?.note.id).toBe('thom-browne-fall-winter-2017');
  });
  it('falls back to the best match, and to nothing without tags', () => {
    expect(featuredShow(tags, notes)?.note.id).toBe('thom-browne-fall-winter-2017');
    expect(featuredShow(tags, notes, { kind: 'music', value: 'Jazz' })?.note.id).toBe('thom-browne-fall-winter-2017'); // Jazz isn't selected
    expect(featuredShow([], notes)).toBeNull();
  });
  it('switches a tag on and off in the quiz’s own field', () => {
    const on = withTag(emptyStyleProfile(), { kind: 'music', value: 'Hip-hop' }, true);
    expect(on.music).toEqual(['Hip-hop']);
    expect(withTag(on, { kind: 'music', value: 'Hip-hop' }, false).music).toEqual([]);
  });
});
