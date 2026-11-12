import { describe, expect, it } from "vitest";
import { capsuleMap, pieceKeyword } from "./capsule-map";
import type { CapsuleSong, CapsuleTree } from "./capsule-tree";

const song = (title: string, genres: CapsuleSong["genres"]): CapsuleSong => ({ caption: `${title} — A`, title, artist: "A", art: "", alt: "", link: "", genres });
const tree: CapsuleTree = {
  example: false,
  genres: { "Hip-Hop": 1.5, Electronic: 0.5 },
  branches: [
    { id: "a", sound: song("Day 'N' Nite", ["Electronic", "Hip-Hop"]), pieces: [{ id: "1", name: "Moon-wash denim jacket", detail: "" }], picks: [{ song: song("Get Lucky", ["Electronic"]), shared: ["Electronic"] }] },
    { id: "b", sound: song("WE ON GO II", ["Hip-Hop"]), pieces: [{ id: "2", name: "Statement Coat — Off-duty", detail: "" }], picks: [] },
    { id: "unplaced", sound: null, pieces: [{ id: "3", name: "Tote", detail: "" }], picks: [] },
  ],
};

describe("the Capsule keyword map", () => {
  it("reads a piece as its garment words", () => {
    expect(pieceKeyword("Moon-wash denim jacket")).toBe("denim jacket");
    expect(pieceKeyword("Statement Coat — Off-duty")).toBe("Statement Coat");
    expect(pieceKeyword("Tote")).toBe("Tote");
  });

  it("links capsule → genre → sound → pieces and next songs, with loose pieces off the centre", () => {
    const map = capsuleMap(tree);
    const label = (id: string) => map.nodes.find(n => n.id === id)?.label;
    expect(map.nodes.filter(n => n.kind === "genre").map(n => n.label)).toEqual(["The sawtooth · Electronic", "The block · Hip-Hop"]);
    expect(map.nodes.filter(n => n.kind === "piece").map(n => n.label)).toEqual(["denim jacket", "Statement Coat", "Tote"]);
    expect(label("sound-unplaced")).toBe("Own finds");
    const edges = map.edges.map(e => `${e.from}>${e.to}`);
    expect(edges).toEqual(expect.arrayContaining(["root>genre-Hip-Hop", "genre-Electronic>sound-a", "genre-Hip-Hop>sound-a", "genre-Hip-Hop>sound-b", "root>sound-unplaced", "sound-a>pick-Get Lucky — A"]));
    // A song picked for two sounds is drawn once, with a line from each.
    const twice = capsuleMap({ ...tree, branches: tree.branches.map(b => ({ ...b, picks: tree.branches[0]!.picks })) });
    expect(twice.nodes.filter(n => n.kind === "pick")).toHaveLength(1);
    expect(twice.edges.filter(e => e.to === "pick-Get Lucky — A")).toHaveLength(3);
    // Every edge joins two drawn nodes, and no two nodes share a spot.
    const ids = new Set(map.nodes.map(n => n.id));
    for (const e of map.edges) expect(ids.has(e.from) && ids.has(e.to)).toBe(true);
    expect(new Set(map.nodes.map(n => `${n.x},${n.y}`)).size).toBe(map.nodes.length);
  });
});
