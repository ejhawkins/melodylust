import { describe, expect, it } from "vitest";
import { boardId, isBoardId, sectionOf, toBoardItems } from "./style-board";

describe("style board", () => {
  it("sorts Want List saves into fashion, music and good reads", () => {
    expect(sectionOf({ kind: "song" })).toBe("music");
    expect(sectionOf({ kind: "piece", from: "Reading Room · Sample read" })).toBe("read");
    expect(sectionOf({ kind: "piece", from: "The Swivel" })).toBe("fashion");
  });
  it("drops non-web links", () => {
    const [item] = toBoardItems([{ id: "1", kind: "piece", name: "Coat", detail: "", link: "javascript:alert(1)", note: "", image: "https://x.com/a.jpg" }]);
    expect(item?.link).toBe("");
    expect(item?.image).toBe("https://x.com/a.jpg");
  });
  it("makes valid link ids", () => {
    const id = boardId(n => new Uint8Array(n).fill(33));
    expect(id).toBe("bbbbbbbbbb");
    expect(isBoardId(id)).toBe(true);
    expect(isBoardId("../etc")).toBe(false);
  });
});

import { spotifyTrackId as sti } from "./style-board";
import { test as t2, expect as e2 } from "vitest";
t2("spotify track links become embeddable ids, other links don't", () => {
  e2(sti("https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh?si=x")).toBe("4iV5W9uYEdYUVa79Axb7Rh");
  e2(sti("https://open.spotify.com/intl-fr/track/4iV5W9uYEdYUVa79Axb7Rh")).toBe("4iV5W9uYEdYUVa79Axb7Rh");
  e2(sti("https://evil.com/open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh")).toBeNull();
});

import { cleanPortfolio } from "./style-board";
t2("portfolio keeps titled https photos, drops unsafe links, caps at 12", () => {
  const ok = { title: "Editorial", image: "https://x.com/a.jpg", link: "javascript:alert(1)" };
  expect(cleanPortfolio([ok, { title: "", image: "https://x.com/b.jpg", link: "" }, { title: "Bad", image: "http://x.com/c.jpg", link: "" }]))
    .toEqual([{ ...ok, link: "" }]);
  expect(cleanPortfolio(Array(15).fill({ ...ok, link: "" })).length).toBe(12);
});
