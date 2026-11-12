import anita from "@/assets/moodboards/IMG_7247.jpg";
import mono from "@/assets/moodboards/IMG_7257.jpg";
import bright from "@/assets/moodboards/IMG_7253.jpg";
import y2k from "@/assets/moodboards/IMG_7250.jpg";
import type { StyleGenre } from "@/lib/style-profile";

export type Quadrant = "tl" | "tr" | "bl" | "br";
export type FitImage = { src: string; alt: string; focus: string };
export type FitLook = {
  id: string; num: string; title: string; line: string; quadrant: Quadrant;
  genres: StyleGenre[]; palette: string[]; images: FitImage[];
  song: { title: string; artist: string; spotify: string };
};
export type FitItem = { id: string; name: string; cover: FitImage; looks: FitLook[] };

/** The two style axes: x runs Polished → Undone, y runs Daytime → After dark. */
export const AXES = { left: "Polished", right: "Undone", top: "After dark", bottom: "Daytime" } as const;

/** Which axis poles a quadrant sits between. */
export function quadrantPoles(q: Quadrant): { x: string; y: string } {
  return { x: q.endsWith("l") ? AXES.left : AXES.right, y: q.startsWith("t") ? AXES.top : AXES.bottom };
}

export const FIT_ITEMS: FitItem[] = [{
  id: "statement-coat", name: "The Statement Coat",
  cover: { src: y2k, alt: "Faux-fur statement coat worn on the street", focus: "45% 10%" },
  looks: [
    { id: "suede", num: "Look 01", title: "70s suede", line: "thrown over patchwork suede", quadrant: "bl", genres: ["Grunge", "Quiet Luxury"],
      palette: ["#b88a5e", "#7a4a2a", "#d9b48a", "#3b2a1e"],
      images: [{ src: anita, alt: "Anita Pallenberg in a newsboy cap and patchwork coat", focus: "15% 25%" }, { src: anita, alt: "Patchwork leather zip jacket", focus: "85% 15%" }, { src: anita, alt: "Brown suede top-handle bag", focus: "85% 48%" }],
      song: { title: "Wake Up", artist: "Mad Season", spotify: "5xhQOnyRJfRywbEwpkgoTy" } },
    { id: "mono", num: "Look 02", title: "Monochrome", line: "sculptural black, lace and kitten heels", quadrant: "tl", genres: ["Quiet Luxury", "Soft Glam"],
      palette: ["#f2f0ec", "#8a8f93", "#3a3a3c", "#4a1e2a"],
      images: [{ src: mono, alt: "Masked models in black sculptural dresses", focus: "85% 50%" }, { src: y2k, alt: "Lace camisole mirror selfie", focus: "50% 95%" }, { src: y2k, alt: "Red kitten heels", focus: "45% 45%" }],
      song: { title: "Sin Thetik (Prada SS21 Womenswear Version)", artist: "Plastikman", spotify: "4FHSuYWyoH9EsFalVIEaOC" } },
    { id: "colour", num: "Look 03", title: "With colour", line: "clashed against desert brights", quadrant: "tr", genres: ["Afrofuturist", "Soft Glam"],
      palette: ["#e94b3c", "#a77dd6", "#8aa83a", "#e8c46a"],
      images: [{ src: bright, alt: "Model with red balloon and dog on a sand dune", focus: "50% 55%" }, { src: bright, alt: "Ribbed lilac and blue knit top", focus: "10% 10%" }, { src: bright, alt: "Puffy pink platform sandals", focus: "80% 95%" }],
      song: { title: "Gimme More (BFRND Remix)", artist: "Britney Spears, BFRND", spotify: "7pNCrChCoVAF7u3MAzLPzB" } },
    { id: "offduty", num: "Look 04", title: "Off-duty", line: "baggy jeans and a red bag", quadrant: "br", genres: ["Y2K", "Grunge"],
      palette: ["#8c1c24", "#d9cfc2", "#2b2522", "#b08a5a"],
      images: [{ src: y2k, alt: "Fur coat, red bag and baggy jeans street style", focus: "45% 10%" }, { src: y2k, alt: "Stacked silver bangles", focus: "10% 40%" }, { src: y2k, alt: "Burgundy leather jacket", focus: "30% 82%" }],
      song: { title: "Runway", artist: "La Femme", spotify: "1JJwRgKGT07bDCllHXi3j2" } },
  ],
}];

export const findLook = (itemId: string, lookId: string) => FIT_ITEMS.find(i => i.id === itemId)?.looks.find(l => l.id === lookId);

/** Whole-number vote shares per look (they sum to 100 when there are votes) and the leading look. */
export function voteShares(counts: Record<string, number>, lookIds: string[]) {
  const total = lookIds.reduce((n, id) => n + (counts[id] ?? 0), 0);
  const shares: Record<string, number> = {};
  if (!total) { lookIds.forEach(id => (shares[id] = 0)); return { total, shares, leader: null as string | null }; }
  const raw = lookIds.map(id => ({ id, v: ((counts[id] ?? 0) / total) * 100 }));
  raw.forEach(r => (shares[r.id] = Math.floor(r.v)));
  let left = 100 - raw.reduce((n, r) => n + Math.floor(r.v), 0);
  [...raw].sort((a, b) => (b.v % 1) - (a.v % 1)).forEach(r => { if (left > 0) { shares[r.id]! += 1; left--; } });
  const top = Math.max(...lookIds.map(id => counts[id] ?? 0));
  const leaders = lookIds.filter(id => (counts[id] ?? 0) === top);
  return { total, shares, leader: leaders.length === 1 ? leaders[0]! : null };
}

/** The Want List row name for a look. */
export const fitWishName = (item: FitItem, look: FitLook) => `${item.name} — ${look.title}`;

/** A fresh id for a visitor's vote. crypto.randomUUID only exists on https and localhost, so a page opened over plain http
 *  (a phone on the Wi-Fi address) has none; calling it threw and took the page down. getRandomValues exists everywhere. */
export function newVoterId(source: { randomUUID?: () => string; getRandomValues: (bytes: Uint8Array) => Uint8Array } = crypto): string {
  if (typeof source.randomUUID === "function") return source.randomUUID();
  return Array.from(source.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, "0")).join("");
}
