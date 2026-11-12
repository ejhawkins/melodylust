import { describe, expect, it } from "vitest";
import type { CapsuleSong } from "./capsule-tree";
import type { Genre } from "./genre-shapes";
import { FILLER_PROFILE, applyTweak, buildDayPlaylist, energyOf, readProfile, tempoGap, tempoOf, type DayProfile } from "./day-playlist";

const song = (title: string, artist: string, genres: Genre[]): CapsuleSong => ({ caption: `${title} — ${artist}`, title, artist, art: "", alt: "", link: "", genres });
const pool = [
  song("Blinding Lights", "The Weeknd", ["Pop", "Electronic"]), song("Levitating", "Dua Lipa", ["Pop"]), song("Physical", "Dua Lipa", ["Pop"]),
  song("Pink + White", "Frank Ocean", ["R&B"]), song("Ivy", "Frank Ocean", ["R&B"]), song("Kill Bill", "SZA", ["R&B"]),
  song("Get Lucky", "Daft Punk", ["Electronic", "Pop"]), song("Redbone", "Childish Gambino", ["R&B"]), song("Feel Good Inc.", "Gorillaz", ["Indie"]),
  song("WE ON GO II", "BIA", ["Hip-Hop"]), song("Fashion Week", "Wale", ["Hip-Hop"]), song("Espresso", "Sabrina Carpenter", ["Pop"]),
  song("Extra One", "Frank Ocean", ["R&B"]),
];
const profile = (more: Partial<DayProfile> = {}): DayProfile => ({ ...FILLER_PROFILE, ...more });

describe("tempo", () => {
  it("uses a known tempo when there is one, and the genre's general tempo when in doubt", () => {
    expect(tempoOf(pool[0]!)).toEqual({ bpm: 171, known: true });
    expect(tempoOf(pool[3]!)).toEqual({ bpm: 85, known: false });
    expect(tempoOf(song("Mystery", "X", ["Hip-Hop", "Electronic"]))).toEqual({ bpm: 107, known: false });
  });
  it("hears double time as the same pulse, and gives energy from genre and tempo", () => {
    expect(tempoGap(171, 86)).toBeLessThan(1);
    expect(tempoGap(124, 85)).toBeGreaterThan(30);
    expect(energyOf(pool[6]!)).toBeGreaterThan(energyOf(pool[3]!));
  });
});

describe("the day playlist", () => {
  it("reads the profile's keywords as genres", () => {
    const hints = readProfile(profile());
    expect(hints.some(h => h.field === "fabrics" && h.word === "silk" && h.genre === "R&B")).toBe(true);
    expect(hints.some(h => h.field === "icons" && h.word === "Aaliyah" && h.genre === "R&B")).toBe(true);
  });

  it("builds only from the pool, tiered about 60/30/10, at most two per artist, avoiding what the reader avoids", () => {
    const day = buildDayPlaylist(profile({ avoid: "Gorillaz", length: 10 }), pool);
    expect(day.tracks).toHaveLength(10);
    expect(day.short).toBeNull();
    const captions = new Set(pool.map(s => s.caption));
    for (const t of day.tracks) expect(captions.has(t.song.caption)).toBe(true);
    expect(day.tracks.some(t => t.song.artist === "Gorillaz")).toBe(false);
    expect(day.tracks.filter(t => t.song.artist === "Frank Ocean").length).toBeLessThanOrEqual(2);
    expect(day.tracks.filter(t => t.tier === "core")).toHaveLength(6);
    expect(day.tracks.filter(t => t.tier === "adjacent")).toHaveLength(3);
    expect(day.tracks.filter(t => t.tier === "wildcard")).toHaveLength(1);
    // Loved artists make the core.
    expect(day.tracks.filter(t => t.song.artist === "SZA" || t.song.artist === "Frank Ocean").every(t => t.tier === "core")).toBe(true);
  });

  it("runs like a show across the day: opening in the morning, closer at night", () => {
    const day = buildDayPlaylist(profile(), pool);
    expect(day.tracks[0]).toMatchObject({ phase: "Morning", role: "Opening" });
    expect(day.tracks.at(-1)).toMatchObject({ phase: "Late night", role: "Closer" });
    expect(day.tracks.some(t => t.role === "Peak")).toBe(true);
    const peak = day.tracks.filter(t => t.role === "Peak").map(t => energyOf(t.song));
    expect(Math.max(...peak)).toBeGreaterThan(energyOf(day.tracks[0]!.song));
    expect(day.title).toBe("A Day in Quiet Luxury");
    expect(day.caption).toBe("Camel at breakfast, black by last call.");
    expect(day.why).toMatch(/silk/);
    expect(day.wear.opener).toMatch(/^Morning: camel silk oversized tailoring/);
  });

  it("says so, rather than inventing songs, when too few fit", () => {
    const day = buildDayPlaylist(profile({ length: 20 }), pool);
    expect(day.tracks.length).toBeLessThan(20);
    expect(day.short).toMatch(/none are invented/);
  });

  it("tweaks energy within 1 to 10", () => {
    expect(applyTweak(profile({ energy: 9 }), "upbeat").energy).toBe(10);
    expect(applyTweak(profile({ energy: 2 }), "softer").energy).toBe(1);
  });
});
