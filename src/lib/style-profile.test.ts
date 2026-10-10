import { describe, expect, it } from 'vitest';
import { emptyStyleProfile, profileSelectionCount, styleProfileSchema, styleSearchInput } from './style-profile';

describe('style profile', () => {
  it('keeps unprofiled searches unchanged', () => expect(styleSearchInput('skirt', emptyStyleProfile())).toBe('skirt'));
  it('includes saved attributes and verified editorial topics', () => {
    const profile = styleProfileSchema.parse({ color: ['Burgundy'], fit: ['A-line'], articles: ['elle-knitwear'] });
    const input = JSON.parse(styleSearchInput('skirt', profile));
    expect(input.query).toBe('skirt');
    expect(input.preferences.color).toEqual(['Burgundy']);
    expect(input.editorialReferences[0].publisher).toBe('ELLE');
    expect(profileSelectionCount(profile)).toBe(3);
  });
  it('rejects oversized inputs and unknown references', () => {
    expect(styleProfileSchema.safeParse({ artists: 'x'.repeat(201) }).success).toBe(false);
    expect(styleProfileSchema.safeParse({ articles: ['invented'] }).success).toBe(false);
    expect(styleProfileSchema.safeParse({ color: Array(13).fill('Burgundy') }).success).toBe(false);
  });
});
