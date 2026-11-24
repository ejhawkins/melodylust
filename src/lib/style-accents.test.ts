import { describe, expect, it } from "vitest";
import { STYLE_GENRES } from "@/lib/style-profile";
import { STYLE_ACCENTS, accentFor, accentLink } from "./style-accents";

describe("style accents", () => {
  it("gives every style filter its own accessory", () => {
    for (const g of STYLE_GENRES) expect(STYLE_ACCENTS[g].genre).toBe(g);
    expect(new Set(STYLE_GENRES.map(g => STYLE_ACCENTS[g].motif)).size).toBe(STYLE_GENRES.length);
  });

  it("pins a butterfly necklace for Y2K and stunner shades for Afrofuturist", () => {
    expect(accentFor(["Y2K"])?.name).toBe("Butterfly necklace");
    expect(accentFor(["Afrofuturist"])?.name).toBe("Stunner shades");
  });

  it("uses the style picked last, and nothing with no filter", () => {
    expect(accentFor(["Y2K", "Afrofuturist"])?.genre).toBe("Afrofuturist");
    expect(accentFor([])).toBeNull();
  });

  it("links to a Farfetch search for the piece", () => {
    expect(accentLink(STYLE_ACCENTS["Y2K"])).toBe("https://www.farfetch.com/shopping/search/items.aspx?q=butterfly%20necklace");
  });
});
