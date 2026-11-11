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
