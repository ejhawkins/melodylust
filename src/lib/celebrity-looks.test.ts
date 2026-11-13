import { describe, expect, it } from "vitest";
import { celebrityLooks, isLookSaved, lookChips, LOOK_FROM, type CelebrityLook } from "./celebrity-looks";

const base = celebrityLooks[0] as CelebrityLook;
describe("Dressed to the Beat", () => {
  it("puts the lead look first and has six looks", () => {
    expect(celebrityLooks).toHaveLength(6);
    expect(celebrityLooks[0]?.lead).toBe(true);
  });
  it("hides empty chips", () => {
    expect(lookChips({ ...base, bpm: null, genre: "Pop", mood: "" })).toEqual(["Pop"]);
    expect(lookChips({ ...base, bpm: 120, genre: "", mood: "Moody" })).toEqual(["120 BPM", "Moody"]);
  });
  it("reads saved state from the Want List", () => {
    const item = { id: "1", kind: "piece" as const, name: base.name, detail: "", link: "", note: "", from: LOOK_FROM };
    expect(isLookSaved([item], base)).toBe(true);
    expect(isLookSaved([{ ...item, from: "Shop" }], base)).toBe(false);
  });
});
