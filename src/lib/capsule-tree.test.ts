import { describe, expect, it } from "vitest";
import { capsuleTree, recommend, soundOf, studioGenres, type CapsuleSong } from "./capsule-tree";
import type { Genre } from "./genre-shapes";
import type { WishItem } from "./wishlist";

const song = (title: string, artist: string, genres: Genre[]): CapsuleSong => ({ caption: `${title} — ${artist}`, title, artist, art: "", alt: "", link: `https://open.spotify.com/track/${title}`, genres });
const mix = [song("Day 'N' Nite", "Kid Cudi", ["Electronic", "Hip-Hop"]), song("DANCE...", "Slayyyter", ["Pop"]), song("WE ON GO II", "BIA", ["Hip-Hop"])];
const studio = [song("Levitating", "Dua Lipa", ["Pop"]), song("Doja", "Central Cee", ["Hip-Hop"]), song("Get Lucky", "Daft Punk", ["Electronic", "Pop"])];
const pool = [...mix, ...studio];
let n = 0;
const piece = (name: string, more: Partial<WishItem> = {}): WishItem => ({ id: `p${++n}`, kind: "piece", name, detail: "", link: "", note: "", ...more });

describe("the Capsule tree", () => {
  it("finds a piece's song from `from`, or from a note naming title and artist", () => {
    expect(soundOf(piece("Hoodie", { from: "Day 'N' Nite — Kid Cudi" }), mix)?.title).toBe("Day 'N' Nite");
    expect(soundOf(piece("Coat", { from: "Fashion", note: "We On Go II — bia" }), mix)?.artist).toBe("BIA");
    expect(soundOf(piece("Coat", { note: "Song: Dance... · Slayyyter" }), mix)?.title).toBe("DANCE...");
    expect(soundOf(piece("Bag", { from: "Shop" }), mix)).toBeNull();
  });

  it("recommends songs sharing a genre, most shared first, fresh before already picked", () => {
    const picks = recommend(["Electronic", "Pop"], pool, new Set(["DANCE... — Slayyyter"]));
    expect(picks.map(p => p.song.title)).toEqual(["Get Lucky", "Day 'N' Nite", "Levitating"]);
    expect(picks[0]?.shared).toEqual(["Electronic", "Pop"]);
    const fresh = recommend(["Pop"], pool, new Set(), new Set(["DANCE... — Slayyyter"]), 2);
    expect(fresh.map(p => p.song.title)).toEqual(["Levitating", "Get Lucky"]);
  });

  it("groups saved pieces under their sound, newest sound first, loose pieces last", () => {
    const saved = [
      piece("Moon-wash denim jacket", { from: "Day 'N' Nite — Kid Cudi" }),
      piece("Tote", { from: "Shop" }),
      piece("Glow-stitch hoodie", { from: "Day 'N' Nite — Kid Cudi" }),
      piece("Track jacket", { from: "WE ON GO II — BIA" }),
      { id: "s1", kind: "song", name: "Levitating — Dua Lipa", detail: "", link: "", note: "" } as WishItem,
    ];
    const tree = capsuleTree({ saved, songs: mix, pool, looks: {} });
    expect(tree.example).toBe(false);
    expect(tree.branches.map(b => [b.sound?.title ?? null, b.pieces.map(p => p.name)])).toEqual([
      ["WE ON GO II", ["Track jacket"]],
      ["Day 'N' Nite", ["Glow-stitch hoodie", "Moon-wash denim jacket"]],
      [null, ["Tote"]],
    ]);
    // A sound in the tree is never recommended, and each branch's picks share its genres.
    const sounds = new Set(tree.branches.map(b => b.sound?.caption));
    for (const branch of tree.branches) {
      expect(branch.picks.length).toBeGreaterThan(0);
      for (const pick of branch.picks) expect(sounds.has(pick.song.caption)).toBe(false);
      if (branch.sound) for (const pick of branch.picks) expect(pick.shared.every(g => branch.sound!.genres.includes(g))).toBe(true);
    }
    expect(tree.branches[0]?.picks[0]?.song.title).toBe("Doja");
  });

  it("dresses the first songs of the mix as an example when nothing is saved", () => {
    const looks = { "DANCE... — Slayyyter": [{ name: "Sequin slip", price: "$120" }], "WE ON GO II — BIA": [{ name: "Track jacket", price: "$90" }] };
    const tree = capsuleTree({ saved: [], songs: mix, pool, looks, examples: 1 });
    expect(tree.example).toBe(true);
    expect(tree.branches.map(b => [b.sound?.title, b.pieces.map(p => p.name)])).toEqual([["DANCE...", ["Sequin slip"]]]);
  });

  it("places the Studio's genres in the shape lexicon", () => {
    expect(studioGenres("Synth-pop")).toEqual(["Pop", "Electronic"]);
    expect(studioGenres("Rap")).toEqual(["Hip-Hop"]);
    expect(studioGenres("Country")).toEqual(["Country"]);
    expect(studioGenres("Polka")).toEqual([]);
    expect(studioGenres(undefined)).toEqual([]);
  });
});
