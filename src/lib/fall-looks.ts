// A fall styling line for a shop piece, shown where the price used to be. Each category the
// shop loads has four looks; a piece always gets the same one (picked from its id), so
// neighbouring cards read like different stylist's notes. Pure and browser-safe for testing.

type Piece = { id?: string; category: string; name: string };

const LOOKS: Record<string, readonly string[]> = {
  Knitwear: [
    "Buttoned over a slip skirt, with tights and loafers",
    "Over a crisp shirt, collar out, with straight denim",
    "Tucked into a leather midi skirt, with knee boots",
    "Worn open over a slip dress, with suede ankle boots",
  ],
  Skirts: [
    "With opaque tights, loafers and an oversized blazer",
    "With a chunky cardigan, tights and knee boots",
    "With a fitted roll-neck, wool socks and penny loafers",
    "Under a long camel coat, with heeled ankle boots",
  ],
  Outerwear: [
    "Over a fine roll-neck and straight denim",
    "Over a cashmere crew-neck, with wide wool trousers and loafers",
    "Belted over a knit dress, with knee boots",
    "Over a grey hoodie and a long slip skirt, with lug-sole boots",
  ],
  Dresses: [
    "Over a fine-gauge knit, with ankle boots and a trench",
    "Layered over a fitted roll-neck, with tights and loafers",
    "Under a cropped leather jacket, with knee boots",
    "With a long cardigan and suede boots",
  ],
  Tops: [
    "Tucked into wool trousers, under a long blazer",
    "Under a chunky cardigan, with a pleated midi skirt",
    "With dark denim and a camel coat",
    "Layered under a slip dress, with ankle boots",
  ],
  Bags: [
    "Worn cross-body over a camel coat",
    "On the shoulder of a trench, with denim and loafers",
    "With a long knit dress and knee boots",
    "Against black leather and a roll-neck",
  ],
};

const FALLBACK = "Layered with a long coat and boots";

/** A small, stable string hash: the same piece always lands on the same look. */
const hash = (text: string) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function fallLook({ id, category, name }: Piece): string {
  const looks = LOOKS[category];
  if (!looks) return FALLBACK;
  return looks[hash(id || name) % looks.length] ?? FALLBACK;
}
