import { describe, expect, it } from "vitest";
import { matchCatalog, parseMusicLink, parseSongList, CATALOG } from "./studio";

describe("parseSongList", () => {
  it("reads Artist - Title lines", () => {
    expect(parseSongList("Frank Ocean - Ivy\nSZA – Kill Bill")).toEqual([{ artist: "Frank Ocean", title: "Ivy" }, { artist: "SZA", title: "Kill Bill" }]);
  });
  it("reads CSV Title,Artist and skips the header", () => {
    expect(parseSongList('Title,Artist\n"Espresso","Sabrina Carpenter"')).toEqual([{ title: "Espresso", artist: "Sabrina Carpenter" }]);
  });
  it("reads M3U EXTINF lines and skips file paths", () => {
    expect(parseSongList("#EXTM3U\n#EXTINF:200,Daft Punk - Get Lucky\nmusic/get-lucky.mp3")).toEqual([{ artist: "Daft Punk", title: "Get Lucky" }]);
  });
});

describe("parseMusicLink", () => {
  it("recognises Spotify playlists and YouTube lists", () => {
    expect(parseMusicLink("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=x")).toEqual({ source: "spotify", kind: "playlist", id: "37i9dQZF1DXcBWIGoYBM5M" });
    expect(parseMusicLink("https://youtube.com/playlist?list=PL123abc")?.kind).toBe("playlist");
    expect(parseMusicLink("https://example.com")).toBeNull();
  });
});

describe("matchCatalog", () => {
  it("keeps the Spotify id of a known song", () => {
    expect(matchCatalog([{ title: "ivy", artist: "frank ocean" }], CATALOG)[0]?.spotify).toBe("2ZWlPOoWh0626oTaHrnl2a");
  });
});

import { spotifyTrackInfo } from "./studio";
describe("spotifyTrackInfo", () => {
  it("reads title, artist and cover from Spotify's public oEmbed", async () => {
    const f = (async () => new Response(JSON.stringify({ title: "Ivy · Frank Ocean", thumbnail_url: "https://i.scdn.co/x" }))) as unknown as typeof fetch;
    expect(await spotifyTrackInfo("2ZWlPOoWh0626oTaHrnl2a", f)).toEqual({ title: "Ivy", artist: "Frank Ocean", spotify: "2ZWlPOoWh0626oTaHrnl2a", art: "https://i.scdn.co/x" });
  });
  it("returns null when Spotify can't find it", async () => {
    expect(await spotifyTrackInfo("x", (async () => new Response("", { status: 404 })) as unknown as typeof fetch)).toBeNull();
  });
});
