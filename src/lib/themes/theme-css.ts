// A theme's look as CSS custom properties: palette, texture, type and motion. Pure, so no AI call is involved
// in how a style looks. The room sets these on its root (.ls[data-room-style]); styles.css reads them, and
// the room's own --ls-ink / --ls-paper / --color-acid-lime are re-pointed so existing components follow.

import type { CSSProperties } from 'react';
import type { RoomTheme } from './theme-spec';

/** Background recipes per texture, shared by the room and the loader. Flat repeating patterns, no images. */
export const TEXTURES: Record<RoomTheme['texture'], (t: RoomTheme) => string> = {
  tartan: t => `repeating-linear-gradient(0deg, ${t.palette.accent}55 0 12px, transparent 12px 36px), repeating-linear-gradient(90deg, ${t.palette.accent}55 0 12px, transparent 12px 36px), ${t.palette.surface}`,
  chrome: t => `linear-gradient(135deg, ${t.palette.surface}, ${t.palette.ink} 45%, ${t.palette.accent}22 60%, ${t.palette.ink})`,
  knit: t => `repeating-linear-gradient(45deg, ${t.palette.accent}22 0 4px, transparent 4px 8px), ${t.palette.surface}`,
  concrete: t => `radial-gradient(${t.palette.accent}11 1px, transparent 1px) 0 0/6px 6px, ${t.palette.surface}`,
};

export const motionMs = (theme: RoomTheme) => (theme.motion.intensity === 'punchy' ? 1400 : 2400);

export function themeVariables(theme: RoomTheme): Record<`--${string}`, string> {
  const { ink, surface, accent, highlight, text } = theme.palette;
  return {
    '--room-ink': ink, '--room-surface': surface, '--room-accent': accent, '--room-highlight': highlight, '--room-text': text,
    '--room-texture': TEXTURES[theme.texture](theme),
    '--room-display-font': `${theme.type.display}, var(--font-editorial), serif`,
    '--room-display-style': theme.type.display_style === 'italic' ? 'italic' : 'normal',
    '--room-body-font': `${theme.type.body}, var(--font-sans)`,
    '--room-motion-ms': `${motionMs(theme)}ms`,
    // The room's existing tokens, so every panel, button and highlight follows the style.
    '--ls-ink': ink, '--ls-paper': text, '--color-acid-lime': highlight,
  };
}

export const themeStyle = (theme: RoomTheme | null): CSSProperties | undefined => (theme ? (themeVariables(theme) as CSSProperties) : undefined);

// WCAG 2.x relative luminance and contrast ratio for #rrggbb colours.
function luminance(hex: string) {
  const value = /^#([0-9a-f]{6})$/i.exec(hex)?.[1];
  if (!value) throw new Error(`Expected #rrggbb, got ${hex}`);
  const [r, g, b] = [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** Every text/background pair the room draws with a theme; each must reach WCAG AA for body text (4.5:1). */
export const themeTextPairs = (theme: RoomTheme) => {
  const { ink, surface, highlight, text } = theme.palette;
  return [
    { use: 'text on ink (panels)', fg: text, bg: ink },
    { use: 'ink on text (centre page)', fg: ink, bg: text },
    { use: 'text on surface (texture)', fg: text, bg: surface },
    { use: 'highlight on ink (accents, links)', fg: highlight, bg: ink },
    { use: 'ink on highlight (solid buttons)', fg: ink, bg: highlight },
  ];
};
