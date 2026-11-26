import { describe, it, expect } from "vitest";
import { isListeningRoomEnabled, parseThemeId, DEFAULT_THEME_ID } from "./room-flag";

describe("room flag", () => {
  it("is off unless exactly 'true'", () => {
    expect(isListeningRoomEnabled(undefined)).toBe(false);
    expect(isListeningRoomEnabled("false")).toBe(false);
    expect(isListeningRoomEnabled("1")).toBe(false);
    expect(isListeningRoomEnabled("true")).toBe(true);
  });
  it("accepts only known theme ids", () => {
    expect(parseThemeId("hiphop-runway")).toBe("hiphop-runway");
    expect(parseThemeId("toString")).toBe(DEFAULT_THEME_ID);
    expect(parseThemeId(42)).toBe(DEFAULT_THEME_ID);
  });
});
