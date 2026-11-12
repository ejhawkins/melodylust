// One day's playlist from a reader's taste profile, built only from songs the room really has (the mix and the Studio),
// so nothing is invented: if too few fit, the playlist is shorter and says why. The style is translated into sound by
// keyword (palette → warmth, fabric → production, silhouette → rhythm, icons → lineage), tracks are tiered core /
// adjacent / wildcard, and the day is sequenced like a show — morning opening to late-night closer — by energy and tempo.
// Plain data and maths, no React.
import { GENRES, LEXICON, type Genre } from "./genre-shapes";
import type { CapsuleSong } from "./capsule-tree";

export type DayProfile = {
  style: string; palette: string; fabrics: string; silhouettes: string; icons: string;
  love: string; avoid: string; mood: string; energy: number; length: number;
};
export type Tier = "core" | "adjacent" | "wildcard";
export type Phase = "Morning" | "Midday" | "Golden hour" | "Evening" | "Late night";
export type DayTrack = { song: CapsuleSong; tier: Tier; phase: Phase; role: string; bpm: number; bpmKnown: boolean; reason: string };
export type DayPlaylist = { title: string; caption: string; why: string; tracks: DayTrack[]; short: string | null; wear: { opener: string; closer: string }; tweaks: Tweak[] };
export type Tweak = { id: "upbeat" | "softer" | "discover"; label: string };

/** Sample answers the form opens with, for the reader to replace with their own. */
export const FILLER_PROFILE: DayProfile = {
  style: "quiet luxury, 90s minimal, a little thrifted", palette: "camel, cream, black", fabrics: "silk, denim, leather",
  silhouettes: "oversized tailoring, slip dress", icons: "Carolyn Bessette, Aaliyah, Prada", love: "Frank Ocean, SZA", avoid: "",
  mood: "a whole day, coffee to last call", energy: 6, length: 10,
};

type Field = "style" | "palette" | "fabrics" | "silhouettes" | "icons";
const FIELD_NAME: Record<Field, string> = { style: "style", palette: "palette", fabrics: "fabrics", silhouettes: "silhouettes", icons: "icons" };
/** What each word in a profile suggests, in the shape lexicon's genres. A word can lean several ways. */
const LEXICON_WORDS: Record<Field, Record<string, readonly Genre[]>> = {
  style: {
    "quiet luxury": ["Jazz", "R&B"], minimal: ["Electronic", "R&B"], "90s": ["Hip-Hop", "R&B"], thrift: ["Indie", "Rock"],
    vintage: ["Indie", "Jazz"], y2k: ["Pop", "Hip-Hop"], grunge: ["Rock", "Indie"], street: ["Hip-Hop"], glam: ["Pop"],
    western: ["Country"], preppy: ["Indie", "Pop"], goth: ["Rock", "Electronic"], boho: ["Indie", "Country"],
    sporty: ["Hip-Hop", "Electronic"], romantic: ["R&B", "Jazz"], futur: ["Electronic"], punk: ["Rock"], classic: ["Jazz"],
  },
  palette: {
    camel: ["R&B", "Jazz"], cream: ["R&B", "Jazz"], brown: ["Jazz", "R&B"], gold: ["R&B"], burgundy: ["R&B", "Rock"], red: ["Rock", "Pop"],
    orange: ["Pop", "Indie"], black: ["Electronic", "Rock"], grey: ["Electronic"], gray: ["Electronic"], silver: ["Electronic"],
    white: ["Electronic", "Pop"], blue: ["Indie", "Electronic"], denim: ["Indie", "Country"], pink: ["Pop"], neon: ["Pop", "Electronic"],
    lime: ["Pop", "Electronic"], green: ["Indie"], pastel: ["Pop"], olive: ["Indie", "Hip-Hop"],
  },
  fabrics: {
    silk: ["R&B"], satin: ["R&B"], denim: ["Rock", "Country", "Indie"], leather: ["Rock", "Hip-Hop"], wool: ["Jazz", "Indie"],
    cashmere: ["Jazz", "R&B"], knit: ["Indie"], linen: ["Indie", "Jazz"], nylon: ["Electronic", "Hip-Hop"], sequin: ["Pop"],
    lace: ["R&B"], velvet: ["Jazz", "R&B"], suede: ["Country", "Rock"], fleece: ["Hip-Hop"], mesh: ["Electronic"],
  },
  silhouettes: {
    oversized: ["Hip-Hop"], baggy: ["Hip-Hop"], tailor: ["Jazz", "Electronic"], slip: ["R&B"], fluid: ["R&B"], boxy: ["Hip-Hop"],
    crop: ["Pop"], mini: ["Pop"], fitted: ["Pop", "Electronic"], wide: ["Hip-Hop", "Jazz"], flare: ["Country", "Rock"], sharp: ["Electronic"],
  },
  icons: {
    aaliyah: ["R&B", "Hip-Hop"], "carolyn bessette": ["Electronic", "Jazz"], prada: ["Electronic"], "kate moss": ["Indie", "Rock"],
    bowie: ["Rock"], pharrell: ["Hip-Hop", "Pop"], dolly: ["Country"], "miles davis": ["Jazz"], "tom ford": ["R&B"],
    "rick owens": ["Rock", "Electronic"], "thom browne": ["Electronic", "Rock"], rihanna: ["Pop", "R&B"], "jane birkin": ["Indie"],
    "grace jones": ["Electronic"], beyonce: ["R&B", "Pop"], "kanye": ["Hip-Hop"], "sade": ["R&B", "Jazz"], margiela: ["Electronic", "Indie"],
  },
};
/** What each field does to the sound, for the "why" paragraph. */
const FIELD_SAYS: Record<Field, string> = {
  palette: "sets the warmth", fabrics: "set the production", silhouettes: "set the rhythm and the space", icons: "set the lineage", style: "sets the overall lean",
};

