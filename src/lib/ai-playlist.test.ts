import { describe, expect, it } from "vitest";
import { localPlaylist, readAIPlaylist } from "./ai-playlist";

const candidates = [
  { id: "a", title: "Blinding Lights", artist: "The Weeknd", genre: "Synth-pop" },
  { id: "b", title: "Kill Bill", artist: "SZA", genre: "R&B" },
  { id: "c", title: "Get Lucky", artist: "Daft Punk", genre: "Disco" },
];

describe("readAIPlaylist", () => {
  it("keeps only offered songs, once each, up to the length", () => {
    const out = readAIPlaylist({ title: "“Out late”", picks: [{ id: "a", why: "Neon." }, { id: "zzz", why: "Made up" }, { id: "a", why: "again" }, { id: "c", why: "Groove." }] }, { candidates, length: 5, prompt: "night out" });
    expect(out).toEqual({ title: "Out late", picks: [{ id: "a", why: "Neon." }, { id: "c", why: "Groove." }] });
  });
  it("returns null when nothing usable came back, and titles from the prompt when none is given", () => {
    expect(readAIPlaylist({ picks: [{ id: "nope" }] }, { candidates, length: 5, prompt: "x" })).toBeNull();
    expect(readAIPlaylist({ picks: [{ id: "b" }] }, { candidates, length: 5, prompt: "slow sunday." })?.title).toBe("Slow sunday");
  });
});

describe("localPlaylist", () => {
  it("leans genres from the prompt's words and puts a named artist first", () => {
    expect(localPlaylist("a night out", candidates, 5)?.picks.map(p => p.id)).toEqual(["a", "c"]);
    expect(localPlaylist("SZA and a night out", candidates, 5)?.picks[0]?.id).toBe("b");
  });
  it("returns null when nothing matches", () => {
    expect(localPlaylist("zzz", candidates, 5)).toBeNull();
  });
});
