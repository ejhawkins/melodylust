import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ListenEdition } from "./ListenEdition";

const read = { id: "r1", title: "Why the tracksuit won", source: "The Face", note: "Uniform as argument.", url: "https://theface.com/r1", image: "", genre: "Hip-Hop" };

describe("the genre edition's good reads", () => {
  afterEach(cleanup);

  it("lists the genre's good reads as links out, with a thumbnail and the count", () => {
    render(<ListenEdition choice="Hip-Hop" onChoose={vi.fn()} stories={[]} reads={[read]} songs={[]} playing={null} onPlay={vi.fn()} onRead={vi.fn()} pairings={null} />);
    expect(screen.getByRole("heading", { name: "Good reads" })).toBeTruthy();
    const link = screen.getByRole("link", { name: /Why the tracksuit won/ });
    expect(link.getAttribute("href")).toBe("https://theface.com/r1");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.querySelector(".good-reads-thumb")?.textContent).toBe("T");
    expect(screen.getByText(/1 good read/)).toBeTruthy();
  });

  it("leaves the section out when the genre has none", () => {
    render(<ListenEdition choice="Hip-Hop" onChoose={vi.fn()} stories={[]} songs={[]} playing={null} onPlay={vi.fn()} onRead={vi.fn()} pairings={null} />);
    expect(screen.queryByRole("heading", { name: "Good reads" })).toBeNull();
  });
});
