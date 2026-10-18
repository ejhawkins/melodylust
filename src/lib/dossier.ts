// Pure helpers for the Curator Dossier (/profile): who the reader is, what they've saved,
// their Style DNA in a few rows, and an edit they can share as a link. Client-safe and
// unit-tested; the page component only wires these to storage, auth and the server.
import { z } from "zod";
import { profileFields, type StyleProfile } from "./style-profile";
import type { WishItem } from "./wishlist";

export type DossierRole = "Editor" | "Contributor" | "Reader";

/** Moderators and admins edit; anyone with a submitted note contributes; everyone else reads. */
export function dossierRole({ canModerate, notes }: { canModerate: boolean; notes: number }): DossierRole {
  if (canModerate) return "Editor";
  return notes > 0 ? "Contributor" : "Reader";
}

export const NOTE_STATUS = {
  pending: { label: "In Review", tone: "amber" },
  approved: { label: "Published", tone: "emerald" },
  rejected: { label: "Declined", tone: "muted" },
} as const;
export type NoteStatus = keyof typeof NOTE_STATUS;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Member since Oct 2026", the same on server and client; null without a date. */
export function memberSince(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Member since ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** The header's stat matrix. Published notes are unknown (null) until the reader signs in. */
export function dossierStats({ wishes, notes, profile }: {
  wishes: readonly WishItem[];
  notes: readonly { status: string }[] | null;
  profile: StyleProfile;
}) {
  return {
    wantList: wishes.length,
    published: notes ? notes.filter(n => n.status === "approved").length : null,
    genres: profile.music.length,
  };
}

/** Pairs each saved piece with its song: the one picked in the Shop, or the song it was saved from. */
export function wantListPairs(items: readonly WishItem[]) {
  const pieces = items.filter(i => i.kind === "piece").map(item => {
    const song = item.from === "Shop" ? item.note : item.from && / — /.test(item.from) ? item.from : "";
    return { item, song: song.trim() || null };
  });
  return { pieces, songs: items.filter(i => i.kind === "song") };
}

/** Swatches for the palette colors the quiz offers; anything else gets a neutral chip. */
const SWATCHES: Record<string, string> = {
  Burgundy: "#6D1A2E",
  "Butter yellow": "#F2E2A2",
  "Chocolate brown": "#5B3A29",
};
const NEUTRAL = "#9A938C";

const MORE_FIELDS = ["aesthetic", "item", "material", "brand", "pattern", "details", "occasion", "season"] as const;

/** Style DNA at a glance: genres, palette and fits up front, every other choice listed after. */
export function styleDna(profile: StyleProfile) {
  const labels = Object.fromEntries(profileFields.map(f => [f.key, f.label])) as Record<string, string>;
  const more = MORE_FIELDS.filter(key => profile[key].length > 0).map(key => ({ label: labels[key] ?? key, values: [...profile[key]] }));
  const artists = [...profile.artistPicks.map(a => a.name), ...(profile.artists ? [profile.artists] : [])];
  if (artists.length) more.push({ label: "Artists", values: artists });
  const dna = {
    genres: [...profile.music],
    palette: profile.color.map(name => ({ name, hex: SWATCHES[name] ?? NEUTRAL })),
    fits: [...profile.fit],
    more,
  };
  return { ...dna, empty: !dna.genres.length && !dna.palette.length && !dna.fits.length && !more.length };
}

// ---- Sharing an edit -------------------------------------------------------------------
// The edit travels in the link's #fragment, so it never reaches a server, and anything read
// back from a link is validated: links and photos must be https, text is length-capped.

const https = z.string().max(600).refine(value => {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}, "Only https links can be shared.");

const sharedEdit = z.object({
  v: z.literal(1),
  items: z.array(z.object({
    k: z.enum(["piece", "song"]),
    n: z.string().trim().min(1).max(160),
    d: z.string().max(200).default(""),
    l: z.union([https, z.literal("")]).default(""),
    i: https.optional(),
    f: z.string().max(160).optional(),
    p: z.string().max(160).optional(),
  })).min(1).max(40),
});

const toBase64Url = (text: string) => {
  let binary = "";
  new TextEncoder().encode(text).forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromBase64Url = (code: string) => {
  const binary = atob(code.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((code.length + 3) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
};

/** An edit as a compact code; items whose links or photos aren't https are left out. */
export function encodeEdit(items: readonly WishItem[]): string {
  const safe = (url?: string) => (url && https.safeParse(url).success ? url : undefined);
  const payload = {
    v: 1,
    items: items.slice(0, 40).map(i => ({
      k: i.kind, n: i.name, d: i.detail, l: safe(i.link) ?? "",
      ...(safe(i.image) ? { i: i.image } : {}), ...(i.from ? { f: i.from } : {}), ...(i.note ? { p: i.note } : {}),
    })),
  };
  return toBase64Url(JSON.stringify(payload));
}

/** Items from a shared code, ready for addWish; null when the code is broken or unsafe. */
export function decodeEdit(code: string): Omit<WishItem, "id">[] | null {
  try {
    const parsed = sharedEdit.safeParse(JSON.parse(fromBase64Url(code)));
    if (!parsed.success) return null;
    return parsed.data.items.map(i => ({
      kind: i.k, name: i.n, detail: i.d, link: i.l, note: i.p ?? "",
      ...(i.f ? { from: i.f } : {}), ...(i.i ? { image: i.i } : {}),
    }));
  } catch {
    return null;
  }
}

export const shareLink = (origin: string, items: readonly WishItem[]) => `${origin}/profile#edit=${encodeEdit(items)}`;

/** The shared edit in a location hash ("#edit=…"), if there is one. */
export function editFromHash(hash: string) {
  const code = /(?:^#|&)edit=([A-Za-z0-9_-]+)/.exec(hash)?.[1];
  return code ? decodeEdit(code) : null;
}
