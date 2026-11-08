// The shape lexicon. Every music genre the journal covers has a shape, and a mix is drawn as its songs' genres blended
// into one. A shape is its reach from the centre in each direction (its farthest reach is 1), so a blend is the weighted
// average of those reaches: a mix that is mostly hip-hop comes out mostly the block. Redraw a genre here and every mark
// drawn from it follows. Plain maths, safe in the browser and on the server.

/** The genres the stories are filed under, plus Pop. */
export const GENRES = ["Hip-Hop", "Pop", "R&B", "Electronic", "Rock", "Indie", "Jazz", "Country"] as const;
export type Genre = (typeof GENRES)[number];
/** How much of a mix each genre makes up, in any unit (song counts, say). Only the proportions matter. */
export type GenreWeights = Partial<Record<Genre, number>>;

/** A shape in the lexicon. `turn` rotates it clockwise, in degrees. */
export type GenreShape =
  | { form: "circle" }
  /** A regular polygon standing on one side. `round` 0 keeps its corners sharp; toward 1 rounds them off. */
  | { form: "polygon"; sides: number; round: number; turn?: number }
  /** A star with a point straight up. `depth` is how far it cuts in between points, 0 to 0.95. */
  | { form: "star"; points: number; depth: number; turn?: number }
  /** A scalloped round: `lobes` swells, one straight up, dipping by `depth` (0 to 0.95) between them. */
  | { form: "wave"; lobes: number; depth: number; turn?: number };

export const LEXICON: Record<Genre, { name: string; why: string; shape: GenreShape }> = {
  "Hip-Hop": { name: "The block", why: "Four-square, like the beat's grid and the speaker stack.", shape: { form: "polygon", sides: 4, round: 0.25 } },
  Pop: { name: "The hook", why: "Round and smooth, made to come round again.", shape: { form: "circle" } },
  "R&B": { name: "The curve", why: "Soft swells, slow as a run of melisma.", shape: { form: "wave", lobes: 6, depth: 0.12 } },
  Electronic: { name: "The sawtooth", why: "Sharp as a synth's harshest waveform.", shape: { form: "polygon", sides: 3, round: 0 } },
  Rock: { name: "The snarl", why: "Jagged, like a distorted chord.", shape: { form: "star", points: 8, depth: 0.3 } },
  Indie: { name: "The cut-out", why: "Five sides cut by hand, a little off true.", shape: { form: "polygon", sides: 5, round: 0.15, turn: 9 } },
  Jazz: { name: "The trio", why: "Three loops, as three players trade a tune.", shape: { form: "wave", lobes: 3, depth: 0.3 } },
  Country: { name: "The buckle", why: "The five-point star on a Western belt buckle.", shape: { form: "star", points: 5, depth: 0.5 } },
};

/** Directions sampled round the centre: one every 1.5°, so the lexicon's corners and points each land on a sample. */
export const STEPS = 240;

const UP = -Math.PI / 2;
const deg = (d = 0) => (d * Math.PI) / 180;
const mod = (x: number, m: number) => ((x % m) + m) % m;
const clampDepth = (depth: number) => Math.min(Math.max(depth, 0), 0.95);

/** A shape's reach toward direction `a` (radians, clockwise from three o'clock, as in SVG), before scaling. */
function reach(shape: GenreShape, a: number): number {
  switch (shape.form) {
    case "circle":
      return 1;
    case "polygon": {
      // The sides as half-planes, combined with a p-norm: a large p is the sharp polygon and a small one rounds the
      // corners (for four sides it is exactly a superellipse). The first side faces straight down, so it stands on it.
      const sides = Math.max(3, Math.round(shape.sides));
      const p = 2 / Math.max(shape.round, 0.02);
      const facing = Array.from({ length: sides }, (_, k) => Math.max(0, Math.cos(a - Math.PI / 2 - deg(shape.turn) - (k * 2 * Math.PI) / sides)));
      const most = Math.max(...facing);
      return 1 / (most * facing.reduce((sum, f) => sum + (f / most) ** p, 0) ** (1 / p));
    }
    case "star": {
      // Straight edges from each point (reach 1) to the notch beside it (reach 1 - depth).
      const half = Math.PI / Math.max(2, Math.round(shape.points));
      const notch = 1 - clampDepth(shape.depth);
      const u = mod(a - UP - deg(shape.turn), 2 * half);
      const [a1, r1, a2, r2] = u < half ? [0, 1, half, notch] : [half, notch, 2 * half, 1];
      return (r1 * r2 * Math.sin(a2 - a1)) / (r1 * Math.sin(u - a1) + r2 * Math.sin(a2 - u));
    }
    case "wave":
      return 1 - (clampDepth(shape.depth) / 2) * (1 - Math.cos(Math.max(1, Math.round(shape.lobes)) * (a - UP - deg(shape.turn))));
  }
}

const scaled = (reaches: readonly number[]) => {
  const top = Math.max(...reaches);
  return reaches.map(r => r / top);
};

const profiles = new Map<GenreShape, readonly number[]>();
/** A shape's reach in each of the STEPS directions, its farthest scaled to 1. */
export function profile(shape: GenreShape): readonly number[] {
  let reaches = profiles.get(shape);
  if (!reaches) {
    reaches = scaled(Array.from({ length: STEPS }, (_, i) => reach(shape, (i * 2 * Math.PI) / STEPS)));
    profiles.set(shape, reaches);
  }
  return reaches;
}

/** The blended shape's reach in each of the STEPS directions, its farthest scaled to 1. No genres at all is a circle. */
export function blend(weights: GenreWeights): number[] {
  const parts = GENRES.flatMap(g => {
    const w = weights[g] ?? 0;
    return w > 0 && Number.isFinite(w) ? [{ reaches: profile(LEXICON[g].shape), w }] : [];
  });
  const total = parts.reduce((sum, part) => sum + part.w, 0);
  if (total === 0) return Array.from({ length: STEPS }, () => 1);
  return scaled(Array.from({ length: STEPS }, (_, i) => parts.reduce((sum, part) => sum + (part.reaches[i] ?? 0) * part.w, 0) / total));
}

/** An SVG path of the blended shape, centred on (cx, cy) with its farthest reach at `radius`. */
export function blendPath(weights: GenreWeights, cx: number, cy: number, radius: number): string {
  const points = blend(weights).map((r, i) => {
    const a = (i * 2 * Math.PI) / STEPS;
    return `${i ? "L" : "M"}${(cx + radius * r * Math.cos(a)).toFixed(2)} ${(cy + radius * r * Math.sin(a)).toFixed(2)}`;
  });
  return `${points.join("")}Z`;
}

/** A mix's genre weights: each song is one vote, shared equally among the genres it is tagged with. */
export function mixGenres(songs: readonly { genres?: readonly Genre[] | undefined }[]): GenreWeights {
  const weights: GenreWeights = {};
  for (const song of songs) {
    const tags = song.genres ?? [];
    for (const g of tags) weights[g] = (weights[g] ?? 0) + 1 / tags.length;
  }
  return weights;
}

/** The genres in a blend, the biggest share first: "Hip-Hop, Pop, R&B and Electronic". */
export function blendName(weights: GenreWeights): string {
  const names = GENRES.filter(g => (weights[g] ?? 0) > 0).sort((a, b) => (weights[b] ?? 0) - (weights[a] ?? 0));
  const last = names.pop();
  return names.length ? `${names.join(", ")} and ${last}` : last ?? "";
}
