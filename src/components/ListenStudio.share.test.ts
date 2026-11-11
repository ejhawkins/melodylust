import { describe, expect, it } from "vitest";
import { shareLink } from "./ListenStudio";
describe("shareLink", () => {
  it("points Spotify songs at the Melodylust song page", () => {
    expect(shareLink({ id: "c10", title: "Ivy", artist: "Frank Ocean", spotify: "2ZWlPOoWh0626oTaHrnl2a" }, "https://x.app")).toBe("https://x.app/song/2ZWlPOoWh0626oTaHrnl2a");
  });
  it("falls back to a Spotify search without a track id", () => {
    expect(shareLink({ id: "a", title: "Ivy", artist: "Frank Ocean" }, "https://x.app")).toBe("https://open.spotify.com/search/Ivy%20Frank%20Ocean");
  });
});

import { shareExtras } from "./ListenStudio";
describe("shareExtras", () => {
  it("offers nothing extra for just music", () => { expect(shareExtras("music", [])).toEqual([]); });
  it("fashion lists Want List pieces first, then Style Matrix looks, never songs", () => {
    const out = shareExtras("fashion", [{ id: "1", kind: "piece", name: "Shield Aviator", detail: "Sunglasses", link: "", note: "" }, { id: "2", kind: "song", name: "Ivy", detail: "", link: "", note: "" }]);
    expect(out[0]?.title).toBe("Shield Aviator");
    expect(out.some(o => o.title === "Ivy")).toBe(false);
    expect(out.some(o => o.title === "The Statement Coat — Monochrome")).toBe(true);
  });
  it("good read lists journal stories", () => { expect(shareExtras("read", [])[0]?.label).toBe("Reading"); });
});
