export const SWIVEL_LAYERS = [
  { name: "Outerwear", query: "jacket" }, { name: "Top", query: "shirt" },
  { name: "Bottom", query: "trousers" }, { name: "Shoes", query: "sneakers" },
] as const;
export const wrap = (value: number, count: number) => count > 0 ? ((value % count) + count) % count : 0;
export function frontPiece(angle: number, count: number) { return count > 0 ? wrap(Math.round(-angle / (360 / count)), count) : 0; }
export function snapAngle(angle: number, count: number) { return count > 0 ? Math.round(angle / (360 / count)) * (360 / count) : 0; }
export function shuffleRings(indices: number[], counts: number[], locks: boolean[], random = Math.random) {
  return counts.map((count, i) => locks[i] ? wrap(indices[i] ?? 0, count) : count > 0 ? Math.min(count - 1, Math.floor(random() * count)) : 0);
}