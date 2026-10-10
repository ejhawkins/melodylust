import { useEffect, useState } from 'react';
import { ArrowRight, Check, ExternalLink, LoaderCircle, Plus, Search, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type Association } from '@/lib/melodylust-evidence';
import { searchTrackedEditorialEvidence } from '@/lib/melodylust.functions';
import { type EvidenceSearchResult } from '@/lib/style-search';
import { foldName, moods, recommendSongs, spotifySearchUrl, type Mood, type Song } from '@/lib/song-recommendations';
import { trackStats, type TrackDetails } from '@/lib/freqblog';
import { lookupTrackDetails } from '@/lib/freqblog.functions';
import { lookupAlbumCover } from '@/lib/album-cover.functions';
import { type StyleProfile } from '@/lib/style-profile';
import { addWish } from '@/lib/wishlist';

function SongPicks({ music, designer, profile }: { music: { kind: string; name: string }; designer: string | null; profile: StyleProfile }) {
  const [mood, setMood] = useState<Mood | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const picks = recommendSongs({ music, designer, mood, profile });
  if (!picks.length) return null;
  return <section className="stylus-songs" aria-label={`Song picks for ${designer ? `${designer} × ` : ''}${music.name}`}>
    <span className="stylus-eyebrow">Song picks</span>
    <div className="stylus-moods" role="group" aria-label="Pick a mood">{moods.map(option => <button type="button" key={option} aria-pressed={mood === option} onClick={() => setMood(mood === option ? null : option)}>{option}</button>)}</div>
    <ol>{picks.map(({ song, reasons }) => {
      const name = `${song.title} — ${song.artist}`;
      return <li key={song.title} className="stylus-song">
        <SongCover song={song} />
        <div className="min-w-0">
          <div className="stylus-song-head"><h4>{song.title}</h4><span>{song.artist} · <em>{song.album}</em> · {song.year}</span></div>
          <ul className="stylus-song-reasons">{reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
          <div className="stylus-song-actions">
            <Button variant="stylusTool" asChild><a href={spotifySearchUrl(song)} target="_blank" rel="noopener noreferrer">Spotify <ArrowRight aria-hidden="true" /></a></Button>
            <Button variant="stylusTool" aria-label={`Save ${name} to My Edit`} onClick={() => { addWish({ kind: 'song', name, detail: designer ? `${designer} × ${music.name}` : music.name, link: spotifySearchUrl(song), note: '', from: 'Song picks' }); setSaved(s => [...s, song.title]); }}>{saved.includes(song.title) ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}{saved.includes(song.title) ? 'Saved' : 'My Edit'}</Button>
          </div>
        </div>
      </li>;
    })}</ol>
    <p className="stylus-evidence-note">Editor's picks, ranked by the search, the house's style, your quiz and mood. Not tracker evidence.</p>
  </section>;
}

/** The song's original album sleeve (MusicBrainz + Cover Art Archive) with FreqBlog's tempo and key.
 *  A plain sleeve shows while loading, when no cover is found, or if the image fails. */
function SongCover({ song }: { song: Song }) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [track, setTrack] = useState<TrackDetails | null>(null);
  useEffect(() => {
    setCoverUrl(null); setTrack(null);
    let current = true;
    const artist = song.artists[0] ?? song.artist;
    lookupAlbumCover({ data: { album: song.album, artist } }).then(response => { if (current) setCoverUrl(response.coverUrl); }).catch(() => {});
    lookupTrackDetails({ data: { track: song.title, artist } }).then(response => { if (current) setTrack(response.track); }).catch(() => {});
    return () => { current = false; };
  }, [song]);
  return <div className="stylus-song-cover">
    {coverUrl ? <img src={coverUrl} alt={`${song.album} album cover`} width={128} height={128} loading="lazy" onError={() => setCoverUrl(null)} /> : <span aria-hidden="true" />}
    {track && trackStats(track) && <small>{trackStats(track)}</small>}
  </div>;
}

/** Option D: the house and the artist set in the cover font — every look gets one. */
function LookCard({ designer, music }: { designer: string; music: string }) {
  return <div className="stylus-look-card" aria-hidden="true"><span>{designer}</span><span>×</span><span>{music}</span></div>;
}

