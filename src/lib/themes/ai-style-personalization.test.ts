import { describe, expect, it } from 'vitest';
import { AI_STYLE_PROMPT, aiStyleCacheKey, aiStyleInputSchema, aiStylePayload, readAIStyle } from '../ai-style';
import type { Association, EvidenceDocument, Observation } from '../melodylust-evidence';
import { songCatalog } from '../song-recommendations';
import { articleStrengths, articlesForStyle, songsForStyle } from './style-evidence';
import { ROOM_THEMES } from './theme-spec';

const article = { id: '22', title: 'Usher’s 2025 Met Gala Scarf Was a Dandy Touch Done Right', summary: 'Usher arrived at the 2025 Met Gala in a classic black three-piece suit from Ralph Lauren paired with a white scarf.', url: 'https://harpersbazaar.com/a' };
const base = { artist: 'Usher', genres: ['r&b'], articles: [article] };

describe('the style in the AI step', () => {
  it('accepts only known theme ids', () => {
    expect(aiStyleInputSchema.parse({ ...base, style: 'hiphop-runway' }).style).toBe('hiphop-runway');
    expect(() => aiStyleInputSchema.parse({ ...base, style: 'made-up' })).toThrow();
    expect(aiStyleInputSchema.parse(base).style).toBeUndefined();
  });

  it('sends the theme spec’s tone, garments and genres, never a setlist or client-written constraints', () => {
    const payload = aiStylePayload(aiStyleInputSchema.parse({ ...base, style: 'hiphop-runway' }));
    const theme = ROOM_THEMES['hiphop-runway'];
    expect('style' in payload && payload.style).toEqual({ label: theme.label, tone: theme.copy.tone, garmentKeywords: theme.content.garmentKeywords, genres: theme.content.genres });
    expect(JSON.stringify(payload)).not.toContain('catalogKey');
    expect('style' in aiStylePayload(aiStyleInputSchema.parse(base))).toBe(false);
    expect(AI_STYLE_PROMPT).toMatch(/never makes an idea basis "evidence"/);
  });

  it('changes the cache key when the style changes, and keeps the old key without one', () => {
    const none = aiStyleInputSchema.parse(base);
    const hiphop = aiStyleInputSchema.parse({ ...base, style: 'hiphop-runway' });
    const tartan = aiStyleInputSchema.parse({ ...base, style: 'autumn-tartan' });
    expect(new Set([aiStyleCacheKey(none), aiStyleCacheKey(hiphop), aiStyleCacheKey(tartan)]).size).toBe(3);
    expect(aiStyleCacheKey(none)).toBe(JSON.stringify(['usher', ['r&b'], [], ['22'], [], []]));
  });

  it('still drops an evidence idea whose quote is not an exact substring, whatever the style', () => {
    const input = aiStyleInputSchema.parse({ ...base, style: 'hiphop-runway' });
    const idea = (quote: string) => ({ title: 'Dandy black tie', basis: 'evidence', why: 'From the article.', article_id: '22', quote, pieces: [{ item: 'three-piece suit', note: 'n' }, { item: 'white scarf', note: 'n' }] });
    expect(readAIStyle({ suggestions: [idea('a classic black three-piece suit from Ralph Lauren')] }, input)).toHaveLength(1);
    expect(readAIStyle({ suggestions: [idea('a classic black chain-draped suit from Ralph Lauren')] }, input)).toHaveLength(0);
  });
});

describe('evidence and songs by style', () => {
  const doc = (id: string, summary = ''): EvidenceDocument => ({ id, url: `https://x/${id}`, publication: 'P', published_at: '2025-01-01', title: `Article ${id}`, summary, categories: [], entity_ids: [] });
  const obs = (article_id: string, relationship: Observation['relationship']): Observation => ({ id: `${article_id}-${relationship}`, article_id, left_id: 'd', right_id: 'a', relationship, quote: 'q', field: 'summary', section: 'summary', proximity: 'same_sentence', evidence_level: 'artist', song_specific: false });
  const associations = [{ sources: [doc('v'), doc('q')], observations: [obs('v', 'worn_by'), obs('q', 'co_occurs_with')] }] as Pick<Association, 'sources' | 'observations'>[];
  const articles = [doc('c', 'a leather jacket'), doc('q'), doc('v')];

  it('reads each article’s strongest tie', () => {
    expect(Object.fromEntries(articleStrengths(associations))).toEqual({ v: 'verified', q: 'quoted' });
  });

  it('applies the theme’s evidence minimum and puts stronger evidence first', () => {
    const strengths = articleStrengths(associations);
    expect(articlesForStyle(articles, strengths, ROOM_THEMES['hiphop-runway']).map(a => a.id)).toEqual(['v', 'q']); // quoted-together minimum
    expect(articlesForStyle(articles, strengths, ROOM_THEMES['autumn-tartan']).map(a => a.id)).toEqual(['v', 'q', 'c']); // contextual minimum
    expect(articlesForStyle(articles, strengths, null)).toBe(articles); // no style: unchanged
  });

  it('orders song picks by the theme’s setlist, then its genres, using catalog songs only', () => {
    const picks = songCatalog.map(song => ({ song }));
    const ordered = songsForStyle(picks, ROOM_THEMES['hiphop-runway']).map(p => `${p.song.title}|${p.song.artist}`);
    expect(ordered.slice(0, 4)).toEqual(ROOM_THEMES['hiphop-runway'].setlist.map(entry => entry.catalogKey));
    expect(songsForStyle(picks, null)).toBe(picks);
  });
});
