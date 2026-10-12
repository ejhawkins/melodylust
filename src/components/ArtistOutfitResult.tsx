import { useState } from 'react';
import { ArrowRight, Check, Plus } from 'lucide-react';
import { Button } from './ui/button';
import type { ArtistStyleRecommendation } from '@/lib/artist-style';
import type { EvidenceDocument } from '@/lib/melodylust-evidence';
import { FREQBLOG_ATTRIBUTION } from '@/lib/artist-provider';
import { addWish } from '@/lib/wishlist';
import { outfitSearchItems } from '@/lib/outfit-search';
import { ShopProducts } from './ShopProducts';

export { outfitSearchItems } from '@/lib/outfit-search';

/** Outfit suggestions and their actual inputs stay separate from documented artist facts. */
export function ArtistOutfitResult({ recommendation, articles }: { recommendation: ArtistStyleRecommendation; articles: EvidenceDocument[] }) {
  const [index, setIndex] = useState(0);
  const [saved, setSaved] = useState<string[]>([]);
  const look = recommendation.looks[index % recommendation.looks.length];
  if (!look) return null;
  const artist = recommendation.artist;
  const from = `Editorial outfit for ${artist.name}`;
  const source = artist.source === 'freqblog' ? 'FreqBlog' : artist.source === 'article' ? 'approved article collection' : artist.source === 'mock' ? 'mock sample data' : 'Melody Lust directory';
  return <section className="stylus-artist-outfit" aria-label={`Outfit ideas for ${artist.name}`} aria-live="polite">
    <span className="stylus-eyebrow">Your artist edit · Editorial suggestion</span>
    <h3>{artist.name}</h3>
    <p className="stylus-artist-meta">Artist matched through {source}.{artist.genres.length > 0 && ` Music genres: ${artist.genres.join(', ')}.`}</p>
    <div className="stylus-notes">
      <h4>{look.title}</h4>
      <p>{look.direction}</p>
      <ol>{look.pieces.map(piece => <li key={piece.name}>
        <span><strong>{piece.name}</strong> {piece.detail}</span>
        <Button variant="stylusTool" size="icon" aria-label={`Save ${piece.name} to My Edit`} onClick={() => { addWish({ kind: 'piece', name: piece.name, detail: piece.detail, link: '', note: '', from }); setSaved(current => [...current, piece.name]); }}>{saved.includes(piece.name) ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}</Button>
      </li>)}</ol>
    </div>
    {/* Keyed by artist and outfit: a new search or "Another outfit" starts a fresh product list. */}
    <ShopProducts key={`${artist.id}:${index % recommendation.looks.length}`} designer={null} items={outfitSearchItems(look.pieces)} from={from}
      seed={`${artist.id}|${look.id}`} genres={artist.genres}
      title="Shop pieces like these" showStatus note={`Real Farfetch listings that match this outfit's pieces, found by search. They are suggestions, not items ${artist.name} wore. Prices and stock change.`} />
    <div className="stylus-restyle"><span>Outfit {index % recommendation.looks.length + 1} of {recommendation.looks.length}</span><Button variant="stylusTool" onClick={() => setIndex(current => current + 1)}>Another outfit <ArrowRight aria-hidden="true" /></Button></div>
    <details className="stylus-evidence-details">
      <summary>Why this outfit?</summary>
      <ul>{look.reasons.map((reason, i) => {
        const article = reason.articleId ? articles.find(source => source.id === reason.articleId) : null;
        return <li key={i}>{reason.text}{article && <> <a href={article.url} target="_blank" rel="noopener noreferrer">Read source</a></>}</li>;
      })}</ul>
      {(artist.source === 'freqblog') && <p>{FREQBLOG_ATTRIBUTION}</p>}
    </details>
    <p className="stylus-evidence-note">These are editorial outfit ideas, not claims about what {artist.name} wears. Genre-to-style matches are creative choices. Documented fashion connections appear with their sources above.</p>
  </section>;
}
