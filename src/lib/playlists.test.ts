import { beforeEach, describe, expect, it } from "vitest";
import { NAME_MAX, createPlaylist, deletePlaylist, readPlaylists, toggleSong } from "./playlists";

describe("playlists", () => {
  beforeEach(() => window.localStorage.clear());

  it("makes a named, empty playlist and numbers blank names", () => {
    expect(createPlaylist("  Late   nights ").name).toBe("Late nights");
    expect(createPlaylist("").name).toBe("My playlist 2");
    expect(createPlaylist("x".repeat(NAME_MAX + 10)).name).toHaveLength(NAME_MAX);
    expect(readPlaylists().map(p => p.songs)).toEqual([[], [], []]);
  });

  it("adds songs in order and takes them off again, leaving other playlists alone", () => {
    const a = createPlaylist("A");
    const b = createPlaylist("B");
    expect(toggleSong(a.id, "WE ON GO II — BIA")).toBe(true);
    expect(toggleSong(a.id, "Fashion Week — Wale")).toBe(true);
    expect(readPlaylists().find(p => p.id === a.id)?.songs).toEqual(["WE ON GO II — BIA", "Fashion Week — Wale"]);
    expect(toggleSong(a.id, "WE ON GO II — BIA")).toBe(false);
    expect(readPlaylists().find(p => p.id === a.id)?.songs).toEqual(["Fashion Week — Wale"]);
    expect(readPlaylists().find(p => p.id === b.id)?.songs).toEqual([]);
  });

  it("deletes a playlist", () => {
    const a = createPlaylist("A");
    createPlaylist("B");
    deletePlaylist(a.id);
    expect(readPlaylists().map(p => p.name)).toEqual(["B"]);
  });

  it("ignores storage it can't read", () => {
    window.localStorage.setItem("ml-playlists", "not json");
    expect(readPlaylists()).toEqual([]);
    window.localStorage.setItem("ml-playlists", JSON.stringify([{ id: "1", name: "Ok", songs: ["x"], at: 1 }, { id: "2", name: "Bad", songs: [3], at: 2 }]));
    expect(readPlaylists().map(p => p.name)).toEqual(["Ok"]);
  });
});
