import { describe, expect, it } from 'vitest';
import { artistQuerySchema, checkProfileUrl, looksLikeSpam, mergeSuggestions, normalizeArtistName, submissionInputSchema } from './artist-search';
import { MOCK_ARTISTS } from './artist-provider';
describe('artist rules', () => {
  it('normalizes accents, spacing and ampersands', () => expect(normalizeArtistName('  Beyoncé & JAY-Z ')).toBe('beyonce and jay z'));
  it('keeps approved prefix matches first and deduplicates external identities, not names', () => {
    const base = MOCK_ARTISTS[0]!;
    const approved = { ...base, id: 'approved', source: 'melodylust' as const };
    const mid = { ...approved, id: 'mid', name: 'The Velvet Static' };
    expect(mergeSuggestions('ve', [mid, approved], MOCK_ARTISTS).map(a => a.id)).toEqual(['approved', 'mid', 'mock:3', 'mock:4']);
    expect(mergeSuggestions('ve', [], [base, base, MOCK_ARTISTS[1]!])).toHaveLength(2);
    expect(mergeSuggestions('ve', [], MOCK_ARTISTS, 1)).toHaveLength(1);
  });
  it.each(['http://example.com', 'https://localhost', 'https://192.168.1.1', 'https://[::1]', 'https://me:pass@example.com', 'https://host.internal', 'https://host.local', 'not a url'])('rejects unsafe profile URL %s', url => expect(checkProfileUrl(url).ok).toBe(false));
  it('normalizes a public profile URL', () => expect(checkProfileUrl(' https://www.example.com/artist#bio ')).toEqual({ ok: true, url: 'https://www.example.com/artist', host: 'example.com' }));
  it('validates field bounds and flags spam', () => {
    const input = submissionInputSchema.parse({ name: 'Artist', profileUrl: 'https://example.com/artist', startedAt: 1000 });
    expect(looksLikeSpam(input, 4000)).toBe(false);
    expect(looksLikeSpam(input, 1200)).toBe(true);
    expect(looksLikeSpam(input, 1000 + 86400001)).toBe(true);
    expect(looksLikeSpam({ ...input, website: 'bot' }, 4000)).toBe(true);
    expect(looksLikeSpam({ ...input, note: 'https://a https://b https://c' }, 4000)).toBe(true);
    expect(submissionInputSchema.safeParse({ ...input, note: 'a'.repeat(501) }).success).toBe(false);
    expect(submissionInputSchema.safeParse({ ...input, name: '' }).success).toBe(false);
    expect(artistQuerySchema.safeParse({ query: 'a' }).success).toBe(false);
  });
});
