import { describe, expect, it } from 'vitest';
import { aiStyleCacheKey, aiStyleInputSchema, namedBrand, readAIStyle } from './ai-style';

const input = aiStyleInputSchema.parse({
  artist: 'Charli XCX', genres: ['Pop'], songs: ['360'],
  articles: [{ id: '10', title: "Examining Charli XCX's Audacious Style", summary: 'a Saint Laurent leather jacket at the brand\'s pre-Oscars party', url: 'https://elle.in/charli-xcx-audacious-style/' }],
});
const idea = (extra: Record<string, unknown>) => ({ title: 'Leather after dark', why: 'Builds on the quoted look.', pieces: [{ item: 'leather jacket', note: 'Cropped.' }, { item: 'mini skirt', note: 'Black.' }], ...extra });

describe('Gemini styling suggestions', () => {
  it('keeps an evidence idea only when its quote is an exact line from the named approved article', () => {
    const [kept] = readAIStyle({ suggestions: [idea({ basis: 'evidence', article_id: '10', quote: 'a Saint Laurent leather jacket' })] }, input);
    expect(kept).toMatchObject({ basis: 'evidence', source: { articleId: '10', quote: 'a Saint Laurent leather jacket', url: 'https://elle.in/charli-xcx-audacious-style/' } });
    // Paraphrased quote, unknown article, or no quote: dropped, never relabelled as evidence or creative.
    expect(readAIStyle({ suggestions: [
      idea({ basis: 'evidence', article_id: '10', quote: 'a Saint Laurent jacket in leather' }),
      idea({ basis: 'evidence', article_id: '99', quote: 'a Saint Laurent leather jacket' }),
      idea({ basis: 'evidence', article_id: '10', quote: null }),
    ] }, input)).toEqual([]);
  });

  it('keeps creative ideas apart, with no source, and lists evidence first', () => {
    const result = readAIStyle({ suggestions: [idea({ basis: 'creative', title: 'Club glitter', article_id: null, quote: null }), idea({ basis: 'evidence', article_id: '10', quote: 'a Saint Laurent leather jacket' })] }, input);
    expect(result.map(s => [s.basis, s.source === null])).toEqual([['evidence', false], ['creative', true]]);
  });

  it('accepts only plain shopping terms as pieces and at most three ideas', () => {
    const bad = idea({ basis: 'creative', pieces: [{ item: 'Saint Laurent® Jacket #1', note: 'x' }, { item: 'mini skirt', note: 'y' }] });
    expect(readAIStyle({ suggestions: [bad] }, input)).toEqual([]);
    const many = Array.from({ length: 5 }, (_, i) => idea({ basis: 'creative', title: `Idea ${i}` }));
    expect(readAIStyle({ suggestions: many }, input)).toHaveLength(3);
    expect(readAIStyle(null, input)).toEqual([]);
  });

  it('takes brands and inspiration only from the supplied articles and coverage', () => {
    const withCoverage = aiStyleInputSchema.parse({ ...input, artist: 'USHER', articles: [], coverage: [{
      url: 'https://www.esquire.com/style/mens-fashion/a61234567/esquire-ralph-lauren-milan-dinner/', publication: 'Esquire',
      title: 'Inside Esquire and Ralph Lauren’s Intimate Milan Fashion Week Dinner', summary: 'USHER attended an Esquire x Ralph Lauren dinner tied to the Purple Label presentations.',
    }] });
    const [kept] = readAIStyle({ suggestions: [idea({
      basis: 'creative', inspired_by: withCoverage.coverage[0]!.url,
      pieces: [{ item: 'polo shirt', brand: 'Ralph Lauren', note: 'Tucked in.' }, { item: 'loafers', brand: 'Gucci', note: 'Suede.' }],
    })] }, withCoverage);
    expect(kept?.inspiration).toEqual({ url: withCoverage.coverage[0]!.url, publication: 'Esquire', title: withCoverage.coverage[0]!.title });
    // Gucci is in no supplied text, so the piece stays but its brand is removed.
    expect(kept?.pieces.map(piece => [piece.item, piece.brand])).toEqual([['polo shirt', 'Ralph Lauren'], ['loafers', null]]);
    // Coverage never upgrades an idea to evidence, and an unknown URL is not credited.
    const [other] = readAIStyle({ suggestions: [idea({ basis: 'creative', inspired_by: 'https://example.com/made-up' })] }, withCoverage);
    expect(other).toMatchObject({ basis: 'creative', inspiration: null, source: null });
  });

  it('matches a named brand as whole words, ignoring case and accents', () => {
    expect(namedBrand('ralph lauren', ['an Esquire x Ralph Lauren dinner'])).toBe('ralph lauren');
    expect(namedBrand('Lauren', ['Laurence Dacade boots'])).toBeNull();
    expect(namedBrand('Celine', ['a Céline coat'])).toBe('Celine');
    expect(namedBrand(null, ['anything'])).toBeNull();
  });

  it('caches by everything that changes the answer, including preferences', () => {
    const withPreference = aiStyleInputSchema.parse({ ...input, preferences: ['Silk'] });
    expect(aiStyleCacheKey(input)).not.toBe(aiStyleCacheKey(withPreference));
    expect(aiStyleCacheKey(input)).not.toBe(aiStyleCacheKey({ ...input, songs: ['Von dutch'] }));
    expect(aiStyleCacheKey({ ...input, genres: ['pop'] })).toBe(aiStyleCacheKey(input));
    expect(aiStyleCacheKey(input)).not.toBe(aiStyleCacheKey({ ...input, coverage: [{ url: 'https://www.elle.com/a/1', publication: 'ELLE', title: 't', summary: 's' }] }));
  });
});
