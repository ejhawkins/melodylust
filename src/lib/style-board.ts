import type { WishItem } from "@/lib/wishlist";

export type BoardSection = "fashion" | "music" | "read";
export type BoardItem = { section: BoardSection; name: string; detail: string; link: string; image: string };

/** Want List songs are music, Reading Room saves are good reads, everything else is fashion. */
export function sectionOf(item: Pick<WishItem, "kind" | "from">): BoardSection {
  if (item.kind === "song") return "music";
  return /reading room|good read/i.test(item.from ?? "") ? "read" : "fashion";
}

const safeLink = (url: string) => (/^https?:\/\//i.test(url) ? url.slice(0, 500) : "");
export function toBoardItems(items: WishItem[]): BoardItem[] {
  return items.slice(0, 24).map(i => ({
    section: sectionOf(i), name: i.name.slice(0, 160), detail: (i.detail ?? "").slice(0, 200),
    link: safeLink(i.link ?? ""), image: safeLink(i.image ?? ""),
  }));
}

/** 10-character link id from an unbiased alphabet. */
export function boardId(random: (n: number) => Uint8Array = n => crypto.getRandomValues(new Uint8Array(n))) {
  const abc = "abcdefghijkmnpqrstuvwxyz23456789"; // 32 chars, so byte % 32 is unbiased
  return Array.from(random(10), b => abc[b % 32]).join("");
}
export const isBoardId = (id: string) => /^[a-z2-9]{10}$/.test(id);

/** Spotify track id from an open.spotify.com track link, for embedding real playback. */
export function spotifyTrackId(link?: string | null): string | null {
  const m = link?.match(/^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?track\/([A-Za-z0-9]{22})/);
  return m ? m[1]! : null;
}

export type PortfolioPiece = { title: string; image: string; link: string };
/** Keep up to 12 portfolio pieces with a title and an https photo; links must be https too. */
export function cleanPortfolio(list: PortfolioPiece[]): PortfolioPiece[] {
  const ok = (u: string) => /^https:\/\/[^\s]+$/i.test(u);
  return list.map(p => ({ title: p.title.trim().slice(0, 80), image: p.image.trim(), link: p.link.trim() }))
    .filter(p => p.title && ok(p.image)).map(p => ({ ...p, link: ok(p.link) ? p.link : "" })).slice(0, 12);
}
