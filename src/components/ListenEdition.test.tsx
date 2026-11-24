import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ListenEdition } from "./ListenEdition";

const read = { id: "r1", title: "Why the tracksuit won", source: "The Face", note: "Uniform as argument.", url: "https://theface.com/r1", image: "", genre: "Hip-Hop" };
const story = { id: "s1", title: "A story", intro: "Intro", category: "Music", date: "Nov 2026", image: "", genre: "Hip-Hop" } as never;
const song = { song: { caption: "Song — Artist", title: "Song", artist: "Artist", art: "" }, index: 0 } as never;
const base = { onChoose: vi.fn(), playing: null, onPlay: vi.fn(), onRead: vi.fn() };

describe("a genre edition, for now", () => {
  afterEach(cleanup);

  it("shows only the genre's runway cards, not its stories, good reads or songs", () => {
    render(<ListenEdition {...base} choice="Hip-Hop" stories={[story]} reads={[read]} songs={[song]} pairingCount={1}
      pairings={<ul><li>Wales Bonner card</li></ul>} />);
    expect(screen.getByText("Wales Bonner card")).toBeTruthy();
    expect(screen.getByText("1 runway card")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Good reads" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "On the record" })).toBeNull();
    expect(screen.queryByText("A story")).toBeNull();
  });

  it("points to Runway Notes when the cards are already open there", () => {
    render(<ListenEdition {...base} choice="Rock" stories={[]} songs={[]} pairingCount={3} pairings={null} />);
    expect(screen.getByText(/in Runway Notes below/)).toBeTruthy();
  });

  it("says so when the genre has no runway cards", () => {
    render(<ListenEdition {...base} choice="Electronic" stories={[]} songs={[]} pairings={null} />);
    expect(screen.getByText("No Electronic runway cards filed yet.")).toBeTruthy();
  });

  it("shows nothing extra for All Curated", () => {
    render(<ListenEdition {...base} choice="all" stories={[story]} songs={[]} pairings={null} />);
    expect(screen.queryByText(/runway card/)).toBeNull();
  });
});
