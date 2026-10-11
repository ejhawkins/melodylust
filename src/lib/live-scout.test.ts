import { describe, expect, it, vi } from 'vitest';
import { findArtistArticles, likePattern, scoutKey, type LiveScoutSteps, type ScoutedArticle } from './live-scout';

const saved: ScoutedArticle = { url: 'https://elle.com/fashion/bruno-mars-saint-laurent', publication: 'ELLE', published_at: '2014-02-02', title: 'Bruno Mars Wears Custom Saint Laurent', summary: 'Bruno Mars wore custom Saint Laurent at the Super Bowl.' };
const proposal = (url: string, summary = 'Tate McRae wore a sheer corset dress on the red carpet.') => ({ url, publication: 'ELLE', published_at: '2025-05-05', title: 'Tate McRae at the Met Gala', summary, categories: ['Red Carpet'] });

const steps = (overrides: Partial<LiveScoutSteps> = {}): LiveScoutSteps => ({
  savedCandidates: vi.fn(async () => []),
  knownUrls: vi.fn(async () => []),
  search: vi.fn(async () => ({ payload: { articles: [] }, cited: [] })),
  save: vi.fn(async () => {}),
  ...overrides,
});

describe('live article discovery for a searched artist', () => {
  it('shows saved candidates without paying for a new web search', async () => {
    const s = steps({ savedCandidates: vi.fn(async () => [saved]) });
    expect(await findArtistArticles('Bruno Mars', s)).toEqual({ articles: [saved], searched: false, rejected: 0 });
    expect(s.search).not.toHaveBeenCalled();
    expect(s.save).not.toHaveBeenCalled();
  });

  it('searches when nothing is saved, keeps only cited, new pages that name the artist, and saves them for review', async () => {
    const s = steps({
      knownUrls: vi.fn(async () => ['https://www.elle.com/culture/already-tracked']),
      search: vi.fn(async () => ({
        payload: { articles: [
          proposal('https://www.elle.com/fashion/tate-mcrae-met-gala'),
          proposal('https://elle.com/culture/already-tracked'), // known already
          proposal('https://www.elle.com/fashion/made-up-address'), // the search never returned it
          proposal('https://www.vogue.com/tate'), // not an allowed publication
          proposal('https://www.elle.com/fashion/someone-else', 'Olivia Rodrigo wore a slip dress to the premiere.'), // does not name the artist
        ] },
        cited: ['https://www.elle.com/fashion/tate-mcrae-met-gala', 'https://elle.com/culture/already-tracked', 'https://www.vogue.com/tate', 'https://www.elle.com/fashion/someone-else'],
      })),
    });
    const found = await findArtistArticles('Tate McRae', s);
    expect(found?.articles.map(a => a.url)).toEqual(['https://elle.com/fashion/tate-mcrae-met-gala']);
    expect(found).toMatchObject({ searched: true, rejected: 4 });
    // Saved as candidates by the caller; the article is shown without categories or any score.
    expect(s.save).toHaveBeenCalledWith([expect.objectContaining({ url: 'https://elle.com/fashion/tate-mcrae-met-gala' })]);
    expect(Object.keys(found!.articles[0]!).sort()).toEqual(['publication', 'published_at', 'summary', 'title', 'url']);
  });

  it('returns an empty list when no credible source exists, and null when a search may not run', async () => {
    expect(await findArtistArticles('Tate McRae', steps())).toEqual({ articles: [], searched: true, rejected: 0 });
    expect(await findArtistArticles('Tate McRae', steps({ search: vi.fn(async () => null) }))).toBeNull();
  });

  it('ignores a malformed search answer rather than inventing articles', async () => {
    const found = await findArtistArticles('Tate McRae', steps({ search: vi.fn(async () => ({ payload: null, cited: ['https://elle.com/x'] })) }));
    expect(found?.articles).toEqual([]);
  });

  it('matches artist names literally and case-insensitively', () => {
    expect(scoutKey('  Charli   XCX ')).toBe(scoutKey('charli xcx'));
    expect(likePattern('100%_Real\\')).toBe('%100\\%\\_Real\\\\%');
  });
});