const publishedMonth = (date: string) => new Date(`${date.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en', { month: 'short', year: 'numeric', timeZone: 'UTC' });

function AssociationResult({ result, profile }: { result: Association; profile: StyleProfile }) {
  const quotes = (id: string) => result.observations.filter(observation => observation.article_id === id);
  // Lead with the article that says the most about this pairing.
  const lead = [...result.sources].sort((a, b) => quotes(b.id).length - quotes(a.id).length)[0];
  return <article className="stylus-association">
    <div className="stylus-look">
      <LookCard designer={result.designer.name} music={result.music.name} />
      <div className="min-w-0">
        <div className="stylus-association-heading"><h3>{result.designer.name} × {result.music.name}</h3><span className="stylus-lift">{result.lift === null ? 'Insufficient evidence' : `${result.lift.toFixed(2)}× lift`}</span></div>
        {lead?.summary && <p className="stylus-look-description">{lead.summary}</p>}
        {lead && <p className="stylus-look-credit">— {lead.publication}, {publishedMonth(lead.published_at)}</p>}
      </div>
    </div>
    <details className="stylus-evidence-details">
      <summary>See the evidence · {result.sources.length} {result.sources.length === 1 ? 'source' : 'sources'}</summary>
      <p>{result.song_specific ? 'Song-specific evidence.' : 'Artist, genre or scene evidence; not song-specific.'}</p>
      {result.corpusSize < 30 && <p className="stylus-evidence-note">Small sample: these results measure only the tracker.</p>}
      {result.sources.map(source => <div key={source.id} className="stylus-source">
        <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} <ExternalLink aria-hidden="true" /></a>
        <p>{source.publication} · {source.published_at}</p>
        {quotes(source.id).map(observation => <blockquote key={observation.id}>“{observation.quote}”</blockquote>)}
      </div>)}
      <Button variant="stylusTool" asChild><a href={`https://open.spotify.com/search/${encodeURIComponent(result.music.name)}`} target="_blank" rel="noopener noreferrer">Find on Spotify <ArrowRight aria-hidden="true" /></a></Button>
    </details>
    <SongPicks music={result.music} designer={result.designer.name} profile={profile} />
  </article>;
}

export function MelodyLustEvidence({ profile }: { profile: StyleProfile }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<EvidenceSearchResult | null>(null);
  const [articles, setArticles] = useState<Awaited<ReturnType<typeof searchTrackedEditorialEvidence>>['articles']>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [look, setLook] = useState(0);
  // One look per house (the tracker can spell a house two ways), strongest lift first.
  const looks = result?.associations.filter((association, index, all) => all.findIndex(other => foldName(other.designer.name) === foldName(association.designer.name)) === index) ?? [];
  const current = looks[look % Math.max(looks.length, 1)];
  return <div className="stylus-evidence" aria-label="MelodyLust evidence search" aria-busy={busy}>
    <form className="stylus-search stylus-search-visible" role="search" aria-label="Music and fashion evidence" onSubmit={async event => {
      event.preventDefault();
      if (busy || !query.trim()) return;
      setError(''); setResult(null); setArticles([]); setLook(0); setBusy(true);
      try {
        const response = await searchTrackedEditorialEvidence({ data: { query: query.trim() } });
        if (response.error || !response.result) throw new Error(response.error || 'No evidence search result was returned.');
        setResult(response.result); setArticles(response.articles);
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : 'Evidence search is unavailable. Please try again.');
      } finally { setBusy(false); }
    }}>
      <label htmlFor="stylus-query" className="stylus-eyebrow font-editorial">Music &<br />fashion evidence</label>
      <div className="stylus-input-row">
        <Search aria-hidden="true" />
        <input id="stylus-query" type="search" placeholder="Artist, song or genre" value={query} onChange={event => { setQuery(event.target.value); setResult(null); setArticles([]); setError(''); }} maxLength={500} required disabled={busy} enterKeyHint="search" />
        <Button variant="stylusTool" size="icon" type="submit" className="h-11 w-11 border-stylus-ink/30 text-stylus-ink hover:bg-stylus-ink/10" aria-label="Search evidence" title="Search evidence" disabled={busy || !query.trim()}>{busy ? <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}</Button>
      </div>
    </form>
    {busy && <p role="status" className="stylus-status">Searching articles...</p>}
    {error && <p role="alert" className="stylus-status">{error}</p>}
    {result && <div className="stylus-results" aria-live="polite">
      {!result.music && <p>No {result.intent.music_kind}-level evidence for {result.intent.music_name} in the tracker. No artist, genre or scene evidence was substituted.</p>}
      {result.missingDesigner && <p>No designer evidence for {result.intent.designer_name} in the tracker.</p>}
      {result.music && !result.missingDesigner && result.associations.length === 0 && <p>No designer overlap for {result.music.name} at the {result.music.kind} evidence level. No hierarchy fallback applied.</p>}
      {looks.length > 1 && <div className="stylus-restyle"><span>Look {look % looks.length + 1} of {looks.length}</span><Button variant="stylusTool" onClick={() => setLook(index => (index + 1) % looks.length)}><Shuffle aria-hidden="true" />Restyle</Button></div>}
      {current && <AssociationResult key={`${current.designer.id}:${current.music.id}`} result={current} profile={profile} />}
      {result.music && result.associations.length === 0 && <SongPicks music={result.music} designer={null} profile={profile} />}
      {result.associations.length === 0 && articles.filter(article => !result.associations.some(association => association.sources.some(source => source.id === article.id))).map(article => <article className="stylus-source" key={article.id}>
        <a href={article.url} target="_blank" rel="noopener noreferrer">{article.title} <ExternalLink aria-hidden="true" /></a>
        <p>{article.publication} · {article.published_at}</p><p>{article.summary}</p>
      </article>)}
      {result.associations.length > 0 && <p className="stylus-evidence-note">Lift measures overlap in the tracker, not taste or causation. Evidence is from CSV metadata.</p>}
    </div>}
  </div>;
}