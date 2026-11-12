import { describe, expect, it } from "vitest";
import { exitProgress } from "./useHeroParallax";

describe("hero parallax progress", () => {
  it("stays at rest until the cover reaches the top, then runs to 1 as it leaves", () => {
    expect(exitProgress(120, 400, 0)).toBe(0);
    expect(exitProgress(0, 400, 0)).toBe(0);
    expect(exitProgress(-100, 400, 0)).toBe(0.25);
    expect(exitProgress(-600, 400, 0)).toBe(1);
    // A scroller that starts lower on the page (the feed under the header) measures from its own top.
    expect(exitProgress(-100, 400, 100)).toBe(0.5);
    expect(exitProgress(0, 0, 0)).toBe(0);
  });
});
