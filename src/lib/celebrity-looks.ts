import data from "@/data/celebrity-looks.json";
import type { WishItem } from "@/lib/wishlist";

export type CelebrityLook = {
  id: string; name: string; event: string; year: string; image: string; imageAlt: string; photoCredit: string;
  look: string; song: string; artist: string; spotifyTrackId: string; whyItFits: string;
  bpm: number | null; genre: string; mood: string; shopUrl: string; lead: boolean;
};
export type CelebrityCover = { image: string; imageAlt: string; photoCredit: string; caption: string };

export const celebrityCover = data.cover as CelebrityCover;
/** Lead look first, then the rest in file order. */
export const celebrityLooks = [...(data.looks as CelebrityLook[])].sort((a, b) => Number(b.lead) - Number(a.lead));

export const LOOK_FROM = "Dressed to the Beat";
export const lookChips = (l: CelebrityLook) =>
  [l.bpm != null ? `${l.bpm} BPM` : "", l.genre, l.mood].filter(s => s && s.trim());
export const isLookSaved = (items: WishItem[], l: CelebrityLook) =>
  items.some(i => i.kind === "piece" && i.from === LOOK_FROM && i.name === l.name);
/** Distinct, non-empty photo credits for the footer, cover first. */
export const photoCredits = (cover: CelebrityCover, looks: CelebrityLook[]) =>
  [...new Set([cover.photoCredit, ...looks.map(l => l.photoCredit)].filter(c => c && c.trim()))];

/** Product analytics: PostHog when present on the page, else the consented Google tag. */
export function trackLook(event: string, l: CelebrityLook) {
  const props = { id: l.id, name: l.name, song: l.song, artist: l.artist, genre: l.genre };
  const w = window as Window & { posthog?: { capture(e: string, p: object): void }; gtag?: (...a: unknown[]) => void };
  w.posthog?.capture(event, props);
  w.gtag?.("event", event, props);
}
