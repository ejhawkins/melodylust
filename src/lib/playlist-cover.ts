// Studio playlist covers: each playlist gets its own sleeve, its name set in Bodoni Moda over one of the house's
// grounds. The ground is picked from the name, so a playlist keeps the same cover on every visit and device.

export type CoverTheme = { ground: string; ink: string; rule: string };

/** The house grounds, each with type that holds 4.5:1 or better on it. */
export const COVER_THEMES: readonly CoverTheme[] = [
  { ground: "#0B040B", ink: "#D4FF32", rule: "#8EAE1C" }, // fig black, acid lime
  { ground: "#FAF9F6", ink: "#0B040B", rule: "#8E788C" }, // chalk, fig black
  { ground: "#4A1E2A", ink: "#F2D9C9", rule: "#C48B8E" }, // oxblood, blush
  { ground: "#D4FF32", ink: "#0B040B", rule: "#4D5E10" }, // acid lime, fig black
  { ground: "#2D142B", ink: "#FAF9F6", rule: "#8E788C" }, // plum, chalk
  { ground: "#E9E4DC", ink: "#4A1E2A", rule: "#B08A5A" }, // bone, oxblood
];

/** A steady pick for a playlist name: the same name always gets the same cover. */
export function coverTheme(name: string): CoverTheme {
  let hash = 0;
  for (const char of name.trim().toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COVER_THEMES[hash % COVER_THEMES.length]!;
}

/** The title as the sleeve sets it: long names step down a size so they stay on the cover. */
export function coverTitleSize(name: string): "lg" | "md" | "sm" {
  const length = name.trim().length;
  return length <= 12 ? "lg" : length <= 24 ? "md" : "sm";
}
