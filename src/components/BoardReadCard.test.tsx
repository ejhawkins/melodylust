import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BoardReadCard } from "./BoardReadCard";

afterEach(cleanup);
const item = { name: "Little black dress", detail: "", link: "https://en.wikipedia.org/wiki/Little_black_dress", image: "" };
const preview = { url: item.link, title: "Little black dress - Wikipedia", description: "A short evening dress.", image: "https://img.example/lbd.jpg", site: "Wikipedia" };

describe("a good read on a board", () => {
  it("embeds the article as one link with its share image, site and summary", () => {
    const { container } = render(<BoardReadCard item={item} preview={preview} />);
    const link = screen.getByRole("link", { name: "Read Little black dress on Wikipedia" });
    expect(link.getAttribute("href")).toBe(item.link);
    expect(container.querySelector("img")?.getAttribute("src")).toBe(preview.image);
    expect(screen.getByText("A short evening dress.")).toBeTruthy();
  });

  it("prefers the board's own picture, then falls back through the share image to the site's letter", () => {
    const { container } = render(<BoardReadCard item={{ ...item, image: "https://img.example/own.jpg" }} preview={preview} />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://img.example/own.jpg");
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")?.getAttribute("src")).toBe(preview.image);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("W")).toBeTruthy();
  });

  it("shows the host and the board's note before any preview arrives", () => {
    render(<BoardReadCard item={{ ...item, detail: "Sample read" }} />);
    expect(screen.getByText("en.wikipedia.org")).toBeTruthy();
    expect(screen.getByText("Sample read")).toBeTruthy();
    expect(screen.getByText("E")).toBeTruthy();
  });
});
