import { useState } from 'react';
import { ArrowRight, ExternalLink, LoaderCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type Association } from '@/lib/melodylust-evidence';
import { searchTrackedEditorialEvidence } from '@/lib/melodylust.functions';
import { type EvidenceSearchResult } from '@/lib/style-search';

function AssociationResult({ result }: { result: Association }) {
  return <article className="stylus-association">
    <div className="stylus-association-heading"><h3>{result.designer.name} × {result.music.name}</h3><span className="stylus-lift">{result.lift === null ? 'Insufficient evidence' : `${result.lift.toFixed(2)}× lift`}</span></div>
    <p>{result.song_specific ? 'Song-specific evidence.' : 'Artist, genre or scene evidence; not song-specific.'}</p>
    {result.corpusSize < 30 && <p className="stylus-evidence-note">Small sample: these results measure only the tracker.</p>}
    {result.sources.map(source => <div key={source.id} className="stylus-source">
      <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} <ExternalLink aria-hidden="true" /></a>
      <p>{source.publication} · {source.published_at}</p>
      {result.observations.filter(observation => observation.article_id === source.id).map(observation => <blockquote key={observation.id}>“{observation.quote}”</blockquote>)}
    </div>)}
    <Button variant="stylusTool" asChild><a href={`https://open.spotify.com/search/${encodeURIComponent(result.music.name)}`} target="_blank" rel="noopener noreferrer">Find on Spotify <ArrowRight aria-hidden="true" /></a></Button>
  </article>;
}

export function MelodyLustEvidence() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<EvidenceSearchResult | null>(null);
  const [articles, setArticles] = useState<Awaited<ReturnType<typeof searchTrackedEditorialEvidence>>['articles']>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <div className="stylus-evidence" aria-label="MelodyLust evidence search" aria-busy={busy}>
    <form className="stylus-search stylus-search-visible" role="search" aria-label="Music and fashion evidence" onSubmit={async event => {
      event.preventDefault();
      if (busy || !query.trim()) return;
      setError(''); setResult(null); setArticles([]); setBusy(true);
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
      {result.associations.map(association => <AssociationResult key={`${association.designer.id}:${association.music.id}`} result={association} />)}
      {articles.filter(article => !result.associations.some(association => association.sources.some(source => source.id === article.id))).map(article => <article className="stylus-source" key={article.id}>
        <a href={article.url} target="_blank" rel="noopener noreferrer">{article.title} <ExternalLink aria-hidden="true" /></a>
        <p>{article.publication} · {article.published_at}</p><p>{article.summary}</p>
      </article>)}
      {result.associations.length > 0 && <p className="stylus-evidence-note">Lift measures overlap in the tracker, not taste or causation. Evidence is from CSV metadata.</p>}
    </div>}
  </div>;
}