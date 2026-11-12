// The Capsule as a map of keywords: the capsule at the centre, its genres round it, each sound beside its genre, and that
// sound's pieces and next songs on the outer ring. Positions are worked out here in plain maths (a unit-free radial
// layout, centred on 0,0) so the component only draws; the tree itself comes from capsule-tree.ts.
import { LEXICON, type Genre } from "./genre-shapes";
import type { CapsuleSong, CapsuleTree } from "./capsule-tree";

export type MapKind = "root" | "genre" | "sound" | "piece" | "pick";
/** What a node's card says: the song behind a sound or pick, a genre, a piece's detail, and what it shares or holds. */
export type MapNode = { id: string; label: string; kind: MapKind; x: number; y: number; song?: CapsuleSong; genre?: Genre; detail?: string; shared?: readonly Genre[]; count?: number };
export type MapEdge = { from: string; to: string };
export type CapsuleMap = { nodes: MapNode[]; edges: MapEdge[] };

/** A piece's keyword: its last two words before any " — " (a look's name follows the dash), so "Moon-wash denim jacket"
 *  reads "denim jacket" and "Statement Coat — Off-duty" reads "Statement Coat". */
export function pieceKeyword(name: string): string {
  const words = (name.split(" — ")[0] ?? name).trim().split(/\s+/).filter(Boolean);
  return words.slice(-2).join(" ");
}

const RINGS = { genre: 150, sound: 280, leaf: 410 } as const;
/** Leaves alternate between two rings so neighbouring labels clear each other. */
const LEAF_STAGGER = 46;
const at = (angle: number, r: number) => ({ x: Math.round(Math.cos(angle) * r), y: Math.round(Math.sin(angle) * r * 0.72) });

export function capsuleMap(tree: CapsuleTree): CapsuleMap {
  const nodes: MapNode[] = [{ id: "root", label: "The Capsule", kind: "root", x: 0, y: 0, count: tree.branches.length }];
  const edges: MapEdge[] = [];
  const branches = tree.branches;
  // Genres in the order the sounds bring them, so a sound sits next to its first genre.
  const genres: Genre[] = [];
  for (const b of branches) for (const g of b.sound?.genres ?? []) if (!genres.includes(g)) genres.push(g);
  // Every branch gets an equal slice of the circle; its sound sits mid-slice and its leaves fan across it.
  const slice = (2 * Math.PI) / Math.max(branches.length, 1);
  const start = -Math.PI / 2;
  const mid = (i: number) => start + slice * (i + 0.5);

  // A genre sits at the average angle of the sounds that carry it.
  for (const g of genres) {
    const holders = branches.flatMap((b, i) => (b.sound?.genres.includes(g) ? [mid(i)] : []));
    const angle = Math.atan2(holders.reduce((s, a) => s + Math.sin(a), 0), holders.reduce((s, a) => s + Math.cos(a), 0));
    nodes.push({ id: `genre-${g}`, label: `${LEXICON[g].name} · ${g}`, kind: "genre", genre: g, count: holders.length, ...at(angle, RINGS.genre) });
    edges.push({ from: "root", to: `genre-${g}` });
  }

  branches.forEach((b, i) => {
    const soundId = `sound-${b.id}`;
    nodes.push({ id: soundId, label: b.sound?.title ?? "Own finds", kind: "sound", count: b.pieces.length, ...(b.sound ? { song: b.sound } : {}), ...at(mid(i), RINGS.sound) });
    if (b.sound) for (const g of b.sound.genres) edges.push({ from: `genre-${g}`, to: soundId });
    else edges.push({ from: "root", to: soundId });
    const leaves = [
      ...b.pieces.map(p => ({ id: `piece-${b.id}-${p.id}`, label: pieceKeyword(p.name), kind: "piece" as const, detail: [p.name, p.detail].filter(Boolean).join(" · "), ...(b.sound ? { song: b.sound } : {}) })),
      ...b.picks.map(p => ({ id: `pick-${p.song.caption}`, label: p.song.title, kind: "pick" as const, song: p.song, shared: p.shared })),
    ];
    // Fan across 80% of the slice, leaving a gap between branches.
    const span = slice * 0.8;
    leaves.forEach((leaf, j) => {
      edges.push({ from: soundId, to: leaf.id });
      // A song picked for two sounds is one keyword with a line from each.
      if (nodes.some(n => n.id === leaf.id)) return;
      const angle = leaves.length === 1 ? mid(i) : mid(i) - span / 2 + (span * j) / (leaves.length - 1);
      nodes.push({ ...leaf, ...at(angle, RINGS.leaf + (j % 2) * LEAF_STAGGER) });
    });
  });
  return { nodes, edges };
}
