import type { ArtistSuggestion } from '@/lib/artist-search';

/** The shared artist autocomplete listbox: one option per suggestion, with the
 *  source labelled so mock and provider data are never mistaken for the directory. */
export function ArtistSuggestionList({ id, results, expanded, active, onChoose }: {
  id: string;
  results: ArtistSuggestion[];
  expanded: boolean;
  active: number;
  onChoose: (artist: ArtistSuggestion) => void;
}) {
  return <ul id={`${id}-list`} role="listbox" aria-label="Artist suggestions" hidden={!expanded}>
    {results.map((artist, index) => <li key={artist.id} id={`${id}-option-${index}`} role="option" aria-selected={index === active}
      onMouseDown={event => event.preventDefault()} onClick={() => onChoose(artist)}>
      {artist.imageUrl && <img src={artist.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />}
      <span className="artist-option-copy"><strong>{artist.name}</strong><span>{artist.genres.join(' · ')}</span>{artist.disambiguation && <small>{artist.disambiguation}</small>}</span>
      <small className="artist-source">{artist.source === 'mock' ? 'Mock data' : artist.source === 'freqblog' ? 'via FreqBlog' : 'Melody Lust'}</small>
    </li>)}
  </ul>;
}
