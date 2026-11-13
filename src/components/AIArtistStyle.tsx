import { useEffect, useState } from 'react';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { styleArtistWithAI } from '@/lib/ai-style.functions';
import { lookupArtistSongs } from '@/lib/freqblog.functions';
import { scoutArtistArticles } from '@/lib/scout.functions';
import type { AIStyleResponse } from '@/lib/ai-style';
import type { ArtistStyleRecommendation } from '@/lib/artist-style';
import type { EvidenceDocument } from '@/lib/melodylust-evidence';
import type { StyleProfile } from '@/lib/style-profile';
import { ArtistOutfitResult } from './ArtistOutfitResult';
import { ShopProducts } from './ShopProducts';

type State = { status: 'loading' } | AIStyleResponse;

const preferencesOf = (profile: StyleProfile) => [...new Set([profile.color, profile.material, profile.pattern, profile.item, profile.fit, profile.details, profile.occasion, profile.season, profile.aesthetic].flat())].slice(0, 20);

/** AI styling for a searched artist: evidence-backed ideas (quoting approved articles) first, then
 *  creative ones, which may draw keywords, vibes and named brands from the publication coverage,
 *  each with real catalog matches. Without AI it falls back to the rule-based outfit. */
export function AIArtistStyle({ recommendation, articles, profile }: { recommendation: ArtistStyleRecommendation; articles: EvidenceDocument[]; profile: StyleProfile }) {
  const artist = recommendation.artist;
  const [state, setState] = useState<State>({ status: 'loading' });
  const [index, setIndex] = useState(0);
  useEffect(() => {
    let current = true; // a newer artist replaces this one's answer
    setState({ status: 'loading' }); setIndex(0);
    (async () => {
      // Same server-cached answers the song and coverage sections use, so these cost no extra API request.
      const [songs, coverage] = await Promise.all([
        lookupArtistSongs({ data: { artist: artist.name } }).then(r => r.songs.map(s => s.title)).catch(() => []),
        scoutArtistArticles({ data: { name: artist.name } }).then(r => r.articles).catch(() => []),
      ]);
      const response = await styleArtistWithAI({ data: {
        artist: artist.name, genres: artist.genres.slice(0, 8), songs,
        articles: articles.slice(0, 8).map(a => ({ id: a.id, title: a.title, summary: a.summary, url: a.url })),
        coverage: coverage.slice(0, 10).map(a => ({ url: a.url, publication: a.publication, title: a.title, summary: a.summary })),
        preferences: preferencesOf(profile),
      } });
      if (current) setState(response);
    })().catch(() => { if (current) setState({ status: 'unavailable', suggestions: [], provider: '' }); });
    return () => { current = false; };
  }, [artist.name, artist.genres.join(','), articles.map(a => a.id).join(','), preferencesOf(profile).join(',')]);

  if (state.status === 'loading') return <p role="status" className="stylus-status">Styling ideas for {artist.name}…</p>;
  if (state.status !== 'ok' || !state.suggestions.length) return <ArtistOutfitResult recommendation={recommendation} articles={articles} />;
  const idea = state.suggestions[index % state.suggestions.length]!;
  const from = `AI styling idea for ${artist.name}`;
  return <section className="stylus-artist-outfit" aria-label={`Styling ideas for ${artist.name}`} aria-live="polite">
    <span className="stylus-eyebrow">{idea.basis === 'evidence' ? 'From the articles · AI-styled' : idea.inspiration ? `Inspired by ${idea.inspiration.publication} coverage · AI-styled` : 'Creative idea · AI-generated'}</span>
    <h3>{artist.name}</h3>
    <div className="stylus-notes">
      <h4>{idea.title}</h4>
      <p>{idea.why}</p>
      {idea.source && <blockquote className="stylus-look-credit">“{idea.source.quote}” <a href={idea.source.url} target="_blank" rel="noopener noreferrer">{idea.source.title} <ExternalLink aria-hidden="true" className="inline h-3 w-3" /></a></blockquote>}
      {idea.inspiration && <p className="stylus-look-credit">Inspired by {idea.inspiration.publication}: <a href={idea.inspiration.url} target="_blank" rel="noopener noreferrer">{idea.inspiration.title} <ExternalLink aria-hidden="true" className="inline h-3 w-3" /></a></p>}
      <ol>{idea.pieces.map(piece => <li key={piece.item}><span><strong>{piece.brand ? `${piece.brand} ${piece.item}` : piece.item}</strong> {piece.note}</span></li>)}</ol>
    </div>
    <ShopProducts key={`${artist.id}:${idea.title}`} designer={null} items={idea.pieces.map(piece => piece.item)} brands={idea.pieces.map(piece => piece.brand)} from={from}
      seed={`${artist.id}|${idea.title}`} genres={artist.genres} look={idea.title}
      title="Shop pieces like these" showStatus note={`Real Farfetch listings matched to this idea's pieces by search. Suggestions only, not items ${artist.name} wore. Prices and stock change.`} />
    {state.suggestions.length > 1 && <div className="stylus-restyle"><span>Idea {index % state.suggestions.length + 1} of {state.suggestions.length}</span><Button variant="stylusTool" onClick={() => setIndex(i => i + 1)}>Another idea <ArrowRight aria-hidden="true" /></Button></div>}
    <p className="stylus-evidence-note">{idea.basis === 'evidence'
      ? 'Built on the quoted line from an approved article; the outfit itself is an AI styling suggestion.'
      : idea.inspiration
        ? `A creative idea drawn from unreviewed ${idea.inspiration.publication} coverage of ${artist.name}. Brands come only from what the coverage names; not a claim about what ${artist.name} wore.`
        : `A creative interpretation of ${artist.name}'s music and your preferences. Not based on what ${artist.name} wore.`}</p>
  </section>;
}
