import { describe, expect, it } from 'vitest';
import { COVER_THEMES, coverTheme, coverTitleSize } from './playlist-cover';

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x! + 0.05) / (y! + 0.05); };

describe('coverTheme', () => {
  it('gives a playlist the same cover every time, whatever its spacing or case', () => {
    expect(coverTheme('Late Night Drive')).toBe(coverTheme('  late night drive '));
  });
  it('spreads different playlists across the house grounds', () => {
    const picked = new Set(['Late Night Drive', 'Sunday', 'Runway', 'Gym', 'Studio 54', 'Rain', 'Autumn', 'Paris'].map(coverTheme));
    expect(picked.size).toBeGreaterThan(2);
  });
  it('keeps every title readable on its ground', () => {
    for (const theme of COVER_THEMES) expect(contrast(theme.ground, theme.ink)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('coverTitleSize', () => {
  it('steps long names down so they stay on the cover', () => {
    expect(coverTitleSize('Sunday')).toBe('lg');
    expect(coverTitleSize('Late night after hours')).toBe('md');
    expect(coverTitleSize('Songs for the walk home from the show')).toBe('sm');
  });
});
