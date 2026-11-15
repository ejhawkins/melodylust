import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ListenProductCard } from "./ListenProductCard";

vi.mock("@/lib/wishlist", () => ({ useWishlist: () => [], addWish: vi.fn(), removeWish: vi.fn() }));

describe("mobile shop playback reveal", () => {
  beforeEach(() => { vi.useFakeTimers(); window.localStorage.clear(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("never opens from an idle page load", () => {
    render(<ListenProductCard active={false} />);
    act(() => { vi.advanceTimersByTime(10000); });
    expect(screen.queryByRole("complementary", { name: "Featured product" })).toBeNull();
  });

  it("waits five seconds after mobile playback or a play request", () => {
    const { rerender } = render(<ListenProductCard active={false} />);
    act(() => { vi.advanceTimersByTime(10000); });
    rerender(<ListenProductCard active />);
    act(() => { vi.advanceTimersByTime(4999); });
    expect(screen.queryByRole("complementary", { name: "Featured product" })).toBeNull();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByRole("complementary", { name: "Featured product" })).toBeInTheDocument();
  });

  it("cancels the pending reveal when mobile playback becomes ineligible", () => {
    const { rerender } = render(<ListenProductCard active />);
    act(() => { vi.advanceTimersByTime(4000); });
    rerender(<ListenProductCard active={false} />);
    act(() => { vi.advanceTimersByTime(10000); });
    expect(screen.queryByRole("complementary", { name: "Featured product" })).toBeNull();
    rerender(<ListenProductCard active />);
    act(() => { vi.advanceTimersByTime(4999); });
    expect(screen.queryByRole("complementary", { name: "Featured product" })).toBeNull();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByRole("complementary", { name: "Featured product" })).toBeInTheDocument();
  });
});
describe("session shop line-up", () => {
  beforeEach(() => { vi.useFakeTimers(); window.localStorage.clear(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("shows one product at a time and stops after ten per session", async () => {
    const { fireEvent } = await import("@testing-library/react");
    render(<ListenProductCard active songKey="a" />);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByText("1 / 10")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    for (let i = 0; i < 9; i++) fireEvent.click(screen.getByRole("button", { name: /Next piece/ }));
    expect(screen.getByText("10 / 10")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Next piece/ })).toBeNull();
  });
});

describe("pieces from Contentful", () => {
  beforeEach(() => { vi.useFakeTimers(); window.localStorage.clear(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });
  const piece = (id: string, name: string, sizes: string[] = []) => ({
    id, name, kicker: "Styled for this song", collection: "Outerwear", price: "$295", sizes,
    colors: [{ name: "Charcoal", image: "https://images.ctfassets.net/s/a.jpg", alt: `${name} in Charcoal`, swatch: "", swatchColor: "#333333" }],
  });

  it("shows the song's own pieces, with a hex swatch and no size row when the piece has no sizes", () => {
    render(<ListenProductCard active songKey="Fashion Week — Wale" products={[piece("blazer", "Double-breasted blazer"), piece("shirt", "Silk camp-collar shirt")]} />);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Double-breasted blazer");
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByText("Styled for this song")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Choose color" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Choose size" })).toBeNull();
  });

  it("paints a Contentful swatch from its hex colour when a piece comes in more than one", () => {
    const two = { ...piece("blazer", "Double-breasted blazer"), colors: [...piece("x", "x").colors, { name: "Camel", image: "https://images.ctfassets.net/s/b.jpg", alt: "Camel", swatch: "", swatchColor: "#c19a6b" }] };
    render(<ListenProductCard active songKey="a" products={[two]} />);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByRole("button", { name: "Charcoal" }).firstElementChild).toHaveStyle({ backgroundColor: "#333333" });
    expect(screen.getByRole("button", { name: "Camel" }).firstElementChild).toHaveStyle({ backgroundColor: "#c19a6b" });
  });

  it("starts from the first piece when the next song brings its own line-up", async () => {
    const { fireEvent } = await import("@testing-library/react");
    const { rerender } = render(<ListenProductCard active songKey="a" products={[piece("blazer", "Double-breasted blazer", ["S", "M"]), piece("shirt", "Silk camp-collar shirt")]} />);
    act(() => { vi.advanceTimersByTime(5000); });
    fireEvent.click(screen.getByRole("button", { name: /Next piece/ }));
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Silk camp-collar shirt");
    rerender(<ListenProductCard active songKey="b" products={[piece("parka", "Shearling-trim parka"), piece("boots", "Wheat work boots")]} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Shearling-trim parka");
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });
});
