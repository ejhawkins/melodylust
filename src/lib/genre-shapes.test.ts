import { describe, expect, it } from "vitest";
import { GENRES, LEXICON, STEPS, blend, blendName, blendPath, mixGenres, profile } from "./genre-shapes";

// The direction index for an angle in degrees, clockwise from three o'clock.
const at = (degrees: number) => Math.round((((degrees % 360) + 360) % 360) / (360 / STEPS));

describe("shape lexicon", () => {
  it("draws every genre as a closed shape that reaches the rim and never pinches to nothing", () => {
    for (const g of GENRES) {
      const reaches = profile(LEXICON[g].shape);
      expect(reaches).toHaveLength(STEPS);
      expect(Math.max(...reaches)).toBeCloseTo(1, 9);
      expect(Math.min(...reaches)).toBeGreaterThan(0.3);
    }
  });

  it("stands the block square, with its corners on the rim and its sides drawn in", () => {
    const block = profile(LEXICON["Hip-Hop"].shape);
    expect(block[at(45)]).toBeCloseTo(1, 9);
    expect(block[at(0)]).toBeLessThan(0.8);
    expect(block[at(0)]).toBeCloseTo(block[at(90)] ?? 0, 9);
  });

  it("points the sawtooth up, with a flat side down", () => {
    const saw = profile(LEXICON.Electronic.shape);
    expect(saw[at(270)]).toBeCloseTo(1, 9);
    expect(saw[at(90)]).toBeCloseTo(0.5, 1);
  });

  it("splits a song's vote among its genres", () => {
    expect(mixGenres([{ genres: ["Hip-Hop"] }, { genres: ["Hip-Hop", "R&B"] }, { genres: ["Pop"] }, {}])).toEqual({ "Hip-Hop": 1.5, "R&B": 0.5, Pop: 1 });
  });

  it("blends by proportion: one genre is its own shape, and doubling every weight changes nothing", () => {
    expect(blend({ Pop: 3 })).toEqual(blend({ Pop: 1 }));
    expect(blend({ Pop: 1 }).every(r => r === 1)).toBe(true);
    expect(blend({ "Hip-Hop": 2, Pop: 1 })).toEqual(blend({ "Hip-Hop": 4, Pop: 2 }));
    const half = blend({ "Hip-Hop": 1, Pop: 1 });
    expect(half[at(0)]).toBeGreaterThan(profile(LEXICON["Hip-Hop"].shape)[at(0)] ?? 1);
  });

  it("falls back to a circle when a mix has no genres, and ignores weights that aren't positive numbers", () => {
    expect(blend({})).toEqual(blend({ Pop: 1 }));
    expect(blend({ Rock: 0, Jazz: -2, Country: Number.NaN, Pop: 1 })).toEqual(blend({ Pop: 1 }));
  });

  it("writes a closed SVG path of finite points", () => {
    const d = blendPath({ "Hip-Hop": 3, Pop: 2, Electronic: 0.5, "R&B": 0.5 }, 50, 50, 38);
    expect(d.startsWith("M")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    expect(d.match(/[ML]/g)).toHaveLength(STEPS);
    expect(d).not.toMatch(/NaN|Infinity/);
  });

  it("names a blend biggest share first", () => {
    expect(blendName({ Pop: 2, "Hip-Hop": 3, Electronic: 0.5, "R&B": 0.5 })).toBe("Hip-Hop, Pop, R&B and Electronic");
    expect(blendName({ Jazz: 1 })).toBe("Jazz");
    expect(blendName({})).toBe("");
  });
});
