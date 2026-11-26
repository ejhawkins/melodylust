import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoomLoader, captionAt, clampProgress } from "./RoomLoader";
import { ROOM_THEMES } from "@/lib/themes/theme-spec";

describe("RoomLoader", () => {
  it("cycles captions from the theme spec", () => {
    const t = ROOM_THEMES["autumn-tartan"];
    expect(captionAt(t, 0)).toBe(t.copy.loadingCaptions[0]);
    expect(captionAt(t, t.copy.loadingCaptions.length)).toBe(t.copy.loadingCaptions[0]);
  });

  it("clamps progress", () => {
    expect(clampProgress(-5)).toBe(0);
    expect(clampProgress(150)).toBe(100);
    expect(clampProgress(NaN)).toBe(0);
  });

  it("uses the theme's loader and silence label while loading", () => {
    const { container } = render(<RoomLoader themeId="hiphop-runway" progress={40} />);
    expect(container.querySelector("[data-loader='chain-link']")).not.toBeNull();
    expect(screen.getByText("Backstage")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows the theme CTA when ready", () => {
    render(<RoomLoader themeId="autumn-tartan" progress={100} />);
    expect(screen.getByRole("button", { name: "Enter the listening room" })).toBeTruthy();
    expect(screen.getByText("Listening mode ready")).toBeTruthy();
  });
});
