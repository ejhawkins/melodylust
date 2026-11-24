import type { StyleGenre } from "@/lib/style-profile";

// One accessory per style filter: picking a style on the Fit Compass pins its piece to the corner of the look's moodboard,
// so Y2K brings a butterfly necklace and Afrofuturist a pair of stunner shades. Each links to a Farfetch search, so the
// link always lands on something real, and each has a drawn motif rather than a borrowed product photo.

export type AccentMotif = "butterfly" | "shades" | "pearls" | "chain" | "bow";
export type StyleAccent = { genre: StyleGenre; name: string; detail: string; query: string; motif: AccentMotif };

export const STYLE_ACCENTS: Record<StyleGenre, StyleAccent> = {
  "Y2K": { genre: "Y2K", name: "Butterfly necklace", detail: "A rhinestone butterfly on a fine chain", query: "butterfly necklace", motif: "butterfly" },
  "Afrofuturist": { genre: "Afrofuturist", name: "Stunner shades", detail: "Wraparound shield sunglasses", query: "shield sunglasses", motif: "shades" },
  "Quiet Luxury": { genre: "Quiet Luxury", name: "Pearl studs", detail: "Single pearls, nothing louder", query: "pearl stud earrings", motif: "pearls" },
  "Grunge": { genre: "Grunge", name: "Chain choker", detail: "A heavy silver curb chain", query: "chain choker necklace", motif: "chain" },
  "Soft Glam": { genre: "Soft Glam", name: "Satin hair bow", detail: "A soft bow at the nape", query: "satin hair bow", motif: "bow" },
};

/** The accessory for the style picked last: the newest filter wins, so each new chip swaps the corner piece. */
export function accentFor(filter: readonly StyleGenre[]): StyleAccent | null {
  const last = filter.at(-1);
  return last ? STYLE_ACCENTS[last] : null;
}

/** Farfetch search for the accessory. */
export const accentLink = (accent: StyleAccent) => `https://www.farfetch.com/shopping/search/items.aspx?q=${encodeURIComponent(accent.query)}`;
