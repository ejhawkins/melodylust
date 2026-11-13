import { useEffect, useState } from 'react';
import { ArrowRight, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { lookupArtistSongs } from '@/lib/freqblog.functions';
import type { ArtistSong } from '@/lib/freqblog';
import { FREQBLOG_ATTRIBUTION } from '@/lib/artist-provider';
import { addWish } from '@/lib/wishlist';

/** The searched artist's three most popular songs from the music directory, for any artist. */
export function ArtistSongs({ artist }: { artist: string }) {
  const [songs, setSongs] = useState<ArtistSong[] | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  useEffect(() => {
    let current = true; // a newer artist replaces this one's answer
    setSongs(null);
    lookupArtistSongs({ data: { artist } }).then(response => { if (current) setSongs(response.songs); }).catch(() => { if (current) setSongs([]); });
    return () => { current = false; };
  }, [artist]);
  // Loading, no key or no songs: the section stays out of the way.
  if (!songs?.length) return null;
  return <section className="stylus-songs artist-song-results" aria-label={`Top songs by ${artist}`}>
    <span className="stylus-eyebrow">Three songs by {artist}</span>
    <ol>{songs.map((song, index) => {
      const name = `${song.title} — ${artist}`;
      return <li key={song.title} className="stylus-song">
        <span className="artist-song-rank" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
        <div className="min-w-0">
          <div className="stylus-song-head"><h4>{song.title}</h4><span className="artist-song-artist">{artist}</span>{(song.album || song.year) && <span className="artist-song-release">{song.album}{song.album && song.year && ' · '}{song.year}</span>}</div>
          {song.genre && <ul className="stylus-song-reasons"><li>{song.genre}</li></ul>}
          <div className="stylus-song-actions">
            <Button variant="stylusTool" asChild><a href={song.spotifyUrl} target="_blank" rel="noopener noreferrer">Spotify <ArrowRight aria-hidden="true" /></a></Button>
            <Button variant="stylusTool" aria-label={`Save ${name} to My Edit`} onClick={() => { addWish({ kind: 'song', name, detail: artist, link: song.spotifyUrl, note: '', from: 'Top songs' }); setSaved(s => [...s, song.title]); }}>{saved.includes(song.title) ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}{saved.includes(song.title) ? 'Saved' : 'My Edit'}</Button>
          </div>
        </div>
      </li>;
    })}</ol>
    <p className="stylus-evidence-note">Most popular songs in the music directory. Not fashion evidence. {FREQBLOG_ATTRIBUTION}</p>
  </section>;
}
