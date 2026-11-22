import { z } from "zod";

/** The stylist brief: optional toggles a board maker answers so a look says what it's for, how dressed up it is and
 *  how it's worn. Shared by the composer, the server's validation and the public board page. Every answer is optional;
 *  blank answers never show. */

export const OCCASIONS = ["Date night", "Work", "Weekend", "Event", "Travel"] as const;
export const DRESS_LEVELS = ["Relaxed", "Smart casual", "Dressed up", "Formal"] as const;
export const COLOR_PLACES = ["Top", "Bottom", "Dress", "Outerwear", "Accessories"] as const;
export const SILHOUETTES = ["Fitted", "Straight", "Relaxed", "Oversized", "Structured", "Fluid"] as const;
export const BUILDS = ["Dress", "Separates"] as const;
export const HEELS = ["Flat", "Low", "Mid", "High"] as const;
export const SEASONS = ["Hot", "Mild", "Cool", "Cold"] as const;
/** Named swatches for the lead colour; the hex is only for drawing the swatch. */
export const LEAD_COLORS = [
  { name: "Forest green", hex: "#2f4f3a" }, { name: "Black", hex: "#111111" }, { name: "Ivory", hex: "#f3ecdc" },
  { name: "Camel", hex: "#b88a57" }, { name: "Chocolate", hex: "#4a2c20" }, { name: "Navy", hex: "#1d2a44" },
  { name: "Burgundy", hex: "#6b1f2a" }, { name: "Red", hex: "#b3202a" }, { name: "Blush", hex: "#e6b8b0" },
  { name: "Grey", hex: "#8a8a8a" }, { name: "Denim blue", hex: "#4a6a8f" }, { name: "Gold", hex: "#c9a24a" },
] as const;
export const AVOID_MAX = 140;

const COLOR_NAMES = LEAD_COLORS.map(c => c.name) as [string, ...string[]];
const many = <T extends readonly [string, ...string[]]>(options: T) => z.array(z.enum(options)).max(options.length)
  .transform(v => options.filter(o => v.includes(o)) as T[number][]); // drop repeats, keep the list's order

export const briefSchema = z.object({
  occasions: many(OCCASIONS).default([]),
  dressLevel: z.enum(DRESS_LEVELS).nullable().default(null),
  leadColor: z.enum(COLOR_NAMES).nullable().default(null),
  colorOn: many(COLOR_PLACES).default([]),
  silhouettes: many(SILHOUETTES).default([]),
  build: z.enum(BUILDS).nullable().default(null),
  heel: z.enum(HEELS).nullable().default(null),
  walkable: z.boolean().default(false),
  season: z.enum(SEASONS).nullable().default(null),
  layer: z.boolean().default(false),
  avoid: z.string().max(AVOID_MAX).default("").transform(s => s.replace(/\s+/g, " ").trim()),
}).strict();

export type StylistBrief = z.output<typeof briefSchema>;
export const emptyBrief = (): StylistBrief => briefSchema.parse({});

export function isEmptyBrief(b: StylistBrief): boolean {
  return !b.occasions.length && !b.dressLevel && !b.leadColor && !b.colorOn.length && !b.silhouettes.length && !b.build
    && !b.heel && !b.walkable && !b.season && !b.layer && !b.avoid;
}

/** A brief as stored, read defensively: anything malformed or empty reads as no brief. */
export function readBrief(value: unknown): StylistBrief | null {
  const parsed = briefSchema.safeParse(value ?? {});
  return parsed.success && !isEmptyBrief(parsed.data) ? parsed.data : null;
}

export const swatchFor = (name: string | null) => LEAD_COLORS.find(c => c.name === name)?.hex ?? null;

/** The brief as labelled lines for the board page, skipping anything unanswered. */
export function briefLines(b: StylistBrief): { label: string; value: string }[] {
  const lines: { label: string; value: string }[] = [];
  const add = (label: string, value: string) => { if (value) lines.push({ label, value: value[0]!.toUpperCase() + value.slice(1) }); };
  const places = b.colorOn.join(", ").toLowerCase();
  add("Occasion", b.occasions.join(" · "));
  add("Dress level", b.dressLevel ?? "");
  add("Lead colour", b.leadColor ? (places ? `${b.leadColor} on the ${places}` : b.leadColor) : places ? `on the ${places}` : "");
  add("Silhouette", [...b.silhouettes, ...(b.build ? [b.build === "Dress" ? "a dress" : "separates"] : [])].join(" · "));
  add("Shoes", [b.heel ? (b.heel === "Flat" ? "flat" : `${b.heel.toLowerCase()} heel`) : "", b.walkable ? "made for walking" : ""].filter(Boolean).join(", "));
  add("Season", [b.season ?? "", b.layer ? "bring a layer" : ""].filter(Boolean).join(", "));
  add("Avoid", b.avoid);
  return lines;
}
