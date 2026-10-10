/** Editor's song picks for a designer × music result. Pure and deterministic: every point a
 *  song earns comes with a plain-language reason, so a pick can always explain itself.
 *  Picks are editorial curation layered on the evidence search, not tracker evidence. */

export const moods = ['Hype', 'Smooth', 'Late night', 'Moody', 'Rebellious', 'Romantic'] as const;
export type Mood = (typeof moods)[number];
/** Same genre names as the style-profile quiz, so quiz answers match directly. */
type Genre = 'R&B' | 'Hip-hop' | 'Pop' | 'Rock' | 'Electronic';

export type Song = {
  title: string;
  artist: string;
  /** Lead artist first, then featured artists / members who should also match a search. */
  artists: string[];
  year: number;
  genres: Genre[];
  moods: Mood[];
  /** A documented fashion moment tying this song to a designer. */
  moment?: { designer: string; note: string };
};

export const songCatalog: Song[] = [
  { title: 'Yeah!', artist: 'Usher feat. Lil Jon & Ludacris', artists: ['Usher', 'Lil Jon', 'Ludacris'], year: 2004, genres: ['R&B', 'Hip-hop'], moods: ['Hype', 'Late night'],
    moment: { designer: 'Off-White', note: 'Performed at his 2024 Super Bowl halftime show, where he wore the Off-White crystal biker suit' } },
  { title: 'Love in This Club', artist: 'Usher feat. Young Jeezy', artists: ['Usher', 'Young Jeezy'], year: 2008, genres: ['R&B', 'Hip-hop'], moods: ['Late night', 'Smooth'] },
  { title: 'U Got It Bad', artist: 'Usher', artists: ['Usher'], year: 2001, genres: ['R&B'], moods: ['Smooth', 'Romantic'] },
  { title: 'Confessions Part II', artist: 'Usher', artists: ['Usher'], year: 2004, genres: ['R&B'], moods: ['Moody', 'Late night'] },
  { title: 'OMG', artist: 'Usher feat. will.i.am', artists: ['Usher', 'will.i.am'], year: 2010, genres: ['Pop', 'R&B', 'Electronic'], moods: ['Hype'] },
  { title: 'Just a Girl', artist: 'No Doubt', artists: ['No Doubt', 'Gwen Stefani'], year: 1995, genres: ['Rock', 'Pop'], moods: ['Rebellious', 'Hype'] },
  { title: "Don't Speak", artist: 'No Doubt', artists: ['No Doubt', 'Gwen Stefani'], year: 1996, genres: ['Rock', 'Pop'], moods: ['Moody', 'Romantic'] },
  { title: 'Hollaback Girl', artist: 'Gwen Stefani', artists: ['Gwen Stefani'], year: 2005, genres: ['Pop', 'Hip-hop'], moods: ['Hype', 'Rebellious'] },
  { title: 'good 4 u', artist: 'Olivia Rodrigo', artists: ['Olivia Rodrigo'], year: 2021, genres: ['Pop', 'Rock'], moods: ['Rebellious', 'Hype'] },
  { title: 'vampire', artist: 'Olivia Rodrigo', artists: ['Olivia Rodrigo'], year: 2023, genres: ['Pop', 'Rock'], moods: ['Moody', 'Rebellious'] },
];

/** Editor's read of each house's sound — the "style" half of a designer × music pairing. */
export const designerLanes: Record<string, { lane: string; genres: Genre[] }> = {
  'Off-White': { lane: 'streetwear', genres: ['Hip-hop', 'R&B'] },
  'Dolce & Gabbana': { lane: 'glamour', genres: ['Pop'] },
  'Jacquie Aiche': { lane: 'crystal-lit', genres: ['R&B'] },
  'Alexander McQueen': { lane: 'dark romance', genres: ['Rock', 'Electronic'] },
  'Bianca Saunders': { lane: 'soft tailoring', genres: ['R&B'] },
  'Dr. Martens': { lane: 'punk', genres: ['Rock'] },
};

export type SongQuery = {
  /** The searched music entity, as the evidence search resolved it. */
  music?: { kind: string; name: string } | null;
  designer?: string | null;
  mood?: Mood | null;
  profile?: { music?: readonly string[]; artists?: string } | null;
};
export type SongPick = { song: Song; score: number; reasons: string[] };

/** "Off White", "off-white" and "OFF–WHITE" all fold to "offwhite". */
export const foldName = (value: string) => value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
const same = (a: string, b: string) => foldName(a) === foldName(b);

/** Stable per-house shuffle for tied songs (FNV-1a), so each look on Restyle leads with a different track. */
function tieBreak(designer: string, title: string) {
  let hash = 0x811c9dc5;
  for (const char of `${foldName(designer)}|${title}`) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193);
  return hash >>> 0;
}

export function recommendSongs({ music, designer, mood, profile }: SongQuery, limit = 3): SongPick[] {
  const lane = designer ? Object.entries(designerLanes).find(([name]) => same(name, designer)) : undefined;
  const quizGenres = profile?.music ?? [];
  const quizArtists = foldName(profile?.artists ?? '');

  const picks = songCatalog.map(song => {
    let score = 0;
    let connected = false;
    const reasons: string[] = [];
    /** `connects` marks reasons tied to the search or designer; mood and taste only re-rank. */
    const add = (points: number, reason: string, connects = true) => { score += points; reasons.push(reason); connected ||= connects; };

    if (music?.kind === 'song' && same(song.title, music.name)) add(5, 'The song you searched');
    const searchedArtist = music && music.kind !== 'song' ? song.artists.find(name => same(name, music.name)) : undefined;
    if (searchedArtist) add(3, `By ${searchedArtist}, the artist you searched`);
    const searchedGenre = music && music.kind === 'genre' ? song.genres.find(genre => same(genre, music.name)) : undefined;
    if (searchedGenre) add(2, `${searchedGenre}, the genre you searched`);
    if (designer && song.moment && same(song.moment.designer, designer)) add(3, song.moment.note);
    const laneGenres = lane ? song.genres.filter(genre => lane[1].genres.includes(genre)) : [];
    if (lane && laneGenres.length) add(2, `Fits ${lane[0]}'s ${lane[1].lane} lane: ${laneGenres.join(' & ')}`);
    const quizMatches = song.genres.filter(genre => quizGenres.some(choice => same(choice, genre)));
    if (quizMatches.length) add(Math.min(quizMatches.length, 2), `Matches your quiz: ${quizMatches.join(' & ')}`, false);
    if (quizArtists && song.artists.some(name => quizArtists.includes(foldName(name)))) add(1, 'An artist from your style profile', false);
    if (mood && song.moods.includes(mood)) add(2, `${mood} mood`, false);
    return { song, score, reasons, connected };
  });

  return picks
    .filter(pick => pick.connected)
    .sort((a, b) => b.score - a.score || (designer ? tieBreak(designer, a.song.title) - tieBreak(designer, b.song.title) : 0) || songCatalog.indexOf(a.song) - songCatalog.indexOf(b.song))
    .slice(0, limit)
    .map(({ song, score, reasons }) => ({ song, score, reasons }));
}

export const spotifySearchUrl = (song: Song) => `https://open.spotify.com/search/${encodeURIComponent(`${song.title} ${song.artists[0]}`)}`;
