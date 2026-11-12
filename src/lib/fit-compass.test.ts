import { describe, expect, it } from "vitest";
import { FIT_ITEMS, quadrantPoles, voteShares, findLook, fitWishName, newVoterId } from "./fit-compass";

describe("fit compass", () => {
  it("each item has exactly four looks, one per quadrant", () => {
    for (const item of FIT_ITEMS) expect(item.looks.map(l => l.quadrant).sort()).toEqual(["bl", "br", "tl", "tr"]);
  });
  it("maps quadrants to the axis poles", () => {
    expect(quadrantPoles("tl")).toEqual({ x: "Polished", y: "After dark" });
    expect(quadrantPoles("br")).toEqual({ x: "Undone", y: "Daytime" });
  });
  it("every look has a valid Spotify track id", () => {
    for (const l of FIT_ITEMS.flatMap(i => i.looks)) expect(l.song.spotify).toMatch(/^[A-Za-z0-9]{22}$/);
  });
  it("vote shares sum to 100 and name a single leader", () => {
    const r = voteShares({ a: 1, b: 1, c: 1 }, ["a", "b", "c", "d"]);
    expect(Object.values(r.shares).reduce((n, v) => n + v, 0)).toBe(100);
    expect(r.leader).toBeNull();
    expect(voteShares({ a: 3, b: 1 }, ["a", "b"])).toMatchObject({ total: 4, shares: { a: 75, b: 25 }, leader: "a" });
    expect(voteShares({}, ["a"]).shares["a"]).toBe(0);
  });
  it("only accepts looks that exist", () => {
    expect(findLook("statement-coat", "mono")?.num).toBe("Look 02");
    expect(findLook("statement-coat", "nope")).toBeUndefined();
  });
  it("names the Want List row after item and look", () => {
    const item = FIT_ITEMS[0]!; expect(fitWishName(item, item.looks[0]!)).toBe("The Statement Coat — 70s suede");
  });
  it("makes a voter id the vote server accepts, with or without crypto.randomUUID", () => {
    const accepted = /^[A-Za-z0-9-]{16,64}$/; // style-votes.functions.ts
    // Plain http (a phone on the Wi-Fi address) has no randomUUID; this used to throw and take the page down.
    const plainHttp = { getRandomValues: (bytes: Uint8Array) => bytes.fill(171) };
    expect(newVoterId(plainHttp)).toBe("ab".repeat(16));
    expect(newVoterId(plainHttp)).toMatch(accepted);
    expect(newVoterId({ ...plainHttp, randomUUID: () => "3f2b8c1e-5a47-4d09-9e6b-7c1d2a3b4c5d" })).toBe("3f2b8c1e-5a47-4d09-9e6b-7c1d2a3b4c5d");
    expect(newVoterId()).toMatch(accepted);
  });
});
