import { beforeEach, describe, expect, it } from "vitest";
import { isLiked, readLikes, toggleLike } from "./likes";

describe("likes", () => {
  beforeEach(() => window.localStorage.clear());

  it("hearts an item, then un-hearts it", () => {
    expect(toggleLike("look", "Day 'N' Nite — Kid Cudi")).toBe(true);
    expect(isLiked(readLikes(), "look", "Day 'N' Nite — Kid Cudi")).toBe(true);
    expect(toggleLike("look", "Day 'N' Nite — Kid Cudi")).toBe(false);
    expect(readLikes()).toEqual([]);
  });

  it("keeps kinds apart, so a story and a look with the same key are separate likes", () => {
    toggleLike("story", "12");
    expect(isLiked(readLikes(), "story", "12")).toBe(true);
    expect(isLiked(readLikes(), "look", "12")).toBe(false);
  });

  it("ignores storage it can't read", () => {
    window.localStorage.setItem("ml-likes", "not json");
    expect(readLikes()).toEqual([]);
    window.localStorage.setItem("ml-likes", JSON.stringify([{ kind: "song", key: "x", at: 1 }, { kind: "video", key: "BY_XwvKogC8", at: 2 }]));
    expect(readLikes()).toEqual([{ kind: "video", key: "BY_XwvKogC8", at: 2 }]);
  });

  it("favourites playlists, runway and fashion with a title snapshot for the shelf", () => {
    toggleLike("playlist", "mix", { title: "The Autumn Mix", sub: "12 songs" });
    toggleLike("runway", "r1", { title: "Stop the show" });
    toggleLike("fashion", "product-Shield Aviator", { title: "Shield Aviator", image: "a.jpg" });
    const likes = readLikes();
    expect(likes.map(l => l.kind)).toEqual(["playlist", "runway", "fashion"]);
    expect(likes[0]?.title).toBe("The Autumn Mix");
    expect(likes[2]?.image).toBe("a.jpg");
  });
});