/** Tempo a genre usually sits at, used when a song's own tempo isn't known. */
export const GENRE_BPM: Record<Genre, number> = { "Hip-Hop": 90, Pop: 115, "R&B": 85, Electronic: 124, Rock: 125, Indie: 115, Jazz: 100, Country: 110 };
/** Tempos we are confident of, by caption. Every other song falls back to its genres' general tempo. */
export const KNOWN_BPM: Readonly<Record<string, number>> = {
  "Blinding Lights — The Weeknd": 171, "Levitating — Dua Lipa": 103, "Get Lucky — Daft Punk": 116, "Kill Bill — SZA": 89,
  "Espresso — Sabrina Carpenter": 104, "Physical — Dua Lipa": 147, "Feel Good Inc. — Gorillaz": 139, "Redbone — Childish Gambino": 81,
};
const GENRE_ENERGY: Record<Genre, number> = { "Hip-Hop": 7, Pop: 7, "R&B": 4, Electronic: 8, Rock: 7, Indie: 5, Jazz: 3, Country: 5 };

export function tempoOf(song: Pick<CapsuleSong, "caption" | "genres">): { bpm: number; known: boolean } {
  const known = KNOWN_BPM[song.caption];
  if (known) return { bpm: known, known: true };
  const g = song.genres.length ? song.genres : (["Pop"] as const);
  return { bpm: Math.round(g.reduce((s, x) => s + GENRE_BPM[x], 0) / g.length), known: false };
}
/** Tempo as felt: 171 sits beside 86, so a double-time song is folded into 70–140 before songs are compared. */
const felt = (bpm: number) => { let b = bpm; while (b > 140) b /= 2; while (b < 70) b *= 2; return b; };
export const tempoGap = (a: number, b: number) => Math.abs(felt(a) - felt(b));
/** A song's energy, 1 to 10: its genres' usual energy, nudged by how fast it feels. */
export function energyOf(song: Pick<CapsuleSong, "caption" | "genres">): number {
  const g = song.genres.length ? song.genres : (["Pop"] as const);
  const base = g.reduce((s, x) => s + GENRE_ENERGY[x], 0) / g.length;
  return Math.min(10, Math.max(1, base + (felt(tempoOf(song).bpm) - 105) / 15));
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
const list = (s: string) => s.split(/[,;/\n]+/).map(x => x.trim()).filter(Boolean);
type Hint = { field: Field; word: string; genre: Genre; weight: number };

/** Every keyword the profile matched, and what it points to. A word typed earlier in a field counts a little more. */
export function readProfile(p: DayProfile): Hint[] {
  const hints: Hint[] = [];
  for (const field of Object.keys(LEXICON_WORDS) as Field[]) {
    list(p[field]).forEach((entry, i) => {
      const text = norm(entry);
      for (const [word, genres] of Object.entries(LEXICON_WORDS[field])) {
        if (!text.includes(word)) continue;
        for (const genre of genres) hints.push({ field, word: entry, genre, weight: (1 / genres.length) * (1 - i * 0.1) });
      }
    });
  }
  return hints;
}
const weightsOf = (hints: readonly Hint[]) => {
  const w: Partial<Record<Genre, number>> = {};
  for (const h of hints) w[h.genre] = (w[h.genre] ?? 0) + h.weight;
  return w;
};
const artistHas = (names: string, song: CapsuleSong) => list(names).some(n => norm(song.artist).includes(norm(n)) && n.length > 1);

/** Where each position sits in the day, and how far its energy leans from the reader's own. */
const PHASES: { phase: Phase; role: string; until: number; lean: number }[] = [
  { phase: "Morning", role: "Opening", until: 0.2, lean: -2 },
  { phase: "Midday", role: "Build", until: 0.5, lean: 0 },
  { phase: "Golden hour", role: "Peak", until: 0.75, lean: 2 },
  { phase: "Evening", role: "Comedown", until: 0.95, lean: -1 },
  { phase: "Late night", role: "Closer", until: 1.01, lean: -2 },
];
const phaseAt = (i: number, n: number) => (i === n - 1 && n > 1 ? PHASES[4]! : PHASES.find(p => (n <= 1 ? 0 : i / (n - 1)) < p.until && p.phase !== "Late night") ?? PHASES[3]!);

export function buildDayPlaylist(profile: DayProfile, pool: readonly CapsuleSong[], options: { discover?: boolean } = {}): DayPlaylist {
  const hints = readProfile(profile);
  const weights = weightsOf(hints);
  const n = Math.max(1, Math.min(30, Math.round(profile.length)));
  const songs = pool.filter((s, i) => pool.findIndex(t => t.caption === s.caption) === i && !artistHas(profile.avoid, s));
  const score = (s: CapsuleSong) => s.genres.reduce((sum, g) => sum + (weights[g] ?? 0), 0) / Math.max(1, s.genres.length) + (artistHas(profile.love, s) ? 2 : 0);
  const ranked = [...songs].sort((a, b) => score(b) - score(a));

  // Tiers: about 60/30/10 (40/40/20 when the reader asks for discoveries), at most two songs by one artist.
  const take = Math.min(n, ranked.length);
  const split = options.discover ? [0.4, 0.4] : [0.6, 0.3];
  const wantCore = Math.round(take * split[0]!), wantAdj = Math.round(take * split[1]!);
  const perArtist = new Map<string, number>();
  const room = (s: CapsuleSong) => (perArtist.get(s.artist) ?? 0) < 2;
  const keep = (s: CapsuleSong) => perArtist.set(s.artist, (perArtist.get(s.artist) ?? 0) + 1);
  const chosen: { song: CapsuleSong; tier: Tier }[] = [];
  const pick = (from: CapsuleSong[], count: number, tier: Tier) => {
    for (const s of from) {
      if (chosen.filter(c => c.tier === tier).length >= count || chosen.length >= take) break;
      if (chosen.some(c => c.song === s) || !room(s)) continue;
      keep(s); chosen.push({ song: s, tier });
    }
  };
  pick(ranked, wantCore, "core");
  pick(ranked, wantAdj, "adjacent");
  pick([...ranked].reverse(), take - wantCore - wantAdj, "wildcard");
  pick(ranked, take, "adjacent"); // any gap left by the artist limit

  // Sequence: each slot wants the reader's energy leaned by its phase, and a tempo close to the song before it.
  const left = [...chosen];
  const ordered: typeof chosen = [];
  for (let i = 0; i < chosen.length; i++) {
    const target = Math.min(10, Math.max(1, profile.energy + phaseAt(i, chosen.length).lean));
    const prev = ordered.at(-1);
    const cost = (c: (typeof chosen)[number]) => Math.abs(energyOf(c.song) - target) + (prev ? tempoGap(tempoOf(prev.song).bpm, tempoOf(c.song).bpm) / 12 : 0);
    left.sort((a, b) => cost(a) - cost(b));
    ordered.push(left.shift()!);
  }

  const tracks = ordered.map(({ song, tier }, i): DayTrack => {
    const { phase, role } = phaseAt(i, ordered.length);
    const t = tempoOf(song);
    return { song, tier, phase, role, bpm: t.bpm, bpmKnown: t.known, reason: reasonFor(song, tier, hints, profile) };
  });

  const lead = list(profile.style)[0] ?? "your style";
  const colours = list(profile.palette);
  return {
    title: `A Day in ${titleCase(lead)}`,
    caption: colours.length >= 2 ? `${titleCase(colours[0]!)} at breakfast, ${colours.at(-1)!.toLowerCase()} by last call.` : "One outfit's worth of music, morning to midnight.",
    why: whyParagraph(hints, profile, weights),
    tracks,
    short: tracks.length < n ? `Only ${tracks.length} of the ${n} songs you asked for: that is every song in the room that fits, and none are invented.` : null,
    wear: wearWith(profile),
    tweaks: [{ id: "upbeat", label: "More upbeat" }, { id: "softer", label: "Softer, slower" }, { id: "discover", label: options.discover ? "Closer to my taste" : "More discoveries" }],
  };
}

const titleCase = (s: string) => s.replace(/\b\p{L}/gu, c => c.toUpperCase());

function reasonFor(song: CapsuleSong, tier: Tier, hints: readonly Hint[], p: DayProfile): string {
  if (artistHas(p.love, song)) return `${song.artist} is on your love list.`;
  const best = hints.filter(h => song.genres.includes(h.genre)).sort((a, b) => b.weight - a.weight)[0];
  const g = best?.genre ?? song.genres[0];
  if (!g) return "A wildcard from the room.";
  const why = LEXICON[g].why.replace(/\.$/, "").toLowerCase();
  if (tier === "wildcard" || !best) return `Wildcard: ${g} you didn't ask for — ${why}.`;
  return `Your ${best.word.toLowerCase()} reads as ${g}: ${why}.`;
}

function whyParagraph(hints: readonly Hint[], p: DayProfile, weights: Partial<Record<Genre, number>>): string {
  const parts: string[] = [];
  for (const field of ["palette", "fabrics", "silhouettes", "icons"] as Field[]) {
    const mine = hints.filter(h => h.field === field);
    if (!mine.length) continue;
    const words = [...new Set(mine.map(h => h.word.toLowerCase()))].slice(0, 2).join(" and ");
    const genres = [...new Set(mine.sort((a, b) => b.weight - a.weight).map(h => h.genre))].slice(0, 2).join(" and ");
    parts.push(`your ${FIELD_NAME[field]} (${words}) ${FIELD_SAYS[field]}, toward ${genres}`);
  }
  const top = GENRES.filter(g => (weights[g] ?? 0) > 0).sort((a, b) => (weights[b] ?? 0) - (weights[a] ?? 0)).slice(0, 2);
  const lead = top.length ? `Read as sound, you lean ${top.join(" and ")}.` : "Nothing in your profile matched a sound yet, so this leans on the room's own mix.";
  const body = parts.length ? ` ${parts.map((s, i) => (i === 0 ? s[0]!.toUpperCase() + s.slice(1) : s)).join("; ")}.` : "";
  return `${lead}${body} The day opens soft, builds through midday, peaks at golden hour around your energy of ${p.energy}, and winds down by late night, each song near the tempo of the one before.`;
}

function wearWith(p: DayProfile) {
  const fabric = list(p.fabrics), colour = list(p.palette), shape = list(p.silhouettes);
  const day = [colour[0], fabric[0], shape[0]].filter(Boolean).join(" ").toLowerCase();
  const night = [colour.at(-1), fabric.at(-1), shape.at(-1)].filter(Boolean).join(" ").toLowerCase();
  return { opener: day ? `Morning: ${day}, easy and unhurried.` : "Morning: something soft you can move in.", closer: night ? `Late night: ${night}, a little sharper.` : "Late night: the same look, one notch darker." };
}

/** A tweak applied to the profile, so the reader's own answers stay theirs. */
export function applyTweak(p: DayProfile, id: Tweak["id"]): DayProfile {
  if (id === "upbeat") return { ...p, energy: Math.min(10, p.energy + 2) };
  if (id === "softer") return { ...p, energy: Math.max(1, p.energy - 2) };
  return p;
}
