import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { scoutArtistArticles } from '@/lib/scout.functions';
import type { LiveScoutResponse, ScoutedArticle } from '@/lib/live-scout';

type ScoutState = { status: 'loading' | LiveScoutResponse['status']; articles: ScoutedArticle[] };

/** The publication-search half of the hybrid search: articles found on Hearst and the other allowed
 *  sites for this artist. Shown as unreviewed leads only; approved articles alone count as evidence. */
export function ScoutedArticles({ artist }: { artist: string }) {
  const [state, setState] = useState<ScoutState>({ status: 'loading', articles: [] });
  useEffect(() => {
    let current = true; // a newer artist replaces this one's answer
    setState({ status: 'loading', articles: [] });
    scoutArtistArticles({ data: { name: artist } })
      .then(response => { if (current) setState(response); })
      .catch(() => { if (current) setState({ status: 'unavailable', articles: [] }); });
    return () => { current = false; };
  }, [artist]);

  // Without a key the section stays out of the way; the approved collection above still stands.
  if (state.status === 'not_configured') return null;
  return <section className="stylus-scouted" aria-label={`More articles about ${artist}`} aria-busy={state.status === 'loading'}>
    <span className="stylus-eyebrow">From ELLE, Harper’s BAZAAR, Esquire and more · Waiting for review</span>
    {state.status === 'loading' && <p role="status" className="stylus-shop-status">Searching ELLE, Harper’s BAZAAR and Esquire for {artist}…</p>}
    {state.status === 'ok' && !state.articles.length && <p role="status" className="stylus-shop-status">No new articles about {artist} found on these publications.</p>}
    {state.status === 'rate_limited' && <p role="status" className="stylus-shop-status">Too many new searches for now. Try again in a little while.</p>}
    {state.status === 'unavailable' && <p role="status" className="stylus-shop-status">The publication search is unavailable right now. The results above still stand.</p>}
    {state.articles.map(article => <article className="stylus-source" key={article.url}>
      <a href={article.url} target="_blank" rel="noopener noreferrer">{article.title} <ExternalLink aria-hidden="true" /></a>
      <p>{article.publication} · {article.published_at}</p><p>{article.summary}</p>
    </article>)}
    {state.articles.length > 0 && <p className="stylus-evidence-note">Found by AI web search and linked to the original page. Summaries are AI-written and not yet checked by an editor, so these articles are not used as evidence or in designer connections until approved.</p>}
  </section>;
}
