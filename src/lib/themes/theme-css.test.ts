import { describe, expect, it } from 'vitest';
import { contrastRatio, mixHex, motionMs, TEXTURES, themeStyle, themeTextPairs, themeVariables } from './theme-css';
import { ROOM_THEMES } from './theme-spec';

describe('theme CSS variables', () => {
  for (const theme of Object.values(ROOM_THEMES)) {
    it(`${theme.id}: sets palette, texture, type and motion, and re-points the room tokens`, () => {
      const vars = themeVariables(theme);
      expect(vars['--room-ink']).toBe(theme.palette.ink);
      expect(vars['--room-highlight']).toBe(theme.palette.highlight);
      expect(vars['--room-texture']).toBe(TEXTURES[theme.texture](theme));
      expect(vars['--room-display-font']).toContain(theme.type.display);
      expect(vars['--room-display-style']).toBe(theme.type.display_style === 'italic' ? 'italic' : 'normal');
      expect(vars['--room-motion-ms']).toBe(`${motionMs(theme)}ms`);
      expect([vars['--ls-ink'], vars['--ls-paper'], vars['--color-acid-lime']]).toEqual([theme.palette.ink, theme.palette.text, theme.palette.highlight]);
      // the palette the room's panels, type and buttons are built on
      expect([vars['--color-fig-black'], vars['--color-fig-950'], vars['--color-chalk-white']]).toEqual([theme.palette.ink, theme.palette.surface, theme.palette.text]);
    });

    it(`${theme.id}: every text colour the room draws meets WCAG AA (4.5:1)`, () => {
      for (const pair of themeTextPairs(theme)) expect(contrastRatio(pair.fg, pair.bg), pair.use).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('gives the two themes different looks, and no style at all without a theme', () => {
    expect(themeVariables(ROOM_THEMES['hiphop-runway'])['--room-texture']).not.toBe(themeVariables(ROOM_THEMES['autumn-tartan'])['--room-texture']);
    expect(motionMs(ROOM_THEMES['hiphop-runway'])).toBeLessThan(motionMs(ROOM_THEMES['autumn-tartan'])); // punchy vs calm
    expect(themeStyle(null)).toBeUndefined();
  });

  it('mixes colours', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#4a0f1f', '#7a1530', 0)).toBe('#4a0f1f');
  });

  it('computes contrast the WCAG way', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });
});
