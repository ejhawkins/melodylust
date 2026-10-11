import { describe, expect, it } from 'vitest';
import { canonicalUrl, parseScoutJson, readScoutCandidates, stripCitations } from './article-scout';

const article = (overrides: Record<string, unknown> = {}) => ({
  url: 'https://www.elle.com/fashion/celebrity-style/a1/usher-off-white/?utm_source=x',
  publication: 'ELLE', published_at: '2024-02-12', title: "Usher's Halftime Wardrobe",
  summary: 'Usher closed his halftime show in a crystal-covered Off-White biker suit.', categories: ['Fashion'],
  ...overrides,
});
const cited = ['https://elle.com/fashion/celebrity-style/a1/usher-off-white'];

describe('article scout', () => {
  it('keeps cited articles from allowed publications, with a clean URL', () => {
    const { accepted, rejected } = readScoutCandidates({ articles: [article()] }, cited, [], 'Usher');
    expect(rejected).toEqual([]);
    expect(accepted).toEqual([{ ...article(), url: 'https://elle.com/fashion/celebrity-style/a1/usher-off-white' }]);
  });

  it('drops URLs the search never cited, so the model cannot invent articles', () => {
    const { accepted, rejected } = readScoutCandidates({ articles: [article({ url: 'https://www.elle.com/made-up' })] }, cited, [], 'Usher');
    expect(accepted).toEqual([]);
    expect(rejected[0]?.reason).toBe('not a cited search result');
  });

  it('drops other publications, tracked articles, duplicates and summaries that miss the artist', () => {
    const vogue = 'https://www.vogue.com/article/usher';
    const result = readScoutCandidates({ articles: [
      article({ url: vogue }),
      article(),
      article(),
      article({ url: 'https://esquiresg.com/usher-two', summary: 'A look at halftime fashion through the years, with crystals.' }),
    ] }, [...cited, vogue, 'https://esquiresg.com/usher-two'], [], 'Usher');
    expect(result.accepted).toHaveLength(1);
    expect(result.rejected.map(r => r.reason)).toEqual(['not an allowed publication', 'already tracked or duplicate', 'summary does not name Usher']);
    expect(readScoutCandidates({ articles: [article()] }, cited, ['http://www.elle.com/fashion/celebrity-style/a1/usher-off-white/'], 'Usher').accepted).toEqual([]);
  });

  it('rejects incomplete rows and non-ISO dates', () => {
    const { rejected } = readScoutCandidates({ articles: [article({ published_at: 'Feb 12, 2024' }), { url: 'https://elle.com/x' }] }, cited, [], 'Usher');
    expect(rejected.every(r => r.reason.startsWith('incomplete'))).toBe(true);
  });

  it('strips pasted citation links from summaries', () => {
    const summary = 'Usher wore custom Off-White at the halftime show. ([harpersbazaar.com](https://www.harpersbazaar.com/a1/))';
    expect(stripCitations(summary)).toBe('Usher wore custom Off-White at the halftime show.');
    expect(stripCitations('Per [ELLE](https://elle.com/x), Usher wore Dior.')).toBe('Per ELLE, Usher wore Dior.');
    expect(readScoutCandidates({ articles: [article({ summary })] }, cited, [], 'Usher').accepted[0]?.summary).toBe('Usher wore custom Off-White at the halftime show.');
  });

  it('reads JSON wrapped in prose or code fences', () => {
    expect(parseScoutJson('Here you go:\n```json\n{"articles":[]}\n```')).toEqual({ articles: [] });
    expect(parseScoutJson('no json here')).toBeNull();
    expect(canonicalUrl('not a url')).toBeNull();
  });
});

it('accepts cited Esquire music-video coverage without inventing a designer', () => {
  const url = 'https://www.esquire.com/entertainment/music/a26590682/cardi-b-bruno-mars-please-me-video/';
  const candidate = { url, publication: 'Esquire', published_at: '2019-03-01', title: 'Cardi B and Bruno Mars music video', summary: 'Bruno Mars and Cardi B appear in a music video with a 1990s visual aesthetic.', categories: ['Music Videos'] };
  const result = readScoutCandidates({ articles: [candidate] }, [url], [], 'Bruno Mars');
  expect(result.rejected).toEqual([]);
  expect(result.accepted).toHaveLength(1);
});
